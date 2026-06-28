import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_COMPANY_ID = "382745b1-d65a-4928-bb1b-95ae513c4e14";

const REPORT_TYPES = ["denuncia", "reclamacao", "sugestao", "elogio"];
const CATEGORIES = [
  "assedio", "discriminacao", "fraude", "conflito_interesses",
  "conduta", "uso_indevido_bens", "quebra_sigilo", "outros",
];
const OCCURRENCE_TYPES = ["data_especifica", "recorrente", "nao_recorda"];

async function generateTrackingCode(supabase: any): Promise<string> {
  // Formato: BETA-XXXX999 (4 letras + 3 dígitos) — prefixo evita conflito com ouvidoria tradicional
  const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let i = 0; i < 15; i++) {
    let letters = "";
    const lArr = new Uint32Array(4);
    crypto.getRandomValues(lArr);
    for (let j = 0; j < 4; j++) letters += LETTERS[lArr[j] % LETTERS.length];
    const nArr = new Uint32Array(3);
    crypto.getRandomValues(nArr);
    let numbers = "";
    for (let j = 0; j < 3; j++) numbers += (nArr[j] % 10).toString();
    const code = `BETA-${letters}${numbers}`;
    const { data } = await supabase
      .from("beta_ouvidoria_reports")
      .select("id")
      .eq("tracking_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Falha ao gerar protocolo");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    const company_id = String(body.company_id ?? "");
    if (!company_id) {
      return new Response(JSON.stringify({ error: "Empresa não informada." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: allowed, error: rpcErr } = await supabase.rpc("company_has_smart_ouvidoria", { _company_id: company_id });
    if (rpcErr || !allowed) {
      console.error("company_has_smart_ouvidoria check failed:", rpcErr, "allowed=", allowed);
      return new Response(JSON.stringify({ error: "Canal indisponível para esta empresa." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const report_type = String(body.report_type ?? "");
    const category = String(body.category ?? "");
    const occurrence_type = String(body.occurrence_type ?? "");
    const description = String(body.description ?? "").trim();
    const category_other = body.category_other ? String(body.category_other).trim().slice(0, 200) : null;
    const location_sector = body.location_sector ? String(body.location_sector).trim().slice(0, 200) : null;
    const occurrence_date = body.occurrence_date ? String(body.occurrence_date).slice(0, 20) : null;

    if (!REPORT_TYPES.includes(report_type)) {
      return new Response(JSON.stringify({ error: "Tipo de relato inválido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({ error: "Categoria inválida." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!OCCURRENCE_TYPES.includes(occurrence_type)) {
      return new Response(JSON.stringify({ error: "Período inválido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (description.length < 20 || description.length > 5000) {
      return new Response(JSON.stringify({ error: "A descrição deve ter entre 20 e 5000 caracteres." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tracking_code = await generateTrackingCode(supabase);

    const { data: report, error } = await supabase
      .from("beta_ouvidoria_reports")
      .insert({
        company_id,
        tracking_code,
        report_type,
        category,
        category_other,
        description: description.slice(0, 5000),
        occurrence_type,
        occurrence_date: occurrence_type === "data_especifica" ? occurrence_date : null,
        location_sector,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar relato beta:", error);
      return new Response(JSON.stringify({ error: "Erro ao salvar relato." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (Array.isArray(body.attachments) && body.attachments.length > 0) {
      const rows = body.attachments.slice(0, 10).map((a: any) => ({
        report_id: report.id,
        file_path: String(a.file_path ?? "").slice(0, 500),
        file_name: String(a.file_name ?? "arquivo").slice(0, 200),
        mime_type: a.mime_type ? String(a.mime_type).slice(0, 100) : null,
        size_bytes: a.size_bytes ? Number(a.size_bytes) : null,
      }));
      const { error: attErr } = await supabase.from("beta_ouvidoria_attachments").insert(rows);
      if (attErr) console.error("Erro ao salvar anexos beta:", attErr);
    }

    return new Response(
      JSON.stringify({ success: true, tracking_code }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-beta-report error:", err);
    return new Response(JSON.stringify({ error: "Erro ao processar relato." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
