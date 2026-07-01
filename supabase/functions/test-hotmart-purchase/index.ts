import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Unauthorized' });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userRes } = await supabase.auth.getUser(token);
    const userId = userRes?.user?.id;
    if (!userId) return json(401, { error: 'Unauthorized' });

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json(403, { error: 'Forbidden' });

    const body = await req.json().catch(() => ({}));
    const productId: string = body?.product_id || '1343825';
    const recurrencyPeriod: number = body?.recurrency_period ?? 12;
    const price: number = body?.price ?? 979.00;
    const email: string = (body?.email || `teste-anual-${Date.now()}@srsms-test.br`).toLowerCase();
    const name: string = body?.name || 'Teste Anual';
    const cleanup: boolean = body?.cleanup !== false;

    // Resolve token
    const { data: cfg } = await supabase
      .from('webhook_configs').select('token').eq('provider', 'hotmart').maybeSingle();
    const hottok = cfg?.token || Deno.env.get('HOTMART_HOTTOK') || '';
    if (!hottok) return json(500, { error: 'HOTMART_HOTTOK not configured' });

    const txId = `TEST-ANNUAL-${Date.now()}`;

    const payload = {
      event: 'PURCHASE_APPROVED',
      hottok,
      data: {
        buyer: { email, name },
        product: { id: productId, name: 'Sr.SMS Anual' },
        purchase: {
          transaction: txId,
          price: { value: price, currency_value: 'BRL' },
          recurrence_number: recurrencyPeriod,
          offer: {},
          subscription: {
            plan: { id: productId, name: 'Sr.SMS Anual', recurrency_period: recurrencyPeriod },
            subscriber: { code: `SUB-${Date.now()}` },
          },
        },
      },
    };

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')!}/functions/v1/hotmart-webhook`;
    const started = Date.now();
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hotmart-hottok': hottok },
      body: JSON.stringify(payload),
    });
    const respBody = await resp.text();
    const durationMs = Date.now() - started;

    // Verify subscription created
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan_id, billing_cycle, status, amount_cents, current_period_start, current_period_end, subscription_plans(slug, name)')
      .eq('hotmart_transaction_id', txId)
      .maybeSingle();

    const { data: authUser } = await supabase.auth.admin.listUsers();
    const createdUser = authUser?.users?.find((u: any) => u.email?.toLowerCase() === email);

    let cleanupInfo: any = null;
    if (cleanup && createdUser) {
      // Rollback the test artifacts to keep DB tidy
      if (sub?.id) await supabase.from('subscriptions').delete().eq('id', sub.id);
      await supabase.from('sst_managers').delete().eq('email', email);
      await supabase.from('companies').delete().eq('email', email);
      await supabase.from('user_roles').delete().eq('user_id', createdUser.id);
      await supabase.from('profiles').delete().eq('id', createdUser.id);
      await supabase.auth.admin.deleteUser(createdUser.id);
      cleanupInfo = { deleted_user: createdUser.id, deleted_email: email };
    }

    return json(200, {
      ok: resp.ok,
      webhook_status: resp.status,
      duration_ms: durationMs,
      webhook_response: tryJson(respBody),
      subscription_created: !!sub,
      subscription: sub,
      user_created: !!createdUser,
      user_id: createdUser?.id,
      cleanup: cleanupInfo,
      request: { productId, recurrencyPeriod, price, email, txId },
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'Unknown' });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function tryJson(s: string) { try { return JSON.parse(s); } catch { return s; } }
