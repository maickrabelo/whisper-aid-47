// Dispara um evento de teste de conversão para a API da OpenAI (ChatGPT Ads).
import { sendOpenAIConversion } from '../_shared/openai-capi.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let email = 'teste@srsms.com';
  try {
    const body = await req.json();
    if (typeof body?.email === 'string' && body.email.length <= 255) email = body.email;
  } catch {
    // sem body — usa padrão
  }

  const eventId = `test-hotmart-${Date.now()}`;
  const result = await sendOpenAIConversion({
    eventId,
    type: 'subscription_created',
    data: {
      type: 'plan_enrollment',
      plan_slug: 'sr-sms-mensal',
      plan_name: 'Sr.SMS Mensal (TESTE)',
      value: 97.9,
      currency: 'BRL',
      test_email: email,
    },
    sourceUrl: 'https://srsms.com.br/checkout',
  });

  return new Response(JSON.stringify({ eventId, email, result }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
