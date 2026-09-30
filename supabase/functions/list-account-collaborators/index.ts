import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await caller.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claims.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const account_type = url.searchParams.get("account_type");
    const account_id = url.searchParams.get("account_id");

    if (!account_type || !account_id) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autorização
    if (account_type === "sst") {
      const { data: ok } = await admin.rpc("user_in_sst_manager", {
        _user_id: callerId,
        _sst_manager_id: account_id,
      });
      if (!ok) {
        return new Response(JSON.stringify({ error: "Sem permissão." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (account_type === "company") {
      const { data: ok } = await admin.rpc("user_in_company", {
        _user_id: callerId,
        _company_id: account_id,
      });
      if (!ok) {
        return new Response(JSON.stringify({ error: "Sem permissão." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "account_type inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar vínculos
    let links: Array<{ user_id: string; is_default: boolean; created_at: string }> = [];

    if (account_type === "sst") {
      const { data } = await admin
        .from("user_sst_managers")
        .select("user_id, is_default, created_at")
        .eq("sst_manager_id", account_id);
      links = data || [];
    } else {
      const { data } = await admin
        .from("user_companies")
        .select("user_id, is_default, created_at")
        .eq("company_id", account_id);
      links = data || [];
    }

    // Buscar profiles
    const userIds = links.map((l) => l.user_id);
    let profilesMap = new Map<string, { full_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      (profs || []).forEach((p: any) => profilesMap.set(p.id, { full_name: p.full_name }));
    }

    // Buscar emails via auth.admin
    const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map<string, string>();
    (usersList?.users || []).forEach((u) => {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    });

    const ownerId = [...links].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.user_id;
    const collaborators = links.map((l) => ({
      user_id: l.user_id,
      email: emailMap.get(l.user_id) || null,
      full_name: profilesMap.get(l.user_id)?.full_name || null,
      is_default: l.user_id === ownerId,
      is_self: l.user_id === callerId,
      created_at: l.created_at,
    }));

    // Convites pendentes
    const { data: pending } = await admin
      .from("account_invitations")
      .select("id, email, status, created_at, expires_at, invited_by")
      .eq("status", "pending")
      .eq(account_type === "sst" ? "sst_manager_id" : "company_id", account_id)
      .order("created_at", { ascending: false });

    return new Response(
      JSON.stringify({
        collaborators,
        pending_invitations: pending || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("unexpected", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
