import { supabase } from '@/integrations/supabase/client';

export type PsychosocialAssessmentType = 'hseit' | 'copsoq';

export interface PsychosocialReportDraftConfig {
  executiveSummary?: string;
  actionItems?: any[];
  scheduleItems?: any[];
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
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('psychosocial_report_drafts')
    .upsert(
      {
        assessment_type: assessmentType,
        assessment_id: assessmentId,
        company_id: companyId ?? null,
        config: config as any,
        created_by: userData?.user?.id ?? null,
      },
      { onConflict: 'assessment_type,assessment_id' }
    );

  if (error) console.error('Erro ao salvar última versão do relatório:', error);
}
