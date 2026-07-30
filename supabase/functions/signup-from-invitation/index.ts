import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { linkInvitedUser, markInvitationAccepted } from "../_shared/link-invitation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const body = await req.json();
    const action = body.action as "info" | "signup";
    const token = (body.token as string) || "";

    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inv, error: invErr } = await admin
      .from("account_invitations")
      .select("id, email, account_type, sst_manager_id, company_id, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Convite não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inv.status !== "pending") {
      return new Response(JSON.stringify({ error: "Convite já utilizado ou revogado." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Convite expirado." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich account name
    let accountName = "";
    if (inv.account_type === "sst" && inv.sst_manager_id) {
      const { data } = await admin.from("sst_managers").select("name").eq("id", inv.sst_manager_id).maybeSingle();
      accountName = (data as any)?.name ?? "";
    } else if (inv.company_id) {
      const { data } = await admin.from("companies").select("name").eq("id", inv.company_id).maybeSingle();
      accountName = (data as any)?.name ?? "";
    }

    if (action === "info") {
      return new Response(
        JSON.stringify({ email: inv.email, account_type: inv.account_type, account_name: accountName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "signup") {
      const fullName = (body.full_name as string)?.trim() || "";
      const password = body.password as string;
      if (!fullName || !password || password.length < 6) {
        return new Response(JSON.stringify({ error: "Nome e senha (mínimo 6 caracteres) são obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists
      let existing: any = null;
      let page = 1;
      while (page < 50) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        existing = data.users.find((u) => u.email?.toLowerCase() === inv.email.toLowerCase());
        if (existing || data.users.length < 1000) break;
        page++;
      }

      if (existing) {
        // User already exists — just update password so they can sign in
        await admin.auth.admin.updateUserById(existing.id, { password });
        await linkInvitedUser(admin, existing.id, inv as any, fullName);
        await markInvitationAccepted(admin, inv.id, existing.id);
        return new Response(JSON.stringify({ success: true, already_existed: true, email: inv.email }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: inv.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (created.user?.id) {
        await linkInvitedUser(admin, created.user.id, inv as any, fullName);
        await markInvitationAccepted(admin, inv.id, created.user.id);
      }

      return new Response(JSON.stringify({ success: true, email: inv.email, user_id: created.user?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
