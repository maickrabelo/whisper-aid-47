import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const log = (step: string, details?: any) => {
  console.log(`[RESET-PASSWORD] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") ?? Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      log("Missing email keys", { hasLovable: !!LOVABLE_API_KEY, hasResend: !!RESEND_API_KEY });
      // Still return success to prevent enumeration
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    log("Reset requested", { email: normalizedEmail });

    const redirectTo = "https://srsms.com.br/reset-password";

    // Generate recovery link via admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    });

    // Silent on missing user to prevent enumeration
    if (linkError || !linkData?.properties?.action_link) {
      log("Link generation failed (silent)", linkError);
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = linkData.properties.action_link;
    const brandLabel = "Sr. SMS";
    const fromHeader = "Sr. SMS <noreply@soia.app.br>";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <h2 style="color: #0F5132; margin: 0 0 16px;">Recuperação de senha — ${brandLabel}</h2>
        <p style="color:#333;font-size:15px;line-height:1.6;">Olá!</p>
        <p style="color:#333;font-size:15px;line-height:1.6;">
          Recebemos uma solicitação para redefinir a senha da sua conta.
          Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.
        </p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${actionLink}"
             style="background:#0F5132;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
            Redefinir senha
          </a>
        </p>
        <p style="color:#664d03;background:#fff3cd;border-radius:6px;padding:12px;font-size:13px;">
          ⚠️ Se você não solicitou esta recuperação, ignore este email — sua senha permanecerá a mesma.
        </p>
        <p style="color:#999;font-size:12px;line-height:1.5;margin-top:24px;">
          Caso o botão não funcione, copie e cole este link no navegador:<br/>
          <span style="color:#0F5132;word-break:break-all;">${actionLink}</span>
        </p>
      </div>
    `;

    // Send via Lovable Resend connector gateway (same as hotmart-webhook / primeiro acesso)
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [normalizedEmail],
        subject: `Recuperação de senha — ${brandLabel}`,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "<no body>");
      log("Gateway send FAILED", { status: response.status, body });
    } else {
      const result = await response.json().catch(() => ({}));
      log("Reset email sent", { email: normalizedEmail, id: (result as any)?.id ?? null });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(
      JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
