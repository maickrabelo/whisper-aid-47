// Sr.SMS: todos os recursos de IA estão desativados nesta aplicação.
// Esta resposta padrão é retornada por qualquer edge function que antes
// chamava a Lovable AI Gateway, evitando consumo de créditos.
export const AI_DISABLED_RESPONSE = {
  error: 'ai_disabled',
  message: 'Recursos de inteligência artificial não estão disponíveis no Sr.SMS.',
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function aiDisabledHandler(req: Request): Response {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return new Response(JSON.stringify(AI_DISABLED_RESPONSE), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
