// Shared welcome / credentials email used by EVERY account creation flow.
// Any new account (manual, trial, Hotmart, SST-created company, admin-created user)
// must call sendWelcomeEmail so the user always receives access instructions.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const APP_URL = "https://srsms.com.br";
const FROM_HEADER = "Sr. SMS <noreply@soia.app.br>";

export type WelcomeAccountType = "sst" | "company" | "admin" | "user";

export interface WelcomeEmailParams {
  email: string;
  password?: string | null;
  name?: string | null;
  accountType?: WelcomeAccountType;
  planName?: string | null;
  trialEndsAt?: string | Date | null;
  existingUser?: boolean;
  context?: string;
}

const escape = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function logAttempt(
  supabase: any,
  recipient: string,
  status: "sent" | "failed" | "skipped",
  errorMessage: string | null,
  context: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from("email_send_attempts").insert({
      recipient_email: recipient,
      status,
      error_message: errorMessage,
      context: `welcome:${context}`,
      metadata,
    });
  } catch (e) {
    console.error("[welcome-email] log failed", e);
  }
}

function buildHtml(p: WelcomeEmailParams) {
  const loginUrl = `${APP_URL}/auth`;
  const name = escape(p.name || "");
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  const credentialsBlock = p.existingUser
    ? `<p style="margin:0 0 8px;">Este e-mail já possui cadastro na plataforma. Use sua senha atual — se não lembrar, clique em <strong>"Esqueci minha senha"</strong> na tela de login.</p>`
    : `<p style="margin:0 0 6px;"><strong>E-mail:</strong> ${escape(p.email)}</p>
       ${p.password ? `<p style="margin:0 0 6px;"><strong>Senha provisória:</strong> ${escape(p.password)}</p>` : ""}
       <p style="margin:0;color:#b45309;font-size:13px;">No primeiro acesso será solicitada a troca da senha.</p>`;

  let trialLine = "";
  if (p.trialEndsAt) {
    const d = new Date(p.trialEndsAt);
    if (!isNaN(d.getTime())) {
      trialLine = `<p style="margin:16px 0 0;color:#0f172a;"><strong>Seu período de teste vai até ${d.toLocaleDateString("pt-BR")}.</strong></p>`;
    }
  }

  const planLine = p.planName
    ? `<p style="margin:16px 0 0;color:#0f172a;"><strong>Plano:</strong> ${escape(p.planName)}</p>`
    : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a;">
    <h1 style="font-size:22px;margin:0 0 4px;color:#0b2f5e;">Bem-vindo ao Sr. SMS</h1>
    <p style="margin:0 0 20px;color:#475569;">Sua conta já está criada e pronta para uso.</p>
    <p style="margin:0 0 16px;">${greeting}</p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h2 style="font-size:16px;margin:0 0 10px;color:#0b2f5e;">Seus dados de acesso</h2>
      ${credentialsBlock}
    </div>
    ${planLine}
    ${trialLine}
    <div style="text-align:center;margin:28px 0;">
      <a href="${loginUrl}" style="background:#0b2f5e;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Acessar a plataforma</a>
    </div>
    <p style="color:#64748b;font-size:12px;margin:0;">Se o botão não funcionar, copie e cole este endereço no navegador: ${loginUrl}</p>
    <p style="color:#64748b;font-size:12px;margin:12px 0 0;">Precisa de ajuda? Responda este e-mail ou fale conosco no WhatsApp.</p>
  </div>`;
}

export async function sendWelcomeEmail(
  supabase: any,
  params: WelcomeEmailParams,
): Promise<{ ok: boolean; error?: string }> {
  const recipient = String(params.email ?? "").trim().toLowerCase();
  const context = params.context || "generic";
  if (!recipient) return { ok: false, error: "missing recipient" };

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY_1");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    const msg = "Email keys missing";
    await logAttempt(supabase, recipient, "skipped", msg, context);
    return { ok: false, error: msg };
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: [recipient],
        subject: "Bem-vindo ao Sr. SMS — seus dados de acesso",
        html: buildHtml({ ...params, email: recipient }),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "<no body>");
      const msg = `Resend gateway ${response.status}: ${body}`;
      await logAttempt(supabase, recipient, "failed", msg, context, { http_status: response.status });
      return { ok: false, error: msg };
    }

    const result = await response.json().catch(() => ({}));
    await logAttempt(supabase, recipient, "sent", null, context, {
      provider_id: (result as any)?.id ?? null,
      account_type: params.accountType ?? null,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logAttempt(supabase, recipient, "failed", msg, context);
    return { ok: false, error: msg };
  }
}
