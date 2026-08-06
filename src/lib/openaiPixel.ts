// OpenAI (ChatGPT Ads) pixel helper
// - carrega/dispara eventos no navegador via oaiq()
// - captura parâmetros de atribuição do anúncio e guarda por 30 dias
// - persiste a atribuição por e-mail no backend, para o webhook da Hotmart
//   conseguir vincular a assinatura ao clique no anúncio.
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    oaiq?: (...args: any[]) => void;
  }
}

export const OPENAI_PIXEL_ID = '5suuVCixrwGcmkDPzEfVe9';

const STORAGE_KEY = 'oai_attribution';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

const ATTR_PARAM_PREFIXES = ['oai_', 'utm_'];
const ATTR_PARAM_NAMES = ['oai_click_id', 'oaiclid', 'gclid', 'fbclid', 'src', 'sck'];

export interface AdAttribution {
  params: Record<string, string>;
  landing_url?: string;
  referrer?: string;
  saved_at: number;
}

/** Lê os parâmetros de anúncio da URL atual (sem persistir). */
const readUrlAttribution = (): Record<string, string> => {
  const out: Record<string, string> = {};
  if (typeof window === 'undefined') return out;
  const sp = new URLSearchParams(window.location.search);
  sp.forEach((value, key) => {
    const k = key.toLowerCase();
    const matches =
      ATTR_PARAM_PREFIXES.some((p) => k.startsWith(p)) || ATTR_PARAM_NAMES.includes(k);
    if (matches && value) out[k] = value.slice(0, 300);
  });
  return out;
};

/** Atribuição salva (ou null quando expirada/ausente). */
export const getAdAttribution = (): AdAttribution | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdAttribution;
    if (!parsed?.saved_at || Date.now() - parsed.saved_at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Captura os parâmetros da URL de entrada. Só sobrescreve a atribuição
 * existente quando a nova URL realmente traz parâmetros de anúncio.
 */
export const captureAdAttribution = (): AdAttribution | null => {
  try {
    const params = readUrlAttribution();
    if (Object.keys(params).length === 0) return getAdAttribution();
    const record: AdAttribution = {
      params,
      landing_url: window.location.href.slice(0, 500),
      referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
      saved_at: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
};

const newEventId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Dispara um evento no pixel do navegador. Nunca lança erro. */
export const oaiqTrack = (
  eventName: string,
  data?: Record<string, unknown>,
  eventId?: string,
): string => {
  const id = eventId || newEventId();
  try {
    if (typeof window !== 'undefined' && typeof window.oaiq === 'function') {
      window.oaiq('measure', eventName, { ...(data || {}), event_id: id });
    }
  } catch (e) {
    console.warn('[OpenAIPixel] measure failed', e);
  }
  return id;
};

/**
 * Salva a atribuição vinculada a um e-mail para que a conversão concluída
 * fora do site (Hotmart) possa ser atribuída ao anúncio.
 */
export const linkAdAttributionToEmail = async (email?: string | null) => {
  try {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized || normalized.length > 255) return;
    const attribution = captureAdAttribution();
    if (!attribution) return;
    await supabase.from('ad_attributions').insert({
      email: normalized,
      source: 'openai',
      params: attribution.params,
      landing_url: attribution.landing_url ?? null,
      referrer: attribution.referrer ?? null,
    });
  } catch (e) {
    console.warn('[OpenAIPixel] attribution link failed', e);
  }
};
