/**
 * validateLtcatForPublication — validador de publicação do LTCAT beta.
 * Bloqueios essenciais: identificação, responsável técnico, estrutura de
 * GHEs e conclusão humana de todas as exposições.
 */

export interface LTCATDocForValidation {
  company_id?: string | null;
  title?: string | null;
  reference_period_start?: string | null;
  reference_period_end?: string | null;
  emission_date?: string | null;
  responsible?: Record<string, any> | null;
}

export interface LTCATGheForValidation {
  id: string;
  name: string;
  roles_meta?: any[] | null;
}

export interface LTCATExposureForValidation {
  id: string;
  ghe_id: string;
  agent_name: string;
  exposure_type?: string | null;
  conclusion_status: string;
  exposure_present?: boolean | null;
  conclusion_text?: string | null;
  engine_output?: any;
}

export interface LTCATValidationResult {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  checkedAt: string;
}

export function validateLtcatForPublication(
  doc: LTCATDocForValidation,
  ghes: LTCATGheForValidation[],
  exposures: LTCATExposureForValidation[],
): LTCATValidationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!doc.company_id) blockers.push('Empresa não vinculada ao documento.');
  if (!doc.title?.trim()) blockers.push('Título do documento ausente.');
  if (!doc.reference_period_start || !doc.reference_period_end) {
    blockers.push('Período de referência (início e fim) não informado.');
  }

  const r = doc.responsible || {};
  const missingResp: string[] = [];
  if (!r.nome?.trim()) missingResp.push('nome');
  if (!r.cpf?.trim()) missingResp.push('CPF');
  if (!r.conselho?.trim()) missingResp.push('conselho profissional');
  if (!r.numero_registro?.trim()) missingResp.push('nº de registro');
  if (!r.habilitacao?.trim()) missingResp.push('habilitação');
  if (missingResp.length) {
    blockers.push(`Responsável técnico incompleto: ${missingResp.join(', ')}.`);
  }

  if (ghes.length === 0) {
    blockers.push('Nenhum GHE cadastrado.');
  } else {
    const noRoles = ghes.filter((g) => !Array.isArray(g.roles_meta) || g.roles_meta.length === 0);
    if (noRoles.length) {
      blockers.push(`GHE(s) sem função/cargo: ${noRoles.map((g) => g.name).join(', ')}.`);
    }
  }

  const pending = exposures.filter((e) => e.conclusion_status === 'PENDING');
  if (pending.length) {
    blockers.push(
      `${pending.length} exposição(ões) sem conclusão humana: ${pending.map((e) => e.agent_name).join(', ')}.`,
    );
  }
  const noText = exposures.filter(
    (e) => e.conclusion_status !== 'PENDING' && !(e.conclusion_text || '').trim(),
  );
  if (noText.length) {
    blockers.push(
      `Exposição(ões) concluída(s) sem fundamentação: ${noText.map((e) => e.agent_name).join(', ')}.`,
    );
  }

  const inReview = exposures.filter((e) => e.conclusion_status === 'REVISAO_HUMANA');
  if (inReview.length) {
    warnings.push(
      `${inReview.length} exposição(ões) marcada(s) para revisão humana serão publicadas com essa indicação.`,
    );
  }
  const noEngine = exposures.filter((e) => !e.engine_output && e.exposure_present !== false);
  if (noEngine.length) {
    warnings.push(`${noEngine.length} exposição(ões) sem consulta ao motor jurídico registrada.`);
  }
  exposures.forEach((e) => {
    if (e.exposure_present === false) return;
    if (!e.exposure_type) warnings.push(`Exposição "${e.agent_name}" sem tipo de exposição informado.`);
  });

  return { ok: blockers.length === 0, blockers, warnings, checkedAt: new Date().toISOString() };
}
