import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL = "est.maxnascimento@gmail.com";
const NAME = "Maxwell Santos do Nascimento";

function genPwd() {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += c[Math.floor(Math.random() * c.length)];
  return p + "!";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    // Find user
    let user: any = null;
    for (let page = 1; page <= 20; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      user = data?.users.find((u: any) => u.email?.toLowerCase() === EMAIL);
      if (user) break;
      if (!data?.users || data.users.length < 200) break;
    }
    if (!user) throw new Error("User not found");

    const password = genPwd();
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    await admin.from("profiles").update({ must_change_password: true, full_name: NAME }).eq("id", user.id);

    // Ensure no leftover trial sub conflicts — already canceled. Active sr-sms remains.

    const loginUrl = "https://srsms.com.br/sms/auth";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f6f8f4">
        <div style="background:#fff;border-radius:12px;padding:32px;border-top:6px solid #1f7a3a">
          <h1 style="color:#1f7a3a;margin:0 0 16px">Bem-vindo ao Sr. SMS, ${NAME}!</h1>
          <p>Seu acesso está liberado. Use as credenciais abaixo para entrar:</p>
          <div style="background:#f0f9f1;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:4px 0"><strong>Link de acesso:</strong> <a href="${loginUrl}" style="color:#1f7a3a">${loginUrl}</a></p>
            <p style="margin:4px 0"><strong>E-mail:</strong> ${EMAIL}</p>
            <p style="margin:4px 0"><strong>Senha provisória:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px">${password}</code></p>
          </div>
          <p style="font-size:13px;color:#666">No primeiro acesso será solicitada a troca da senha.</p>
          <p style="margin-top:24px"><a href="${loginUrl}" style="background:#1f7a3a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Acessar agora</a></p>
        </div>
        <p style="text-align:center;color:#888;font-size:12px;margin-top:16px">Sr. SMS · suporte: sr.smsapp@gmail.com</p>
      </div>`;

    const sent = await resend.emails.send({
      from: "Sr. SMS <no-reply@srsms.com.br>",
      to: [EMAIL],
      subject: "Suas novas credenciais Sr. SMS",
      html,
    });

    return new Response(JSON.stringify({ ok: true, email: EMAIL, password, sent }, null, 2), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
