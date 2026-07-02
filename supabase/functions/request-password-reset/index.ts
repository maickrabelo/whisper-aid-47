import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[RESET-PASSWORD] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    log("Reset requested", { email: normalizedEmail });

    // Determine redirect URL from request origin (fallback to soia.app.br)
    const origin = req.headers.get("origin") || "https://soia.app.br";
    const redirectTo = `${origin}/reset-password`;

    // Generate recovery link via admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    });

    // Always respond with success to prevent email enumeration
    if (linkError || !linkData?.properties?.action_link) {
      log("Link generation failed (silent)", linkError);
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = linkData.properties.action_link;
    const logoUrl = "https://soia.app.br/lovable-uploads/Logo_SOIA.png";

    // Try preferred sender first; fall back to Resend's default onboarding sender
    // if the domain isn't verified (which silently drops the email otherwise).
    const preferredFrom = "SOIA <noreply@soia.app.br>";
    const fallbackFrom = "SOIA <onboarding@resend.dev>";

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${logoUrl}" alt="SOIA" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
            <h1 style="color: #0F5132; margin: 0;">Recuperação de senha</h1>
          </div>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">Olá!</p>
            <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">
              Recebemos uma solicitação para redefinir a senha da sua conta.
            </p>
            <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">
              Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionLink}"
               style="background: #0F5132; color: white; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Redefinir senha
            </a>
          </div>

          <div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #664d03; font-size: 13px; line-height: 1.5; margin: 0;">
              ⚠️ Se você <strong>não solicitou</strong> esta recuperação, ignore este email — sua senha permanecerá a mesma.
            </p>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; line-height: 1.5;">
            Caso o botão não funcione, copie e cole este link no navegador:<br/>
            <span style="color: #0F5132; word-break: break-all;">${actionLink}</span>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 11px; text-align: center; margin: 0;">
            SOIA — Sistema de Saúde, Segurança e Compliance
          </p>
        </div>
      `;

    const trySend = async (from: string) => {
      const result = await resend.emails.send({
        from,
        to: [normalizedEmail],
        subject: "Recuperação de senha - SOIA",
        html: htmlBody,
      });
      return result as { data?: { id?: string } | null; error?: { name?: string; message?: string; statusCode?: number } | null };
    };

    let sendResult = await trySend(preferredFrom);
    if (sendResult.error) {
      log("Resend primary send FAILED", { from: preferredFrom, error: sendResult.error });
      // Retry with fallback sender if domain/from problem
      const errMsg = (sendResult.error.message || "").toLowerCase();
      const shouldFallback =
        errMsg.includes("domain") || errMsg.includes("verify") || errMsg.includes("from") ||
        sendResult.error.statusCode === 403 || sendResult.error.statusCode === 400;
      if (shouldFallback) {
        sendResult = await trySend(fallbackFrom);
        if (sendResult.error) {
          log("Resend fallback send FAILED", { from: fallbackFrom, error: sendResult.error });
        } else {
          log("Reset email sent via fallback sender", { email: normalizedEmail, id: sendResult.data?.id });
        }
      }
    } else {
      log("Reset email sent", { email: normalizedEmail, id: sendResult.data?.id });
    }


    return new Response(
      JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    // Still return success to user to prevent enumeration
    return new Response(
      JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
