import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
Deno.serve(async () => {
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const uid = "ec860d0e-4ad8-4a37-9b1e-390146398845";
  const newEmail = "canaldeatendimento@sementesorria.com.br";
  const pwd = "Menossi" + Math.floor(1000 + Math.random() * 9000) + "!";
  const { error } = await a.auth.admin.updateUserById(uid, { email: newEmail, email_confirm: true, password: pwd, user_metadata: { must_change_password: true } });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  await a.from("profiles").update({ email: newEmail }).eq("id", uid);
  const html = `<p>Olá,</p><p>O acesso da empresa <strong>Industria e Comércio de Produtos Agrícolas Menossi Ltda</strong> ao Sr.SMS foi atualizado.</p><p><strong>Link:</strong> https://srsms.com.br/auth<br/><strong>E-mail:</strong> ${newEmail}<br/><strong>Senha temporária:</strong> ${pwd}</p><p>No primeiro acesso será solicitada a criação de uma nova senha.</p><p>Equipe Sr.SMS</p>`;
  const res = [];
  for (const to of [newEmail, "simonebatista26@hotmail.com"]) {
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "X-Connection-Api-Key": Deno.env.get("RESEND_API_KEY")! }, body: JSON.stringify({ from: "Sr.SMS <noreply@soia.app.br>", to: [to], subject: "Acesso Sr.SMS - Menossi", html }) });
    res.push({ to, ok: r.ok, s: r.status, b: (await r.text()).slice(0, 200) });
  }
  return new Response(JSON.stringify({ ok: true, res }));
});
