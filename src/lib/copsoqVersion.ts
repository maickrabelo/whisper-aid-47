// Helper central para resolver os dados do questionário COPSOQ II conforme a
// versão configurada na avaliação ('short' = 41 questões/23 dimensões,
// 'medium' = 76 questões/29 dimensões — Silva et al. 2011).

import {
  COPSOQ_QUESTIONS_SORTED,
  COPSOQ_CATEGORY_LABELS,
  CATEGORY_GROUPS,
  ALL_CATEGORIES,
  normalizeScore,
  calculateCategoryAverage,
  calculateOverallAverage,
  getRiskLevel,
  type RiskLevel,
  type COPSOQScaleType,
  type COPSOQCategory,
} from '@/data/copsoqQuestions';
import {
  COPSOQ_MEDIUM_QUESTIONS_SORTED,
  COPSOQ_MEDIUM_CATEGORY_LABELS,
  MEDIUM_CATEGORY_GROUPS,
  MEDIUM_ALL_CATEGORIES,
  normalizeMediumScore,
  calculateMediumCategoryAverage,
  calculateMediumOverallAverage,
  getMediumRiskLevel,
  type COPSOQMediumCategory,
} from '@/data/copsoqMediumQuestions';

export type COPSOQVersion = 'short' | 'medium';

export interface COPSOQGenericQuestion {
  number: number;
  text: string;
  category: string;
  isInverted: boolean;
  scaleType: COPSOQScaleType;
}

export interface COPSOQVersionData {
  version: COPSOQVersion;
  /** Nome curto da versão, ex.: "Versão Média" */
  versionLabel: string;
  /** Descrição curta, ex.: "76 questões · 29 dimensões" */
  versionDescription: string;
  /** Texto para capa/metodologia do PDF */
  instrumentLabel: string;
  questionCount: number;
  dimensionCount: number;
  questions: COPSOQGenericQuestion[];
  categoryLabels: Record<string, string>;
  categoryGroups: Record<string, string[]>;
  allCategories: string[];
  normalizeScore: (value: number, isInverted: boolean) => number;
  calculateCategoryAverage: (answers: { questionNumber: number; value: number }[], category: string) => number;
  calculateOverallAverage: (answers: { questionNumber: number; value: number }[]) => number;
  getRiskLevel: (score: number) => RiskLevel;
}

export function normalizeCOPSOQVersion(version?: string | null): COPSOQVersion {
  return version === 'medium' ? 'medium' : 'short';
}

export function getCOPSOQVersionData(version?: string | null): COPSOQVersionData {
  if (normalizeCOPSOQVersion(version) === 'medium') {
    return {
      version: 'medium',
      versionLabel: 'Versão Média',
      versionDescription: '76 questões · 29 dimensões',
      instrumentLabel: 'Copenhagen Psychosocial Questionnaire (versão média — 76 itens, Silva et al. 2011)',
      questionCount: 76,
      dimensionCount: 29,
      questions: COPSOQ_MEDIUM_QUESTIONS_SORTED,
      categoryLabels: COPSOQ_MEDIUM_CATEGORY_LABELS,
      categoryGroups: MEDIUM_CATEGORY_GROUPS,
      allCategories: MEDIUM_ALL_CATEGORIES,
      normalizeScore: normalizeMediumScore,
      calculateCategoryAverage: (answers, category) =>
        calculateMediumCategoryAverage(answers, category as COPSOQMediumCategory),
      calculateOverallAverage: calculateMediumOverallAverage,
      getRiskLevel: getMediumRiskLevel,
    };
  }
  return {
    version: 'short',
    versionLabel: 'Versão Curta',
    versionDescription: '41 questões · 23 dimensões',
    instrumentLabel: 'Copenhagen Psychosocial Questionnaire (versão curta)',
    questionCount: 41,
    dimensionCount: 23,
    questions: COPSOQ_QUESTIONS_SORTED,
    categoryLabels: COPSOQ_CATEGORY_LABELS,
    categoryGroups: CATEGORY_GROUPS,
    allCategories: ALL_CATEGORIES,
    normalizeScore,
    calculateCategoryAverage: (answers, category) =>
      calculateCategoryAverage(answers, category as COPSOQCategory),
    calculateOverallAverage,
    getRiskLevel,
  };
}
