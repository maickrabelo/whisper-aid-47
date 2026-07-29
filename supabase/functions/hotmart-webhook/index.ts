import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hotmart-hottok',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

async function logEmailAttempt(
  supabase: any,
  recipientEmail: string,
  status: 'sent' | 'failed' | 'skipped',
  subscriptionId: string | null,
  errorMessage: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from('email_send_attempts').insert({
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage,
      subscription_id: subscriptionId,
      context: 'hotmart-webhook:credentials',
      metadata,
    });
  } catch (e) {
    console.error('Failed to log email attempt:', e);
  }
}

async function sendCredentialsEmail(
  supabase: any,
  toEmail: string,
  password: string,
  planName: string,
  isExistingUser: boolean,
  subscriptionId: string | null,
  planSlug?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_1') ?? Deno.env.get('RESEND_API_KEY');
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    const msg = 'Email keys missing';
    await logEmailAttempt(supabase, toEmail, 'skipped', subscriptionId, msg);
    return { ok: false, error: msg };
  }

  const isSmsPlan = !!planSlug && planSlug.toLowerCase().includes('sms');
  const loginUrl = isSmsPlan ? 'https://srsms.com.br/sst-dashboard' : 'https://srsms.com.br/sst-dashboard';
  const brandLabel = isSmsPlan ? 'Sr. SMS' : 'SOIA';
  const fromHeader = isSmsPlan
    ? 'Sr. SMS <noreply@soia.app.br>'
    : 'SOIA <noreply@soia.app.br>';

  const passwordBlock = isExistingUser
    ? `<p>Este e-mail já possui cadastro. Use sua senha atual; se não lembrar, utilize <strong>"Esqueci minha senha"</strong> na tela de login.</p>`
    : `<p><strong>Senha provisória:</strong> ${password}</p><p>No primeiro acesso será solicitada a troca da senha.</p>`;

  try {
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [toEmail],
        subject: `Bem-vindo ao ${brandLabel} — Plano ${planName} ativado`,
        html: `
          <h2>Compra confirmada!</h2>
          <p>Seu plano <strong>${planName}</strong> está ativo.</p>
          <p><strong>Email:</strong> ${toEmail}</p>
          ${passwordBlock}
          <p><a href="${loginUrl}">Acessar a plataforma (${brandLabel})</a></p>
          <p style="color:#666;font-size:12px;">Se o botão não funcionar, copie e cole este endereço no navegador: ${loginUrl}</p>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '<no body>');
      const msg = `Resend gateway ${response.status}: ${body}`;
      await logEmailAttempt(supabase, toEmail, 'failed', subscriptionId, msg, { http_status: response.status });
      return { ok: false, error: msg };
    }
    const result = await response.json().catch(() => ({}));
    await logEmailAttempt(supabase, toEmail, 'sent', subscriptionId, null, { provider_id: (result as any)?.id ?? null });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logEmailAttempt(supabase, toEmail, 'failed', subscriptionId, msg);
    return { ok: false, error: msg };
  }
}

async function sendBlockedPurchaseEmail(
  supabase: any,
  toEmail: string,
  planName: string,
  planSlug: string | null | undefined,
  transactionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_1') ?? Deno.env.get('RESEND_API_KEY');
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    await logEmailAttempt(supabase, toEmail, 'skipped', null, 'Email keys missing', { context: 'blocked_purchase' });
    return { ok: false, error: 'Email keys missing' };
  }

  const isSmsPlan = !!planSlug && planSlug.toLowerCase().includes('sms');
  const loginUrl = isSmsPlan ? 'https://srsms.com.br/sst-dashboard' : 'https://srsms.com.br/sst-dashboard';
  const brandLabel = isSmsPlan ? 'Sr. SMS' : 'SOIA';
  const fromHeader = isSmsPlan
    ? 'Sr. SMS <noreply@soia.app.br>'
    : 'SOIA <noreply@soia.app.br>';
  const supportEmail = 'contato@soia.app.br';
  const supportWhats = 'https://wa.me/5511910333355';

  try {
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [toEmail],
        subject: `Sua compra do plano ${planName} precisa de atenção`,
        html: `
          <h2>Recebemos sua compra!</h2>
          <p>Identificamos que o e-mail <strong>${toEmail}</strong> já possui uma conta ativa na plataforma ${brandLabel}.</p>
          <p>Para evitar duplicidade de cadastros e cobranças sobrepostas, <strong>não ativamos automaticamente</strong> o plano <strong>${planName}</strong> nesta conta.</p>
          <h3>O que fazer agora:</h3>
          <ol>
            <li>Entre em contato com o nosso suporte informando o número da transação Hotmart: <strong>${transactionId}</strong>.</li>
            <li>Nossa equipe vai avaliar se você quer migrar o plano atual, adicionar a nova licença na conta existente, ou cancelar a compra.</li>
          </ol>
          <p><strong>Suporte:</strong></p>
          <ul>
            <li>WhatsApp: <a href="${supportWhats}">${supportWhats}</a></li>
            <li>E-mail: <a href="mailto:${supportEmail}">${supportEmail}</a></li>
          </ul>
          <p>Você pode acessar sua conta existente em: <a href="${loginUrl}">${loginUrl}</a></p>
          <p style="color:#666;font-size:12px;">Se não reconhece esta compra, responda este e-mail imediatamente.</p>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '<no body>');
      const msg = `Resend gateway ${response.status}: ${body}`;
      await logEmailAttempt(supabase, toEmail, 'failed', null, msg, { context: 'blocked_purchase', http_status: response.status });
      return { ok: false, error: msg };
    }
    const result = await response.json().catch(() => ({}));
    await logEmailAttempt(supabase, toEmail, 'sent', null, null, { context: 'blocked_purchase', provider_id: (result as any)?.id ?? null });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logEmailAttempt(supabase, toEmail, 'failed', null, msg, { context: 'blocked_purchase' });
    return { ok: false, error: msg };
  }
}

async function findAuthUserByEmail(supabase: any, email: string) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((u: any) => u.email?.toLowerCase() === normalized);
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

function normalizeEmail(email: string | null | undefined) {
  return String(email || '').trim().toLowerCase();
}

function normalizeDigits(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

function getBuyerPhone(buyer: any) {
  return normalizeDigits(buyer?.checkout_phone ?? buyer?.phone ?? buyer?.phone_number);
}

function getBuyerDocument(buyer: any) {
  return normalizeDigits(buyer?.document ?? buyer?.doc ?? buyer?.document_number);
}

function getBuyerAddress(buyer: any) {
  const address = buyer?.address;
  if (!address || typeof address !== 'object') return null;
  const street = [address.address, address.number].filter(Boolean).join(', ');
  const complement = address.complement ? ` - ${address.complement}` : '';
  const neighborhood = address.neighborhood ? ` - ${address.neighborhood}` : '';
  const cityState = [address.city, address.state].filter(Boolean).join('/');
  const zip = address.zipcode ? `, CEP ${address.zipcode}` : '';
  const formatted = `${street}${complement}${neighborhood}${cityState ? `, ${cityState}` : ''}${zip}`.trim();
  return formatted || null;
}

async function findSstManagersByEmail(supabase: any, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const { data, error } = await supabase
    .from('sst_managers')
    .select('*')
    .ilike('email', normalized)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function consolidateSstManagersByEmail(supabase: any, email: string, preferredTargetId?: string | null) {
  const managers = await findSstManagersByEmail(supabase, email);
  if (managers.length === 0) {
    return { target: null, mergedIds: [] as string[] };
  }

  const target = preferredTargetId
    ? (managers.find((m: any) => m.id === preferredTargetId) ?? managers[0])
    : managers[0];
  const sources = managers.filter((m: any) => m.id !== target.id);
  const mergedIds: string[] = [];

  for (const source of sources) {
    const fillPatch: Record<string, unknown> = {};
    for (const field of ['name', 'email', 'cnpj', 'phone', 'address', 'logo_url', 'slug']) {
      if ((target[field] === null || target[field] === undefined || target[field] === '') && source[field]) {
        fillPatch[field] = source[field];
        target[field] = source[field];
      }
    }
    if ((target.max_companies === null || target.max_companies === undefined || target.max_companies === 0) && typeof source.max_companies === 'number') {
      fillPatch.max_companies = source.max_companies;
      target.max_companies = source.max_companies;
    }
    if (typeof source.extra_company_slots === 'number' && typeof target.extra_company_slots === 'number') {
      fillPatch.extra_company_slots = Math.max(target.extra_company_slots, source.extra_company_slots);
      target.extra_company_slots = fillPatch.extra_company_slots;
    }
    if (source.pgr_module_enabled === true && target.pgr_module_enabled !== true) {
      fillPatch.pgr_module_enabled = true;
      target.pgr_module_enabled = true;
    }
    if (fillPatch.cnpj || fillPatch.slug) {
      await supabase.from('sst_managers').update({
        ...(fillPatch.cnpj ? { cnpj: null } : {}),
        ...(fillPatch.slug ? { slug: null } : {}),
      }).eq('id', source.id);
    }
    if (Object.keys(fillPatch).length > 0) {
      await supabase.from('sst_managers').update(fillPatch).eq('id', target.id);
    }

    await supabase.from('profiles').update({ sst_manager_id: target.id }).eq('sst_manager_id', source.id);
    const { data: sourceAssignments } = await supabase
      .from('company_sst_assignments')
      .select('company_id, assigned_at')
      .eq('sst_manager_id', source.id);
    for (const assignment of sourceAssignments ?? []) {
      await supabase
        .from('company_sst_assignments')
        .upsert({ company_id: assignment.company_id, sst_manager_id: target.id, assigned_at: assignment.assigned_at }, { onConflict: 'company_id' });
    }
    await supabase.from('company_sst_assignments').delete().eq('sst_manager_id', source.id);
    await supabase.from('account_invitations').update({ sst_manager_id: target.id }).eq('sst_manager_id', source.id);
    await supabase.from('sst_extra_slot_purchases').update({ sst_manager_id: target.id }).eq('sst_manager_id', source.id);
    await supabase.from('sst_training_modules').update({ sst_manager_id: target.id }).eq('sst_manager_id', source.id);
    await supabase.from('sector_viewer_access').update({ sst_manager_id: target.id }).eq('sst_manager_id', source.id);

    const { data: sourceUsers } = await supabase
      .from('user_sst_managers')
      .select('user_id')
      .eq('sst_manager_id', source.id);
    for (const row of sourceUsers ?? []) {
      await supabase
        .from('user_sst_managers')
        .upsert({ user_id: row.user_id, sst_manager_id: target.id }, { onConflict: 'user_id,sst_manager_id' });
    }
    await supabase.from('user_sst_managers').delete().eq('sst_manager_id', source.id);

    const { error: deleteError } = await supabase.from('sst_managers').delete().eq('id', source.id);
    if (deleteError) {
      console.warn('Could not delete duplicate SST manager after merge', { sourceId: source.id, error: deleteError.message });
    } else {
      mergedIds.push(source.id);
    }
  }

  return { target, mergedIds };
}

/**
 * Reaproveita uma conta existente (auth user, company ou sst_manager) e ativa o plano
 * recém-comprado via Hotmart. Não duplica usuários, preserva todos os dados.
 * Retorna null se NÃO houver conta existente (sinaliza para o caller criar nova).
 */
async function upgradeExistingAccount(supabase: any, ctx: {
  existingAuthUser: any | null;
  existingCompany: { id: string } | null;
  existingManager: { id: string } | null;
  buyerEmail: string;
  buyerName: string;
  plan: any;
  productId?: string;
  product: any;
  buyer: any;
  transactionId?: string;
  subscriberCode?: string;
  subscriptionInfo: any;
  purchase: any;
  eventType: string;
}): Promise<Record<string, unknown> | null> {
  const {
    existingAuthUser, existingCompany, existingManager,
    buyerEmail, buyerName, plan, productId, product,
    buyer, transactionId, subscriberCode, subscriptionInfo, purchase, eventType,
  } = ctx;
  const buyerDocument = getBuyerDocument(buyer);
  const buyerPhone = getBuyerPhone(buyer);
  const buyerAddress = getBuyerAddress(buyer);

  // Localiza user_id
  let userId: string | null = existingAuthUser?.id ?? null;
  if (!userId && (existingCompany || existingManager)) {
    const q = supabase.from('profiles').select('id').limit(1);
    if (existingManager) q.eq('sst_manager_id', existingManager.id);
    else if (existingCompany) q.eq('company_id', existingCompany.id);
    const { data: prof } = await q.maybeSingle();
    userId = prof?.id ?? null;
  }
  if (!userId && !existingAuthUser && !existingCompany && !existingManager) {
    return null; // nada existe -> caller faz criação normal
  }

  // Se ainda não houver auth user (entidade órfã), cria um vinculado
  if (!userId) {
    const tempPwd = crypto.randomUUID().slice(0, 12);
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: buyerEmail, password: tempPwd, email_confirm: true,
      user_metadata: { full_name: buyerName },
    });
    if (error) throw error;
    userId = created.user!.id;
  }

  // 1) Reseta senha
  const newPassword = crypto.randomUUID().slice(0, 12);
  await supabase.auth.admin.updateUserById(userId!, {
    password: newPassword, email_confirm: true,
  });
  await supabase.from('profiles').upsert({
    id: userId!, full_name: buyerName, must_change_password: true,
  });

  if ((plan.category === 'manager' || plan.category === 'sst') && existingManager?.id) {
    await supabase.from('profiles').update({ sst_manager_id: existingManager.id }).eq('id', userId!);
    await supabase.from('user_sst_managers').upsert(
      { user_id: userId!, sst_manager_id: existingManager.id, is_default: true },
      { onConflict: 'user_id,sst_manager_id' },
    );
  }
  if (plan.category === 'company' && existingCompany?.id) {
    await supabase.from('profiles').update({ company_id: existingCompany.id }).eq('id', userId!);
  }

  // 2) Cancela assinaturas anteriores ativas/trial deste usuário
  const { data: prevSubs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('owner_user_id', userId)
    .in('status', ['trial', 'trialing', 'active']);
  const previousIds = (prevSubs ?? []).map((s: any) => s.id);
  if (previousIds.length > 0) {
    await supabase.from('subscriptions')
      .update({ status: 'canceled' })
      .in('id', previousIds);
  }

  // 3) Cria nova assinatura
  const billingCycle = (subscriptionInfo?.plan?.recurrency_period === 12 || purchase?.recurrence_number === 12)
    ? 'annual' : 'monthly';
  // Prefer the plan's configured recurring price so promo/first-charge values
  // (e.g. R$ 9,90) don't overwrite the real monthly/annual amount.
  const planRecurringPrice = billingCycle === 'annual'
    ? (plan.price_annual_cents ?? null)
    : (plan.price_monthly_cents ?? null);
  const purchaseCents = Math.round(
    ((purchase?.price?.value ?? purchase?.full_price?.value ?? 0) as number) * 100,
  );
  const amountCents = (planRecurringPrice && planRecurringPrice > 0)
    ? planRecurringPrice
    : (purchaseCents || (plan.base_price_cents ?? 0));
  const trialDays = (plan as any).trial_days as number | null | undefined;
  const isTrialPlan = typeof trialDays === 'number' && trialDays > 0;
  const nowIso = new Date();
  const periodEnd = isTrialPlan
    ? new Date(Date.now() + trialDays! * 24 * 60 * 60 * 1000)
    : (billingCycle === 'annual'
      ? new Date(new Date().setFullYear(nowIso.getFullYear() + 1))
      : new Date(new Date().setMonth(nowIso.getMonth() + 1)));
  const trialEndsAt = periodEnd.toISOString();

  const { data: newSub, error: subErr } = await supabase
    .from('subscriptions')
    .insert({
      owner_user_id: userId,
      owner_email: buyerEmail,
      plan_id: plan.id,
      billing_cycle: billingCycle,
      status: isTrialPlan ? 'trial' : 'active',
      amount_cents: amountCents,
      provider: 'hotmart',
      hotmart_transaction_id: transactionId,
      hotmart_subscriber_code: subscriberCode ?? null,
      current_period_start: new Date().toISOString(),
      current_period_end: trialEndsAt,
      metadata: {
        upgraded_from_existing_account: true,
        previous_subscription_ids: previousIds,
        buyer: { name: buyerName, email: buyerEmail },
        product: { id: productId, name: product?.name },
        raw_event: eventType,
        trial_days: isTrialPlan ? trialDays : undefined,
      },
    })
    .select('id')
    .single();
  if (subErr) throw subErr;
  const subId = newSub!.id;
  const entityStatus = isTrialPlan ? 'trial' : 'active';

  // 4) Garante role (sem deletar roles existentes)
  const role = plan.category === 'manager' ? 'sst'
    : plan.category === 'company' ? 'company' : 'sst';
  await supabase.from('user_roles').upsert(
    { user_id: userId, role }, { onConflict: 'user_id,role' },
  );

  // 5) Atualiza/cria entidade preservando dados
  const { data: profile } = await supabase
    .from('profiles')
    .select('sst_manager_id, company_id')
    .eq('id', userId)
    .maybeSingle();

  if (plan.category === 'manager' || plan.category === 'sst') {
    if (profile?.sst_manager_id) {
      await supabase.from('sst_managers').update({
        subscription_status: entityStatus,
        trial_ends_at: trialEndsAt,
        max_companies: plan.max_companies || 9999,
        pgr_module_enabled: plan.pgr_enabled === true,
        ...(buyerDocument ? { cnpj: buyerDocument } : {}),
        ...(buyerPhone ? { phone: buyerPhone } : {}),
        ...(buyerAddress ? { address: buyerAddress } : {}),
      }).eq('id', profile.sst_manager_id);
      await supabase.from('user_sst_managers').upsert(
        { user_id: userId!, sst_manager_id: profile.sst_manager_id, is_default: true },
        { onConflict: 'user_id,sst_manager_id' },
      );
    } else {
      const { data: mgr } = await supabase.from('sst_managers').insert({
        name: buyerName, email: buyerEmail,
        cnpj: buyerDocument,
        phone: buyerPhone,
        address: buyerAddress,
        max_companies: plan.max_companies || 9999,
        subscription_status: entityStatus,
        trial_ends_at: trialEndsAt,
        pgr_module_enabled: plan.pgr_enabled === true,
      }).select('id').single();
      if (mgr) {
        await supabase.from('profiles').update({ sst_manager_id: mgr.id }).eq('id', userId);
        await supabase.from('user_sst_managers').upsert(
          { user_id: userId!, sst_manager_id: mgr.id, is_default: true },
          { onConflict: 'user_id,sst_manager_id' },
        );
      }
    }
  } else if (plan.category === 'company') {
    let companyId = profile?.company_id ?? existingCompany?.id ?? null;
    if (companyId) {
      await supabase.from('companies').update({
        subscription_status: entityStatus,
        trial_ends_at: trialEndsAt,
        parent_subscription_id: subId,
        max_employees: plan.max_employees,
        ...(buyerDocument ? { cnpj: buyerDocument } : {}),
        ...(buyerPhone ? { phone: buyerPhone } : {}),
        ...(buyerAddress ? { address: buyerAddress } : {}),
      }).eq('id', companyId);
    } else {
      const slugBase = buyerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      const { data: company } = await supabase.from('companies').insert({
        name: buyerName, email: buyerEmail,
        cnpj: buyerDocument,
        phone: buyerPhone,
        address: buyerAddress,
        slug: `${slugBase}-${Date.now().toString(36)}`,
        subscription_status: entityStatus,
        trial_ends_at: trialEndsAt,
        employee_count: 0,
        parent_subscription_id: subId,
        max_employees: plan.max_employees,
      }).select('id').single();
      companyId = company?.id ?? null;
      if (companyId) {
        await supabase.from('user_companies').upsert(
          { user_id: userId, company_id: companyId },
          { onConflict: 'user_id,company_id' },
        );
        await supabase.from('profiles').update({ company_id: companyId }).eq('id', userId);
      }
    }
    if (companyId) {
      await supabase.from('company_feature_access').upsert({
        company_id: companyId,
        ouvidoria_enabled: plan.ouvidoria_enabled ?? true,
        psicossocial_enabled: true,
        burnout_enabled: true,
        clima_enabled: true,
        treinamentos_enabled: true,
      });
    }
  }

  // 6) Envia e-mail com nova senha provisória
  const emailResult = await sendCredentialsEmail(
    supabase, buyerEmail, newPassword, plan.name,
    false, // estamos enviando senha provisória de verdade
    subId, plan.slug,
  );
  if (!emailResult.ok) {
    await supabase.from('subscriptions').update({
      metadata: {
        upgraded_from_existing_account: true,
        previous_subscription_ids: previousIds,
        provisional_password: newPassword,
        email_send_error: emailResult.error ?? 'unknown',
        buyer: { name: buyerName, email: buyerEmail },
      },
    }).eq('id', subId);
  }

  return {
    ok: true,
    upgraded_existing: true,
    user_id: userId,
    subscription_id: subId,
    canceled_previous_subscriptions: previousIds,
    email_sent: emailResult.ok,
  };
}


const APPROVED_EVENTS = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const CANCEL_EVENTS = new Set([
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_CANCELED',
  'PURCHASE_CANCELLED',
  'SUBSCRIPTION_CANCELLATION',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const sourceIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;
  const reqHeaders: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    if (!/authorization|apikey|cookie/i.test(k)) reqHeaders[k] = v;
  });

  const rawBody = await req.text().catch(() => '');
  let event: any = null;
  try { event = rawBody ? JSON.parse(rawBody) : null; } catch { /* ignore */ }

  const logAndRespond = async (
    statusCode: number,
    response: Record<string, unknown>,
    errorMsg: string | null = null,
  ) => {
    const eventType = event?.event || event?.data?.event || null;
    try {
      await supabase.from('webhook_logs').insert({
        provider: 'hotmart',
        event_type: eventType,
        status_code: statusCode,
        source_ip: sourceIp,
        headers: reqHeaders,
        payload: event ?? { raw: rawBody.slice(0, 4000) },
        response,
        error: errorMsg,
      });
    } catch (e) { console.error('Failed to log webhook:', e); }
    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  try {
    // Token: prefer DB config, fallback to env secret
    const { data: cfg } = await supabase
      .from('webhook_configs')
      .select('token, enabled')
      .eq('provider', 'hotmart')
      .maybeSingle();

    if (cfg && cfg.enabled === false) {
      return await logAndRespond(503, { error: 'Webhook disabled' }, 'disabled');
    }

    const expectedToken = (cfg?.token && cfg.token.trim()) || Deno.env.get('HOTMART_HOTTOK');
    if (!expectedToken) {
      console.error('HOTMART_HOTTOK not configured');
      return await logAndRespond(500, { error: 'Server misconfigured' }, 'missing token config');
    }

    if (!event) {
      return await logAndRespond(400, { error: 'Invalid body' }, 'invalid json');
    }

    // Hotmart sends hottok either as header or in body
    const headerTok = req.headers.get('x-hotmart-hottok');
    const bodyTok = event?.hottok || event?.data?.hottok;
    const receivedToken = headerTok || bodyTok;
    if (receivedToken !== expectedToken) {
      console.warn('Invalid hottok');
      return await logAndRespond(401, { error: 'Unauthorized' }, 'invalid hottok');
    }

    const eventType = event?.event || event?.data?.event;
    const data = event?.data || event;
    const buyer = data?.buyer || {};
    const product = data?.product || {};
    const purchase = data?.purchase || {};
    const subscriptionInfo = purchase?.subscription || data?.subscription || {};

    const buyerEmail: string | undefined = (buyer?.email || '').trim().toLowerCase() || undefined;
    const buyerName: string = buyer?.name || buyerEmail || 'Cliente Hotmart';
    const productId: string | undefined = product?.id ? String(product.id) : (product?.ucode ? String(product.ucode) : undefined);
    const planId: string | undefined = subscriptionInfo?.plan?.id
      ? String(subscriptionInfo.plan.id)
      : (subscriptionInfo?.plan?.name ? String(subscriptionInfo.plan.name) : undefined);
    const transactionId: string | undefined = purchase?.transaction || data?.transaction;
    const subscriberCode: string | undefined = subscriptionInfo?.subscriber?.code || subscriptionInfo?.code;

    console.log('Hotmart event:', eventType, 'product:', productId, 'plan:', planId, 'tx:', transactionId, 'email:', buyerEmail);

    if (eventType === 'PING' || eventType === 'TEST') {
      return await logAndRespond(200, { ok: true, pong: true, event: eventType });
    }

    if (!eventType) {
      return await logAndRespond(200, { ok: true, ignored: 'no event' });
    }

    // ===== APPROVED =====
    if (APPROVED_EVENTS.has(eventType)) {
      if (!buyerEmail || !productId || !transactionId) {
        console.warn('Missing required fields for approval');
        return new Response(JSON.stringify({ ok: true, ignored: 'missing fields' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Idempotency
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('hotmart_transaction_id', transactionId)
        .maybeSingle();
      if (existingSub) {
        return new Response(JSON.stringify({ ok: true, alreadyProvisioned: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Map plan -> subscription plan. Hotmart pode ter múltiplas ofertas (offer.code) sob o
      // mesmo product_id com preços/condições diferentes (ex.: R$ 9,90 trial vs R$ 97,90 mensal).
      // Por isso o mapeamento prioriza (product_id + offer_code), depois product_id sem offer,
      // e por fim o plan_id da assinatura como fallback legado.
      const offerCode: string | undefined = purchase?.offer?.code
        ? String(purchase.offer.code)
        : (subscriptionInfo?.plan?.code ? String(subscriptionInfo.plan.code) : undefined);
      const lookupIds = [planId, productId].filter(Boolean) as string[];
      let mapping: any = null;
      if (lookupIds.length > 0) {
        const { data: m } = await supabase
          .from('hotmart_product_plans')
          .select('plan_id, is_active, hotmart_product_id, hotmart_offer_code, subscription_plans(*)')
          .in('hotmart_product_id', lookupIds)
          .eq('is_active', true);
        if (m && m.length > 0) {
          // 1) exact match (product_id + offer_code)
          if (offerCode) {
            mapping = m.find((row: any) =>
              row.hotmart_product_id === productId && row.hotmart_offer_code === offerCode,
            ) ?? m.find((row: any) =>
              row.hotmart_product_id === planId && row.hotmart_offer_code === offerCode,
            );
          }
          // 2) product_id sem offer_code definido (mapeamento default)
          if (!mapping) {
            mapping = m.find((row: any) => row.hotmart_product_id === productId && !row.hotmart_offer_code)
              ?? m.find((row: any) => row.hotmart_product_id === planId && !row.hotmart_offer_code);
          }
          // 3) fallback: qualquer linha do product/plan id
          if (!mapping) {
            mapping = m.find((row: any) => row.hotmart_product_id === productId)
              ?? m.find((row: any) => row.hotmart_product_id === planId)
              ?? m[0];
          }
        }
        console.log('hotmart mapping resolved:', {
          productId, planId, offerCode, resolvedPlanId: mapping?.plan_id,
        });
      }

      if (!mapping || !mapping.is_active) {
        console.warn(`Hotmart plan ${planId} / product ${productId} not mapped or inactive`);
        return new Response(JSON.stringify({ ok: true, ignored: 'plan not mapped', planId, productId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const plan: any = mapping.subscription_plans;

      // ===== Detecção: e-mail já cadastrado =====
      const existingAuthUser = await findAuthUserByEmail(supabase, buyerEmail);
      const { data: existingCompanies } = await supabase
        .from('companies')
        .select('id')
        .ilike('email', buyerEmail)
        .order('created_at', { ascending: false });
      const existingCompany = existingCompanies?.[0] ?? null;

      const mergeInfo = await consolidateSstManagersByEmail(supabase, buyerEmail);
      const existingManager = mergeInfo.target ? { id: mergeInfo.target.id } : null;

      // ===== UPGRADE IN-PLACE: e-mail já existe em qualquer forma =====
      // Reaproveita usuário existente: reseta senha, cancela assinaturas anteriores,
      // ativa a nova assinatura e atualiza/cria a entidade (sst_manager/company)
      // SEM duplicar usuários ou perder dados.
      const upgradeResult = await upgradeExistingAccount(supabase, {
        existingAuthUser,
        existingCompany,
        existingManager,
        buyerEmail,
        buyerName,
        plan,
        productId,
        product,
          buyer,
        transactionId,
        subscriberCode,
        subscriptionInfo,
        purchase,
        eventType,
      });
      if (upgradeResult) {
        return await logAndRespond(200, {
          ...upgradeResult,
          merged_duplicate_sst_manager_ids: mergeInfo.mergedIds,
        }, 'upgraded_existing_account');
      }




      // Create user (no existing account at this point)
      const password = crypto.randomUUID().slice(0, 12);
      let userId: string | null = null;
      let isNewUser = false;
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: buyerName },
      });
      if (createErr) {
        // Race condition: alguém criou a conta entre o check e o insert.
        // Rebusca o auth user e aplica o fluxo de upgrade in-place.
        if ((createErr as any)?.code === 'email_exists' || (createErr as any)?.status === 422) {
          console.warn('Race: account created between check and insert, upgrading in-place', buyerEmail);
          const raceUser = await findAuthUserByEmail(supabase, buyerEmail);
          const raceResult = await upgradeExistingAccount(supabase, {
            existingAuthUser: raceUser,
            existingCompany: null,
            existingManager: null,
            buyerEmail, buyerName, plan, productId, product,
          buyer,
            transactionId, subscriberCode, subscriptionInfo, purchase, eventType,
          });
          if (raceResult) {
            return await logAndRespond(200, raceResult, 'upgraded_existing_account:race');
          }
          throw createErr;
        }
        throw createErr;
      }

      userId = created.user!.id;
      isNewUser = true;

      await supabase.from('profiles').upsert({
        id: userId!,
        full_name: buyerName,
        ...(isNewUser ? { must_change_password: true } : {}),
      });

      const role = plan.category === 'manager' ? 'sst' : 'company';
      await supabase.from('user_roles').upsert({ user_id: userId!, role }, { onConflict: 'user_id,role' });

      // Create subscription row first so we can link entities
      const billingCycle = (subscriptionInfo?.plan?.recurrency_period === 12 || purchase?.recurrence_number === 12)
        ? 'annual'
        : 'monthly';
      const planRecurringPrice = billingCycle === 'annual'
        ? (plan.price_annual_cents ?? null)
        : (plan.price_monthly_cents ?? null);
      const purchaseCents = Math.round(
        ((purchase?.price?.value ?? purchase?.full_price?.value ?? 0) as number) * 100,
      );
      const amountCents = (planRecurringPrice && planRecurringPrice > 0)
        ? planRecurringPrice
        : (purchaseCents || (plan.base_price_cents ?? 0));

      // Trial-mode plans (e.g. Teste SMS): provisiona como trial com expiração automática
      const trialDays = (plan as any).trial_days as number | null | undefined;
      const isTrialPlan = typeof trialDays === 'number' && trialDays > 0;
      const nowIso2 = new Date();
      const periodEnd2 = isTrialPlan
        ? new Date(Date.now() + trialDays! * 24 * 60 * 60 * 1000)
        : (billingCycle === 'annual'
          ? new Date(new Date().setFullYear(nowIso2.getFullYear() + 1))
          : new Date(new Date().setMonth(nowIso2.getMonth() + 1)));
      const trialEndsAt = periodEnd2.toISOString();

      const { data: newSub, error: subErr } = await supabase
        .from('subscriptions')
        .insert({
          owner_user_id: userId,
          owner_email: buyerEmail,
          plan_id: plan.id,
          billing_cycle: billingCycle,
          status: isTrialPlan ? 'trial' : 'active',
          amount_cents: amountCents,
          provider: 'hotmart',
          hotmart_transaction_id: transactionId,
          hotmart_subscriber_code: subscriberCode ?? null,
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndsAt,
          metadata: {
            buyer: { name: buyerName, email: buyerEmail },
            product: { id: productId, name: product?.name },
            raw_event: eventType,
            trial_days: isTrialPlan ? trialDays : undefined,
          },
        })
        .select('id')
        .single();

      if (subErr) throw subErr;
      const subId = newSub!.id;

      const entityStatus = isTrialPlan ? 'trial' : 'active';

      // Provision company or sst_manager
      if (plan.category === 'company') {
        const slugBase = buyerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
        const { data: company } = await supabase
          .from('companies')
          .insert({
            name: buyerName,
            email: buyerEmail,
            cnpj: getBuyerDocument(buyer),
            phone: getBuyerPhone(buyer),
            address: getBuyerAddress(buyer),
            slug: `${slugBase}-${Date.now().toString(36)}`,
            subscription_status: entityStatus,
            trial_ends_at: trialEndsAt,
            employee_count: 0,
            parent_subscription_id: subId,
            max_employees: plan.max_employees,
          })
          .select('id')
          .single();
        if (company) {
          await supabase.from('user_companies').upsert(
            { user_id: userId!, company_id: company.id },
            { onConflict: 'user_id,company_id' },
          );
          await supabase.from('profiles').update({ company_id: company.id }).eq('id', userId!);

          // Aplicar feature flags do plano (SMS plans: ouvidoria_enabled=false, sem IA)
          await supabase.from('company_feature_access').upsert({
            company_id: company.id,
            ouvidoria_enabled: plan.ouvidoria_enabled ?? true,
            psicossocial_enabled: true,
            burnout_enabled: true,
            clima_enabled: true,
            treinamentos_enabled: true,
          });
        }
      } else if (plan.category === 'manager') {
        const { data: mgr } = await supabase
          .from('sst_managers')
          .insert({
            name: buyerName,
            email: buyerEmail,
            cnpj: getBuyerDocument(buyer),
            phone: getBuyerPhone(buyer),
            address: getBuyerAddress(buyer),
            max_companies: plan.max_companies || 10,
            subscription_status: entityStatus,
            trial_ends_at: trialEndsAt,
            pgr_module_enabled: plan.pgr_enabled === true,
          })
          .select('id')
          .single();
        if (mgr) {
          await supabase.from('profiles').update({ sst_manager_id: mgr.id }).eq('id', userId!);
          await supabase.from('user_sst_managers').upsert(
            { user_id: userId!, sst_manager_id: mgr.id, is_default: true },
            { onConflict: 'user_id,sst_manager_id' },
          );
        }
      }


      const emailResult = await sendCredentialsEmail(
        supabase,
        buyerEmail,
        password,
        plan.name,
        !isNewUser,
        subId,
        plan.slug,
      );

      if (!emailResult.ok && isNewUser) {
        await supabase
          .from('subscriptions')
          .update({
            metadata: {
              provisional_password: password,
              email_send_error: emailResult.error ?? 'unknown',
              buyer: { name: buyerName, email: buyerEmail },
            },
          })
          .eq('id', subId);
      }

      return new Response(JSON.stringify({ ok: true, provisioned: true, userId, subscriptionId: subId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== CANCEL =====
    if (CANCEL_EVENTS.has(eventType)) {
      let target: any = null;
      if (transactionId) {
        const r = await supabase
          .from('subscriptions')
          .select('id, owner_user_id, plan_id, subscription_plans(category)')
          .eq('hotmart_transaction_id', transactionId)
          .maybeSingle();
        target = r.data;
      }
      if (!target && subscriberCode) {
        const r = await supabase
          .from('subscriptions')
          .select('id, owner_user_id, plan_id, subscription_plans(category)')
          .eq('hotmart_subscriber_code', subscriberCode)
          .maybeSingle();
        target = r.data;
      }

      if (!target) {
        console.warn('Cancel event but no matching subscription');
        return new Response(JSON.stringify({ ok: true, notFound: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('subscriptions').update({ status: 'canceled' }).eq('id', target.id);

      const category = (target as any).subscription_plans?.category;
      if (category === 'company') {
        await supabase
          .from('companies')
          .update({ subscription_status: 'inactive' })
          .eq('parent_subscription_id', target.id);
      } else if (category === 'manager' && target.owner_user_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('sst_manager_id')
          .eq('id', target.owner_user_id)
          .maybeSingle();
        if (prof?.sst_manager_id) {
          await supabase
            .from('sst_managers')
            .update({ subscription_status: 'inactive' })
            .eq('id', prof.sst_manager_id);
        }
      }

      return new Response(JSON.stringify({ ok: true, suspended: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return await logAndRespond(200, { ok: true, ignored: eventType });
  } catch (e) {
    console.error('hotmart-webhook error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown';
    return await logAndRespond(500, { error: msg }, msg);
  }
});
