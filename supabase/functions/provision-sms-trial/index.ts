import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_ID = "af9d601f-fda5-4f77-862d-aff799e4fdf3"; // teste-sms
const TRIAL_DAYS = 7;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function genPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p + "!";
}

async function sendWelcome(toEmail: string, password: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY_1");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) return { ok: false, error: "missing keys" };
  const loginUrl = "https://srsms.com.br/sst-dashboard";
  const r = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "Sr. SMS <noreply@soia.app.br>",
      to: [toEmail],
      subject: "Bem-vindo ao Sr. SMS — Seu teste de 7 dias está ativo",
      html: `
        <h2>Sua conta está pronta!</h2>
        <p>Olá! Seu acesso de teste de <strong>7 dias</strong> ao Sr. SMS foi liberado.</p>
        <p><strong>Email:</strong> ${toEmail}</p>
        <p><strong>Senha provisória:</strong> ${password}</p>
        <p>No primeiro acesso será solicitada a troca da senha.</p>
        <p><a href="${loginUrl}">Acessar a plataforma</a></p>
        <p style="color:#666;font-size:12px;">Se o botão não funcionar, copie e cole no navegador: ${loginUrl}</p>
      `,
    }),
  });
  if (!r.ok) return { ok: false, error: `resend ${r.status}: ${await r.text()}` };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const fullName = String(body.full_name || email);
    const phone = body.phone ? String(body.phone) : null;
    if (!email) throw new Error("email obrigatório");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const password = genPassword();

    // find existing user
    let user: any = null;
    let page = 1;
    while (page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      user = data.users.find((u: any) => u.email?.toLowerCase() === email);
      if (user) break;
      if (data.users.length < 200) break;
      page++;
    }

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: fullName, phone },
      });
      if (error) throw error;
      user = data.user;
    } else {
      await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    }

    await admin.from("profiles").upsert({
      id: user.id, full_name: fullName, phone, must_change_password: true,
    });

    const { data: prof } = await admin.from("profiles").select("sst_manager_id").eq("id", user.id).single();
    let mgrId = prof?.sst_manager_id;
    const now = new Date();
    const end = new Date(now.getTime() + TRIAL_DAYS * 86400 * 1000);

    if (!mgrId) {
      const { data: mgr, error: mgrErr } = await admin.from("sst_managers").insert({
        name: fullName, email,
        max_companies: 20, subscription_status: "trialing",
        pgr_module_enabled: true,
        trial_ends_at: end.toISOString(),
      }).select("id").single();
      if (mgrErr) throw new Error("mgr: " + mgrErr.message);
      mgrId = mgr.id;
      await admin.from("profiles").update({ sst_manager_id: mgrId }).eq("id", user.id);
    } else {
      await admin.from("sst_managers").update({
        subscription_status: "trialing",
        trial_ends_at: end.toISOString(),
        max_companies: 20,
        pgr_module_enabled: true,
      }).eq("id", mgrId);
    }

    await admin.from("user_roles").upsert(
      { user_id: user.id, role: "sst" },
      { onConflict: "user_id,role" },
    );

    // cancel previous active/trial subscriptions
    await admin.from("subscriptions")
      .update({ status: "canceled" })
      .eq("owner_user_id", user.id)
      .in("status", ["active", "trial", "trialing"]);

    await admin.from("subscriptions").insert({
      owner_user_id: user.id, owner_email: email, plan_id: PLAN_ID,
      billing_cycle: "monthly", status: "trialing", amount_cents: 0,
      provider: "manual-trial",
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      metadata: { manual_provision: true, source: "provision-sms-trial" },
    });

    const emailResult = await sendWelcome(email, password);

    return new Response(JSON.stringify({
      ok: true, email, password, user_id: user.id,
      trial_ends_at: end.toISOString(),
      email_sent: emailResult.ok, email_error: emailResult.error,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
