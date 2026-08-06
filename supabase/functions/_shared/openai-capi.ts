// Envio de eventos server-side para a Conversions API da OpenAI (ChatGPT Ads).
// Nunca lança: falhas apenas são logadas para não afetar o provisionamento.
const PIXEL_ID = '5suuVCixrwGcmkDPzEfVe9';
const ENDPOINT = `https://bzr.openai.com/v1/events?pid=${PIXEL_ID}`;

export interface OpenAIConversionEvent {
  /** ID único do evento (usar id da transação para deduplicação). */
  eventId: string;
  /** Ex.: subscription_created */
  type: string;
  /** Payload do evento, ex.: { type: 'plan_enrollment' } */
  data?: Record<string, unknown>;
  sourceUrl?: string;
  timestampMs?: number;
}

export async function sendOpenAIConversion(
  event: OpenAIConversionEvent,
): Promise<{ ok: boolean; skipped?: string; status?: number }> {
  try {
    const apiKey = Deno.env.get('OPENAI_ADS_CAPI_KEY');
    if (!apiKey) {
      console.warn('[openai-capi] no api key configured, skipping');
      return { ok: false, skipped: 'no_api_key' };
    }

    // A API da OpenAI rejeita campos desconhecidos em `data`.
    // Só enviamos os campos aceitos pelo evento.
    const ALLOWED_DATA_FIELDS = ['type'];
    const data: Record<string, unknown> = {};
    for (const key of ALLOWED_DATA_FIELDS) {
      const value = event.data?.[key];
      if (value !== undefined) data[key] = value;
    }

    const body = {
      validate_only: false,
      events: [
        {
          id: event.eventId,
          type: event.type,
          timestamp_ms: event.timestampMs ?? Date.now(),
          source_url: event.sourceUrl ?? 'https://srsms.com.br',
          action_source: 'web',
          data,
        },
      ],
    };


    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.warn('[openai-capi] rejected', res.status, text.slice(0, 500));
      return { ok: false, skipped: 'rejected', status: res.status };
    }
    console.log('[openai-capi] sent', event.type, event.eventId, text.slice(0, 300));
    return { ok: true, status: res.status };
  } catch (e) {
    console.warn('[openai-capi] exception', e);
    return { ok: false, skipped: 'exception' };
  }
}

/** Busca a atribuição de anúncio salva no site para este e-mail (mais recente). */
export async function getAdAttributionForEmail(
  supabase: any,
  email?: string | null,
): Promise<Record<string, unknown> | null> {
  try {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return null;
    const { data } = await supabase
      .from('ad_attributions')
      .select('params, landing_url, referrer')
      .eq('email', normalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      ...(data.params && typeof data.params === 'object' ? data.params : {}),
      landing_url: data.landing_url ?? undefined,
    };
  } catch {
    return null;
  }
}
