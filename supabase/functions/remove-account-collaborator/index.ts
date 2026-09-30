import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: cErr } = await caller.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims) return json({ error: "Token inválido" }, 401);
    const callerId = claims.claims.sub as string;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { account_type, account_id, user_id } = await req.json();
    if (!account_id || !user_id || !["sst", "company"].includes(account_type)) {
      return json({ error: "Parâmetros inválidos" }, 400);
    }
    if (user_id === callerId) return json({ error: "Você não pode remover a si mesmo." }, 400);

    const table = account_type === "sst" ? "user_sst_managers" : "user_companies";
    const col = account_type === "sst" ? "sst_manager_id" : "company_id";
    const rpc = account_type === "sst" ? "user_in_sst_manager" : "user_in_company";
    const rpcArgs = account_type === "sst"
      ? { _user_id: callerId, _sst_manager_id: account_id }
      : { _user_id: callerId, _company_id: account_id };

    const { data: ok } = await admin.rpc(rpc, rpcArgs);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!ok && !isAdmin) return json({ error: "Sem permissão." }, 403);

    // Titular = vínculo mais antigo da conta
    const { data: owner } = await admin
      .from(table).select("user_id").eq(col, account_id)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (owner?.user_id === user_id) return json({ error: "O titular da conta não pode ser removido." }, 400);

    const { error } = await admin.from(table).delete().eq(col, account_id).eq("user_id", user_id);
    if (error) throw error;

    // Se o perfil apontava para esta conta, reaponta para outro vínculo (ou limpa)
    const profileCol = account_type === "sst" ? "sst_manager_id" : "company_id";
    const { data: prof } = await admin.from("profiles").select(profileCol).eq("id", user_id).maybeSingle();
    if (prof && (prof as any)[profileCol] === account_id) {
      const { data: other } = await admin.from(table).select(col).eq("user_id", user_id).limit(1).maybeSingle();
      await admin.from("profiles").update({ [profileCol]: (other as any)?.[col] ?? null }).eq("id", user_id);
    }
    return json({ success: true });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message || "Erro interno" }, 500);
  }
});
