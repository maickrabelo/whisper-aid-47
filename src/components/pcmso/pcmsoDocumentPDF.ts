import { jsPDF } from 'jspdf';
import { installPdfTextSafety } from '@/lib/pdfTextSafety';
import { formatPdfAddress, formatPdfSector } from '@/lib/pdfDisplayFormat';

type RecordData = Record<string, any>;
export interface PcmsoDocumentPayload { kind: 'minuta' | 'aprovado'; content: RecordData; hash: string; physician?: RecordData; approved_at?: string }
const examTypes: Record<string, string> = { admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao trabalho', mudanca_risco: 'Mudança de riscos ocupacionais', demissional: 'Demissional' };
const date = (value: unknown) => value ? String(value).slice(0, 10).split('-').reverse().join('/') : 'Não informado';

/** Pure renderer: approved evidence is provided by the authorized snapshot RPC, never live joins. */
export function createPcmsoPDF(payload: PcmsoDocumentPayload): jsPDF {
  const pdf = new jsPDF();
  installPdfTextSafety(pdf);
  pdf.setProperties({ title: String(payload.content.program?.title ?? 'PCMSO'), subject: `PCMSO - ${payload.kind}`, author: 'PCMSO', creator: 'PCMSO' });
  const content = payload.content;
  const company = content.company ?? {};
  const program = content.program ?? {};
  const settings = content.document_settings ?? {};
  const sources: RecordData[] = content.inventory ?? [];
  let y = 26;
  const ensure = (height = 6) => { if (y + height > 274) { pdf.addPage(); y = 26; } };
  const line = (text: unknown, bold = false, size = 10) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    const lines: string[] = pdf.splitTextToSize(String(text ?? ''), 172);
    for (const item of lines) { ensure(); pdf.text(item, 19, y); y += 5.5; }
    y += 2;
  };
  const section = (title: string) => { ensure(20); y += 4; line(title, true, 12); };
  line('PCMSO', true, 24);
  line('Programa de Controle Médico de Saúde Ocupacional', true, 12);
  line(program.title, true, 14);
  line(`Revisão ${program.revision_number ?? 1} - ${payload.kind === 'minuta' ? 'MINUTA BETA - NÃO APROVADA' : 'APROVADO - ASSINATURA PENDENTE'}`, true);
  line(`Referência documental: ${program.id ?? ''}`);
  line(`Vigência: ${date(settings.valid_from)} a ${date(settings.valid_to)}`);
  section('1. Identificação da empresa');
  line(company.name, true);
  line(`CNPJ: ${company.cnpj || 'Não informado'} | CNAE: ${company.cnae || 'Não informado'}`);
  line(`Endereço: ${formatPdfAddress(company.address) || 'Não informado'}`);
  section('2. Objetivos e responsabilidades');
  line(settings.objectives || 'Objetivos pendentes de preenchimento e revisão médica.');
  line(settings.responsibilities || 'Responsabilidades pendentes de preenchimento e revisão médica.');
  section('3. Fontes, grupos e inventário de riscos');
  if (!sources.length) line('Inventário pendente de importação e validação.');
  for (const source of sources) {
    const data = source.content ?? {};
    line(`${data.document?.title || 'PGR'} - versão ${data.document?.version ?? '?'} - captura ${date(source.captured_at ?? source.imported_at ?? source.created_at)}`, true);
    line(`Hash da origem: ${source.source_hash ?? ''}`, false, 8);
    for (const ghe of data.ghes ?? []) {
      line(`${formatPdfSector(ghe.name)} | Setor: ${formatPdfSector(ghe.sector) || 'Não informado'} | Função: ${formatPdfSector(ghe.role) || 'Não informada'}`, true);
      const risks = (data.risks ?? []).filter((risk: RecordData) => risk.ghe_id === ghe.id);
      for (const risk of risks) {
        line(`- ${risk.agent_name || 'Agente não informado'} (${risk.category || 'Categoria não informada'}). ${risk.source ? `Origem: ${risk.source}.` : ''} ${risk.exposure_description || ''}`);
        if (risk.existing_epc) line(`EPC: ${risk.existing_epc}`);
        if (risk.existing_epi) line(`EPI: ${risk.existing_epi}`);
      }
      if (!risks.length) line('Sem riscos registrados neste grupo; validar a origem.');
    }
    for (const risk of data.risks ?? []) {
      if (!(data.ghes ?? []).some((g: RecordData) => g.id === risk.ghe_id)) line(`GHE pendente - ${risk.agent_name || 'Agente não informado'}: ${risk.exposure_description || 'Exposição não informada'}`);
    }
    for (const aep of data.aeps ?? []) {
      line(`AEP: ${formatPdfSector(aep.assessment?.setor_nome) || 'Setor não informado'} / ${formatPdfSector(aep.assessment?.funcao_nome) || 'Função não informada'}`, true);
      for (const factor of aep.factors ?? []) line(`- ${factor.fator_nome || 'Fator ergonômico registrado'}: ${factor.evidencia_texto || 'Consultar evidência da avaliação de origem.'}`);
    }
  }
  section('4. Protocolos de exames');
  const protocols: RecordData[] = content.protocols ?? [];
  if (!protocols.length) line('Nenhum protocolo ativo. Revisão médica pendente.');
  for (const protocol of protocols) {
    const source = sources.find(s => s.id === protocol.snapshot_id);
    const ghe = source?.content?.ghes?.find((g: RecordData) => g.id === protocol.ghe_id);
    const risk = source?.content?.risks?.find((r: RecordData) => r.id === protocol.risk_id);
    line(`${protocol.exam_name} - ${examTypes[protocol.exam_type] ?? protocol.exam_type}`, true);
    line(`${protocol.scope === 'todos' ? 'Todos os trabalhadores' : `${formatPdfSector(ghe?.name) || 'GHE não identificado'} / ${formatPdfSector(ghe?.role) || 'Função não informada'}`}${risk ? ` | Risco: ${risk.agent_name}` : ''}${protocol.periodicity_months ? ` | Periodicidade: ${protocol.periodicity_months} meses` : ''}`);
    line(`Justificativa: ${protocol.justification}`);
    if (protocol.notes) line(`Observações: ${protocol.notes}`);
  }
  section('5. Cronograma de ações preventivas');
  if (!(content.actions ?? []).length) line('Cronograma pendente de preparação.');
  for (const action of content.actions ?? []) {
    line(action.title, true);
    line(`Responsável: ${action.responsible || 'Não informado'} | Prazo: ${date(action.due_date)} | Situação: ${action.status}`);
    if (action.notes) line(action.notes);
  }
  section('6. Atendimento de urgência e acompanhamento');
  line(settings.emergency_flow || 'Fluxo de urgência pendente de definição.');
  line(settings.monitoring || 'Acompanhamento e avaliação do programa pendentes de definição.');
  section('7. Responsável médico e validação documental');
  if (payload.physician) {
    line(payload.physician.name, true);
    line(`CRM ${payload.physician.crm} / ${payload.physician.crm_uf} | Aprovação: ${date(payload.approved_at)}`);
  } else line('Médico responsável: pendente de aprovação pela atribuição da empresa.');
  line('Assinatura do médico responsável: __________________________________');
  line('A aprovação registrada no sistema não equivale a assinatura digital. Este documento não é ASO, prontuário ou comprovante de envio ao eSocial.', false, 9);
  ensure(12);
  line(`Integridade da versão: ${payload.hash}`, false, 8);
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    pdf.text(payload.kind === 'minuta' ? 'PCMSO - MINUTA BETA - NÃO APROVADA' : 'PCMSO - VERSÃO APROVADA - ASSINATURA PENDENTE', 19, 14);
    pdf.text(`Revisão ${program.revision_number ?? 1} | Página ${page} de ${count}`, 19, 286);
  }
  return pdf;
}