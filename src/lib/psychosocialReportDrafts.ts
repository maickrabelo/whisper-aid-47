import { supabase } from '@/integrations/supabase/client';

export type PsychosocialAssessmentType = 'hseit' | 'copsoq';

export const DEFAULT_RECOMMENDED_PERIODICITY = [
  'Reavaliação a cada 30 dias: Para dimensões em nível crítico (Intolerável)',
  'Reavaliação a cada 90 dias: Para dimensões em nível moderado',
  'Reavaliação a cada 180 dias: Monitoramento regular',
  'Reavaliação anual: Avaliação completa obrigatória',
].join('\n');

export interface PsychosocialReportDraftConfig {
  executiveSummary?: string;
  actionItems?: any[];
  scheduleItems?: any[];
  recommendedPeriodicity?: string;
  companyCnpj?: string;
  companyAddress?: string;
  companyCnae?: string;
  companyRiskGrade?: string;
  sstCpf?: string;
  sstRegistration?: string;
  technicianName?: string;
  orgResponsibleName?: string;
  orgResponsibleCpf?: string;
  orgResponsibleRole?: string;
}

export async function loadReportDraft(
  assessmentType: PsychosocialAssessmentType,
  assessmentId: string
): Promise<PsychosocialReportDraftConfig | null> {
  const { data, error } = await supabase
    .from('psychosocial_report_drafts')
    .select('config')
    .eq('assessment_type', assessmentType)
    .eq('assessment_id', assessmentId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao carregar última versão do relatório:', error);
    return null;
  }
  return (data?.config as PsychosocialReportDraftConfig) ?? null;
}

export async function saveReportDraft(
  assessmentType: PsychosocialAssessmentType,
  assessmentId: string,
  companyId: string | null | undefined,
  config: PsychosocialReportDraftConfig
): Promise<PsychosocialReportDraftConfig> {
  if (!companyId) {
    throw new Error('Empresa não identificada. Não foi possível salvar a última versão do relatório.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Sua sessão expirou. Entre novamente para salvar o relatório.');
  }

  const { data, error } = await supabase
    .from('psychosocial_report_drafts')
    .upsert(
      {
        assessment_type: assessmentType,
        assessment_id: assessmentId,
        company_id: companyId,
        config: config as any,
        created_by: userData.user.id,
      },
      { onConflict: 'assessment_type,assessment_id' }
    )
    .select('config')
    .single();

  if (error) {
    console.error('Erro ao salvar última versão do relatório:', error);
    throw new Error(`Não foi possível salvar a última versão: ${error.message}`);
  }

  const savedConfig = data?.config as PsychosocialReportDraftConfig | null;
  if (!savedConfig) {
    throw new Error('O banco não confirmou o salvamento da última versão do relatório.');
  }

  const expectedActionCount = config.actionItems?.length ?? 0;
  const savedActionCount = savedConfig.actionItems?.length ?? 0;
  const expectedScheduleCount = config.scheduleItems?.length ?? 0;
  const savedScheduleCount = savedConfig.scheduleItems?.length ?? 0;

  if (savedActionCount !== expectedActionCount || savedScheduleCount !== expectedScheduleCount) {
    throw new Error('O plano de ação não foi salvo por completo. Tente novamente antes de fechar a tela.');
  }

  return savedConfig;
}
