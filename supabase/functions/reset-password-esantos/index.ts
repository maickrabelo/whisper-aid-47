import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_EMAIL = "esantos@inventuspower.com";
const NEW_PASSWORD = "Inventus2026Sms";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let target: any = null;
    let page = 1;
    while (page < 50) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      target = data.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL);
      if (target || data.users.length < 1000) break;
      page++;
    }
    if (!target) throw new Error("user not found");

    const { error: updErr } = await admin.auth.admin.updateUserById(target.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });
    if (updErr) throw updErr;

    await admin
      .from("profiles")
      .update({ must_change_password: false, password_reset_reason: null })
      .eq("id", target.id);

    return new Response(JSON.stringify({ success: true, user_id: target.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
