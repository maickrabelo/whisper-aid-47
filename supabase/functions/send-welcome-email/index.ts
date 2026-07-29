import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWelcomeEmail } from "../_shared/welcome-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const result = await sendWelcomeEmail(supabase, {
      email: body.email,
      password: body.password ?? null,
      name: body.name ?? null,
      accountType: body.account_type ?? "user",
      planName: body.plan_name ?? null,
      trialEndsAt: body.trial_ends_at ?? null,
      existingUser: !!body.existing_user,
      context: body.context ?? "send-welcome-email",
    });

    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
