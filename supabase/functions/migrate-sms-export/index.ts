import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORD = "SrSMS@2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const payload = await req.json();
  const users: any[] = payload.users || [];
  const results: any[] = [];

  for (const u of users) {
    const email = (u.auth_user?.email || u.subscription?.owner_email || "").toLowerCase().trim();
    const uid = u.profile?.id || u.subscription?.owner_user_id;
    if (!email || !uid) {
      results.push({ email, status: "skip_no_id" });
      continue;
    }

    try {
      // 1) auth user — try create with explicit id; if exists, update
      let authUserId = uid;
      const createRes = await supabase.auth.admin.createUser({
        id: uid,
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: u.auth_user?.user_metadata || { full_name: u.profile?.full_name },
      } as any);

      if (createRes.error) {
        // user likely exists — locate
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = list.users.find((x: any) => x.email?.toLowerCase() === email);
        if (found) {
          authUserId = found.id;
          await supabase.auth.admin.updateUserById(found.id, {
            password: DEFAULT_PASSWORD,
            email_confirm: true,
          });
        } else {
          // try without id
          const retry = await supabase.auth.admin.createUser({
            email, password: DEFAULT_PASSWORD, email_confirm: true,
            user_metadata: u.auth_user?.user_metadata || {},
          });
          if (retry.error) throw retry.error;
          authUserId = retry.data.user!.id;
        }
      }

      // 2) profile (the trigger created a 'pending' role + profile; upsert real values)
      await supabase.from("profiles").upsert({
        id: authUserId,
        full_name: u.profile?.full_name,
        sst_manager_id: u.profile?.sst_manager_id,
        company_id: u.profile?.company_id,
        must_change_password: true,
      });

      // 3) roles — replace
      await supabase.from("user_roles").delete().eq("user_id", authUserId);
      const roles = (u.roles || []).filter((r: string) => r && r !== "pending");
      if (roles.length === 0) roles.push("sst");
      for (const role of roles) {
        await supabase.from("user_roles").insert({ user_id: authUserId, role });
      }

      // 4) sst_manager
      if (u.sst_manager) {
        const m = u.sst_manager;
        await supabase.from("sst_managers").upsert({
          id: m.id, name: m.name, cnpj: m.cnpj, email: m.email, phone: m.phone,
          address: m.address, logo_url: m.logo_url, max_companies: m.max_companies ?? 30,
          subscription_status: "trial",
          trial_ends_at: m.trial_ends_at,
          pgr_module_enabled: true,
          extra_company_slots: m.extra_company_slots ?? 0,
          extra_employee_slots: m.extra_employee_slots ?? 0,
          brand_color: m.brand_color,
          onboarding_completed_pages: m.onboarding_completed_pages || [],
        });
      }

      // 5) company (if any)
      if (u.company) {
        const c = u.company;
        await supabase.from("companies").upsert({
          id: c.id, name: c.name, cnpj: c.cnpj, email: c.email, phone: c.phone,
          address: c.address, slug: c.slug, employee_count: c.employee_count ?? 0,
          max_employees: c.max_employees, subscription_status: c.subscription_status || "active",
          trial_ends_at: c.trial_ends_at, trial_plan_slug: c.trial_plan_slug,
          extra_employee_slots: c.extra_employee_slots ?? 0,
        });
        // link manager <-> company
        if (u.sst_manager?.id) {
          await supabase.from("company_sst_assignments").upsert(
            { company_id: c.id, sst_manager_id: u.sst_manager.id },
            { onConflict: "company_id,sst_manager_id" } as any,
          );
        }
      }

      // 6) user_companies
      for (const uc of u.user_companies || []) {
        await supabase.from("user_companies").upsert(
          { user_id: uc.user_id, company_id: uc.company_id, is_default: uc.is_default ?? false },
          { onConflict: "user_id,company_id" } as any,
        );
      }

      // 7) company_feature_access
      if (u.company_feature_access) {
        const f = u.company_feature_access;
        await supabase.from("company_feature_access").upsert({
          company_id: f.company_id,
          ouvidoria_enabled: false, // SMS plan has no ouvidoria
          psicossocial_enabled: f.psicossocial_enabled ?? true,
          burnout_enabled: f.burnout_enabled ?? true,
          clima_enabled: f.clima_enabled ?? true,
          treinamentos_enabled: f.treinamentos_enabled ?? true,
        }, { onConflict: "company_id" } as any);
      }

      // 8) subscription
      const s = u.subscription;
      await supabase.from("subscriptions").upsert({
        id: s.id, owner_user_id: authUserId, owner_email: s.owner_email,
        plan_id: s.plan_id, billing_cycle: s.billing_cycle || "monthly",
        status: s.status || "trial",
        amount_cents: s.amount_cents ?? 0,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        provider: s.provider || "hotmart",
        hotmart_transaction_id: s.hotmart_transaction_id,
        hotmart_subscriber_code: s.hotmart_subscriber_code,
        metadata: s.metadata || {},
      });

      results.push({ email, status: "ok", uid: authUserId });
    } catch (e: any) {
      results.push({ email, status: "error", error: e?.message || String(e) });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const err = results.filter((r) => r.status === "error").length;
  return new Response(JSON.stringify({ ok, err, total: users.length, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
