import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendOpenAIConversion, getAdAttributionForEmail } from '../_shared/openai-capi.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
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
      context: 'asaas-webhook:credentials',
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
): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_1') ?? Deno.env.get('RESEND_API_KEY');
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    const msg = 'Email keys missing (LOVABLE_API_KEY or RESEND_API_KEY)';
    console.warn(msg);
    await logEmailAttempt(supabase, toEmail, 'skipped', subscriptionId, msg);
    return { ok: false, error: msg };
  }
  const passwordBlock = isExistingUser
    ? `<p>Este e-mail já possui cadastro na SOIA. Use sua senha atual para acessar; se não lembrar, utilize a opção <strong>“Esqueci minha senha”</strong> na tela de login.</p>`
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
        from: 'SOIA <noreply@soia.app.br>',
        to: [toEmail],
        subject: `Bem-vindo à SOIA — Plano ${planName} ativado`,
        html: `
          <h2>Pagamento confirmado!</h2>
          <p>Seu plano <strong>${planName}</strong> está ativo.</p>
          <p><strong>Email:</strong> ${toEmail}</p>
          ${passwordBlock}
          <p><a href="https://soia.app.br/auth">Acessar a plataforma</a></p>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '<no body>');
      const msg = `Resend gateway returned ${response.status}: ${body}`;
      console.error('sendCredentialsEmail failed:', msg);
      await logEmailAttempt(supabase, toEmail, 'failed', subscriptionId, msg, {
        http_status: response.status,
      });
      return { ok: false, error: msg };
    }

    const result = await response.json().catch(() => ({}));
    console.log('sendCredentialsEmail success:', result);
    await logEmailAttempt(supabase, toEmail, 'sent', subscriptionId, null, {
      provider_id: (result as any)?.id ?? null,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('sendCredentialsEmail threw:', msg);
    await logEmailAttempt(supabase, toEmail, 'failed', subscriptionId, msg);
    return { ok: false, error: msg };
  }
}

async function findAuthUserByEmail(supabase: any, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const existingUser = users.find((user: any) => user.email?.toLowerCase() === normalizedEmail);
    if (existingUser) return existingUser;
    if (users.length < perPage) break;

    page += 1;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Validate Asaas access token (REQUIRED — fail closed)
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (!expectedToken) {
      console.error('ASAAS_WEBHOOK_TOKEN is not configured — rejecting webhook');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const receivedToken = req.headers.get('asaas-access-token');
    if (!receivedToken || receivedToken !== expectedToken) {
      console.warn('Invalid or missing asaas-access-token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const event = await req.json();
    console.log('Asaas webhook event:', event?.event, 'payment:', event?.payment?.id);

    const eventType = event?.event;
    const payment = event?.payment;
    if (!eventType || !payment) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const asaasSubscriptionId = payment.subscription;
    const asaasPaymentId = payment.id;

    // Find subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .or(`asaas_subscription_id.eq.${asaasSubscriptionId},asaas_payment_id.eq.${asaasPaymentId}`)
      .maybeSingle();

    if (!sub) {
      console.warn('No subscription found for', asaasSubscriptionId);
      return new Response(JSON.stringify({ ok: true, notFound: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
      // Activate subscription + provision user
      const plan: any = (sub as any).subscription_plans;
      const meta: any = sub.metadata || {};
      const email: string = sub.owner_email;
      const customerName: string = meta.customer?.name || email;

      // Skip if already active
      if (sub.status === 'active') {
        return new Response(JSON.stringify({ ok: true, alreadyActive: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ===== Conversão ChatGPT Ads (server-side) =====
      try {
        const attribution = await getAdAttributionForEmail(supabase, email);
        await sendOpenAIConversion({
          eventId: `asaas-${asaasSubscriptionId || asaasPaymentId || sub.id}`,
          type: 'subscription_created',
          data: {
            type: 'plan_enrollment',
            plan_slug: plan?.slug ?? undefined,
            plan_name: plan?.name ?? undefined,
            currency: 'BRL',
            ...(attribution || {}),
          },
        });
      } catch (e) {
        console.warn('[asaas-webhook] openai conversion failed', e);
      }


      // Generate password (CNPJ digits or random)
      const cpfCnpj = (meta.customer?.cpfCnpj || '').replace(/\D/g, '');
      const password = cpfCnpj.length >= 8 ? cpfCnpj : crypto.randomUUID().slice(0, 12);

      // Find or create user (robust against email_exists race)
      let userId: string | null = null;
      let isNewUser = false;
      const existing = await findAuthUserByEmail(supabase, email);
      if (existing) {
        userId = existing.id;
        console.log('User already exists, reusing:', userId);
      } else {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: customerName },
        });
        if (createErr) {
          // Race / duplicate — try to fetch again
          if ((createErr as any)?.code === 'email_exists' || (createErr as any)?.status === 422) {
            const found = await findAuthUserByEmail(supabase, email);
            if (!found) throw createErr;
            userId = found.id;
            console.log('Recovered existing user after email_exists:', userId);
          } else {
            throw createErr;
          }
        } else {
          userId = created.user!.id;
          isNewUser = true;
        }
      }

      await supabase.from('profiles').upsert({
        id: userId!,
        full_name: customerName,
        ...(isNewUser ? { must_change_password: true } : {}),
      });

      // Assign role based on plan category
      const role = plan.category === 'manager' ? 'sst' : 'company';
      await supabase.from('user_roles').upsert({ user_id: userId!, role }, { onConflict: 'user_id,role' });

      // Create company(s) for company plans, or sst_manager for manager plans
      if (plan.category === 'company') {
        const cnpjs: string[] = (meta.cnpjs && meta.cnpjs.length > 0) ? meta.cnpjs : [cpfCnpj];
        for (const cnpj of cnpjs) {
          const cnpjClean = cnpj.replace(/\D/g, '');
          const slug = `${(meta.companyName || customerName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${cnpjClean.slice(-4)}`.slice(0, 60);
          const { data: company } = await supabase
            .from('companies')
            .insert({
              name: meta.companyName || customerName,
              cnpj: cnpjClean,
              email,
              slug: `${slug}-${Date.now().toString(36)}`,
              subscription_status: 'active',
              employee_count: 0,
              parent_subscription_id: sub.id,
              max_employees: plan.max_employees,
            })
            .select('id')
            .single();

          if (company) {
            await supabase.from('profiles').update({ company_id: company.id }).eq('id', userId!);
          }
        }
      } else if (plan.category === 'manager') {
        const { data: mgr } = await supabase
          .from('sst_managers')
          .insert({
            name: meta.companyName || customerName,
            email,
            max_companies: plan.max_companies || 10,
            subscription_status: 'active',
          })
          .select('id')
          .single();
        if (mgr) {
          await supabase.from('profiles').update({ sst_manager_id: mgr.id }).eq('id', userId!);
        }
      }

      // Activate subscription
      await supabase
        .from('subscriptions')
        .update({
          owner_user_id: userId,
          status: 'active',
          current_period_start: new Date().toISOString(),
        })
        .eq('id', sub.id);

      // Send confirmation email; on failure, persist provisional password as fallback
      const emailResult = await sendCredentialsEmail(
        supabase,
        email,
        password,
        plan.name,
        !isNewUser,
        sub.id,
      );

      if (!emailResult.ok && isNewUser) {
        console.warn('Email failed — storing provisional password fallback in subscription metadata');
        await supabase
          .from('subscriptions')
          .update({
            metadata: {
              ...meta,
              provisional_password: password,
              provisional_password_set_at: new Date().toISOString(),
              email_send_error: emailResult.error ?? 'unknown',
            },
          })
          .eq('id', sub.id);
      }
    } else if (eventType === 'PAYMENT_OVERDUE') {
      await supabase.from('subscriptions').update({ status: 'past_due' }).eq('id', sub.id);
    } else if (eventType === 'SUBSCRIPTION_DELETED' || eventType === 'PAYMENT_DELETED') {
      await supabase.from('subscriptions').update({ status: 'canceled' }).eq('id', sub.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('asaas-webhook error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
