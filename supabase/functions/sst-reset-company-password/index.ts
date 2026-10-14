import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  company_id: string;
  send_email?: boolean;
}

function generateTempPassword(companyName: string): string {
  const clean = companyName.replace(/[^a-zA-Z]/g, '').substring(0, 8);
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() || 'Empresa';
  return `${capitalized}2026!`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { company_id, send_email }: ResetRequest = await req.json();
    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Authorize: caller must be admin OR the SST manager assigned to this company
    const { data: rolesData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = (rolesData || []).map((r: any) => r.role);
    const isAdmin = roles.includes('admin');
    const isSst = roles.includes('sst');

    let authorized = isAdmin;
    if (!authorized && isSst) {
      // Find SST manager id for this user
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('sst_manager_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.sst_manager_id) {
        const { data: assignment } = await supabaseAdmin
          .from('company_sst_assignments')
          .select('id')
          .eq('company_id', company_id)
          .eq('sst_manager_id', profile.sst_manager_id)
          .maybeSingle();
        authorized = !!assignment;
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado a esta empresa.' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, cnpj, email')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empresa não encontrada.' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Users with SST/admin/sales roles are never treated as the company login:
    // resetting them would lock the SST manager (or a collaborator) out of their own account.
    const isPrivileged = async (uid: string) => {
      const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', uid);
      return (data || []).some((r: any) => ['sst', 'admin', 'sales'].includes(r.role));
    };

    // Find user linked: first via profiles.company_id, then via user_companies
    let userId: string | null = null;
    let email: string | null = null;

    const { data: profileMatches } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('company_id', company_id);
    const { data: ucMatches } = await supabaseAdmin
      .from('user_companies')
      .select('user_id')
      .eq('company_id', company_id);
    const candidates = [
      ...(profileMatches || []).map((p: any) => p.id),
      ...(ucMatches || []).map((u: any) => u.user_id),
    ];
    for (const cid of candidates) {
      if (!(await isPrivileged(cid))) { userId = cid; break; }
    }


    const tempPassword = generateTempPassword(company.name);

    if (!userId) {
      // No user linked yet (orphan company): create one on the fly using the company email.
      const companyEmail = (company as any).email?.toString().trim().toLowerCase();
      if (!companyEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Empresa sem email cadastrado. Edite a empresa e adicione um email antes de resetar a senha.' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check if an auth user with this email already exists
      const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingList?.users?.find((u: any) => u.email?.toLowerCase() === companyEmail);

      if (existing) {
        userId = existing.id;
        email = existing.email!;
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
        });
        if (updErr) throw updErr;
      } else {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: companyEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: company.name },
        });
        if (createErr) throw createErr;
        userId = created.user!.id;
        email = created.user!.email!;
      }

      // Ensure profile points to this company
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, full_name: company.name, company_id: company_id, must_change_password: true }, { onConflict: 'id' });

      // Ensure 'company' role
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: 'company' });
    } else {
      // Get auth user (email)
      const { data: authUserData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (getUserErr || !authUserData?.user?.email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email do usuário não encontrado.' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      email = authUserData.user.email;

      // Reset password + force change on next login
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
      });
      if (updateErr) throw updateErr;
    }

    await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    // Get all related companies (multi-company access)
    const { data: userCompanies } = await supabaseAdmin
      .from('user_companies')
      .select('company_id')
      .eq('user_id', userId);

    const companyIds = new Set<string>([company_id]);
    (userCompanies || []).forEach((uc: any) => companyIds.add(uc.company_id));

    const { data: relatedCompanies } = await supabaseAdmin
      .from('companies')
      .select('name, cnpj')
      .in('id', Array.from(companyIds));

    // Optionally send credentials by email via Resend
    let emailSent = false;
    if (send_email && email) {
      try {
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
          const loginUrl = `${supabaseUrl.replace('.supabase.co', '')}`; // not used; we link to app
          const appUrl = Deno.env.get('APP_PUBLIC_URL') || 'https://srsmsapp.com.br';
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin:0 auto; padding:24px; color:#111;">
              <h2 style="color:#16a34a;">Acesso ao seu painel — Ouvidoria Smart</h2>
              <p>Olá, <strong>${company.name}</strong>!</p>
              <p>Seu acesso foi gerado/atualizado. Use as credenciais abaixo para entrar:</p>
              <p><strong>E-mail:</strong> ${email}<br/>
                 <strong>Senha temporária:</strong> <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;">${tempPassword}</code></p>
              <p>Você será solicitado a definir uma nova senha no primeiro acesso.</p>
              <p><a href="${appUrl}/auth" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Entrar agora</a></p>
              <p style="font-size:12px;color:#666;margin-top:24px;">Se você não esperava este e-mail, ignore.</p>
            </div>`;
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Sr.SMS <no-reply@srsmsapp.com.br>',
              to: [email],
              subject: 'Seus dados de acesso — Ouvidoria Smart',
              html,
            }),
          });
          emailSent = r.ok;
          if (!r.ok) console.error('Resend error:', await r.text());
        }
      } catch (e) {
        console.error('Email send failed:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
        tempPassword,
        emailSent,
        relatedCompanies: relatedCompanies || [{ name: company.name, cnpj: company.cnpj }],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error('sst-reset-company-password error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro interno.' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
