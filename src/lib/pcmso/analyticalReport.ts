export const indicatorLabels = {
  population: 'Trabalhadores únicos', clinical_exams: 'Exames clínicos', complementary_exams: 'Exames complementares',
  abnormal_results: 'Resultados alterados', occupational_diseases: 'Novos casos de doença ocupacional', cat: 'CAT emitidas',
  admission: 'Admissionais', periodic: 'Periódicos', return: 'Retorno ao trabalho', change_risk: 'Mudança de riscos', dismissal: 'Demissionais',
} as const;
export type Indicator = keyof typeof indicatorLabels;
export type AnalyticalGroup = { sector: string; role: string } & Record<Indicator, number | null>;
export type AnalyticalContent = { year: number; groups: AnalyticalGroup[]; analysis: string; recommendations: string; sources: string; discussion: string; [key: string]: any };
export const blankAnalyticalGroup = (): AnalyticalGroup => ({ sector: '', role: '', population: null, clinical_exams: null, complementary_exams: null, abnormal_results: null, occupational_diseases: null, cat: null, admission: null, periodic: null, return: null, change_risk: null, dismissal: null });

/** Export only, never an authorization boundary: source snapshots remain physician-only on the server. */
export function safeAnalyticalExport(content: AnalyticalContent): AnalyticalContent {
  const suppressed = content.groups.some(g => g.population === null || g.population < 5 || Object.keys(indicatorLabels).some(k => { const n = g[k as Indicator]; return n !== null && n > 0 && n < 5; }));
  if (suppressed) return { year: content.year, groups: [], analysis: 'Conteúdo oculto para proteção de grupos ou indicadores abaixo de 5.', recommendations: '', sources: '', discussion: '', status: 'suprimido', threshold: 5, simulation: true };
  return structuredClone(content);
}

export function clinicalRates(group: AnalyticalGroup) {
  return {
    abnormalPercentage: group.abnormal_results === null || !group.complementary_exams ? null : 100 * group.abnormal_results / group.complementary_exams,
    incidencePercentage: group.occupational_diseases === null || !group.population ? null : 100 * group.occupational_diseases / group.population,
  };
}