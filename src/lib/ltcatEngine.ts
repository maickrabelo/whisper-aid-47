import { supabase } from '@/integrations/supabase/client';

export interface EngineConsultInput {
  rule_key: string;
  input: Record<string, unknown>;
  ltcat_id?: string;
  exposure_id?: string;
}

export interface EngineOutput {
  outcome?: string;
  result_status?: string;
  matched?: boolean;
  reason?: string;
  reasoning_summary?: string;
  rule_key?: string;
  rule_version?: number;
  rule_checksum?: string;
  operator?: string;
  unit?: string;
  methodology?: string | null;
  measured_value?: number | null;
  threshold?: number | null;
  requires_human_confirmation?: boolean;
  blocking_conflicts?: string[];
  missing_information?: string[];
  source_references?: Array<{ authority_type?: string; number?: string; year?: number; title?: string; role?: string }>;
  advisory?: string;
  previous_outcome?: string;
  suggested_required_years?: number;
  [key: string]: unknown;
}

/**
 * Consulta o motor jurídico via edge function (EXECUTE do RPC é restrito a
 * service_role). A edge function valida JWT + flag LTCAT_BETA e grava a
 * trilha de auditoria.
 */
export async function consultLegalEngine(params: EngineConsultInput): Promise<EngineOutput> {
  const { data, error } = await supabase.functions.invoke('ltcat-engine', {
    body: {
      action: 'resolve',
      rule_key: params.rule_key,
      input: params.input,
      ltcat_id: params.ltcat_id,
      exposure_id: params.exposure_id,
    },
  });
  if (error) throw new Error(error.message || 'Falha na consulta ao motor jurídico');
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.output as EngineOutput;
}

export interface LegalRuleOption {
  rule_key: string;
  title: string;
  agent_id: string | null;
  automation_level: string | null;
}

export interface OccupationalAgent {
  id: string;
  internal_code: string;
  name: string;
  category: string;
}

/** Catálogo de regras + agentes (RLS libera SELECT para usuários LTCAT_BETA). */
export async function loadEngineCatalog(): Promise<{ rules: LegalRuleOption[]; agents: OccupationalAgent[] }> {
  const [{ data: rules, error: e1 }, { data: agents, error: e2 }] = await Promise.all([
    supabase
      .from('legal_rules' as any)
      .select('rule_key, title, agent_id, automation_level')
      .eq('active', true)
      .order('rule_key'),
    supabase
      .from('occupational_agents' as any)
      .select('id, internal_code, name, category')
      .eq('active', true)
      .order('internal_code'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    rules: (rules as any[] || []) as LegalRuleOption[],
    agents: (agents as any[] || []) as OccupationalAgent[],
  };
}

export const AGENT_CATEGORY_LABELS: Record<string, string> = {
  PHYSICAL: 'Físico',
  CHEMICAL: 'Químico',
  BIOLOGICAL: 'Biológico',
  ASSOCIATION: 'Associação de agentes',
  OTHER: 'Outros',
};

/** Ordem de exibição das categorias no seletor de agentes. */
export const AGENT_CATEGORY_ORDER = ['PHYSICAL', 'CHEMICAL', 'BIOLOGICAL', 'ASSOCIATION', 'OTHER'];

/** Exemplos dos agentes mais utilizados em cada categoria (texto de apoio). */
export const AGENT_CATEGORY_HINTS: Record<string, string> = {
  PHYSICAL: 'Mais usados: Ruído e Temperatura (calor/frio).',
  CHEMICAL: 'Descreva o agente químico avaliado nas observações.',
  BIOLOGICAL: 'Descreva o agente biológico avaliado nas observações.',
  ASSOCIATION: 'Associação de fatores de risco (Anexo IV).',
  OTHER: 'Demais agentes do catálogo interno.',
};

export const OUTCOME_LABELS: Record<string, string> = {
  RULE_MATCHED: 'Regra aplicada',
  THRESHOLD_EXCEEDED: 'Limite excedido',
  THRESHOLD_NOT_EXCEEDED: 'Limite não excedido',
  REQUIRES_HUMAN_CONFIRMATION: 'Exige confirmação humana',
  LEGAL_CONFLICT_REQUIRES_REVIEW: 'Conflito jurídico — revisão humana',
  INCONCLUSIVE: 'Inconclusivo',
  NO_RULE_FOUND: 'Nenhuma regra encontrada',
  NOT_PARAMETERIZED: 'Não parametrizado',
  REFERENCE_ONLY: 'Somente referência',
  ACCESS_DENIED: 'Acesso negado',
};
