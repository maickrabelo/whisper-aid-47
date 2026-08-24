// COPSOQ II (Copenhagen Psychosocial Questionnaire) - Versão Curta
// Questionário de Avaliação de Riscos Psicossociais
// ~41 questões divididas em 23 dimensões

export type COPSOQScaleType = 'frequency' | 'intensity' | 'satisfaction' | 'extent' | 'health';

export interface COPSOQQuestion {
  number: number;
  text: string;
  category: COPSOQCategory;
  isInverted: boolean; // Se true, pontuação alta = desfavorável, precisa inverter
  scaleType: COPSOQScaleType;
}

export type COPSOQCategory =
  | 'quantitativeDemands'
  | 'workPace'
  | 'cognitiveDemands'
  | 'emotionalDemands'
  | 'influence'
  | 'developmentPossibilities'
  | 'meaningOfWork'
  | 'commitment'
  | 'predictability'
  | 'roleClarity'
  | 'roleConflicts'
  | 'leadershipQuality'
  | 'socialSupport'
  | 'socialCommunity'
  | 'jobInsecurity'
  | 'jobSatisfaction'
  | 'workFamilyConflict'
  | 'burnout'
  | 'stress'
  | 'selfRatedHealth'
  | 'trust'
  | 'justice'
  | 'offensiveBehaviors';

export const COPSOQ_CATEGORY_LABELS: Record<COPSOQCategory, string> = {
  quantitativeDemands: 'Exigências Quantitativas',
  workPace: 'Ritmo de Trabalho',
  cognitiveDemands: 'Exigências Cognitivas',
  emotionalDemands: 'Exigências Emocionais',
  influence: 'Influência no Trabalho',
  developmentPossibilities: 'Possibilidades de Desenvolvimento',
  meaningOfWork: 'Significado do Trabalho',
  commitment: 'Compromisso com o Local de Trabalho',
  predictability: 'Previsibilidade',
  roleClarity: 'Clareza de Papel',
  roleConflicts: 'Conflitos de Papel',
  leadershipQuality: 'Qualidade da Liderança',
  socialSupport: 'Apoio Social de Superiores',
  socialCommunity: 'Comunidade Social no Trabalho',
  jobInsecurity: 'Insegurança no Trabalho',
  jobSatisfaction: 'Satisfação no Trabalho',
  workFamilyConflict: 'Conflito Trabalho-Família',
  burnout: 'Burnout',
  stress: 'Estresse',
  selfRatedHealth: 'Saúde Geral Auto-avaliada',
  trust: 'Confiança na Gestão',
  justice: 'Justiça e Respeito',
  offensiveBehaviors: 'Comportamentos Ofensivos',
};

export const COPSOQ_CATEGORY_COLORS: Record<COPSOQCategory, string> = {
  quantitativeDemands: '#ef4444',
  workPace: '#f97316',
  cognitiveDemands: '#eab308',
  emotionalDemands: '#dc2626',
  influence: '#3b82f6',
  developmentPossibilities: '#22c55e',
  meaningOfWork: '#10b981',
  commitment: '#06b6d4',
  predictability: '#8b5cf6',
  roleClarity: '#6366f1',
  roleConflicts: '#f43f5e',
  leadershipQuality: '#14b8a6',
  socialSupport: '#2563eb',
  socialCommunity: '#7c3aed',
  jobInsecurity: '#b91c1c',
  jobSatisfaction: '#16a34a',
  workFamilyConflict: '#ea580c',
  burnout: '#991b1b',
  stress: '#be123c',
  selfRatedHealth: '#059669',
  trust: '#4f46e5',
  justice: '#0891b2',
  offensiveBehaviors: '#9f1239',
};

// Categorias que representam riscos (pontuação alta = ruim)
const RISK_CATEGORIES: COPSOQCategory[] = [
  'quantitativeDemands', 'workPace', 'cognitiveDemands', 'emotionalDemands',
  'roleConflicts', 'jobInsecurity', 'workFamilyConflict', 'burnout', 'stress',
  'offensiveBehaviors',
];

// Categorias que representam recursos (pontuação alta = bom)
const RESOURCE_CATEGORIES: COPSOQCategory[] = [
  'influence', 'developmentPossibilities', 'meaningOfWork', 'commitment',
  'predictability', 'roleClarity', 'leadershipQuality', 'socialSupport',
  'socialCommunity', 'jobSatisfaction', 'selfRatedHealth', 'trust', 'justice',
];

// Escalas Likert por tipo
export const COPSOQ_SCALES = {
  frequency: [
    { value: 1, label: 'Nunca / Quase nunca' },
    { value: 2, label: 'Raramente' },
    { value: 3, label: 'Às vezes' },
    { value: 4, label: 'Frequentemente' },
    { value: 5, label: 'Sempre' },
  ],
  intensity: [
    { value: 1, label: 'Nada / Quase nada' },
    { value: 2, label: 'Um pouco' },
    { value: 3, label: 'Moderadamente' },
    { value: 4, label: 'Muito' },
    { value: 5, label: 'Extremamente' },
  ],
  satisfaction: [
    { value: 1, label: 'Muito insatisfeito' },
    { value: 2, label: 'Insatisfeito' },
    { value: 3, label: 'Nem satisfeito nem insatisfeito' },
    { value: 4, label: 'Satisfeito' },
    { value: 5, label: 'Muito satisfeito' },
  ],
  extent: [
    { value: 1, label: 'Nada / Quase nada' },
    { value: 2, label: 'Um pouco' },
    { value: 3, label: 'Moderadamente' },
    { value: 4, label: 'Muito' },
    { value: 5, label: 'Extremamente' },
  ],
  // Escala exclusiva do item de Saúde Geral (versão média, item 61)
  health: [
    { value: 1, label: 'Excelente' },
    { value: 2, label: 'Muito boa' },
    { value: 3, label: 'Boa' },
    { value: 4, label: 'Razoável' },
    { value: 5, label: 'Deficitária' },
  ],
};

// Escala padrão de frequência (usada na maioria das questões)
export const COPSOQ_LIKERT_OPTIONS = COPSOQ_SCALES.frequency;

// 41 Questões do COPSOQ II Versão Curta (tradução PT-BR validada)
export const COPSOQ_QUESTIONS: COPSOQQuestion[] = [
  // Exigências Quantitativas (2 itens)
  { number: 1, text: 'A sua carga de trabalho se acumula por não ser realizada no dia a dia?', category: 'quantitativeDemands', isInverted: true, scaleType: 'frequency' },
  { number: 2, text: 'Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?', category: 'quantitativeDemands', isInverted: true, scaleType: 'frequency' },

  // Ritmo de Trabalho (1 item)
  { number: 3, text: 'Precisa trabalhar num ritmo muito rápido?', category: 'workPace', isInverted: true, scaleType: 'frequency' },

  // Exigências Cognitivas (2 itens)
  { number: 4, text: 'O seu trabalho exige que você tome decisões difíceis?', category: 'cognitiveDemands', isInverted: true, scaleType: 'frequency' },
  { number: 5, text: 'O seu trabalho exige que você se lembre de muitas coisas?', category: 'cognitiveDemands', isInverted: true, scaleType: 'frequency' },

  // Exigências Emocionais (1 item)
  { number: 6, text: 'O seu trabalho o coloca em situações emocionalmente perturbadoras?', category: 'emotionalDemands', isInverted: true, scaleType: 'frequency' },

  // Influência no Trabalho (2 itens)
  { number: 7, text: 'Você tem grande influência sobre decisões no seu trabalho?', category: 'influence', isInverted: false, scaleType: 'frequency' },
  { number: 8, text: 'Você tem influência sobre a quantidade de trabalho que lhe é atribuída?', category: 'influence', isInverted: false, scaleType: 'frequency' },

  // Possibilidades de Desenvolvimento (2 itens)
  { number: 9, text: 'O seu trabalho permite que você aprenda coisas novas?', category: 'developmentPossibilities', isInverted: false, scaleType: 'extent' },
  { number: 10, text: 'Você pode usar suas habilidades ou competências no seu trabalho?', category: 'developmentPossibilities', isInverted: false, scaleType: 'extent' },

  // Significado do Trabalho (2 itens)
  { number: 11, text: 'O seu trabalho é significativo?', category: 'meaningOfWork', isInverted: false, scaleType: 'extent' },
  { number: 12, text: 'Você sente que o trabalho que faz é importante?', category: 'meaningOfWork', isInverted: false, scaleType: 'extent' },

  // Compromisso com o Local de Trabalho (2 itens)
  { number: 13, text: 'Você gosta de falar sobre o seu local de trabalho para outras pessoas?', category: 'commitment', isInverted: false, scaleType: 'extent' },
  { number: 14, text: 'Você sente que os problemas do seu local de trabalho são seus também?', category: 'commitment', isInverted: false, scaleType: 'extent' },

  // Previsibilidade (2 itens)
  { number: 15, text: 'No seu local de trabalho, você é informado com antecedência sobre decisões importantes, mudanças ou planos para o futuro?', category: 'predictability', isInverted: false, scaleType: 'extent' },
  { number: 16, text: 'Você recebe toda a informação de que precisa para fazer bem o seu trabalho?', category: 'predictability', isInverted: false, scaleType: 'extent' },

  // Clareza de Papel (2 itens)
  { number: 17, text: 'O seu trabalho tem objetivos claros?', category: 'roleClarity', isInverted: false, scaleType: 'extent' },
  { number: 18, text: 'Você sabe exatamente quais são as suas responsabilidades?', category: 'roleClarity', isInverted: false, scaleType: 'extent' },

  // Conflitos de Papel (2 itens)
  { number: 19, text: 'São feitas exigências contraditórias no seu trabalho?', category: 'roleConflicts', isInverted: true, scaleType: 'frequency' },
  { number: 20, text: 'Às vezes tem que fazer coisas que deveriam ser feitas de outra forma?', category: 'roleConflicts', isInverted: true, scaleType: 'frequency' },

  // Qualidade da Liderança (2 itens)
  { number: 21, text: 'Em que medida a sua chefia imediata oferece oportunidades de desenvolvimento individual?', category: 'leadershipQuality', isInverted: false, scaleType: 'extent' },
  { number: 22, text: 'Em que medida a sua chefia imediata dá prioridade à satisfação no trabalho?', category: 'leadershipQuality', isInverted: false, scaleType: 'extent' },

  // Apoio Social de Superiores (2 itens)
  { number: 23, text: 'Com que frequência a sua chefia imediata conversa sobre como você realiza o trabalho?', category: 'socialSupport', isInverted: false, scaleType: 'frequency' },
  { number: 24, text: 'Com que frequência você recebe ajuda e apoio da sua chefia imediata?', category: 'socialSupport', isInverted: false, scaleType: 'frequency' },

  // Comunidade Social no Trabalho (2 itens)
  { number: 25, text: 'Existe um bom ambiente de trabalho entre você e seus colegas?', category: 'socialCommunity', isInverted: false, scaleType: 'frequency' },
  { number: 26, text: 'Existe boa cooperação entre seus colegas de trabalho?', category: 'socialCommunity', isInverted: false, scaleType: 'frequency' },

  // Insegurança no Trabalho (1 item)
  { number: 27, text: 'Você se sente preocupado em ficar desempregado?', category: 'jobInsecurity', isInverted: true, scaleType: 'extent' },

  // Satisfação no Trabalho (2 itens)
  { number: 28, text: 'Em relação ao seu trabalho de uma forma geral, quão satisfeito está?', category: 'jobSatisfaction', isInverted: false, scaleType: 'satisfaction' },
  { number: 29, text: 'Em relação às suas perspectivas de trabalho, quão satisfeito está?', category: 'jobSatisfaction', isInverted: false, scaleType: 'satisfaction' },

  // Conflito Trabalho-Família (2 itens)
  { number: 30, text: 'Você sente que o seu trabalho exige muita energia, afetando negativamente a sua vida privada?', category: 'workFamilyConflict', isInverted: true, scaleType: 'frequency' },
  { number: 31, text: 'Você sente que o seu trabalho ocupa tanto do seu tempo que afeta negativamente a sua vida privada?', category: 'workFamilyConflict', isInverted: true, scaleType: 'frequency' },

  // Burnout (2 itens)
  { number: 32, text: 'Com que frequência se sente fisicamente exausto?', category: 'burnout', isInverted: true, scaleType: 'frequency' },
  { number: 33, text: 'Com que frequência se sente emocionalmente exausto?', category: 'burnout', isInverted: true, scaleType: 'frequency' },

  // Estresse (2 itens)
  { number: 34, text: 'Com que frequência se sente irritado?', category: 'stress', isInverted: true, scaleType: 'frequency' },
  { number: 35, text: 'Com que frequência se sente tenso?', category: 'stress', isInverted: true, scaleType: 'frequency' },

  // Saúde Geral Auto-avaliada (1 item)
  { number: 36, text: 'Em geral, como avalia a sua saúde?', category: 'selfRatedHealth', isInverted: false, scaleType: 'intensity' },

  // Confiança na Gestão (2 itens)
  { number: 37, text: 'A administração do seu local de trabalho é confiável?', category: 'trust', isInverted: false, scaleType: 'extent' },
  { number: 38, text: 'Você confia na informação que vem da administração?', category: 'trust', isInverted: false, scaleType: 'extent' },

  // Justiça e Respeito (2 itens)
  { number: 39, text: 'Os conflitos são resolvidos de forma justa?', category: 'justice', isInverted: false, scaleType: 'extent' },
  { number: 40, text: 'O trabalho é distribuído de forma justa?', category: 'justice', isInverted: false, scaleType: 'extent' },

  // Comportamentos Ofensivos (1 item)
  { number: 41, text: 'Nos últimos 12 meses, foi alvo de intimidação, assédio moral (bullying) ou alguma forma de violência no local de trabalho?', category: 'offensiveBehaviors', isInverted: true, scaleType: 'frequency' },
];

// Ordenar questões por número
export const COPSOQ_QUESTIONS_SORTED = [...COPSOQ_QUESTIONS].sort((a, b) => a.number - b.number);

// Obter questões por categoria
export const getQuestionsByCategory = (category: COPSOQCategory): COPSOQQuestion[] => {
  return COPSOQ_QUESTIONS.filter(q => q.category === category);
};

// Limiares de classificação de risco
export type RiskLevel = 'favorable' | 'intermediate' | 'risk';

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  favorable: 'Favorável',
  intermediate: 'Intermediário',
  risk: 'Risco',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  favorable: '#22c55e',
  intermediate: '#eab308',
  risk: '#ef4444',
};

// Para categorias de RISCO (alto = ruim): normalizar para que 5 = favorável
// Para categorias de RECURSO (alto = bom): manter como está
export function normalizeScore(value: number, isInverted: boolean): number {
  return isInverted ? (6 - value) : value;
}

// Classificação: score normalizado (1-5 onde 5 = favorável)
export function getRiskLevel(normalizedScore: number): RiskLevel {
  if (normalizedScore >= 3.67) return 'favorable';
  if (normalizedScore >= 2.33) return 'intermediate';
  return 'risk';
}

// Calcular média de uma categoria (score normalizado)
export function calculateCategoryAverage(
  answers: { questionNumber: number; value: number }[],
  category: COPSOQCategory
): number {
  const categoryQuestions = getQuestionsByCategory(category);
  const questionNumbers = categoryQuestions.map(q => q.number);

  const categoryAnswers = answers.filter(a => questionNumbers.includes(a.questionNumber));
  if (categoryAnswers.length === 0) return 0;

  const total = categoryAnswers.reduce((sum, answer) => {
    const question = categoryQuestions.find(q => q.number === answer.questionNumber);
    if (!question) return sum;
    return sum + normalizeScore(answer.value, question.isInverted);
  }, 0);

  return total / categoryAnswers.length;
}

// Calcular média geral
export function calculateOverallAverage(
  answers: { questionNumber: number; value: number }[]
): number {
  if (answers.length === 0) return 0;

  const total = answers.reduce((sum, answer) => {
    const question = COPSOQ_QUESTIONS.find(q => q.number === answer.questionNumber);
    if (!question) return sum;
    return sum + normalizeScore(answer.value, question.isInverted);
  }, 0);

  return total / answers.length;
}

// Verificar se categoria é de risco
export function isRiskCategory(category: COPSOQCategory): boolean {
  return RISK_CATEGORIES.includes(category);
}

// Obter todas as categorias
export const ALL_CATEGORIES: COPSOQCategory[] = Object.keys(COPSOQ_CATEGORY_LABELS) as COPSOQCategory[];

// Agrupar categorias para exibição
export const CATEGORY_GROUPS = {
  'Exigências do Trabalho': ['quantitativeDemands', 'workPace', 'cognitiveDemands', 'emotionalDemands'] as COPSOQCategory[],
  'Organização e Conteúdo': ['influence', 'developmentPossibilities', 'meaningOfWork', 'commitment'] as COPSOQCategory[],
  'Relações e Liderança': ['predictability', 'roleClarity', 'roleConflicts', 'leadershipQuality', 'socialSupport', 'socialCommunity'] as COPSOQCategory[],
  'Interface Trabalho-Indivíduo': ['jobInsecurity', 'jobSatisfaction', 'workFamilyConflict'] as COPSOQCategory[],
  'Saúde e Bem-estar': ['burnout', 'stress', 'selfRatedHealth'] as COPSOQCategory[],
  'Valores no Local de Trabalho': ['trust', 'justice', 'offensiveBehaviors'] as COPSOQCategory[],
};
