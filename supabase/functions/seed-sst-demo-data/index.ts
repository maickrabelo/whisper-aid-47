// One-shot helper: seed demo company + assessments for an existing SST manager.
// Reuses the same logic from create-sst-trial-account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: any) => console.log(`[SEED-SST-DEMO] ${s}`, d ?? "");

const DEPARTMENTS = ["Administrativo", "Operacional", "Comercial", "RH", "TI"];
const DEPT_BIAS: Record<string, number> = {
  Administrativo: 0.6, Operacional: 0.35, Comercial: 0.55, RH: 0.7, TI: 0.65,
};

function seededRandom(seed: number) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }
function variedValue(min: number, max: number, bias: number, seed: number) {
  const r = seededRandom(seed); const biased = r * (1 - bias) + bias;
  return Math.round(min + biased * (max - min));
}

const OPEN_ANSWERS: Record<number, string[]> = {
  0: ["Ambiente colaborativo, comunicação pode melhorar.", "Clima respeitoso.", "No geral positivo.", "Falta integração entre setores.", "Muito bom, equipe acolhedora.", "Tem altos e baixos."],
  1: ["Colegas e propósito.", "Crescimento profissional.", "Salário e benefícios.", "Aprendizado constante.", "Flexibilidade.", "Fazer diferença."],
  2: ["Comunicação interna.", "Mais treinamentos.", "Melhor infraestrutura.", "Feedbacks mais frequentes.", "Plano de carreira.", "Equilíbrio vida-trabalho."],
  3: ["Mais reconhecimento.", "Reuniões de alinhamento.", "Nada a declarar.", "Obrigado pela oportunidade.", "Precisamos de mais pessoas.", "Mais autonomia."],
  4: ["Obrigado pelo espaço.", "Espero que considerem.", "Estamos no caminho certo.", "Revisitar metas.", "Nada a acrescentar.", "Mais pesquisas como esta."],
};

async function seedHSEIT(s: any, companyId: string, userId: string, respondents: any[]) {
  const { data: a, error } = await s.from("hseit_assessments").insert({
    company_id: companyId, title: "Avaliação HSE-IT Demo",
    description: "Demonstrativa", is_active: true, created_by: userId,
  }).select().single();
  if (error) { log("hseit err", error); return; }
  await s.from("hseit_departments").insert(DEPARTMENTS.map((name, i) => ({ assessment_id: a.id, name, employee_count: 10, order_index: i })));
  const { data: responses } = await s.from("hseit_responses").insert(
    respondents.map(r => ({ assessment_id: a.id, department: r.department, respondent_token: r.token, completed_at: new Date().toISOString() }))
  ).select("id");
  const answers: any[] = [];
  responses.forEach((resp: any, ri: number) => {
    const r = respondents[ri];
    for (let q = 1; q <= 35; q++) answers.push({ response_id: resp.id, question_number: q, answer_value: variedValue(1, 5, r.bias, r.seed * 35 + q) });
  });
  for (let i = 0; i < answers.length; i += 500) await s.from("hseit_answers").insert(answers.slice(i, i + 500));
  log("hseit ok", { responses: responses.length });
}

async function seedBurnout(s: any, companyId: string, userId: string, respondents: any[]) {
  const { data: a, error } = await s.from("burnout_assessments").insert({
    company_id: companyId, title: "Avaliação Burnout Demo",
    description: "Demonstrativa", is_active: true, created_by: userId,
  }).select().single();
  if (error) { log("burnout err", error); return; }
  await s.from("burnout_departments").insert(DEPARTMENTS.map((name, i) => ({ assessment_id: a.id, name, employee_count: 10, order_index: i })));
  const respInserts = respondents.map(r => {
    let total = 0;
    for (let q = 1; q <= 20; q++) total += variedValue(1, 6, 1 - r.bias, r.seed * 20 + q);
    const riskLevel = total <= 40 ? "baixo" : total <= 60 ? "moderado" : total <= 80 ? "alto" : "critico";
    return { assessment_id: a.id, department: r.department, respondent_token: r.token, completed_at: new Date().toISOString(), total_score: total, risk_level: riskLevel };
  });
  const { data: responses } = await s.from("burnout_responses").insert(respInserts).select("id");
  const answers: any[] = [];
  responses.forEach((resp: any, ri: number) => {
    const r = respondents[ri];
    for (let q = 1; q <= 20; q++) answers.push({ response_id: resp.id, question_number: q, answer_value: variedValue(1, 6, 1 - r.bias, r.seed * 20 + q) });
  });
  for (let i = 0; i < answers.length; i += 500) await s.from("burnout_answers").insert(answers.slice(i, i + 500));
  log("burnout ok", { responses: responses.length });
}

async function seedCOPSOQ(s: any, companyId: string, userId: string, respondents: any[]) {
  const { data: a, error } = await s.from("copsoq_assessments").insert({
    company_id: companyId, title: "Avaliação COPSOQ II Demo",
    description: "Demonstrativa", is_active: true, created_by: userId,
  }).select().single();
  if (error) { log("copsoq err", error); return; }
  await s.from("copsoq_departments").insert(DEPARTMENTS.map((name, i) => ({ assessment_id: a.id, name, employee_count: 10, order_index: i })));
  const { data: responses } = await s.from("copsoq_responses").insert(
    respondents.map(r => ({ assessment_id: a.id, department: r.department, respondent_token: r.token, completed_at: new Date().toISOString() }))
  ).select("id");
  if (!responses) return;
  const answers: any[] = [];
  responses.forEach((resp: any, ri: number) => {
    const r = respondents[ri];
    for (let q = 1; q <= 40; q++) answers.push({ response_id: resp.id, question_number: q, answer_value: variedValue(1, 5, r.bias, r.seed * 40 + q) });
  });
  for (let i = 0; i < answers.length; i += 500) await s.from("copsoq_answers").insert(answers.slice(i, i + 500));
  log("copsoq ok", { responses: responses.length });
}

async function seedClimate(s: any, companyId: string, respondents: any[]) {
  const { data: survey, error } = await s.from("climate_surveys").insert({
    company_id: companyId, title: "Pesquisa de Clima Demo", description: "Demonstrativa", is_active: true,
  }).select().single();
  if (error) { log("climate err", error); return; }
  await s.from("survey_departments").insert(DEPARTMENTS.map((name, i) => ({ survey_id: survey.id, name, employee_count: 10, order_index: i })));
  const likert = [
    "Colaboração entre colegas?", "Sente-se respeitado?", "Ambiente físico adequado?",
    "Comunicação da liderança é clara?", "Pode expressar ideias?", "Feedbacks regulares?",
    "Liderança ouve a equipe?", "Sente-se motivado?", "Esforços reconhecidos?",
    "Trabalho desafiador?", "Empresa cuida do bem-estar?", "Equilíbrio vida-trabalho?",
  ];
  const open = [
    "Como descreveria o ambiente?", "O que mais te motiva?", "O que pode melhorar?",
    "Algo a compartilhar com a liderança?", "Algo mais a acrescentar?",
  ];
  const qInserts = [
    ...likert.map((t, i) => ({ survey_id: survey.id, question_text: t, question_type: "likert", category: "geral", order_index: i, is_required: true })),
    ...open.map((t, i) => ({ survey_id: survey.id, question_text: t, question_type: "open_text", category: "open", order_index: likert.length + i, is_required: false })),
  ];
  const { data: questions } = await s.from("survey_questions").insert(qInserts).select("id, question_type, order_index");
  const { data: responses } = await s.from("survey_responses").insert(
    respondents.map(r => ({ survey_id: survey.id, department: r.department, respondent_token: r.token, completed_at: new Date().toISOString() }))
  ).select("id");
  const sorted = questions.sort((a: any, b: any) => a.order_index - b.order_index);
  const lQ = sorted.filter((q: any) => q.question_type === "likert");
  const oQ = sorted.filter((q: any) => q.question_type === "open_text");
  const answers: any[] = [];
  responses.forEach((resp: any, ri: number) => {
    const r = respondents[ri]; const idx = ri % 6;
    lQ.forEach((q: any, qi: number) => answers.push({ response_id: resp.id, question_id: q.id, answer_value: String(variedValue(1, 5, r.bias, r.seed * 17 + qi)) }));
    oQ.forEach((q: any, qi: number) => {
      const arr = OPEN_ANSWERS[qi] || OPEN_ANSWERS[0];
      answers.push({ response_id: resp.id, question_id: q.id, answer_text: arr[idx % arr.length] });
    });
  });
  for (let i = 0; i < answers.length; i += 500) await s.from("survey_answers").insert(answers.slice(i, i + 500));
  log("climate ok", { responses: responses.length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { sst_manager_id, user_id, company_name } = await req.json();
    if (!sst_manager_id || !user_id) {
      return new Response(JSON.stringify({ error: "sst_manager_id and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const name = company_name || "Empresa Demo Sr.SMS";
    const slug = `demo-srsms-${Date.now().toString(36)}`;

    // Check if a demo company already linked
    const { data: existing } = await sb.from("companies").select("id, name").ilike("name", `${name}%`).maybeSingle();
    let companyId: string;
    if (existing) {
      companyId = existing.id;
      log("Reusing existing demo company", existing);
    } else {
      const { data: company, error: cErr } = await sb.from("companies").insert({
        name, slug, email: `demo+${Date.now()}@srsms.app`,
        max_employees: 50, subscription_status: "active", employee_count: 50,
      }).select().single();
      if (cErr) throw cErr;
      companyId = company.id;
      await sb.from("company_sst_assignments").insert({ company_id: companyId, sst_manager_id });
      await sb.from("company_feature_access").upsert({
        company_id: companyId, ouvidoria_enabled: false, psicossocial_enabled: true,
        burnout_enabled: true, clima_enabled: true, treinamentos_enabled: true,
      });
    }

    const respondents = DEPARTMENTS.flatMap((dept, di) =>
      Array.from({ length: 6 }, (_, i) => ({
        department: dept, token: crypto.randomUUID(), seed: di * 100 + i, bias: DEPT_BIAS[dept],
      }))
    );

    await Promise.all([
      seedHSEIT(sb, companyId, user_id, respondents),
      seedBurnout(sb, companyId, user_id, respondents),
      seedCOPSOQ(sb, companyId, user_id, respondents),
      seedClimate(sb, companyId, respondents),
    ]);

    return new Response(JSON.stringify({ success: true, company_id: companyId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log("ERROR", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
