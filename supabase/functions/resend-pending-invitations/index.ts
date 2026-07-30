// Reenvia, com o link correto (srsms.com.br) e branding Sr. SMS, todos os
// convites de colaborador que ficaram pendentes com o domínio legado.
// Apenas administradores podem executar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAppUrl } from "../_shared/app-url.ts";
import { sendCollaboratorInvite } from "../_shared/collaborator-invite-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await caller.auth.getClaims(authHeader.replace("Bearer ", ""));
    const callerId = claims?.claims?.sub as string | undefined;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const onlyEmails: string[] | null = Array.isArray(body?.emails)
      ? body.emails.map((e: string) => String(e).toLowerCase())
      : null;

    let query = admin
      .from("account_invitations")
      .select("id, email, account_type, sst_manager_id, company_id, invited_by")
      .eq("status", "pending");
    if (onlyEmails) query = query.in("email", onlyEmails);

    const { data: invites, error } = await query;
    if (error) throw error;

    const results: Array<{ email: string; ok: boolean; accept_url: string; error?: string }> = [];

    for (const inv of invites ?? []) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await admin
        .from("account_invitations")
        .update({ token, expires_at: expiresAt })
        .eq("id", inv.id);

      let accountName = "sua equipe";
      if (inv.account_type === "sst" && inv.sst_manager_id) {
        const { data } = await admin.from("sst_managers").select("name").eq("id", inv.sst_manager_id).maybeSingle();
        if ((data as any)?.name) accountName = (data as any).name;
      } else if (inv.company_id) {
        const { data } = await admin.from("companies").select("name").eq("id", inv.company_id).maybeSingle();
        if ((data as any)?.name) accountName = (data as any).name;
      }

      let inviterName = "Sua equipe";
      if (inv.invited_by) {
        const { data } = await admin.from("profiles").select("full_name").eq("id", inv.invited_by).maybeSingle();
        if ((data as any)?.full_name) inviterName = (data as any).full_name;
      }

      const acceptUrl = buildAppUrl(`/convite/${token}`);
      const sent = await sendCollaboratorInvite({
        to: inv.email,
        inviterName,
        accountName,
        acceptUrl,
      });

      await admin.from("email_send_attempts").insert({
        recipient_email: inv.email,
        status: sent.ok ? "sent" : "failed",
        error_message: sent.error ?? null,
        context: "resend-pending-invitations",
        metadata: { invitation_id: inv.id },
      }).select();

      results.push({ email: inv.email, ok: sent.ok, accept_url: acceptUrl, error: sent.error });
    }

    return new Response(JSON.stringify({ total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("resend-pending-invitations", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
