import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PASSWORD = "Teste123!";
const PLAN_ID = "66ee2fda-d975-4e49-8682-248a786b2cf7"; // Sr.SMS

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // One-shot bootstrap function (will be deleted after use)


  const results: Record<string, any> = {};

  async function upsertUser(email: string, fullName: string) {
    const { data: list } = await admin.auth.admin.listUsers();
    let u = list?.users.find((x) => x.email === email);
    if (u) {
      await admin.auth.admin.updateUserById(u.id, { password: PASSWORD, email_confirm: true });
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email, password: PASSWORD, email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw error;
      u = data.user!;
    }
    return u!;
  }

  async function setRole(userId: string, role: string) {
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role });
  }

  try {
    // ===== ADMIN =====
    {
      const email = "teste.admin@srsms.app";
      const u = await upsertUser(email, "Admin Teste");
      await setRole(u.id, "admin");
      results.admin = { email, password: PASSWORD };
    }

    // ===== SST (Gestora SST) =====
    {
      const email = "teste.sst@srsms.app";
      const u = await upsertUser(email, "Gestora SST Teste");
      await setRole(u.id, "sst");
      // sst_manager
      let { data: sm } = await admin.from("sst_managers").select("id").eq("owner_user_id", u.id).maybeSingle();
      if (!sm) {
        const { data: created } = await admin.from("sst_managers").insert({
          owner_user_id: u.id,
          name: "SST Teste Sr.SMS",
          cnpj: "00.000.000/0001-00",
          email,
          phone: "(27) 99844-3852",
          max_companies: 50,
          pgr_module_enabled: true,
        }).select("id").single();
        sm = created;
      }
      await admin.from("profiles").update({ sst_manager_id: sm!.id, full_name: "Gestora SST Teste" }).eq("id", u.id);
      // subscription
      const { data: subExisting } = await admin.from("subscriptions").select("id").eq("owner_user_id", u.id).maybeSingle();
      if (!subExisting) {
        await admin.from("subscriptions").insert({
          owner_user_id: u.id, plan_id: PLAN_ID, status: "active",
          current_period_end: new Date(Date.now() + 365*24*3600*1000).toISOString(),
        });
      }
      results.sst = { email, password: PASSWORD };
    }

    // ===== COMPANY =====
    {
      const email = "teste.empresa@srsms.app";
      const u = await upsertUser(email, "Empresa Teste");
      await setRole(u.id, "company");
      let { data: c } = await admin.from("companies").select("id").eq("email", email).maybeSingle();
      if (!c) {
        const { data: created } = await admin.from("companies").insert({
          name: "Empresa Teste Ltda",
          cnpj: "11.111.111/0001-11",
          email,
          phone: "(27) 99844-3852",
          industry: "Serviços",
          employee_count: 25,
          owner_user_id: u.id,
        }).select("id").single();
        c = created;
      }
      await admin.from("profiles").update({ company_id: c!.id, full_name: "Empresa Teste" }).eq("id", u.id);
      await admin.from("user_companies").upsert({ user_id: u.id, company_id: c!.id, role: "owner" }, { onConflict: "user_id,company_id" });
      // subscription on company
      const { data: subExisting } = await admin.from("subscriptions").select("id").eq("owner_user_id", u.id).maybeSingle();
      if (!subExisting) {
        const { data: s } = await admin.from("subscriptions").insert({
          owner_user_id: u.id, plan_id: PLAN_ID, status: "active",
          current_period_end: new Date(Date.now() + 365*24*3600*1000).toISOString(),
        }).select("id").single();
        await admin.from("companies").update({ parent_subscription_id: s!.id }).eq("id", c!.id);
      }
      results.company = { email, password: PASSWORD };
    }

    // ===== SALES =====
    {
      const email = "teste.sales@srsms.app";
      const u = await upsertUser(email, "Comercial Teste");
      await setRole(u.id, "sales");
      results.sales = { email, password: PASSWORD };
    }

    // ===== PARTNER =====
    {
      const email = "teste.parceiro@srsms.app";
      const u = await upsertUser(email, "Parceiro Teste");
      await setRole(u.id, "partner");
      const { data: p } = await admin.from("licensed_partners").select("id").eq("email", email).maybeSingle();
      if (!p) {
        await admin.from("licensed_partners").insert({
          user_id: u.id,
          razao_social: "Parceiro Teste LTDA",
          nome_fantasia: "Parceiro Teste",
          cnpj: "22.222.222/0001-22",
          endereco_completo: "Rua Teste, 100",
          email,
          phone: "(27) 99844-3852",
          status: "approved",
        });
      }
      results.partner = { email, password: PASSWORD };
    }

    // ===== AFFILIATE =====
    {
      const email = "teste.afiliado@srsms.app";
      const u = await upsertUser(email, "Afiliado Teste");
      await setRole(u.id, "affiliate");
      const { data: a } = await admin.from("affiliates").select("id").eq("email", email).maybeSingle();
      if (!a) {
        await admin.from("affiliates").insert({
          user_id: u.id,
          full_name: "Afiliado Teste",
          email,
          phone: "(27) 99844-3852",
          referral_code: "TESTE" + Math.floor(Math.random()*9999),
          status: "approved",
        });
      }
      results.affiliate = { email, password: PASSWORD };
    }

    // ===== SECTOR VIEWER =====
    {
      const email = "teste.setor@srsms.app";
      const u = await upsertUser(email, "Visualizador Setor");
      await setRole(u.id, "sector_viewer");
      results.sector_viewer = { email, password: PASSWORD };
    }

    return json({ success: true, results });
  } catch (e: any) {
    return json({ success: false, error: e.message, stack: e.stack, results }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
