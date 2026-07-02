import {
  HSEIT_CATEGORY_LABELS,
  HSEIT_QUESTIONS,
  type HSEITCategory,
  type RiskLevel,
  calculateCategoryAverage,
  getRiskLevel,
  normalizeScore,
} from '@/data/hseitQuestions';

export interface HSEITDimensionScore {
  category: HSEITCategory;
  label: string;
  average: number;
  riskLevel: RiskLevel;
}

export interface HSEITAnswerRow {
  question_number: number;
  answer_value: number;
}

export function computeHSEITDimensions(rawAnswers: HSEITAnswerRow[]): HSEITDimensionScore[] {
  const answers = rawAnswers.map(a => ({ questionNumber: a.question_number, value: a.answer_value }));
  const categories: HSEITCategory[] = ['demands', 'control', 'managerSupport', 'peerSupport', 'relationships', 'role', 'change'];
  return categories.map(cat => {
    const avg = calculateCategoryAverage(answers, cat);
    return {
      category: cat,
      label: HSEIT_CATEGORY_LABELS[cat],
      average: avg,
      riskLevel: getRiskLevel(avg),
    };
  });
}

// Map normalized HSE-IT risk to AEP severity/probability (matrix 5)
export function hseitRiskToSevProb(riskLevel: RiskLevel): { severity: number; probability: number } {
  switch (riskLevel) {
    case 'very_high': return { severity: 5, probability: 5 };
    case 'high':      return { severity: 4, probability: 4 };
    case 'moderate':  return { severity: 3, probability: 3 };
    case 'low':       return { severity: 2, probability: 2 };
    case 'very_low':  return { severity: 1, probability: 1 };
  }
}

export function isHighRisk(riskLevel: RiskLevel): boolean {
  return riskLevel === 'high' || riskLevel === 'very_high';
}
