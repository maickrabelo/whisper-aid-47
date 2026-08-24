// COPSOQ II (Copenhagen Psychosocial Questionnaire) - Versão Média Portuguesa
// 76 itens distribuídos em 29 subescalas — redação conforme Silva et al. (2011),
// com registro ajustado para PT-BR. Sistema de pontuação: média por dimensão (1-5),
// itens 42 e 45 invertidos na correção (6 - resposta), semáforo por tercis
// (cortes 2,33 e 3,66) conforme o sentido conceptual de cada dimensão.
//
// Convenção interna (igual à versão curta): `isInverted = true` significa que
// resposta alta = desfavorável; a normalização (6 - valor) faz 5 = favorável.
// - Dimensões "quanto maior, pior": todos os itens com isInverted = true,
//   EXCETO o item 42 (redação positiva dentro de dimensão negativa — o PDF o
//   inverte na correção, então o efeito líquido é isInverted = false).
// - Dimensões "quanto maior, melhor": isInverted = false, EXCETO o item 45
//   (redação negativa — o PDF o inverte; efeito líquido isInverted = true).
// - Item 61 (Saúde geral): escala 1=Excelente … 5=Deficitária → isInverted = true.

import type { COPSOQScaleType, RiskLevel } from './copsoqQuestions';

export type COPSOQMediumCategory =
  | 'quantitativeDemands'
  | 'workPace'
  | 'cognitiveDemands'
  | 'emotionalDemands'
  | 'influence'
  | 'developmentPossibilities'
  | 'predictability'
  | 'roleClarity'
  | 'rewards'
  | 'roleConflicts'
  | 'socialSupportColleagues'
  | 'socialSupport'
  | 'socialCommunity'
  | 'leadershipQuality'
  | 'trustHorizontal'
  | 'trustVertical'
  | 'justice'
  | 'selfEfficacy'
  | 'meaningOfWork'
  | 'commitment'
  | 'jobSatisfaction'
  | 'jobInsecurity'
  | 'selfRatedHealth'
  | 'workFamilyConflict'
  | 'sleepProblems'
  | 'burnout'
  | 'stress'
  | 'depressiveSymptoms'
  | 'offensiveBehaviors';

export interface COPSOQMediumQuestion {
  number: number;
  text: string;
  category: COPSOQMediumCategory;
  isInverted: boolean;
  scaleType: COPSOQScaleType;
}

export const COPSOQ_MEDIUM_CATEGORY_LABELS: Record<COPSOQMediumCategory, string> = {
  quantitativeDemands: 'Exigências Quantitativas',
  workPace: 'Ritmo de Trabalho',
  cognitiveDemands: 'Exigências Cognitivas',
  emotionalDemands: 'Exigências Emocionais',
  influence: 'Influência no Trabalho',
  developmentPossibilities: 'Possibilidades de Desenvolvimento',
  predictability: 'Previsibilidade',
  roleClarity: 'Transparência do Papel',
  rewards: 'Recompensas (Reconhecimento)',
  roleConflicts: 'Conflitos Laborais',
  socialSupportColleagues: 'Apoio Social de Colegas',
  socialSupport: 'Apoio Social de Superiores',
  socialCommunity: 'Comunidade Social no Trabalho',
  leadershipQuality: 'Qualidade da Liderança',
  trustHorizontal: 'Confiança Horizontal',
  trustVertical: 'Confiança Vertical',
  justice: 'Justiça e Respeito',
  selfEfficacy: 'Autoeficácia',
  meaningOfWork: 'Significado do Trabalho',
  commitment: 'Compromisso com o Local de Trabalho',
  jobSatisfaction: 'Satisfação no Trabalho',
  jobInsecurity: 'Insegurança no Trabalho',
  selfRatedHealth: 'Saúde Geral',
  workFamilyConflict: 'Conflito Trabalho-Família',
  sleepProblems: 'Problemas para Dormir',
  burnout: 'Burnout',
  stress: 'Estresse',
  depressiveSymptoms: 'Sintomas Depressivos',
  offensiveBehaviors: 'Comportamentos Ofensivos',
};

export const COPSOQ_MEDIUM_CATEGORY_COLORS: Record<COPSOQMediumCategory, string> = {
  quantitativeDemands: '#ef4444',
  workPace: '#f97316',
  cognitiveDemands: '#eab308',
  emotionalDemands: '#dc2626',
  influence: '#3b82f6',
  developmentPossibilities: '#22c55e',
  predictability: '#8b5cf6',
  roleClarity: '#6366f1',
  rewards: '#f59e0b',
  roleConflicts: '#f43f5e',
  socialSupportColleagues: '#0ea5e9',
  socialSupport: '#2563eb',
  socialCommunity: '#7c3aed',
  leadershipQuality: '#14b8a6',
  trustHorizontal: '#64748b',
  trustVertical: '#4f46e5',
  justice: '#0891b2',
  selfEfficacy: '#65a30d',
  meaningOfWork: '#10b981',
  commitment: '#06b6d4',
  jobSatisfaction: '#16a34a',
  jobInsecurity: '#b91c1c',
  selfRatedHealth: '#059669',
  workFamilyConflict: '#ea580c',
  sleepProblems: '#9333ea',
  burnout: '#991b1b',
  stress: '#be123c',
  depressiveSymptoms: '#7e22ce',
  offensiveBehaviors: '#9f1239',
};

const F: COPSOQScaleType = 'frequency';
const X: COPSOQScaleType = 'extent';
const H: COPSOQScaleType = 'health';

export const COPSOQ_MEDIUM_QUESTIONS: COPSOQMediumQuestion[] = [
  // Exigências Quantitativas (1-3) — quanto maior, pior
  { number: 1, text: 'A sua carga de trabalho se acumula por ser mal distribuída?', category: 'quantitativeDemands', isInverted: true, scaleType: F },
  { number: 2, text: 'Com que frequência você não tem tempo para completar todas as tarefas do seu trabalho?', category: 'quantitativeDemands', isInverted: true, scaleType: F },
  { number: 3, text: 'Você precisa fazer horas extras?', category: 'quantitativeDemands', isInverted: true, scaleType: F },

  // Ritmo de Trabalho (4) — quanto maior, pior
  { number: 4, text: 'Você precisa trabalhar muito rapidamente?', category: 'workPace', isInverted: true, scaleType: F },

  // Exigências Cognitivas (5-7) — quanto maior, pior
  { number: 5, text: 'O seu trabalho exige a sua atenção constante?', category: 'cognitiveDemands', isInverted: true, scaleType: F },
  { number: 6, text: 'O seu trabalho requer que você seja bom em propor novas ideias?', category: 'cognitiveDemands', isInverted: true, scaleType: F },
  { number: 7, text: 'O seu trabalho exige que você tome decisões difíceis?', category: 'cognitiveDemands', isInverted: true, scaleType: F },

  // Exigências Emocionais (8) — quanto maior, pior
  { number: 8, text: 'O seu trabalho exige emocionalmente de você?', category: 'emotionalDemands', isInverted: true, scaleType: F },

  // Influência no Trabalho (9-12) — quanto maior, melhor
  { number: 9, text: 'Você tem um elevado grau de influência no seu trabalho?', category: 'influence', isInverted: false, scaleType: F },
  { number: 10, text: 'Você participa da escolha das pessoas com quem trabalha?', category: 'influence', isInverted: false, scaleType: F },
  { number: 11, text: 'Você pode influenciar a quantidade de trabalho que lhe é atribuída?', category: 'influence', isInverted: false, scaleType: F },
  { number: 12, text: 'Você tem alguma influência sobre o tipo de tarefas que faz?', category: 'influence', isInverted: false, scaleType: F },

  // Possibilidades de Desenvolvimento (13-15) — quanto maior, melhor
  { number: 13, text: 'O seu trabalho exige que você tenha iniciativa?', category: 'developmentPossibilities', isInverted: false, scaleType: F },
  { number: 14, text: 'O seu trabalho permite que você aprenda coisas novas?', category: 'developmentPossibilities', isInverted: false, scaleType: F },
  { number: 15, text: 'O seu trabalho permite que você use as suas habilidades ou competências?', category: 'developmentPossibilities', isInverted: false, scaleType: F },

  // Previsibilidade (16-17) — quanto maior, melhor
  { number: 16, text: 'No seu local de trabalho, você é informado com antecedência sobre decisões importantes, mudanças ou planos para o futuro?', category: 'predictability', isInverted: false, scaleType: F },
  { number: 17, text: 'Você recebe toda a informação de que precisa para fazer bem o seu trabalho?', category: 'predictability', isInverted: false, scaleType: F },

  // Transparência do Papel (18-20) — quanto maior, melhor
  { number: 18, text: 'O seu trabalho apresenta objetivos claros?', category: 'roleClarity', isInverted: false, scaleType: F },
  { number: 19, text: 'Você sabe exatamente quais são as suas responsabilidades?', category: 'roleClarity', isInverted: false, scaleType: F },
  { number: 20, text: 'Você sabe exatamente o que é esperado de você?', category: 'roleClarity', isInverted: false, scaleType: F },

  // Recompensas / Reconhecimento (21-23) — quanto maior, melhor
  { number: 21, text: 'O seu trabalho é reconhecido e apreciado pela gerência?', category: 'rewards', isInverted: false, scaleType: F },
  { number: 22, text: 'A gerência do seu local de trabalho respeita você?', category: 'rewards', isInverted: false, scaleType: F },
  { number: 23, text: 'Você é tratado de forma justa no seu local de trabalho?', category: 'rewards', isInverted: false, scaleType: F },

  // Conflitos Laborais (24-26) — quanto maior, pior
  { number: 24, text: 'Você faz coisas no seu trabalho com as quais uns concordam mas outros não?', category: 'roleConflicts', isInverted: true, scaleType: F },
  { number: 25, text: 'Às vezes você tem que fazer coisas que deveriam ser feitas de outra maneira?', category: 'roleConflicts', isInverted: true, scaleType: F },
  { number: 26, text: 'Às vezes você tem que fazer coisas que considera desnecessárias?', category: 'roleConflicts', isInverted: true, scaleType: F },

  // Apoio Social de Colegas (27-29) — quanto maior, melhor
  { number: 27, text: 'Com que frequência você tem ajuda e apoio dos seus colegas de trabalho?', category: 'socialSupportColleagues', isInverted: false, scaleType: F },
  { number: 28, text: 'Com que frequência os seus colegas estão dispostos a ouvir você sobre os seus problemas de trabalho?', category: 'socialSupportColleagues', isInverted: false, scaleType: F },
  { number: 29, text: 'Com que frequência os seus colegas falam com você sobre o seu desempenho no trabalho?', category: 'socialSupportColleagues', isInverted: false, scaleType: F },

  // Apoio Social de Superiores (30-32) — quanto maior, melhor
  { number: 30, text: 'Com que frequência o seu superior imediato fala com você sobre como está o andamento do seu trabalho?', category: 'socialSupport', isInverted: false, scaleType: F },
  { number: 31, text: 'Com que frequência você tem ajuda e apoio do seu superior imediato?', category: 'socialSupport', isInverted: false, scaleType: F },
  { number: 32, text: 'Com que frequência o seu superior imediato fala com você em relação ao seu desempenho no trabalho?', category: 'socialSupport', isInverted: false, scaleType: F },

  // Comunidade Social no Trabalho (33-35) — quanto maior, melhor
  { number: 33, text: 'Existe um bom ambiente de trabalho entre você e os seus colegas?', category: 'socialCommunity', isInverted: false, scaleType: F },
  { number: 34, text: 'Existe uma boa cooperação entre os colegas de trabalho?', category: 'socialCommunity', isInverted: false, scaleType: F },
  { number: 35, text: 'No seu local de trabalho, você se sente parte de uma comunidade?', category: 'socialCommunity', isInverted: false, scaleType: F },

  // Qualidade da Liderança (36-39) — quanto maior, melhor
  // Intro: "Em relação à sua chefia direta, até que ponto considera que..."
  { number: 36, text: 'Oferece aos indivíduos e ao grupo boas oportunidades de desenvolvimento?', category: 'leadershipQuality', isInverted: false, scaleType: F },
  { number: 37, text: 'Dá prioridade à satisfação no trabalho?', category: 'leadershipQuality', isInverted: false, scaleType: F },
  { number: 38, text: 'É bom no planejamento do trabalho?', category: 'leadershipQuality', isInverted: false, scaleType: F },
  { number: 39, text: 'É bom em resolver conflitos?', category: 'leadershipQuality', isInverted: false, scaleType: F },

  // Confiança Horizontal (40-42) — quanto maior, pior (item 42 invertido na correção)
  // Intro: "As questões seguintes referem-se ao seu local de trabalho no seu todo."
  { number: 40, text: 'Os funcionários ocultam informações uns dos outros?', category: 'trustHorizontal', isInverted: true, scaleType: F },
  { number: 41, text: 'Os funcionários ocultam informação da gerência?', category: 'trustHorizontal', isInverted: true, scaleType: F },
  { number: 42, text: 'Os funcionários confiam uns nos outros de um modo geral?', category: 'trustHorizontal', isInverted: false, scaleType: F },

  // Confiança Vertical (43-45) — quanto maior, melhor (item 45 invertido na correção)
  { number: 43, text: 'A gerência confia nos seus funcionários para fazerem o seu trabalho bem?', category: 'trustVertical', isInverted: false, scaleType: F },
  { number: 44, text: 'Você confia na informação que lhe é transmitida pela gerência?', category: 'trustVertical', isInverted: false, scaleType: F },
  { number: 45, text: 'A gerência oculta informação dos seus funcionários?', category: 'trustVertical', isInverted: true, scaleType: F },

  // Justiça e Respeito (46-48) — quanto maior, melhor
  { number: 46, text: 'Os conflitos são resolvidos de uma forma justa?', category: 'justice', isInverted: false, scaleType: F },
  { number: 47, text: 'As sugestões dos funcionários são tratadas de forma séria pela gerência?', category: 'justice', isInverted: false, scaleType: F },
  { number: 48, text: 'O trabalho é distribuído de forma igual entre os funcionários?', category: 'justice', isInverted: false, scaleType: F },

  // Autoeficácia (49-50) — quanto maior, melhor
  { number: 49, text: 'Sou sempre capaz de resolver problemas, se tentar o suficiente.', category: 'selfEfficacy', isInverted: false, scaleType: F },
  { number: 50, text: 'É fácil para mim seguir os meus planos e atingir os meus objetivos.', category: 'selfEfficacy', isInverted: false, scaleType: F },

  // Significado do Trabalho (51-53) — quanto maior, melhor (escala de intensidade)
  { number: 51, text: 'O seu trabalho tem algum significado para você?', category: 'meaningOfWork', isInverted: false, scaleType: X },
  { number: 52, text: 'Você sente que o seu trabalho é importante?', category: 'meaningOfWork', isInverted: false, scaleType: X },
  { number: 53, text: 'Você se sente motivado e envolvido com o seu trabalho?', category: 'meaningOfWork', isInverted: false, scaleType: X },

  // Compromisso com o Local de Trabalho (54-55) — quanto maior, melhor (intensidade)
  { number: 54, text: 'Você gosta de falar com os outros sobre o seu local de trabalho?', category: 'commitment', isInverted: false, scaleType: X },
  { number: 55, text: 'Você sente que os problemas do seu local de trabalho são seus também?', category: 'commitment', isInverted: false, scaleType: X },

  // Satisfação no Trabalho (56-59) — quanto maior, melhor (intensidade)
  // Intro: "Em relação ao seu trabalho em geral, quão satisfeito está com..."
  { number: 56, text: 'As suas perspectivas de trabalho?', category: 'jobSatisfaction', isInverted: false, scaleType: X },
  { number: 57, text: 'As condições físicas do seu local de trabalho?', category: 'jobSatisfaction', isInverted: false, scaleType: X },
  { number: 58, text: 'A forma como as suas capacidades são utilizadas?', category: 'jobSatisfaction', isInverted: false, scaleType: X },
  { number: 59, text: 'O seu trabalho de uma forma global?', category: 'jobSatisfaction', isInverted: false, scaleType: X },

  // Insegurança no Trabalho (60) — quanto maior, pior (intensidade)
  { number: 60, text: 'Você se sente preocupado em ficar desempregado?', category: 'jobInsecurity', isInverted: true, scaleType: X },

  // Saúde Geral (61) — escala própria: 1=Excelente … 5=Deficitária (quanto maior, pior)
  { number: 61, text: 'Em geral, você sente que a sua saúde é:', category: 'selfRatedHealth', isInverted: true, scaleType: H },

  // Conflito Trabalho-Família (62-64) — quanto maior, pior (intensidade)
  // Intro: "As próximas três questões referem-se ao modo como o seu trabalho afeta a sua vida privada."
  { number: 62, text: 'Você sente que o seu trabalho lhe exige muita energia, que acaba por afetar a sua vida privada negativamente?', category: 'workFamilyConflict', isInverted: true, scaleType: X },
  { number: 63, text: 'Você sente que o seu trabalho lhe exige muito tempo, que acaba por afetar a sua vida privada negativamente?', category: 'workFamilyConflict', isInverted: true, scaleType: X },
  { number: 64, text: 'A sua família e os seus amigos dizem que você trabalha demais?', category: 'workFamilyConflict', isInverted: true, scaleType: X },

  // Problemas para Dormir (65-66) — últimas 4 semanas — quanto maior, pior
  // Intro: "Com que frequência, durante as últimas 4 semanas, você se sentiu..."
  { number: 65, text: 'Dificuldade para adormecer?', category: 'sleepProblems', isInverted: true, scaleType: F },
  { number: 66, text: 'Acordou várias vezes durante a noite e depois não conseguiu adormecer novamente?', category: 'sleepProblems', isInverted: true, scaleType: F },

  // Burnout (67-68) — últimas 4 semanas — quanto maior, pior
  { number: 67, text: 'Fisicamente exausto(a)?', category: 'burnout', isInverted: true, scaleType: F },
  { number: 68, text: 'Emocionalmente exausto(a)?', category: 'burnout', isInverted: true, scaleType: F },

  // Estresse (69-70) — últimas 4 semanas — quanto maior, pior
  { number: 69, text: 'Irritado(a)?', category: 'stress', isInverted: true, scaleType: F },
  { number: 70, text: 'Ansioso(a)?', category: 'stress', isInverted: true, scaleType: F },

  // Sintomas Depressivos (71-72) — últimas 4 semanas — quanto maior, pior
  { number: 71, text: 'Triste?', category: 'depressiveSymptoms', isInverted: true, scaleType: F },
  { number: 72, text: 'Falta de interesse por coisas do dia a dia?', category: 'depressiveSymptoms', isInverted: true, scaleType: F },

  // Comportamentos Ofensivos (73-76) — últimos 12 meses — quanto maior, pior
  // Intro: "Nos últimos 12 meses, no seu local de trabalho:"
  { number: 73, text: 'Você tem sido alvo de insultos ou provocações verbais?', category: 'offensiveBehaviors', isInverted: true, scaleType: F },
  { number: 74, text: 'Você tem sido exposto(a) a assédio sexual indesejado?', category: 'offensiveBehaviors', isInverted: true, scaleType: F },
  { number: 75, text: 'Você tem sido exposto(a) a ameaças de violência?', category: 'offensiveBehaviors', isInverted: true, scaleType: F },
  { number: 76, text: 'Você tem sido exposto(a) a violência física?', category: 'offensiveBehaviors', isInverted: true, scaleType: F },
];

export const COPSOQ_MEDIUM_QUESTIONS_SORTED = [...COPSOQ_MEDIUM_QUESTIONS].sort((a, b) => a.number - b.number);

export const getMediumQuestionsByCategory = (category: COPSOQMediumCategory): COPSOQMediumQuestion[] => {
  return COPSOQ_MEDIUM_QUESTIONS.filter(q => q.category === category);
};

export const MEDIUM_ALL_CATEGORIES: COPSOQMediumCategory[] = Object.keys(COPSOQ_MEDIUM_CATEGORY_LABELS) as COPSOQMediumCategory[];

// Agrupamento das 29 dimensões para exibição (domínios COPSOQ)
export const MEDIUM_CATEGORY_GROUPS: Record<string, COPSOQMediumCategory[]> = {
  'Exigências do Trabalho': ['quantitativeDemands', 'workPace', 'cognitiveDemands', 'emotionalDemands'],
  'Organização e Conteúdo do Trabalho': ['influence', 'developmentPossibilities', 'predictability', 'roleClarity', 'rewards', 'roleConflicts', 'meaningOfWork', 'commitment'],
  'Relações e Liderança': ['socialSupportColleagues', 'socialSupport', 'socialCommunity', 'leadershipQuality', 'trustHorizontal', 'trustVertical', 'justice', 'selfEfficacy'],
  'Interface Trabalho-Indivíduo': ['jobInsecurity', 'jobSatisfaction', 'workFamilyConflict'],
  'Saúde e Bem-Estar': ['selfRatedHealth', 'sleepProblems', 'burnout', 'stress', 'depressiveSymptoms', 'offensiveBehaviors'],
};

// Notas de seção exibidas ao respondente antes de determinados itens
export const MEDIUM_SECTION_NOTES: Record<number, string> = {
  36: 'Em relação à sua chefia direta, até que ponto você considera que...',
  40: 'As questões seguintes referem-se ao seu local de trabalho no seu todo.',
  56: 'Em relação ao seu trabalho em geral, quão satisfeito você está com...',
  62: 'As próximas três questões referem-se ao modo como o seu trabalho afeta a sua vida privada.',
  65: 'Com que frequência, durante as últimas 4 semanas, você se sentiu...',
  73: 'Nos últimos 12 meses, no seu local de trabalho:',
};

// ─── Pontuação (sistema do anexo) ───
// Normalização interna: 5 = favorável (mesma convenção da versão curta).
export function normalizeMediumScore(value: number, isInverted: boolean): number {
  return isInverted ? (6 - value) : value;
}

// Semáforo por tercis do PDF (cortes 2,33 e 3,66) aplicado ao score normalizado:
// > 3,66 favorável | > 2,33 intermediário | <= 2,33 risco
export function getMediumRiskLevel(normalizedScore: number): RiskLevel {
  if (normalizedScore > 3.66) return 'favorable';
  if (normalizedScore > 2.33) return 'intermediate';
  return 'risk';
}

export function calculateMediumCategoryAverage(
  answers: { questionNumber: number; value: number }[],
  category: COPSOQMediumCategory
): number {
  const categoryQuestions = getMediumQuestionsByCategory(category);
  const questionNumbers = categoryQuestions.map(q => q.number);

  const categoryAnswers = answers.filter(a => questionNumbers.includes(a.questionNumber));
  if (categoryAnswers.length === 0) return 0;

  const total = categoryAnswers.reduce((sum, answer) => {
    const question = categoryQuestions.find(q => q.number === answer.questionNumber);
    if (!question) return sum;
    return sum + normalizeMediumScore(answer.value, question.isInverted);
  }, 0);

  return total / categoryAnswers.length;
}

// Nota: o COPSOQ não define escore total oficial — este valor é apenas um
// indicador consolidado interno; a interpretação formal é por dimensão.
export function calculateMediumOverallAverage(
  answers: { questionNumber: number; value: number }[]
): number {
  if (answers.length === 0) return 0;

  const total = answers.reduce((sum, answer) => {
    const question = COPSOQ_MEDIUM_QUESTIONS.find(q => q.number === answer.questionNumber);
    if (!question) return sum;
    return sum + normalizeMediumScore(answer.value, question.isInverted);
  }, 0);

  return total / answers.length;
}
