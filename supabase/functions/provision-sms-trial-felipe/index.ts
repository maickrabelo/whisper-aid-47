import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL = "felipecsanche@hotmail.com";
const FULL_NAME = "Felipe Sanches";
const PLAN_ID = "af9d601f-fda5-4f77-862d-aff799e4fdf3"; // teste-sms
const TRIAL_DAYS = 7;

function genPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p + "!";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const password = genPassword();

    // find existing
    let user: any = null;
    let page = 1;
    while (page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      user = data.users.find((u: any) => u.email?.toLowerCase() === EMAIL);
      if (user) break;
      if (data.users.length < 200) break;
      page++;
    }

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: EMAIL, password, email_confirm: true,
        user_metadata: { full_name: FULL_NAME },
      });
      if (error) throw error;
      user = data.user;
    } else {
      await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    }

    await admin.from("profiles").upsert({
      id: user.id, full_name: FULL_NAME, must_change_password: true,
    });

    // sst manager
    let { data: prof } = await admin.from("profiles").select("sst_manager_id").eq("id", user.id).single();
    let mgrId = prof?.sst_manager_id;
    if (!mgrId) {
      const { data: mgr, error: mgrErr } = await admin.from("sst_managers").insert({
        name: FULL_NAME, email: EMAIL,
        max_companies: 30, subscription_status: "trialing",
        pgr_module_enabled: true,
      }).select("id").single();
      if (mgrErr) throw new Error("mgr: " + mgrErr.message);
      mgrId = mgr.id;
      await admin.from("profiles").update({ sst_manager_id: mgrId }).eq("id", user.id);
    }

    // role
    await admin.from("user_roles").delete().eq("user_id", user.id);
    await admin.from("user_roles").insert({ user_id: user.id, role: "sst" });

    // subscription trial
    const now = new Date();
    const end = new Date(now.getTime() + TRIAL_DAYS * 86400 * 1000);
    const { data: existSub } = await admin.from("subscriptions").select("id")
      .eq("owner_user_id", user.id).maybeSingle();
    if (existSub) {
      await admin.from("subscriptions").update({
        plan_id: PLAN_ID, status: "trialing", billing_cycle: "monthly",
        amount_cents: 0, provider: "manual-trial",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        trial_ends_at: end.toISOString(),
      }).eq("id", existSub.id);
    } else {
      await admin.from("subscriptions").insert({
        owner_user_id: user.id, owner_email: EMAIL, plan_id: PLAN_ID,
        billing_cycle: "monthly", status: "trialing", amount_cents: 0,
        provider: "manual-trial",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        trial_ends_at: end.toISOString(),
        metadata: { manual_provision: true, source: "felipe-trial" },
      });
    }

    return new Response(JSON.stringify({
      ok: true, email: EMAIL, password, user_id: user.id, trial_ends_at: end.toISOString(),
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
