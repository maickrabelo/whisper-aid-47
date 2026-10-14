import { MAIL_FROM } from "./app-url.ts";

const escape = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function collaboratorInviteHtml(opts: {
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

export async function sendCollaboratorInvite(opts: {
  to: string;
  inviterName: string;
  accountName: string;
  acceptUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY_1");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) return { ok: false, error: "Email keys missing" };

  try {
    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [opts.to],
        subject: `${opts.inviterName} convidou você para ${opts.accountName} no Sr. SMS`,
        html: collaboratorInviteHtml(opts),
      }),
    });
    if (!resp.ok) return { ok: false, error: `${resp.status} ${await resp.text().catch(() => "")}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
