import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const users = [
  { id: "025c31b5-b049-489d-bcf5-9f4ad3f0caf5", email: "krystalsaudecorporativa@gmail.com", name: "Jôliane" },
  { id: "267c9e58-a092-48b3-a78f-9eeb79fbb834", email: "niedjakrystal@gmail.com", name: "Niedja" },
];

const gen = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const a = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(a, (b) => c[b % c.length]).join("") + "!7";
};

Deno.serve(async () => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const lk = Deno.env.get("LOVABLE_API_KEY")!; const rk = Deno.env.get("RESEND_API_KEY_1")!;
  const out: any[] = [];
  for (const u of users) {
    const pw = gen();
    const { error } = await admin.auth.admin.updateUserById(u.id, { password: pw, email_confirm: true });
    if (error) { out.push({ email: u.email, error: error.message }); continue; }
    await admin.from("profiles").update({ must_change_password: true }).eq("id", u.id);
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h2 style="color:#16a34a">Seu acesso ao Sr. SMS foi restabelecido</h2>
      <p>Olá, ${u.name}!</p><p>Corrigimos o problema que impedia o seu acesso. Use os dados abaixo:</p>
      <p><strong>E-mail:</strong> ${u.email}<br/><strong>Senha temporária:</strong> <code style="background:#f3f4f6;padding:4px 8px">${pw}</code></p>
      <p>No primeiro acesso o sistema vai pedir para você criar uma nova senha.</p>
      <p><a href="https://srsms.com.br/auth" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Acessar a plataforma</a></p>
      <p>Dúvidas? WhatsApp: <a href="https://wa.me/5527998443852">https://wa.me/5527998443852</a></p></div>`;
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": rk, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Sr.SMS <no-reply@srsmsapp.com.br>", to: [u.email], subject: "Seu acesso ao Sr. SMS foi restabelecido", html }),
    });
    out.push({ email: u.email, sent: r.ok, detail: r.ok ? undefined : await r.text() });
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
