import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function findUserByEmail(admin: any, email: string) {
  const target = String(email).toLowerCase();
  let page = 1;
  while (page < 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u: any) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 1000) break;
    page++;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: ud } = await userClient.auth.getUser();
    if (!ud?.user) return json({ error: "Sessão inválida" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: ud.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Acesso restrito ao administrador" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "toggle";
    const featureKey = typeof body.feature_key === "string" ? body.feature_key : "LTCAT_BETA";

    if (action === "list") {
      const emails: string[] = Array.isArray(body.emails) ? body.emails : [];
      if (emails.length === 0) return json({ statuses: {} });

      const { data: rows, error } = await admin
        .from("feature_access")
        .select("user_id, enabled, valid_to")
        .eq("feature_key", featureKey)
        .eq("enabled", true);
      if (error) throw error;

      const activeIds = new Set(
        (rows ?? [])
          .filter((r: any) => !r.valid_to || new Date(r.valid_to) > new Date())
          .map((r: any) => r.user_id),
      );

      const wanted = new Set(emails.map((e) => e.toLowerCase()));
      const statuses: Record<string, boolean> = {};
      let page = 1;
      while (page < 50) {
        const { data, error: lerr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (lerr) throw lerr;
        for (const u of data.users) {
          const em = u.email?.toLowerCase();
          if (em && wanted.has(em)) statuses[em] = activeIds.has(u.id);
        }
        if (data.users.length < 1000) break;
        page++;
      }
      return json({ statuses });
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) return json({ error: "E-mail obrigatório" }, 400);
    const enabled = body.enabled !== false;

    const target = await findUserByEmail(admin, email);
    if (!target) return json({ error: "Usuário não encontrado para este e-mail" }, 404);

    const { data: existing, error: selErr } = await admin
      .from("feature_access")
      .select("id")
      .eq("feature_key", featureKey)
      .eq("user_id", target.id);
    if (selErr) throw selErr;

    if (existing && existing.length > 0) {
      const { error: updErr } = await admin
        .from("feature_access")
        .update({
          enabled,
          valid_to: null,
          granted_by: ud.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("feature_key", featureKey)
        .eq("user_id", target.id);
      if (updErr) throw updErr;
    } else if (enabled) {
      const { error: insErr } = await admin.from("feature_access").insert({
        feature_key: featureKey,
        user_id: target.id,
        enabled: true,
        granted_by: ud.user.id,
        note: "Liberado manualmente pelo painel master",
      });
      if (insErr) throw insErr;
    }

    return json({ success: true, enabled, user_id: target.id, email: target.email });
  } catch (e: any) {
    console.error("admin-toggle-feature-access error:", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
