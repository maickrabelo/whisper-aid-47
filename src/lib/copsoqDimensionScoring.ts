import {
  COPSOQ_CATEGORY_LABELS,
  ALL_CATEGORIES,
  calculateCategoryAverage,
  getRiskLevel,
  type COPSOQCategory,
  type RiskLevel,
} from '@/data/copsoqQuestions';
import {
  COPSOQ_MEDIUM_CATEGORY_LABELS,
  MEDIUM_ALL_CATEGORIES,
  calculateMediumCategoryAverage,
  getMediumRiskLevel,
  type COPSOQMediumCategory,
} from '@/data/copsoqMediumQuestions';
import { normalizeCOPSOQVersion } from '@/lib/copsoqVersion';

export interface COPSOQDimensionScore {
  category: string;
  label: string;
  average: number;
  riskLevel: RiskLevel;
}

export interface COPSOQAnswerRow {
  question_number: number;
  answer_value: number;
}

export function computeCOPSOQDimensions(rawAnswers: COPSOQAnswerRow[]): COPSOQDimensionScore[] {
  const answers = rawAnswers.map(a => ({ questionNumber: a.question_number, value: a.answer_value }));
  return ALL_CATEGORIES.map(cat => {
    const avg = calculateCategoryAverage(answers, cat);
    return {
      category: cat,
      label: COPSOQ_CATEGORY_LABELS[cat],
      average: avg,
      riskLevel: getRiskLevel(avg),
    };
  }).filter(d => d.average > 0);
}

export function computeCOPSOQMediumDimensions(rawAnswers: COPSOQAnswerRow[]): COPSOQDimensionScore[] {
  const answers = rawAnswers.map(a => ({ questionNumber: a.question_number, value: a.answer_value }));
  return MEDIUM_ALL_CATEGORIES.map(cat => {
    const avg = calculateMediumCategoryAverage(answers, cat);
    return {
      category: cat,
      label: COPSOQ_MEDIUM_CATEGORY_LABELS[cat],
      average: avg,
      riskLevel: getMediumRiskLevel(avg),
    };
  }).filter(d => d.average > 0);
}

/** Despacha o cálculo de dimensões conforme a versão do questionário da avaliação. */
export function computeCOPSOQDimensionsByVersion(
  version: string | null | undefined,
  rawAnswers: COPSOQAnswerRow[]
): COPSOQDimensionScore[] {
  return normalizeCOPSOQVersion(version) === 'medium'
    ? computeCOPSOQMediumDimensions(rawAnswers)
    : computeCOPSOQDimensions(rawAnswers);
}

// COPSOQ has 3 levels (favorable/intermediate/risk). Map to AEP severity/prob (matrix 5)
export function copsoqRiskToSevProb(riskLevel: RiskLevel): { severity: number; probability: number } {
  switch (riskLevel) {
    case 'risk':         return { severity: 5, probability: 4 };
    case 'intermediate': return { severity: 3, probability: 3 };
    case 'favorable':    return { severity: 1, probability: 2 };
  }
}

export function isHighRisk(riskLevel: RiskLevel): boolean {
  return riskLevel === 'risk';
}

export const COPSOQ_RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  favorable: 'Favorável',
  intermediate: 'Intermediário',
  risk: 'Risco',
};
