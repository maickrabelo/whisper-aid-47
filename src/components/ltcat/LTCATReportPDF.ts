import jsPDF from 'jspdf';
import { renderReportLogos, renderCoverBackground } from '@/lib/pdfLogos';
import { sanitizePdfText, installPdfTextSafety } from '@/lib/pdfTextSafety';
import { OUTCOME_LABELS } from '@/lib/ltcatEngine';
import fundoPgr from '@/assets/fundo-pgr.jpg.asset.json';
import type {
  LtcatDoc, LtcatGhe, LtcatExposure, LtcatEpiEpc, LtcatEvaluation,
} from '@/pages/LTCATDetail';

export interface LTCATReportInput {
  doc: LtcatDoc;
  company: { name: string; cnpj?: string | null; logo_url?: string | null };
  sstLogoUrl?: string | null;
  ghes: LtcatGhe[];
  exposures: LtcatExposure[];
  epiEpcs: LtcatEpiEpc[];
  evaluations: LtcatEvaluation[];
}

const EXPOSURE_TYPE_LABELS: Record<string, string> = {
  HABITUAL_PERMANENTE: 'Habitual e permanente',
  INTERMITENTE: 'Intermitente',
  EVENTUAL: 'Eventual',
};

const CONCLUSION_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONCLUIDO: 'Concluído',
  REVISAO_HUMANA: 'Revisão humana necessária',
};

/**
 * PDF do LTCAT (beta privado). Toda página recebe a marca d'água diagonal
 * "BETA — DOCUMENTO PARA VALIDAÇÃO INTERNA" e rodapé com a mesma indicação.
 */
export async function generateLTCATReportPDF(input: LTCATReportInput): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  installPdfTextSafety(doc);

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const NAVY: [number, number, number] = [11, 63, 41];
  const TEXT: [number, number, number] = [40, 40, 40];
  const MUTED: [number, number, number] = [110, 110, 110];
  const RED: [number, number, number] = [170, 30, 30];

  let y = MARGIN;
  const state = { skipChrome: false };

  const setText = (size: number, bold: boolean, color: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const fmtDate = (d?: string | null) =>
    d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : '—';
  const todayBR = () => new Date().toLocaleDateString('pt-BR');
  const placeholder = (v?: string | number | null) =>
    v === null || v === undefined || String(v).trim() === '' ? '—' : String(v);

  const pageChrome = () => {
    if (state.skipChrome) return;
    setText(8, false, MUTED);
    doc.text(`LTCAT — ${input.company.name} — Revisão ${String(input.doc.version_number).padStart(2, '0')}`, MARGIN, 10);
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN, 12, PAGE_W - MARGIN, 12);
  };

  const newPage = () => {
    doc.addPage();
    state.skipChrome = false;
    y = MARGIN + 8;
    pageChrome();
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - 22) newPage();
  };

  const sectionTitle = (t: string) => {
    ensureSpace(18);
    y += 4;
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    setText(13, true, [255, 255, 255]);
    doc.text(sanitizePdfText(t.toUpperCase()), MARGIN + 3, y + 5.8);
    y += 13;
  };

  const subTitle = (t: string) => {
    ensureSpace(12);
    y += 3;
    setText(11, true, NAVY);
    doc.text(sanitizePdfText(t), MARGIN, y);
    y += 6;
  };

  const paragraph = (t: string, indent = 0) => {
    setText(10, false, TEXT);
    const lines = doc.splitTextToSize(sanitizePdfText(t), CONTENT_W - indent);
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, MARGIN + indent, y, { align: 'justify', maxWidth: CONTENT_W - indent });
      y += 4.6;
    }
    y += 1.5;
  };

  const kvRow = (label: string, value: string) => {
    ensureSpace(6);
    setText(10, true, TEXT);
    doc.text(sanitizePdfText(`${label}:`), MARGIN, y);
    setText(10, false, TEXT);
    const lines = doc.splitTextToSize(sanitizePdfText(value), CONTENT_W - 45);
    doc.text(lines, MARGIN + 45, y);
    y += Math.max(1, lines.length) * 4.6 + 0.6;
  };

  // ─── CAPA ──────────────────────────────────────────────────
  state.skipChrome = true;
  await renderCoverBackground(doc, PAGE_W, PAGE_H, fundoPgr.url);
  await renderReportLogos(doc, PAGE_W, {
    sstLogoUrl: input.sstLogoUrl,
    companyLogoUrl: input.company.logo_url,
    topY: 8, maxHeight: 24, maxWidth: 45,
  });

  setText(36, true, NAVY);
  doc.text('LTCAT', PAGE_W / 2, 55, { align: 'center' });
  setText(13, false, NAVY);
  doc.text('Laudo Técnico das Condições Ambientais do Trabalho', PAGE_W / 2, 65, { align: 'center' });
  setText(9, false, [80, 80, 80]);
  doc.text('Finalidade previdenciária — Decreto nº 3.048/1999, Anexo IV (INSS)', PAGE_W / 2, 72, { align: 'center' });

  setText(18, true, NAVY);
  const compLines = doc.splitTextToSize(input.company.name || 'EMPRESA', CONTENT_W);
  doc.text(compLines, PAGE_W / 2, 120, { align: 'center' });

  setText(14, true, TEXT);
  doc.text(`CNPJ: ${placeholder(input.company.cnpj)}`, PAGE_W / 2, 142, { align: 'center' });

  setText(10, true, MUTED);
  doc.text(
    `Período de referência: ${fmtDate(input.doc.reference_period_start)} a ${fmtDate(input.doc.reference_period_end)}`,
    PAGE_W / 2, 182, { align: 'center' },
  );
  setText(9, false, MUTED);
  doc.text(
    `Revisão ${String(input.doc.version_number).padStart(2, '0')}  •  Emitido em ${fmtDate(input.doc.emission_date) || todayBR()}`,
    PAGE_W / 2, 190, { align: 'center' },
  );

  // Faixa BETA na capa
  doc.setFillColor(RED[0], RED[1], RED[2]);
  doc.rect(MARGIN, 205, CONTENT_W, 12, 'F');
  setText(11, true, [255, 255, 255]);
  doc.text('BETA — DOCUMENTO PARA VALIDAÇÃO INTERNA', PAGE_W / 2, 212.5, { align: 'center' });

  setText(8, false, MUTED);
  doc.text('Documento gerado pela plataforma Sr.SMS — módulo LTCAT (beta privado)', PAGE_W / 2, PAGE_H - 24, { align: 'center' });
  doc.text('Sem valor oficial para fins de transmissão ao eSocial ou ao INSS nesta fase de validação', PAGE_W / 2, PAGE_H - 19, { align: 'center' });

  // ─── INTERIOR ──────────────────────────────────────────────
  newPage();

  // 1. Identificação
  sectionTitle('1. Identificação');
  kvRow('Empresa', placeholder(input.company.name));
  kvRow('CNPJ', placeholder(input.company.cnpj));
  kvRow('Documento', `${input.doc.title} — Revisão ${String(input.doc.version_number).padStart(2, '0')}`);
  kvRow('Período de referência', `${fmtDate(input.doc.reference_period_start)} a ${fmtDate(input.doc.reference_period_end)}`);
  kvRow('Data de emissão', fmtDate(input.doc.emission_date));
  const extras = (input.doc.additional_addresses || []).filter((a) => a && String(a).trim());
  if (extras.length) {
    subTitle('Unidades / endereços adicionais (mesmo CNPJ)');
    extras.forEach((addr, i) => paragraph(`Unidade ${i + 2}: ${addr}`));
  }
  if (input.doc.notes) {
    subTitle('Observações gerais');
    paragraph(input.doc.notes);
  }

  // 2. Responsáveis
  sectionTitle('2. Responsáveis');
  const r = input.doc.responsible || {};
  subTitle('Responsável técnico');
  kvRow('Nome', placeholder(r.nome));
  kvRow('CPF', placeholder(r.cpf));
  kvRow('Conselho', `${placeholder(r.conselho)}${r.numero_registro ? ` — Registro ${r.numero_registro}` : ''}`);
  kvRow('Habilitação', placeholder(r.habilitacao));
  const o = input.doc.org_responsible || {};
  if (o.nome) {
    subTitle('Responsável pela organização');
    kvRow('Nome', placeholder(o.nome));
    if (o.cargo) kvRow('Cargo', o.cargo);
    if (o.cpf) kvRow('CPF', o.cpf);
  }

  // 3. GHEs
  sectionTitle('3. Grupos Homogêneos de Exposição (GHE)');
  if (input.ghes.length === 0) {
    paragraph('Nenhum GHE cadastrado neste documento.');
  }
  for (const g of input.ghes) {
    ensureSpace(30);
    subTitle(g.name);
    if (g.sector) kvRow('Setor', g.sector);
    kvRow('Trabalhadores', String(g.worker_count ?? 0));
    const roles = Array.isArray(g.roles_meta) ? g.roles_meta : [];
    for (const role of roles) {
      ensureSpace(10);
      setText(10, true, TEXT);
      doc.text(sanitizePdfText(`${role.role}${role.cbo ? ` — CBO ${role.cbo}` : ''}`), MARGIN + 3, y);
      y += 5;
      if (role.activities) {
        const acts = String(role.activities).split('\n').map((s) => s.trim()).filter(Boolean);
        for (const a of acts) {
          paragraph(`• ${a}`, 6);
        }
      }
    }
    if (g.activities_description) {
      subTitle('Observações do GHE');
      paragraph(g.activities_description);
    }
  }

  // 4. Exposições
  sectionTitle('4. Exposições Ocupacionais e Conclusões');
  if (input.exposures.length === 0) {
    paragraph('Nenhuma exposição ocupacional cadastrada.');
  }
  for (const g of input.ghes) {
    const exps = input.exposures.filter((e) => e.ghe_id === g.id);
    if (!exps.length) continue;
    subTitle(`GHE: ${g.name}`);
    for (const e of exps) {
      ensureSpace(40);
      setText(11, true, TEXT);
      doc.text(sanitizePdfText(`${e.agent_name} (${e.agent_code})`), MARGIN + 3, y);
      y += 6;
      kvRow('Tipo de exposição', EXPOSURE_TYPE_LABELS[e.exposure_type || ''] || placeholder(e.exposure_type));
      if (e.measured_value != null) kvRow('Valor medido', `${e.measured_value} ${e.unit || ''}`);
      if (e.notes) kvRow('Observações', e.notes);

      const meds = input.epiEpcs.filter(
        (m) => m.exposure_id === e.id || (!m.exposure_id && m.ghe_id === e.ghe_id),
      );
      if (meds.length) {
        ensureSpace(8);
        setText(10, true, TEXT);
        doc.text('Medidas de proteção:', MARGIN + 3, y);
        y += 5;
        for (const m of meds) {
          paragraph(
            `• [${m.type}] ${m.description}${m.ca_number ? ` (CA ${m.ca_number})` : ''}${m.effective ? '' : ' — eficácia não confirmada'}`,
            6,
          );
        }
      }

      const evals = input.evaluations.filter((v) => v.exposure_id === e.id);
      if (evals.length) {
        ensureSpace(8);
        setText(10, true, TEXT);
        doc.text('Avaliações:', MARGIN + 3, y);
        y += 5;
        for (const ev of evals) {
          paragraph(
            `• ${fmtDate(ev.evaluation_date)} — ${placeholder(ev.methodology_code)}`
            + `${ev.result_value != null ? ` — Resultado: ${ev.result_value} ${ev.unit || ''}` : ''}`
            + `${ev.instrument_name ? ` — ${ev.instrument_name}${ev.instrument_serial ? ` s/n ${ev.instrument_serial}` : ''}` : ''}`,
            6,
          );
        }
      }

      if (e.engine_output) {
        ensureSpace(12);
        const out = e.engine_output;
        paragraph(
          `Consulta ao motor jurídico: ${OUTCOME_LABELS[out.outcome] || out.outcome}`
          + `${e.engine_rule_key ? ` — regra ${e.engine_rule_key}` : ''}`
          + `${out.rule_version != null ? ` v${out.rule_version}` : ''}`
          + `${out.rule_checksum ? ` (checksum ${String(out.rule_checksum).slice(0, 16)}...)` : ''}`,
          3,
        );
        if (out.reasoning_summary) paragraph(String(out.reasoning_summary), 6);
      }

      ensureSpace(10);
      setText(10, true, NAVY);
      doc.text(
        sanitizePdfText(`Conclusão: ${CONCLUSION_LABELS[e.conclusion_status] || e.conclusion_status}`),
        MARGIN + 3, y,
      );
      y += 5;
      if (e.conclusion_text) paragraph(e.conclusion_text, 6);
      y += 2;
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 5;
    }
  }

  // 5. Encerramento
  sectionTitle('5. Encerramento');
  paragraph(
    `Este documento foi gerado pelo módulo LTCAT (beta privado) da plataforma Sr.SMS em ${todayBR()}. `
    + 'Trata-se de documento para validação interna, sem valor oficial para fins de transmissão ao '
    + 'eSocial ou de comprovação junto ao INSS nesta fase. As conclusões previdenciárias aqui '
    + 'registradas são de responsabilidade do profissional técnico habilitado identificado no item 2.',
  );
  if (input.doc.validated_at) {
    paragraph(`Validação de publicação executada em ${new Date(input.doc.validated_at).toLocaleString('pt-BR')} sem erros bloqueantes.`);
  }

  // Assinatura
  ensureSpace(40);
  y += 20;
  doc.setDrawColor(120, 120, 120);
  doc.line(PAGE_W / 2 - 55, y, PAGE_W / 2 + 55, y);
  y += 5;
  setText(10, true, TEXT);
  doc.text(sanitizePdfText(placeholder(r.nome)), PAGE_W / 2, y, { align: 'center' });
  y += 5;
  setText(9, false, MUTED);
  doc.text(
    sanitizePdfText(`${placeholder(r.habilitacao)}${r.conselho ? ` — ${r.conselho} ${r.numero_registro || ''}` : ''}`),
    PAGE_W / 2, y, { align: 'center' },
  );

  // ─── Marca d'água BETA + rodapé em todas as páginas ───────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    try {
      doc.saveGraphicsState();
      const GState = (doc as any).GState;
      if (GState) doc.setGState(new GState({ opacity: 0.07 }));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(42);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text('BETA — VALIDAÇÃO INTERNA', PAGE_W / 2, PAGE_H / 2, { align: 'center', angle: 45 });
      doc.restoreGraphicsState();
    } catch { /* marca d'água é melhor esforço */ }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text('BETA — DOCUMENTO PARA VALIDAÇÃO INTERNA', MARGIN, PAGE_H - 10);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`Gerado em ${todayBR()} — Página ${i} de ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
  }

  const safeName = sanitizePdfText(input.company.name || 'empresa').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_');
  doc.save(`LTCAT_${safeName}_v${String(input.doc.version_number).padStart(2, '0')}_BETA.pdf`);
}
