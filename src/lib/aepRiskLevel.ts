export type MatrixSize = 3 | 4 | 5;

export const classifyRisk = (size: MatrixSize, severity: number, probability: number): string => {
  const v = severity * probability;
  if (size === 3) {
    if (v >= 9) return 'intolerable';
    if (v >= 6) return 'substantial';
    if (v >= 3) return 'moderate';
    if (v >= 2) return 'tolerable';
    return 'trivial';
  }
  if (size === 4) {
    if (v >= 15) return 'intolerable';
    if (v >= 9) return 'substantial';
    if (v >= 5) return 'moderate';
    if (v >= 3) return 'tolerable';
    return 'trivial';
  }
  if (v >= 20) return 'intolerable';
  if (v >= 15) return 'substantial';
  if (v >= 8) return 'moderate';
  if (v >= 4) return 'tolerable';
  return 'trivial';
};

export const LEVEL_STYLES: Record<string, string> = {
  trivial: 'bg-green-100 text-green-700',
  tolerable: 'bg-lime-100 text-lime-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  substantial: 'bg-orange-100 text-orange-700',
  intolerable: 'bg-red-100 text-red-700',
};
export const LEVEL_LABELS: Record<string, string> = {
  trivial: 'Trivial', tolerable: 'Tolerável', moderate: 'Moderado',
  substantial: 'Substancial', intolerable: 'Intolerável',
};

export const AEP_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  in_review: 'Em revisão',
  revised: 'Revisada',
};

export const AEP_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  in_review: 'bg-amber-100 text-amber-700',
  revised: 'bg-purple-100 text-purple-700',
};

/** Categoria da AEP → categoria do PGR (para pgr_risks.category) */
export const aepCategoriaToPgr = (c: string): string => {
  if (c === 'psicossocial') return 'psicossocial';
  return 'ergonomico';
};
