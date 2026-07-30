import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWelcomeEmail } from "../_shared/welcome-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await caller.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const userEmail = ((claims.claims.email as string | undefined) ?? "").toLowerCase();
    const admin = createClient(supabaseUrl, serviceKey);

    const { invitation_token } = await req.json();
    if (!invitation_token || typeof invitation_token !== "string") {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inv, error: invErr } = await admin
      .from("account_invitations")
      .select("*")
      .eq("token", invitation_token)
      .maybeSingle();

    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Convite não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inv.status !== "pending") {
      return new Response(JSON.stringify({ error: "Convite já utilizado ou revogado." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Convite expirado." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inv.email.toLowerCase() !== userEmail) {
      return new Response(
        JSON.stringify({
          error: `Este convite é para ${inv.email}. Faça login com este e-mail.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const targetRole = inv.account_type === "sst" ? "sst" : "company";

    // Atualizar role
    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const hasTargetRole = existingRoles?.some((r: any) => r.role === targetRole);
    if (!hasTargetRole) {
      // Remove pending se existir
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "pending");
      await admin.from("user_roles").insert({ user_id: userId, role: targetRole });
    }

    // Inserir vínculo
    if (inv.account_type === "sst") {
      await admin
        .from("user_sst_managers")
        .insert({ user_id: userId, sst_manager_id: inv.sst_manager_id, is_default: false })
        .select();

      // Se profile não tem sst_manager_id, define como ativa
      const { data: prof } = await admin
        .from("profiles")
        .select("sst_manager_id")
        .eq("id", userId)
        .maybeSingle();
      if (!prof?.sst_manager_id) {
        await admin.from("profiles").update({ sst_manager_id: inv.sst_manager_id }).eq("id", userId);
      }
    } else {
      await admin
        .from("user_companies")
        .insert({ user_id: userId, company_id: inv.company_id, is_default: false })
        .select();

      const { data: prof } = await admin
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();
      if (!prof?.company_id) {
        await admin.from("profiles").update({ company_id: inv.company_id }).eq("id", userId);
      }
    }

    // Marcar como aceito
    await admin
      .from("account_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq("id", inv.id);

    // E-mail de boas-vindas ao colaborador que acabou de aceitar o convite
    try {
      let accountName: string | null = null;
      if (inv.account_type === "sst" && inv.sst_manager_id) {
        const { data } = await admin.from("sst_managers").select("name").eq("id", inv.sst_manager_id).maybeSingle();
        accountName = (data as any)?.name ?? null;
      } else if (inv.company_id) {
        const { data } = await admin.from("companies").select("name").eq("id", inv.company_id).maybeSingle();
        accountName = (data as any)?.name ?? null;
      }
      const { data: prof } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      await sendWelcomeEmail(admin, {
        email: userEmail,
        name: (prof as any)?.full_name ?? null,
        accountType: inv.account_type === "sst" ? "sst" : "company",
        planName: accountName,
        existingUser: true,
        context: "collaborator-invitation",
      });
    } catch (e) {
      console.error("welcome email (collaborator) failed", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        account_type: inv.account_type,
        sst_manager_id: inv.sst_manager_id,
        company_id: inv.company_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("unexpected", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
