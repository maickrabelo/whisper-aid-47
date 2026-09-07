/**
 * Cálculo de indicadores da Pesquisa de Clima.
 * Usado tanto para o consolidado quanto para cada setor (departamento),
 * garantindo que os números sejam idênticos em tela, PDF e Excel.
 */

export interface ClimateAnswer {
  question_text: string;
  question_type: string;
  category: string | null;
  answer_value: string | null;
  answer_text: string | null;
}

export interface ClimateResponse {
  id: string;
  department: string | null;
  completed_at: string | null;
  demographics: any;
  answers: ClimateAnswer[];
}

export interface ClimateStats {
  totalResponses: number;
  npsScore: number;
  avgScore: number;
  categoryScores: { category: string; score: number; fullMark: number }[];
  npsDistribution: { name: string; value: number; color: string }[];
  departmentDistribution: { name: string; value: number }[];
}

export const NO_DEPARTMENT_LABEL = 'Não informado';

const prettify = (category: string) =>
  category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

export function computeClimateStats(responses: ClimateResponse[]): ClimateStats {
  const categoryAnswers: Record<string, number[]> = {};
  const categoryNames: Record<string, string> = {};
  const npsAnswers: number[] = [];

  responses.forEach((resp) => {
    resp.answers.forEach((answer) => {
      if (!answer.answer_value) return;
      const value = parseFloat(answer.answer_value);
      if (isNaN(value)) return;

      if (answer.question_type === 'scale_0_10') {
        npsAnswers.push(value);
      } else if (answer.question_type === 'likert' && answer.category) {
        if (!categoryAnswers[answer.category]) categoryAnswers[answer.category] = [];
        categoryAnswers[answer.category].push(value);
        if (!categoryNames[answer.category]) {
          categoryNames[answer.category] = prettify(answer.category);
        }
      }
    });
  });

  const categoryScores = Object.keys(categoryAnswers)
    .filter((catId) => catId !== 'open' && catId !== 'nps')
    .map((catId) => {
      const values = categoryAnswers[catId] || [];
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { category: categoryNames[catId] || catId, score: parseFloat(avg.toFixed(2)), fullMark: 5 };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const allLikert = Object.values(categoryAnswers).flat();
  const avgScore = allLikert.length > 0
    ? allLikert.reduce((a, b) => a + b, 0) / allLikert.length
    : 0;

  let npsScore = 0;
  let npsDistribution = [
    { name: 'Detratores (0-6)', value: 0, color: '#ef4444' },
    { name: 'Neutros (7-8)', value: 0, color: '#f59e0b' },
    { name: 'Promotores (9-10)', value: 0, color: '#22c55e' },
  ];

  if (npsAnswers.length > 0) {
    const detractors = npsAnswers.filter((v) => v <= 6).length;
    const passives = npsAnswers.filter((v) => v >= 7 && v <= 8).length;
    const promoters = npsAnswers.filter((v) => v >= 9).length;

    const detractorPct = Math.round((detractors / npsAnswers.length) * 100);
    const passivePct = Math.round((passives / npsAnswers.length) * 100);
    const promoterPct = Math.round((promoters / npsAnswers.length) * 100);

    npsScore = promoterPct - detractorPct;
    npsDistribution = [
      { name: 'Detratores (0-6)', value: detractorPct, color: '#ef4444' },
      { name: 'Neutros (7-8)', value: passivePct, color: '#f59e0b' },
      { name: 'Promotores (9-10)', value: promoterPct, color: '#22c55e' },
    ];
  }

  const deptCounts: Record<string, number> = {};
  responses.forEach((r) => {
    const dept = r.department?.trim() || NO_DEPARTMENT_LABEL;
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const departmentDistribution = Object.entries(deptCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    totalResponses: responses.length,
    npsScore,
    avgScore: parseFloat(avgScore.toFixed(2)),
    categoryScores,
    npsDistribution,
    departmentDistribution,
  };
}

/** Média geral (Likert) de um conjunto de respostas — usado nos cabeçalhos de grupo. */
export function averageLikert(responses: ClimateResponse[]): number {
  const values: number[] = [];
  responses.forEach((r) => r.answers.forEach((a) => {
    if (a.question_type !== 'likert' || !a.answer_value) return;
    const v = parseFloat(a.answer_value);
    if (!isNaN(v)) values.push(v);
  }));
  if (values.length === 0) return 0;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

/**
 * Busca paginada: o serviço de dados devolve no máximo 1.000 linhas por
 * consulta, então percorremos em blocos até esgotar os registros.
 */
export async function fetchAllRows<T>(
  runPage: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await runPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    all.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
