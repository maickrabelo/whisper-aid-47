// Meta Conversions API proxy
// Sends server-side events to Meta to complement the browser Pixel.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PIXEL_ID = '3291187004514210';
const API_VERSION = 'v21.0';

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashIfPresent(v?: string | null): Promise<string | undefined> {
  if (!v) return undefined;
  const trimmed = String(v).trim();
  if (!trimmed) return undefined;
  return await sha256(trimmed);
}

function onlyDigits(v?: string | null) {
  return v ? v.replace(/\D/g, '') : undefined;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const token = Deno.env.get('META_CAPI_ACCESS_TOKEN');
    if (!token) {
      // No token configured — silently skip so the client never sees an error.
      return new Response(JSON.stringify({ ok: false, skipped: 'no_token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const testCode = Deno.env.get('META_CAPI_TEST_EVENT_CODE') || undefined;

    const body = await req.json();
    const {
      event_name,
      event_id,
      event_source_url,
      action_source = 'website',
      custom_data = {},
      user_data: ud = {},
    } = body || {};

    if (!event_name) {
      return new Response(JSON.stringify({ ok: false, skipped: 'no_event_name' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get IP & UA from request
    const fwd = req.headers.get('x-forwarded-for') || '';
    const client_ip_address = ud.client_ip_address || fwd.split(',')[0]?.trim() || undefined;
    const client_user_agent = ud.client_user_agent || req.headers.get('user-agent') || undefined;

    const phoneDigits = onlyDigits(ud.phone);

    const user_data: Record<string, unknown> = {
      em: await hashIfPresent(ud.email),
      ph: await hashIfPresent(phoneDigits),
      fn: await hashIfPresent(ud.first_name),
      ln: await hashIfPresent(ud.last_name),
      external_id: await hashIfPresent(ud.external_id),
      country: await hashIfPresent(ud.country || 'br'),
      ct: await hashIfPresent(ud.city),
      st: await hashIfPresent(ud.state),
      zp: await hashIfPresent(ud.zip),
      client_ip_address,
      client_user_agent,
      fbp: ud.fbp,
      fbc: ud.fbc,
    };
    // strip undefined
    Object.keys(user_data).forEach((k) => user_data[k] === undefined && delete user_data[k]);

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url,
          action_source,
          user_data,
          custom_data,
        },
      ],
    };
    if (testCode) (payload as any).test_event_code = testCode;

    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      // Don't surface Meta errors (bad token, etc.) to the client — just log.
      console.warn('[meta-capi] meta rejected', res.status, json);
      return new Response(JSON.stringify({ ok: false, skipped: 'meta_rejected', status: res.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, meta: json }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.warn('[meta-capi] exception', e);
    return new Response(JSON.stringify({ ok: false, skipped: 'exception' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
