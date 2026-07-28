import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIAL_PLAN_SLUG = 'teste-sms';
const MONTHLY_PLAN_SLUG = 'sr-sms';
const TRIAL_DAYS = 7;
const MONTHLY_DAYS = 30;

type IncomingRow = {
  email: string;
  amountCents: number;
  paidAt: string | null; // ISO
  status: string; // raw hotmart transaction status
  transactionCode?: string | null;
};

type PlanRow = { id: string; slug: string; name: string; price_monthly_cents: number | null };

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

function isRefunded(status: string) {
  const s = norm(status);
  return s.includes('reembols') || s.includes('refund') || s.includes('cancel') || s.includes('chargeback') || s.includes('estorn');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // --- Auth: only admins ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleRow } = await supabase
      .from('user_roles').select('role').eq('user_id', caller.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a administradores' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const mode: 'preview' | 'apply' = body.mode === 'apply' ? 'apply' : 'preview';
    const fileName: string = body.fileName ?? 'planilha.xls';
    const rows: IncomingRow[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma linha válida encontrada na planilha' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Plans ---
    const { data: plansData } = await supabase
      .from('subscription_plans')
      .select('id, slug, name, price_monthly_cents')
      .in('slug', [TRIAL_PLAN_SLUG, MONTHLY_PLAN_SLUG]);
    const plans = (plansData ?? []) as PlanRow[];
    const trialPlan = plans.find((p) => p.slug === TRIAL_PLAN_SLUG);
    const monthlyPlan = plans.find((p) => p.slug === MONTHLY_PLAN_SLUG);
    if (!trialPlan || !monthlyPlan) {
      return new Response(JSON.stringify({ error: 'Planos base (teste-sms / sr-sms) não encontrados' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Reduce rows: latest paid transaction per email ---
    const latest = new Map<string, IncomingRow>();
    for (const r of rows) {
      const email = norm(r.email);
      if (!email || !email.includes('@')) continue;
      const prev = latest.get(email);
      const rTime = r.paidAt ? new Date(r.paidAt).getTime() : 0;
      const pTime = prev?.paidAt ? new Date(prev.paidAt).getTime() : -1;
      if (!prev || rTime >= pTime) latest.set(email, { ...r, email });
    }

    const emails = [...latest.keys()];

    // --- Load accounts (auth users by email) ---
    const userByEmail = new Map<string, { id: string; email: string }>();
    let page = 1;
    while (page <= 40) {
      const { data: list, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      const users = list?.users ?? [];
      for (const u of users) {
        if (u.email) userByEmail.set(norm(u.email), { id: u.id, email: u.email });
      }
      if (users.length < 1000) break;
      page++;
    }

    const userIds = [...userByEmail.values()].map((u) => u.id);

    // --- Load profiles (to reach sst_manager / company) ---
    const { data: profilesData } = await supabase
      .from('profiles').select('id, sst_manager_id, company_id').in('id', userIds.slice(0, 10000));
    const profileById = new Map<string, any>((profilesData ?? []).map((p: any) => [p.id, p]));

    // --- Load current subscriptions ---
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('id, owner_user_id, owner_email, plan_id, status, current_period_end, amount_cents, created_at')
      .order('created_at', { ascending: false });
    const subsByUser = new Map<string, any[]>();
    const subsByEmail = new Map<string, any[]>();
    for (const s of (subsData ?? []) as any[]) {
      if (s.owner_user_id) {
        const arr = subsByUser.get(s.owner_user_id) ?? [];
        arr.push(s); subsByUser.set(s.owner_user_id, arr);
      }
      if (s.owner_email) {
        const key = norm(s.owner_email);
        const arr = subsByEmail.get(key) ?? [];
        arr.push(s); subsByEmail.set(key, arr);
      }
    }

    const { data: allPlans } = await supabase.from('subscription_plans').select('id, slug, name');
    const planNameById = new Map<string, string>((allPlans ?? []).map((p: any) => [p.id, p.name]));

    const now = Date.now();
    const items: any[] = [];

    for (const email of emails) {
      const row = latest.get(email)!;
      const account = userByEmail.get(email);
      const paidAt = row.paidAt ?? null;

      const currentSubs = account
        ? (subsByUser.get(account.id) ?? subsByEmail.get(email) ?? [])
        : (subsByEmail.get(email) ?? []);
      const currentSub = currentSubs.find((s) => ['active', 'trial', 'trialing'].includes(s.status)) ?? currentSubs[0] ?? null;

      const base = {
        email,
        user_id: account?.id ?? null,
        purchase_amount_cents: Math.round((row.amountCents ?? 0)),
        payment_confirmed_at: paidAt,
        previous_plan: currentSub?.plan_id ? (planNameById.get(currentSub.plan_id) ?? null) : null,
        previous_status: currentSub?.status ?? null,
        previous_period_end: currentSub?.current_period_end ?? null,
        new_plan: null as string | null,
        new_status: null as string | null,
        new_period_end: null as string | null,
        action: 'unchanged',
        reason: '',
      };

      if (!account) {
        items.push({ ...base, action: 'no_account', reason: 'E-mail da planilha não possui conta no sistema' });
        continue;
      }

      if (isRefunded(row.status)) {
        items.push({
          ...base, action: 'blocked', new_status: 'canceled', new_plan: base.previous_plan,
          new_period_end: base.previous_period_end,
          reason: `Transação ${row.status} na Hotmart — acesso bloqueado`,
        });
        continue;
      }

      if (!paidAt) {
        items.push({ ...base, action: 'no_account', reason: 'Sem data de confirmação de pagamento na planilha' });
        continue;
      }

      const isTrialPurchase = Math.abs((row.amountCents ?? 0) - 990) <= 50;
      const isMonthlyPurchase = Math.abs((row.amountCents ?? 0) - 9790) <= 200;

      if (isTrialPurchase) {
        const end = addDays(paidAt, TRIAL_DAYS);
        const expired = new Date(end).getTime() < now;
        items.push({
          ...base,
          action: expired ? 'blocked' : 'trial',
          new_plan: trialPlan.name,
          new_plan_id: trialPlan.id,
          new_status: expired ? 'expired' : 'trial',
          new_period_end: end,
          reason: expired
            ? `Teste de 7 dias expirado em ${new Date(end).toLocaleDateString('pt-BR')} — bloquear e pedir assinatura mensal`
            : `Teste de 7 dias válido até ${new Date(end).toLocaleDateString('pt-BR')}`,
        });
        continue;
      }

      if (isMonthlyPurchase) {
        const end = addDays(paidAt, MONTHLY_DAYS);
        const wasActive = currentSub?.status === 'active' && (planNameById.get(currentSub.plan_id) === monthlyPlan.name);
        items.push({
          ...base,
          action: wasActive ? 'renewed' : 'activated',
          new_plan: monthlyPlan.name,
          new_plan_id: monthlyPlan.id,
          new_status: 'active',
          new_period_end: end,
          reason: `Assinatura mensal paga em ${new Date(paidAt).toLocaleDateString('pt-BR')} — vigente até ${new Date(end).toLocaleDateString('pt-BR')}`,
        });
        continue;
      }

      items.push({
        ...base, action: 'divergent',
        reason: `Valor de compra não reconhecido (R$ ${((row.amountCents ?? 0) / 100).toFixed(2)})`,
      });
    }

    // --- Divergent: active accounts in system not present in file ---
    const fileEmails = new Set(emails);
    for (const s of (subsData ?? []) as any[]) {
      if (!['active', 'trial', 'trialing'].includes(s.status)) continue;
      const key = norm(s.owner_email);
      if (!key || fileEmails.has(key)) continue;
      if (items.some((i) => i.email === key)) continue;
      items.push({
        email: key,
        user_id: s.owner_user_id ?? null,
        purchase_amount_cents: null,
        payment_confirmed_at: null,
        previous_plan: planNameById.get(s.plan_id) ?? null,
        previous_status: s.status,
        previous_period_end: s.current_period_end,
        new_plan: null, new_status: null, new_period_end: null,
        action: 'divergent',
        reason: 'Conta ativa no sistema sem transação correspondente na planilha — revisar manualmente',
      });
    }

    const counts = {
      total_rows: rows.length,
      total_emails: emails.length,
      count_activated: items.filter((i) => i.action === 'activated').length,
      count_renewed: items.filter((i) => i.action === 'renewed').length,
      count_trial: items.filter((i) => i.action === 'trial').length,
      count_blocked: items.filter((i) => i.action === 'blocked').length,
      count_no_account: items.filter((i) => i.action === 'no_account').length,
      count_divergent: items.filter((i) => i.action === 'divergent').length,
      count_unchanged: items.filter((i) => i.action === 'unchanged').length,
    };

    if (mode === 'preview') {
      return new Response(JSON.stringify({ mode, counts, items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- APPLY ---
    const applicable = items.filter((i) => ['activated', 'renewed', 'trial', 'blocked'].includes(i.action) && i.user_id);

    for (const item of applicable) {
      const userId = item.user_id as string;
      const profile = profileById.get(userId);
      const isBlocked = item.action === 'blocked';
      const subStatus = item.new_status ?? (isBlocked ? 'expired' : 'active');

      // 1) Cancel other live subscriptions of this owner
      await supabase.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('owner_user_id', userId)
        .in('status', ['active', 'trial', 'trialing']);

      // 2) Insert reconciled subscription
      const planId = item.new_plan_id ?? (item.new_plan === trialPlan.name ? trialPlan.id : monthlyPlan.id);
      const amount = planId === trialPlan.id ? 990 : (monthlyPlan.price_monthly_cents ?? 9790);
      await supabase.from('subscriptions').insert({
        owner_user_id: userId,
        owner_email: item.email,
        plan_id: planId,
        billing_cycle: 'monthly',
        status: subStatus,
        provider: 'hotmart',
        amount_cents: amount,
        current_period_start: item.payment_confirmed_at,
        current_period_end: item.new_period_end,
        next_charge_date: item.new_period_end,
        metadata: { reconciled: true, reconciled_at: new Date().toISOString(), source_file: fileName, action: item.action },
      });

      // 3) Sync gating flags on sst_managers / companies
      const gateStatus = isBlocked
        ? 'inactive'
        : (item.action === 'trial' ? 'trial' : 'active');
      const trialEnds = item.action === 'trial' || isBlocked ? item.new_period_end : null;

      if (profile?.sst_manager_id) {
        await supabase.from('sst_managers')
          .update({ subscription_status: gateStatus, trial_ends_at: trialEnds })
          .eq('id', profile.sst_manager_id);
      }
      if (profile?.company_id) {
        await supabase.from('companies')
          .update({ subscription_status: gateStatus, trial_ends_at: trialEnds })
          .eq('id', profile.company_id);
      }
    }

    // --- Log batch ---
    const { data: batch, error: batchErr } = await supabase
      .from('subscription_reconciliations')
      .insert({
        file_name: fileName,
        executed_by: caller.id,
        executed_by_email: caller.email,
        status: 'applied',
        ...counts,
      })
      .select('id')
      .single();
    if (batchErr) throw batchErr;

    const itemRows = items.map((i) => ({
      reconciliation_id: batch.id,
      email: i.email,
      user_id: i.user_id,
      action: i.action,
      reason: i.reason,
      purchase_amount_cents: i.purchase_amount_cents,
      payment_confirmed_at: i.payment_confirmed_at,
      previous_plan: i.previous_plan,
      new_plan: i.new_plan,
      previous_status: i.previous_status,
      new_status: i.new_status,
      previous_period_end: i.previous_period_end,
      new_period_end: i.new_period_end,
      applied: ['activated', 'renewed', 'trial', 'blocked'].includes(i.action) && !!i.user_id,
    }));

    for (let i = 0; i < itemRows.length; i += 500) {
      await supabase.from('subscription_reconciliation_items').insert(itemRows.slice(i, i + 500));
    }

    return new Response(JSON.stringify({ mode, counts, reconciliation_id: batch.id, applied: applicable.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('reconcile-subscriptions error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
