import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWelcomeEmail } from "../_shared/welcome-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-SST-MANUAL] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      sst_name,
      email,
      responsible_name,
      cnpj,
      phone,
      address,
      logo_url,
      max_companies,
      plan_id,
      trial_days,
    } = body ?? {};

    if (!sst_name || !email || !responsible_name) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: sst_name, email, responsible_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const cleanEmail = String(email).trim().toLowerCase();
    const cnpjDigits = (cnpj ?? "").toString().replace(/\D/g, "");
    if (cnpjDigits && cnpjDigits.length < 8) {
      return new Response(
        JSON.stringify({ error: "CNPJ inválido (mínimo 8 dígitos para senha inicial)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email not in use
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const exists = usersList?.users?.some((u: any) => u.email?.toLowerCase() === cleanEmail);
    if (exists) {
      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado no sistema." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Slug
    const baseSlug = String(sst_name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const { data: existingSlug } = await supabaseAdmin
      .from("sst_managers").select("id").eq("slug", baseSlug).maybeSingle();
    const finalSlug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    // Initial password: CNPJ digits or fallback
    const tempPassword = cnpjDigits && cnpjDigits.length >= 8
      ? cnpjDigits
      : `Soia@${Math.random().toString(36).slice(2, 8)}`;

    // 1. Create SST manager
    const { data: sstManager, error: sstErr } = await supabaseAdmin
      .from("sst_managers")
      .insert({
        name: sst_name,
        cnpj: cnpjDigits || null,
        email: cleanEmail,
        phone: phone || null,
        address: address || null,
        logo_url: logo_url || null,
        slug: finalSlug,
        max_companies: Number(max_companies) > 0 ? Number(max_companies) : 50,
        subscription_status: "active",
      })
      .select()
      .single();
    if (sstErr) throw new Error(`Erro ao criar gestora SST: ${sstErr.message}`);
    log("SST created", { id: sstManager.id });

    // 2. Create auth user
    const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: responsible_name },
    });
    if (userErr) {
      await supabaseAdmin.from("sst_managers").delete().eq("id", sstManager.id);
      throw new Error(`Erro ao criar usuário: ${userErr.message}`);
    }
    const userId = newUser.user.id;
    log("User created", { userId });

    // 3. Update profile
    await supabaseAdmin
      .from("profiles")
      .update({
        sst_manager_id: sstManager.id,
        must_change_password: true,
        full_name: responsible_name,
      })
      .eq("id", userId);

    // 4. Role sst
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles").update({ role: "sst" }).eq("user_id", userId);
    if (roleErr) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "sst" });
    }

    await supabaseAdmin
      .from("user_sst_managers")
      .upsert(
        { user_id: userId, sst_manager_id: sstManager.id, is_default: true },
        { onConflict: "user_id,sst_manager_id" }
      );

    // 5. Optional manual plan + trial
    let subscriptionId: string | null = null;
    if (plan_id) {
      const now = new Date();
      const end = new Date(now);
      const days = Math.max(0, Number(trial_days) || 0);
      end.setDate(end.getDate() + (days > 0 ? days : 365));
      const isTrial = days > 0;

      const { data: sub, error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          owner_user_id: userId,
          owner_email: cleanEmail,
          plan_id,
          billing_cycle: "annual",
          status: isTrial ? "trial" : "active",
          provider: "manual",
          amount_cents: 0,
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          next_charge_date: end.toISOString(),
          metadata: {
            assigned_manually: true,
            trial_days: days,
            assigned_at: now.toISOString(),
            created_via: "create-sst-manual-account",
          },
        })
        .select("id")
        .single();
      if (subErr) log("Subscription error (non-fatal)", subErr);
      else subscriptionId = sub?.id ?? null;
    }

    await sendWelcomeEmail(supabaseAdmin, {
      email: cleanEmail,
      password: tempPassword,
      name: responsible_name,
      accountType: "sst",
      context: "create-sst-manual-account",
    });

    return new Response(
      JSON.stringify({
        success: true,
        sst_manager_id: sstManager.id,
        user_id: userId,
        subscription_id: subscriptionId,
        initial_password: tempPassword,
        message: "Gestora SST cadastrada manualmente com sucesso.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
