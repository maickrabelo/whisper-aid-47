// Generic importer: takes an export JSON (same shape produced by old project)
// and upserts every related table for a user. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// table -> conflict column(s) for upsert
const TABLE_ORDER: Array<[string, string]> = [
  ["profiles", "id"],
  ["sst_managers", "id"],
  ["user_roles", "id"],
  ["user_sst_managers", "id"],
  ["companies", "id"],
  ["company_sst_assignments", "id"],
  ["user_companies", "id"],
  ["company_feature_access", "company_id"],
  ["subscriptions", "id"],
  ["hseit_assessments", "id"],
  ["hseit_departments", "id"],
  ["hseit_responses", "id"],
  ["hseit_answers", "id"],
  ["copsoq_assessments", "id"],
  ["copsoq_departments", "id"],
  ["copsoq_responses", "id"],
  ["copsoq_answers", "id"],
  ["burnout_assessments", "id"],
  ["burnout_departments", "id"],
  ["burnout_responses", "id"],
  ["burnout_answers", "id"],
  ["climate_surveys", "id"],
  ["survey_departments", "id"],
  ["survey_questions", "id"],
  ["survey_responses", "id"],
  ["survey_answers", "id"],
  ["pulse_surveys", "id"],
  ["pulse_survey_departments", "id"],
  ["pulse_survey_questions", "id"],
  ["pulse_survey_cycles", "id"],
  ["pulse_survey_responses", "id"],
  ["pulse_survey_answers", "id"],
  ["reports", "id"],
  ["report_updates", "id"],
  ["report_attachments", "id"],
  ["beta_ouvidoria_reports", "id"],
  ["beta_ouvidoria_updates", "id"],
  ["beta_ouvidoria_attachments", "id"],
  ["pgr_documents", "id"],
  ["pgr_ghe", "id"],
  ["pgr_ghe_workers", "id"],
  ["pgr_risks", "id"],
  ["pgr_action_items", "id"],
  ["pgr_action_checklist_items", "id"],
  ["pgr_monitoring", "id"],
];

// Source-data keys that aren't direct tables — they map differently
// `sst_manager` (singular) -> sst_managers; `roles` -> user_roles; `subscription`/`subscriptions` -> subscriptions
const KEY_ALIASES: Record<string, string> = {
  sst_manager: "sst_managers",
  profile: "profiles",
  roles: "user_roles",
  subscription: "subscriptions",
  company: "companies",
  company_feature_access: "company_feature_access",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json();
    const data = payload.data || payload; // accept either {data:{...}} or raw export
    const results: Record<string, { ok: number; err: number; errors: string[] }> = {};

    // Normalize: turn alias singular keys into plural-table arrays
    const normalized: Record<string, any[]> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!Array.isArray(v) && (typeof v !== "object" || v === null)) continue;
      const tableName = KEY_ALIASES[k] || k;
      if (!Array.isArray(v)) continue;
      normalized[tableName] = (normalized[tableName] || []).concat(v);
    }

    for (const [table, conflict] of TABLE_ORDER) {
      const rows = normalized[table];
      if (!rows || rows.length === 0) continue;
      const r = { ok: 0, err: 0, errors: [] as string[] };
      // upsert in chunks to surface row-specific errors
      for (const row of rows) {
        const { error } = await supabase.from(table).upsert(row, { onConflict: conflict } as any);
        if (error) {
          r.err++;
          r.errors.push(`${row.id ?? "?"}: ${error.message}`);
        } else {
          r.ok++;
        }
      }
      results[table] = r;
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
