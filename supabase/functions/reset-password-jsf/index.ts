import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USER_ID = "df3ef98b-44d7-43aa-8fca-83cea9a56729";
const EMAIL = "jair.filho@jsfassessoria.com.br";

function genPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p + "9a";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const password = genPassword();

    const { error: updErr } = await admin.auth.admin.updateUserById(USER_ID, {
      password,
      email_confirm: true,
    });
    if (updErr) throw updErr;

    const { error: profErr } = await admin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", USER_ID);
    if (profErr) throw profErr;

    return new Response(
      JSON.stringify({ ok: true, email: EMAIL, password }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
