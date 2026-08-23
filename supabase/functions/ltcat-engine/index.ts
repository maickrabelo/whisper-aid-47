import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * LTCAT Engine Gateway — beta privado.
 * Único caminho de consulta ao motor jurídico (resolve_legal_rule tem EXECUTE
 * restrito a service_role). Valida JWT + flag LTCAT_BETA e registra a trilha
 * de auditoria em ltcat_engine_consults.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: betaAllowed }, { data: isAdmin }] = await Promise.all([
      userClient.rpc('has_feature_access', { _feature_key: 'LTCAT_BETA', _company_id: null }),
      userClient.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
    ]);

    if (betaAllowed !== true && isAdmin !== true) {
      return new Response(JSON.stringify({ error: 'Acesso restrito ao beta LTCAT' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || body.action !== 'resolve') {
      return new Response(JSON.stringify({ error: 'Ação inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ruleKey = typeof body.rule_key === 'string' ? body.rule_key.trim() : '';
    if (!ruleKey || ruleKey.length > 120 || !/^[A-Z0-9_]+$/.test(ruleKey)) {
      return new Response(JSON.stringify({ error: 'rule_key inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const input = (body.input && typeof body.input === 'object' && !Array.isArray(body.input)) ? body.input : {};

    const service = createClient(supabaseUrl, serviceKey);
    const { data: output, error: engineError } = await service.rpc('resolve_legal_rule', {
      _rule_key: ruleKey,
      _input: input,
    });

    if (engineError) {
      console.error('engine error:', engineError);
      return new Response(JSON.stringify({ error: 'Falha ao consultar o motor jurídico' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trilha de auditoria (opcional, quando vinculado a um documento)
    if (typeof body.ltcat_id === 'string' && body.ltcat_id.length === 36) {
      await service.from('ltcat_engine_consults').insert({
        ltcat_id: body.ltcat_id,
        exposure_id: typeof body.exposure_id === 'string' ? body.exposure_id : null,
        rule_key: ruleKey,
        input,
        output: output ?? {},
        consulted_by: user.id,
      });
    }

    return new Response(JSON.stringify({ output }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ltcat-engine unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
