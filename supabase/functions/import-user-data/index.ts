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
  ["user_roles", "user_id,role"],
  ["user_sst_managers", "user_id,sst_manager_id"],
  ["companies", "id"],
  ["company_sst_assignments", "company_id"],
  ["user_companies", "user_id,company_id"],
  ["company_feature_access", "company_id"],
  ["subscriptions", "id"],
  ["sst_training_modules", "id"],
  ["sst_training_materials", "id"],
  ["sst_training_company_access", "id"],
  ["sst_portal_trainings", "id"],
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

const NESTED_GROUP_ALIASES: Record<string, Record<string, string>> = {
  hseit: {
    assessments: "hseit_assessments",
    departments: "hseit_departments",
    responses: "hseit_responses",
    answers: "hseit_answers",
  },
  copsoq: {
    assessments: "copsoq_assessments",
    departments: "copsoq_departments",
    responses: "copsoq_responses",
    answers: "copsoq_answers",
  },
  burnout: {
    assessments: "burnout_assessments",
    departments: "burnout_departments",
    responses: "burnout_responses",
    answers: "burnout_answers",
  },
  climate: {
    surveys: "climate_surveys",
    departments: "survey_departments",
    questions: "survey_questions",
    responses: "survey_responses",
    answers: "survey_answers",
  },
  pulse: {
    surveys: "pulse_surveys",
    departments: "pulse_survey_departments",
    questions: "pulse_survey_questions",
    cycles: "pulse_survey_cycles",
    responses: "pulse_survey_responses",
    answers: "pulse_survey_answers",
  },
  pgr: {
    documents: "pgr_documents",
    ghe: "pgr_ghe",
    ghe_workers: "pgr_ghe_workers",
    risks: "pgr_risks",
    action_items: "pgr_action_items",
    action_checklist_items: "pgr_action_checklist_items",
    monitoring: "pgr_monitoring",
  },
  reports: {
    reports: "reports",
    updates: "report_updates",
    attachments: "report_attachments",
  },
  beta_ouvidoria: {
    reports: "beta_ouvidoria_reports",
    updates: "beta_ouvidoria_updates",
    attachments: "beta_ouvidoria_attachments",
  },
  trainings: {
    modules: "sst_training_modules",
    materials: "sst_training_materials",
    company_access: "sst_training_company_access",
    portal_trainings: "sst_portal_trainings",
  },
};

const BATCH_SIZE = 50;
const SST_MANAGER_REF_TABLES = new Set([
  "profiles",
  "user_sst_managers",
  "company_sst_assignments",
  "account_invitations",
  "sst_extra_slot_purchases",
  "sst_training_modules",
  "sector_viewer_access",
]);

function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function asRows(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractEmail(data: Record<string, any>, normalized: Record<string, any[]>) {
  const candidates = [
    ...asRows(data.target),
    ...asRows(data.auth_user),
    ...asRows(data.profile),
    ...asRows(data.profiles),
    ...asRows(data.sst_manager),
    ...asRows(data.sst_managers),
    ...asRows(data.subscription),
    ...asRows(data.subscriptions),
    ...(normalized.profiles || []),
    ...(normalized.sst_managers || []),
    ...(normalized.subscriptions || []),
  ];
  for (const row of candidates) {
    const email = normalizeEmail(row?.email || row?.owner_email || row?.user?.email);
    if (email) return email;
  }
  return "";
}

async function findAuthUserByEmail(supabase: any, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = (data?.users ?? []).find((u: any) => normalizeEmail(u.email) === normalized);
    if (found) return found;
    if ((data?.users ?? []).length < perPage) break;
    page++;
  }
  return null;
}

async function findSstManagersByEmail(supabase: any, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const { data, error } = await supabase
    .from("sst_managers")
    .select("*")
    .ilike("email", normalized)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function consolidateSstManagersByEmail(supabase: any, email: string, preferredTargetId?: string | null) {
  const managers = await findSstManagersByEmail(supabase, email);
  if (managers.length === 0) return { target: null, mergedIds: [] as string[] };
  const target = preferredTargetId
    ? (managers.find((m: any) => m.id === preferredTargetId) ?? managers[0])
    : managers[0];
  const sources = managers.filter((m: any) => m.id !== target.id);
  const mergedIds: string[] = [];

  for (const source of sources) {
    const patch: Record<string, unknown> = {};
    for (const field of ["name", "email", "cnpj", "phone", "address", "logo_url", "slug", "brand_color"]) {
      if ((target[field] === null || target[field] === undefined || target[field] === "") && source[field]) {
        patch[field] = source[field];
        target[field] = source[field];
      }
    }
    for (const field of ["max_companies", "extra_company_slots", "extra_employee_slots"]) {
      if ((target[field] === null || target[field] === undefined || target[field] === 0) && typeof source[field] === "number") {
        patch[field] = source[field];
        target[field] = source[field];
      }
    }
    if (source.pgr_module_enabled === true && target.pgr_module_enabled !== true) {
      patch.pgr_module_enabled = true;
      target.pgr_module_enabled = true;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("sst_managers").update(patch).eq("id", target.id);
    }

    await supabase.from("profiles").update({ sst_manager_id: target.id }).eq("sst_manager_id", source.id);
    await supabase.from("company_sst_assignments").update({ sst_manager_id: target.id }).eq("sst_manager_id", source.id);
    await supabase.from("account_invitations").update({ sst_manager_id: target.id }).eq("sst_manager_id", source.id);
    await supabase.from("sst_extra_slot_purchases").update({ sst_manager_id: target.id }).eq("sst_manager_id", source.id);
    await supabase.from("sst_training_modules").update({ sst_manager_id: target.id }).eq("sst_manager_id", source.id);
    await supabase.from("sector_viewer_access").update({ sst_manager_id: target.id }).eq("sst_manager_id", source.id);

    const { data: sourceUsers } = await supabase
      .from("user_sst_managers")
      .select("user_id")
      .eq("sst_manager_id", source.id);
    for (const row of sourceUsers ?? []) {
      await supabase
        .from("user_sst_managers")
        .upsert({ user_id: row.user_id, sst_manager_id: target.id }, { onConflict: "user_id,sst_manager_id" });
    }
    await supabase.from("user_sst_managers").delete().eq("sst_manager_id", source.id);

    const { error: deleteError } = await supabase.from("sst_managers").delete().eq("id", source.id);
    if (!deleteError) mergedIds.push(source.id);
  }
  return { target, mergedIds };
}

function remapRowsForExistingAccount(normalized: Record<string, any[]>, targetUserId: string | null, targetManagerId: string | null) {
  const importedManagerIds = new Set<string>((normalized.sst_managers || []).map((r: any) => r?.id).filter(Boolean));
  const importedProfileIds = new Set<string>((normalized.profiles || []).map((r: any) => r?.id).filter(Boolean));

  if (targetManagerId && importedManagerIds.size > 0) {
    for (const [table, rows] of Object.entries(normalized)) {
      if (table === "sst_managers") continue;
      for (const row of rows) {
        if (SST_MANAGER_REF_TABLES.has(table) && importedManagerIds.has(row?.sst_manager_id)) {
          row.sst_manager_id = targetManagerId;
        }
      }
    }
    const importedManagers = normalized.sst_managers || [];
    const newestImported = importedManagers
      .slice()
      .sort((a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())[0] || {};
    const safeManagerPatch: Record<string, unknown> = { id: targetManagerId };
    for (const field of ["name", "email", "cnpj", "phone", "address", "logo_url", "slug", "brand_color", "onboarding_completed_pages"]) {
      if (newestImported[field] !== undefined) safeManagerPatch[field] = newestImported[field];
    }
    normalized.sst_managers = [safeManagerPatch];
  }

  if (targetUserId && importedProfileIds.size > 0) {
    for (const [table, rows] of Object.entries(normalized)) {
      for (const row of rows) {
        if (["user_roles", "user_sst_managers", "user_companies", "sector_viewer_access"].includes(table) && importedProfileIds.has(row?.user_id)) {
          row.user_id = targetUserId;
        }
        if (table === "subscriptions" && importedProfileIds.has(row?.owner_user_id)) {
          row.owner_user_id = targetUserId;
        }
        for (const userRef of ["created_by", "updated_by", "granted_by", "purchased_by", "invited_by", "accepted_by"]) {
          if (importedProfileIds.has(row?.[userRef])) row[userRef] = targetUserId;
        }
      }
    }
    const importedProfiles = normalized.profiles || [];
    const newestImported = importedProfiles
      .slice()
      .sort((a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())[0] || {};
    normalized.profiles = [{ ...newestImported, id: targetUserId, sst_manager_id: targetManagerId ?? newestImported.sst_manager_id }];
  }
}

function appendRows(normalized: Record<string, any[]>, table: string, value: any) {
  const rows = asRows(value).filter((row) => row && typeof row === "object" && !Array.isArray(row));
  if (rows.length > 0) normalized[table] = (normalized[table] || []).concat(rows);
}

function normalizeExportPayload(data: Record<string, any>) {
  const normalized: Record<string, any[]> = {};

  for (const [k, v] of Object.entries(data)) {
    if (!Array.isArray(v) && (typeof v !== "object" || v === null)) continue;

    if (k === "assessments" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [groupName, groupValue] of Object.entries(v as Record<string, any>)) {
        const aliases = NESTED_GROUP_ALIASES[groupName];
        if (!aliases || !groupValue || typeof groupValue !== "object") continue;
        for (const [subKey, table] of Object.entries(aliases)) appendRows(normalized, table, (groupValue as any)[subKey]);
      }
      continue;
    }

    const nestedAliases = NESTED_GROUP_ALIASES[k];
    if (nestedAliases && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [subKey, table] of Object.entries(nestedAliases)) appendRows(normalized, table, (v as any)[subKey]);
      continue;
    }

    const tableName = KEY_ALIASES[k] || k;
    appendRows(normalized, tableName, v);
  }

  return normalized;
}

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

    // Normalize: accepts both flat exports and nested backups like assessments.hseit / pgr.documents.
    const normalized = normalizeExportPayload(data);

    const detectedEmail = extractEmail(data, normalized);
    let targetUserId: string | null = null;
    let targetManagerId: string | null = null;
    let mergedDuplicateManagerIds: string[] = [];

    if (detectedEmail) {
      const existingUser = await findAuthUserByEmail(supabase, detectedEmail);
      targetUserId = existingUser?.id ?? null;

      const mergeBefore = await consolidateSstManagersByEmail(supabase, detectedEmail);
      targetManagerId = mergeBefore.target?.id ?? null;
      mergedDuplicateManagerIds = mergedDuplicateManagerIds.concat(mergeBefore.mergedIds);

      if (targetUserId && !targetManagerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("sst_manager_id")
          .eq("id", targetUserId)
          .maybeSingle();
        targetManagerId = profile?.sst_manager_id ?? null;
      }
      remapRowsForExistingAccount(normalized, targetUserId, targetManagerId);
    }

    for (const [table, conflict] of TABLE_ORDER) {
      const rows = normalized[table];
      if (!rows || rows.length === 0) continue;
      const r = { ok: 0, err: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(table).upsert(batch, { onConflict: conflict } as any);
        if (error) {
          for (const row of batch) {
            const { error: rowError } = await supabase.from(table).upsert(row, { onConflict: conflict } as any);
            if (rowError) {
              r.err++;
              r.errors.push(`${row.id ?? "?"}: ${rowError.message}`);
            } else {
              r.ok++;
            }
          }
        } else {
          r.ok += batch.length;
        }
      }
      results[table] = r;
    }

    if (detectedEmail) {
      const mergeAfter = await consolidateSstManagersByEmail(supabase, detectedEmail, targetManagerId);
      if (!targetManagerId && mergeAfter.target?.id) targetManagerId = mergeAfter.target.id;
      mergedDuplicateManagerIds = mergedDuplicateManagerIds.concat(mergeAfter.mergedIds);
    }

    return new Response(JSON.stringify({
      success: true,
      detected_email: detectedEmail || null,
      target_user_id: targetUserId,
      target_sst_manager_id: targetManagerId,
      merged_duplicate_sst_manager_ids: Array.from(new Set(mergedDuplicateManagerIds)),
      results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
