import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_BASE = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error('Unauthorized');
    const user = userData.user;

    // Fetch all subscriptions for this user (by id or email)
    const { data: subs, error: subErr } = await supabase
      .from('subscriptions')
      .select('id, plan_id, status, billing_cycle, amount_cents, current_period_start, current_period_end, next_charge_date, asaas_customer_id, asaas_subscription_id, invoice_url, created_at, owner_email, subscription_plans(name, slug, tier, category, price_monthly_cents, price_annual_cents)')
      .or(`owner_user_id.eq.${user.id},owner_email.eq.${user.email}`)
      .order('created_at', { ascending: false });

    if (subErr) throw subErr;

    const active = (subs || []).find((s: any) => s.status === 'active') || (subs || [])[0] || null;

    let payments: any[] = [];
    if (active?.asaas_customer_id) {
      const res = await fetch(
        `${ASAAS_BASE}/payments?customer=${active.asaas_customer_id}&limit=50`,
        { headers: { 'access_token': ASAAS_API_KEY } }
      );
      if (res.ok) {
        const json = await res.json();
        payments = (json.data || []).map((p: any) => ({
          id: p.id,
          status: p.status,
          value: p.value,
          netValue: p.netValue,
          billingType: p.billingType,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate,
          clientPaymentDate: p.clientPaymentDate,
          invoiceUrl: p.invoiceUrl,
          bankSlipUrl: p.bankSlipUrl,
          description: p.description,
          subscription: p.subscription,
        }));
      }
    }

    // Compute days until next payment
    const now = new Date();
    const nextDate = active?.next_charge_date ? new Date(active.next_charge_date) : null;
    const daysUntilNext = nextDate ? Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    // Last paid payment
    const lastPaid = payments
      .filter((p) => p.paymentDate || p.clientPaymentDate)
      .sort((a, b) => new Date(b.paymentDate || b.clientPaymentDate).getTime() - new Date(a.paymentDate || a.clientPaymentDate).getTime())[0] || null;

    return new Response(
      JSON.stringify({
        subscription: active,
        allSubscriptions: subs,
        payments,
        lastPaid,
        daysUntilNext,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[asaas-list-payments] error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
