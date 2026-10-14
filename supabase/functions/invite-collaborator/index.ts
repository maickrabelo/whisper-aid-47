import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAppUrl, MAIL_FROM } from "../_shared/app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const escape = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function emailTemplate(opts: {
  inviterName: string;
  accountName: string;
  acceptUrl: string;
}): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
  <tr><td style="background:#0b2f5e;padding:32px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:26px;">Sr. SMS</h1>
    <p style="color:#cbd5e1;margin:8px 0 0;font-size:14px;">Plataforma de Gestão SST · NR-01</p>
  </td></tr>
  <tr><td style="padding:32px;color:#0f172a;">
    <h2 style="color:#0b2f5e;margin-top:0;">Você foi convidado(a)!</h2>
    <p style="font-size:16px;line-height:1.6;">
      <strong>${escape(opts.inviterName)}</strong> convidou você para colaborar na conta
      <strong>${escape(opts.accountName)}</strong> no <strong>Sr. SMS</strong>.
    </p>
    <p style="font-size:16px;line-height:1.6;">
      Ao aceitar, você terá acesso ao mesmo painel e às mesmas ferramentas da conta.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${opts.acceptUrl}" style="background:#0b2f5e;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Aceitar convite</a>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.5;">
      Ou copie este link: <br><span style="color:#0b2f5e;word-break:break-all;">${opts.acceptUrl}</span>
    </p>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Este convite expira em 7 dias.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px;text-align:center;color:#64748b;font-size:12px;">
    © ${new Date().getFullYear()} Sr. SMS · srsms.com.br
  </td></tr>
</table></td></tr></table></body></html>`;
}

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

    const callerId = claims.claims.sub as string;
    const callerEmail = (claims.claims.email as string | undefined) ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const account_type = body.account_type as "sst" | "company";
    const account_id = body.account_id as string;
    const resend = !!body.resend;

    if (!email || !email.includes("@") || email.length > 255) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["sst", "company"].includes(account_type) || !account_id) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autorização: caller pertence à conta?
    if (account_type === "sst") {
      const { data: ok } = await admin.rpc("user_in_sst_manager", {
        _user_id: callerId,
        _sst_manager_id: account_id,
      });
      if (!ok) {
        return new Response(JSON.stringify({ error: "Sem permissão." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: ok } = await admin.rpc("user_in_company", {
        _user_id: callerId,
        _company_id: account_id,
      });
      if (!ok) {
        return new Response(JSON.stringify({ error: "Sem permissão." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const accountColumn = account_type === "sst" ? "sst_manager_id" : "company_id";

    // Já existe convite pendente?
    const { data: existing } = await admin
      .from("account_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .eq(accountColumn, account_id)
      .maybeSingle();

    if (existing && !resend) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este e-mail. Use 'Reenviar convite'." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inviteToken = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let inv: any = null;

    if (existing) {
      // Reenvio: renova token e validade do convite existente
      const { data, error } = await admin
        .from("account_invitations")
        .update({ token: inviteToken, expires_at: expiresAt, invited_by: callerId })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) {
        console.error("resend update error", error);
        return new Response(JSON.stringify({ error: "Erro ao reenviar convite." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inv = data;
    } else {
      const insertPayload: any = {
        email,
        account_type,
        invited_by: callerId,
        token: inviteToken,
        expires_at: expiresAt,
      };
      insertPayload[accountColumn] = account_id;

      const { data, error: iErr } = await admin
        .from("account_invitations")
        .insert(insertPayload)
        .select()
        .single();

      if (iErr) {
        console.error("insert error", iErr);
        return new Response(JSON.stringify({ error: "Erro ao criar convite." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inv = data;
    }

    // Buscar nome da conta
    let accountName = "sua equipe";
    if (account_type === "sst") {
      const { data } = await admin.from("sst_managers").select("name").eq("id", account_id).maybeSingle();
      if (data?.name) accountName = data.name;
    } else {
      const { data } = await admin.from("companies").select("name").eq("id", account_id).maybeSingle();
      if (data?.name) accountName = data.name;
    }

    // Buscar nome de quem convidou
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", callerId)
      .maybeSingle();
    const inviterName = inviterProfile?.full_name || callerEmail || "Um colega";

    const acceptUrl = buildAppUrl(`/convite/${inviteToken}`);

    // Enviar e-mail via Resend (gateway Lovable)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY_1");
    let emailSent = false;
    let emailError: string | null = null;

    if (LOVABLE_API_KEY && RESEND_API_KEY) {
      try {
        const html = emailTemplate({ inviterName, accountName, acceptUrl });
        const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: MAIL_FROM,
            to: [email],
            subject: `${inviterName} convidou você para ${accountName} no Sr. SMS`,
            html,
          }),
        });
        if (!resp.ok) {
          emailError = `${resp.status} ${await resp.text().catch(() => "")}`;
          console.error("resend gateway failed", emailError);
        } else {
          emailSent = true;
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
        console.error("email error", e);
      }
    } else {
      emailError = "Email keys missing";
      console.warn("Email keys missing, skipping invite email send");
    }

    try {
      await admin.from("email_send_attempts").insert({
        recipient_email: email,
        status: emailSent ? "sent" : "failed",
        error_message: emailError,
        context: "invite-collaborator",
        metadata: { account_type, account_id, resend },
      });
    } catch (_) { /* logging is best-effort */ }

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: inv.id,
        accept_url: acceptUrl,
        email_sent: emailSent,
        resent: !!existing,
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
