import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendWelcomeEmail } from "../_shared/welcome-email.ts";

// Error sanitization utility
function getSafeErrorMessage(error: any): string {
  const errorMessage = error?.message || String(error);
  
  // Map common error patterns to safe messages
  if (errorMessage.includes('23505') || errorMessage.includes('duplicate key')) {
    return 'Este email já está registrado no sistema.';
  }
  if (errorMessage.includes('23503')) {
    return 'Referência não encontrada. Verifique os dados relacionados.';
  }
  if (errorMessage.includes('password')) {
    return 'Erro ao processar senha. Verifique o formato.';
  }
  if (errorMessage.includes('email')) {
    return 'Erro ao processar email. Verifique o formato.';
  }
  
  return 'Erro ao processar solicitação. Tente novamente.';
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'company' | 'sst' | 'sales' | 'admin' | 'pending';
  company_id?: string;
  sst_manager_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authentication and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Sessão não encontrada. Faça login novamente.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    // Verify the user has admin role, even when the account has multiple roles
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError || !isAdmin) {
      console.error('Authorization check failed:', roleError);
      return jsonResponse({ success: false, error: 'Permissão negada. Apenas administradores podem alterar senhas.' });
    }

    const { email, password, full_name, role, company_id, sst_manager_id }: CreateUserRequest = await req.json();

    // Validar dados
    if (!email || !password || !full_name || !role) {
      throw new Error("Email, senha, nome e papel são obrigatórios");
    }

    if (role === 'company' && !company_id) {
      throw new Error("company_id é obrigatório para usuários do tipo 'company'");
    }

    if (role === 'sst' && !sst_manager_id) {
      throw new Error("sst_manager_id é obrigatório para usuários do tipo 'sst'");
    }

    // Verificar se o usuário já existe
    const normalizedEmail = email.trim().toLowerCase();
    let existingUser: any = null;
    for (let page = 1; page < 50; page++) {
      const { data: existingUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listUsersError) throw listUsersError;

      existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedEmail);
      if (existingUser || !existingUsers?.users?.length || existingUsers.users.length < 1000) break;
    }

    let userId: string;

    if (existingUser) {
      // Usuário já existe, atualizar senha
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: {
            full_name,
          },
        }
      );

      if (updateError) throw updateError;
      if (!updateData.user) throw new Error("Erro ao atualizar usuário");
      
      userId = updateData.user.id;
    } else {
      // Criar novo usuário
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não foi criado");
      
      userId = authData.user.id;
    }

    // Atualizar profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        company_id: role === 'company' ? company_id : null,
        sst_manager_id: role === 'sst' ? sst_manager_id : null,
        must_change_password: true,
      })
      .eq("id", userId);

    if (profileError) throw profileError;

    // Remove all existing roles and insert the correct one
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    const { error: insertRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (insertRoleError) throw insertRoleError;

    await sendWelcomeEmail(supabaseAdmin, {
      email: normalizedEmail,
      password,
      name: full_name,
      accountType: (role === "sst" || role === "company" || role === "admin") ? role : "user",
      context: "create-user-with-password",
    });

    return jsonResponse({
      success: true,
      user_id: userId,
      message: existingUser ? "Senha atualizada com sucesso" : "Usuário criado com sucesso",
    });
  } catch (error: any) {
    console.error("Error creating user:", error?.message, error);
    const rawMessage = error?.message || String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: rawMessage,
        details: error?.code || error?.status || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
