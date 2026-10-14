import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAppUrl, MAIL_FROM } from "../_shared/app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function emailHtml(opts: {
  inviterName: string;
  companyName: string;
  departments: string[];
  assessmentType: string;
  acceptUrl: string;
}) {
  const typeLabel = opts.assessmentType === "hseit" ? "HSE-IT" : "COPSOQ II";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
  <tr><td style="background:#0b2f5e;padding:32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:26px;">Sr. SMS</h1>
    <p style="color:#cbd5e1;margin:8px 0 0;font-size:14px;">Acesso a dados de setor</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <h2 style="color:#0b2f5e;margin-top:0;">Você foi convidado(a)!</h2>
    <p style="color:#374151;font-size:16px;line-height:1.6;">
      <strong>${opts.inviterName}</strong> está te dando acesso para visualizar os
      dados da avaliação <strong>${typeLabel}</strong> da empresa
      <strong>${opts.companyName}</strong> nos seguintes setores:
    </p>
    <ul style="color:#374151;font-size:15px;line-height:1.6;">
      ${opts.departments.map((d) => `<li>${d}</li>`).join("")}
    </ul>
    <p style="color:#6b7280;font-size:14px;">
      Você só verá esses setores — nenhum outro dado da empresa fica disponível.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${opts.acceptUrl}" style="background:#0b2f5e;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Aceitar acesso</a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;">
      Ou copie este link: <br><span style="color:#3b82f6;word-break:break-all;">${opts.acceptUrl}</span>
    </p>
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Este convite expira em 7 dias.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:20px;text-align:center;color:#6b7280;font-size:12px;">
    © ${new Date().getFullYear()} Sr. SMS · srsms.com.br
  </td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: cErr } = await caller.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;
    const callerEmail = (claims.claims.email as string | undefined) ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const company_id = String(body.company_id ?? "");
    const assessment_type = String(body.assessment_type ?? "");
    const department_names = Array.isArray(body.department_names)
      ? body.department_names.filter((s: unknown) => typeof s === "string" && s.length > 0)
      : [];

    if (!email.includes("@") || email.length > 255) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!company_id || !["hseit", "copsoq"].includes(assessment_type) || department_names.length === 0) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se o caller é SST e está vinculado à empresa
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isSst = roles?.some((r: any) => r.role === "sst") ?? false;
    const isAdmin = roles?.some((r: any) => r.role === "admin") ?? false;
    if (!isSst && !isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas gestoras SST podem conceder acesso por setor." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar sst_manager_id do caller via profile
    const { data: callerProfile } = await admin
      .from("profiles").select("sst_manager_id, full_name").eq("id", callerId).maybeSingle();
    const sst_manager_id = callerProfile?.sst_manager_id;
    if (!sst_manager_id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Gestora SST não encontrada para o usuário." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirmar que a empresa está atribuída à gestora SST do caller
    if (!isAdmin) {
      const { data: assignment } = await admin
        .from("company_sst_assignments").select("id")
        .eq("company_id", company_id).eq("sst_manager_id", sst_manager_id).maybeSingle();
      if (!assignment) {
        return new Response(JSON.stringify({ error: "Empresa não pertence à sua gestora SST." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Determinar o sst_manager_id final (para admin, derivar do assignment da empresa)
    let finalSstManagerId = sst_manager_id;
    if (isAdmin && !finalSstManagerId) {
      const { data: assignment } = await admin
        .from("company_sst_assignments").select("sst_manager_id")
        .eq("company_id", company_id).maybeSingle();
      finalSstManagerId = assignment?.sst_manager_id;
      if (!finalSstManagerId) {
        return new Response(JSON.stringify({ error: "Empresa sem gestora SST atribuída." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Cancelar convites pendentes anteriores com mesmo escopo
    await admin.from("sector_viewer_invitations").update({ status: "revoked" })
      .eq("email", email).eq("company_id", company_id)
      .eq("assessment_type", assessment_type).eq("status", "pending");

    const token = generateToken();
    const { data: inv, error: iErr } = await admin
      .from("sector_viewer_invitations")
      .insert({
        token, email,
        sst_manager_id: finalSstManagerId,
        company_id, assessment_type, department_names,
        invited_by: callerId,
      }).select().single();

    if (iErr) {
      console.error("invite insert error", iErr);
      return new Response(JSON.stringify({ error: "Erro ao criar convite." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nome da empresa
    const { data: comp } = await admin.from("companies").select("name").eq("id", company_id).maybeSingle();
    const companyName = comp?.name ?? "sua empresa";
    const inviterName = callerProfile?.full_name || callerEmail || "Sua gestora SST";

    const acceptUrl = buildAppUrl(`/convite-setor/${token}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY_1");
    if (LOVABLE_API_KEY && RESEND_API_KEY) {
      try {
        const html = emailHtml({ inviterName, companyName, departments: department_names, assessmentType: assessment_type, acceptUrl });
        const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: MAIL_FROM,
            to: [email],
            subject: `Acesso à avaliação ${assessment_type.toUpperCase()} — ${companyName}`,
            html,
          }),
        });
        if (!resp.ok) console.error("resend failed", await resp.text());
      } catch (e) {
        console.error("email error", e);
      }
    }

    return new Response(JSON.stringify({ success: true, invitation_id: inv.id, accept_url: acceptUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("unexpected", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
