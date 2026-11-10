import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { MAIL_FROM, buildAppUrl } from "../_shared/app-url.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { program_id } = await req.json().catch(() => ({}));
    if (typeof program_id !== "string" || !/^[0-9a-f-]{36}$/i.test(program_id)) return json({ error: "program_id inválido" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: program } = await admin.from("pcmso_programs").select("id, title, status, company_id").eq("id", program_id).maybeSingle();
    if (!program) return json({ error: "Programa não encontrado" }, 404);
    const { data: allowed } = await userClient.rpc("pcmso_can", { _company_id: program.company_id, _permission: "program.prepare" });
    if (!allowed) return json({ error: "Sem permissão" }, 403);
    if (program.status !== "em_revisao") return json({ error: "Programa não está em revisão" }, 409);

    const { data: company } = await admin.from("companies").select("name").eq("id", program.company_id).maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const { data: docs } = await admin.from("pcmso_professional_assignments")
      .select("user_id, professional_name, valid_from, valid_to")
      .eq("company_id", program.company_id).eq("clinical_role", "responsavel").is("revoked_at", null);
    const active = (docs ?? []).filter((d: any) => (!d.valid_from || d.valid_from <= today) && (!d.valid_to || d.valid_to >= today));
    if (!active.length) return json({ sent: 0, reason: "no_physician" });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY_1");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) return json({ error: "Email não configurado" }, 500);

    const link = buildAppUrl(`/pcmso/${program.company_id}/programa/${program.id}`);
    const login = buildAppUrl("/auth");
    let sent = 0; const errors: string[] = [];
    for (const d of active) {
      const { data: u } = await admin.auth.admin.getUserById(d.user_id);
      const to = u?.user?.email; if (!to) continue;
      const html = `<!DOCTYPE html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0b2f5e;padding:24px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:22px;">Sr. SMS · PCMSO</h1></td></tr>
<tr><td style="padding:28px;color:#0f172a;font-size:15px;line-height:1.6;">
<p>Olá, Dr(a). ${esc(d.professional_name || "")}</p>
<p>O PCMSO <strong>${esc(program.title)}</strong> da empresa <strong>${esc(company?.name)}</strong> foi enviado para sua revisão e aprovação.</p>
<p>Entre com este e-mail (${esc(to)}), abra o programa e clique em <strong>Aprovar</strong> ou devolva para ajustes.</p>
<div style="text-align:center;margin:28px 0;"><a href="${link}" style="background:#0b2f5e;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Revisar PCMSO</a></div>
<p style="color:#64748b;font-size:13px;">Se o link pedir login, acesse ${login} e depois abra o PCMSO da empresa.</p>
</td></tr></table></td></tr></table></body></html>`;
      const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: `PCMSO aguardando sua aprovação – ${company?.name ?? ""}`, html }),
      });
      if (r.ok) sent++; else { const t = await r.text(); console.error(r.status, t); errors.push(`${r.status}`); }
    }
    return json({ sent, errors });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
