import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_HEADER = "Sr. SMS <noreply@soia.app.br>";
const SUPPORT_EMAIL = "maickrabelo@gmail.com";

const BodySchema = z.object({
  message: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Valida o usuário autenticado
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.user.email ?? "sem e-mail";
    const userId = userData.user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") ?? Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("Credenciais de e-mail não configuradas");
      return new Response(JSON.stringify({ error: "Serviço de e-mail indisponível" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: [SUPPORT_EMAIL],
        subject: "LTCAT não liberado após upgrade — notificação de suporte",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <h2 style="color: #166534;">Solicitação de liberação do LTCAT</h2>
            <p>O usuário abaixo informou que fez upgrade de plano, mas o módulo LTCAT ainda não foi liberado:</p>
            <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold;">E-mail</td>
                <td style="border: 1px solid #e5e7eb; padding: 8px;">${userEmail}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold;">ID do usuário</td>
                <td style="border: 1px solid #e5e7eb; padding: 8px;">${userId}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 12px;">Verifique o webhook da Hotmart e, se necessário, libere o LTCAT manualmente pelo painel master.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend falhou [${response.status}]: ${errorBody}`);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar e-mail", status: response.status, details: errorBody }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-ltcat-support error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
