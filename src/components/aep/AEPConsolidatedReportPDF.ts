import jsPDF from 'jspdf';
import { renderReportLogos } from '@/lib/pdfLogos';
import { classifyRisk, LEVEL_LABELS } from '@/lib/aepRiskLevel';
import { AEP_CATEGORIAS } from '@/hooks/useAEPFatoresCatalog';
import { renderEvidenceImages } from './aepPdfImage';
import type { ReportSignatures } from '@/lib/reportSignatures';
import { formatPdfSector } from '@/lib/pdfDisplayFormat';

interface AEPBundle {
  aep: any;
  fatores: any[];
  participantes: any[];
  evidencias: any[];
}

interface Input {
  company: { name: string; cnpj: string; logo_url?: string | null };
  sstLogoUrl?: string | null;
  bundles: AEPBundle[];
  signatures?: Partial<ReportSignatures>;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

const METOD_LABELS: Record<string, string> = {
  observacao: 'Observação da atividade',
  entrevista: 'Entrevista individual',
  grupo_focal: 'Grupo focal',
  questionario: 'Questionário validado',
  outro: 'Outro',
};

const AEP_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  in_review: 'Em revisão',
  revised: 'Revisada',
};

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 15) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawWrappedText(
  doc: jsPDF,
  y: number,
  text: string,
  x: number,
  maxWidth: number,
  lineHeight = 4.2,
  options?: any
): number {
  const wrapped = doc.splitTextToSize(text || '—', maxWidth);
  y = ensureSpace(doc, y, wrapped.length * lineHeight + 1.5);
  if (options) doc.text(wrapped, x, y, options);
  else doc.text(wrapped, x, y);
  return y + wrapped.length * lineHeight + 0.8;
}

function line(doc: jsPDF, y: number, label: string, value: string): number {
  const wrapped = doc.splitTextToSize(value || '—', CONTENT_W - 45);
  y = ensureSpace(doc, y, Math.max(5, wrapped.length * 4.5) + 1);
  doc.setFont('helvetica', 'bold'); doc.text(label, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(wrapped, MARGIN + 45, y);
  return y + Math.max(5, wrapped.length * 4.5) + 0.5;
}

async function renderAEPSection(doc: jsPDF, aep: any, fatores: any[], participantes: any[], evidencias: any[], idx: number, total: number, signatures?: Partial<ReportSignatures>): Promise<void> {
  doc.addPage();
  let y = 20;

  // Header banda com altura dinâmica para setores longos
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  const sectorHeader = `Setor: ${formatPdfSector(aep.setor_nome) || '—'}`;
  const sectorHeaderLines = doc.splitTextToSize(sectorHeader, 125);
  const headerH = Math.max(12, sectorHeaderLines.length * 4 + 5);
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, PAGE_W, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`AEP ${idx} de ${total}`, MARGIN, 8);
  doc.setFontSize(8.5);
  doc.text(sectorHeaderLines, PAGE_W - MARGIN, 7, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y = headerH + 8;

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  y = drawWrappedText(doc, y, `${formatPdfSector(aep.setor_nome) || 'Setor'} — ${aep.funcao_nome || 'Função'}`, MARGIN, CONTENT_W, 5.2);
  doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
  doc.text(`Versão ${aep.version || 1} · ${AEP_STATUS_LABELS[aep.status] || aep.status}`, MARGIN, y); y += 6;
  doc.setTextColor(0);

  const escopo: any[] = Array.isArray(aep.escopo_json) ? aep.escopo_json : [];
  const hasBlocos = escopo.length > 0;

  // 1. Identificação
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('1. Identificação', MARGIN, y); y += 5;
  doc.setFontSize(9);
  if (hasBlocos) {
    doc.setFont('helvetica', 'bold'); doc.text('Escopo avaliado:', MARGIN, y); y += 5;
    doc.setFont('helvetica', 'normal');
    escopo.forEach((it: any, i: number) => {
      const t = `${i + 1}. ${formatPdfSector(it.setor) || '—'} — ${it.funcao || '—'}${it.cbo ? ` (CBO ${it.cbo})` : ''} · ${it.worker_count || 1} trab.`;
      y = drawWrappedText(doc, y, t, MARGIN + 3, CONTENT_W - 3, 4.2);
    });
  } else {
    y = line(doc, y, 'Setor:', formatPdfSector(aep.setor_nome) || '—');
    y = line(doc, y, 'Função/cargo:', aep.funcao_nome || '—');
  }
  y = line(doc, y, 'Data:', new Date(aep.assessment_date).toLocaleDateString('pt-BR'));
  if (aep.next_review_date) y = line(doc, y, 'Próxima revisão:', new Date(aep.next_review_date).toLocaleDateString('pt-BR'));
  const hasBlocoSit = escopo.some((e: any) => e.situacao_trabalho);
  if (!hasBlocoSit) y = line(doc, y, 'Situação avaliada:', aep.situacao_trabalho || '—');
  y += 3;

  // 2. Metodologia
  y = ensureSpace(doc, y, 30);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('2. Metodologia', MARGIN, y); y += 5;
  doc.setFontSize(9);
  const metods = (aep.methodologies || []).map((m: string) => METOD_LABELS[m] || m).join(', ');
  y = line(doc, y, 'Métodos:', metods || '—');
  if (aep.instrument_name) y = line(doc, y, 'Instrumento:', aep.instrument_name);
  y = line(doc, y, 'Anonimato:', aep.anonymity_ensured ? 'Sim' : 'Não');
  if (aep.methodology_details) y = line(doc, y, 'Detalhes:', aep.methodology_details);
  y += 3;

  const renderFat = (f: any, i: number) => {
    y = ensureSpace(doc, y, 25);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    y = drawWrappedText(doc, y, `${i + 1}. ${f.fator_nome}`, MARGIN, CONTENT_W, 4.3);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    const level = classifyRisk(5, f.severity, f.probability);
    y = drawWrappedText(
      doc,
      y,
      `Categoria: ${AEP_CATEGORIAS[f.categoria as keyof typeof AEP_CATEGORIAS] || f.categoria} · Sev ${f.severity} · Prob ${f.probability} · ${LEVEL_LABELS[level]}`,
      MARGIN,
      CONTENT_W,
      3.8
    );
    if (f.source_assessment_type) {
      doc.setTextColor(80, 80, 180);
      y = drawWrappedText(doc, y, `(Importado de ${f.source_assessment_type === 'hseit' ? 'HSE-IT' : 'COPSOQ II'})`, MARGIN, CONTENT_W, 3.8);
      doc.setTextColor(0);
    }
    if (f.fonte_causa) {
      y = drawWrappedText(doc, y, `Fonte/causa: ${f.fonte_causa}`, MARGIN, CONTENT_W, 3.7);
    }
    if (f.evidencia_texto) {
      y = drawWrappedText(doc, y, `Evidência: ${f.evidencia_texto}`, MARGIN, CONTENT_W, 3.7);
    }
    y += 2;
  };

  const renderPart = (p: any) => {
    y = ensureSpace(doc, y, 5);
    const nome = p.anonimizado ? '(Anonimizado)' : (p.nome || '—');
    y = drawWrappedText(doc, y, `• ${nome}${p.funcao ? ' — ' + p.funcao : ''} [${p.tipo_participacao || 'outro'}]`, MARGIN, CONTENT_W, 4.1);
  };

  // 3. Avaliação por bloco (ou lista flat legada)
  y = ensureSpace(doc, y, 15);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(hasBlocos ? '3. Avaliação por bloco (GHE)' : `3. Fatores levantados (${fatores.length})`, MARGIN, y); y += 5;

  if (hasBlocos) {
    const blocos = [
      ...escopo.map((e: any, i: number) => ({ key: e.tempId, label: `${i + 1}. ${e.setor || '—'} / ${e.funcao || '—'}${e.cbo ? ` · CBO ${e.cbo}` : ''}`, item: e })),
      { key: '__geral__', label: 'Geral', item: null as any },
    ];
    blocos.forEach(b => {
      const fats = fatores.filter(f => (b.key === '__geral__') ? !f.escopo_ref : f.escopo_ref === b.key);
      const parts = participantes.filter(p => (b.key === '__geral__') ? !p.escopo_ref : p.escopo_ref === b.key);
      if (fats.length === 0 && parts.length === 0 && !b.item?.situacao_trabalho) return;

      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      const workerTxt = b.item?.worker_count ? `${b.item.worker_count} trab.` : '';
      const workerW = workerTxt ? doc.getTextWidth(workerTxt) + 5 : 0;
      const labelLines = doc.splitTextToSize(b.label, CONTENT_W - 4 - workerW);
      const barH = Math.max(7, labelLines.length * 4.2 + 2.2);
      y = ensureSpace(doc, y, barH + 3);
      doc.setFillColor(230, 236, 250);
      doc.rect(MARGIN, y - 4, CONTENT_W, barH, 'F');
      doc.setTextColor(30, 64, 175);
      doc.text(labelLines, MARGIN + 2, y);
      if (workerTxt) doc.text(workerTxt, PAGE_W - MARGIN - 2, y, { align: 'right' });
      doc.setTextColor(0); y += barH + 1;

      if (b.item?.situacao_trabalho) {
        doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        y = drawWrappedText(doc, y, `Situação: ${b.item.situacao_trabalho}`, MARGIN, CONTENT_W, 3.8);
        doc.setFont('helvetica', 'normal');
      }
      if (fats.length) {
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text(`Fatores (${fats.length}):`, MARGIN, y); y += 4;
        fats.forEach((f, i) => renderFat(f, i));
      }
      if (parts.length) {
        y = ensureSpace(doc, y, 10);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text(`Participantes (${parts.length}):`, MARGIN, y); y += 4;
        doc.setFont('helvetica', 'normal');
        parts.forEach(renderPart);
      }
      y += 2;
    });
  } else {
    fatores.forEach((f, i) => renderFat(f, i));
    y = ensureSpace(doc, y, 15);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`4. Participantes (${participantes.length})`, MARGIN, y); y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    participantes.forEach(renderPart);
  }
  y += 3;

  // 5. Evidências
  if (evidencias.length) {
    y = ensureSpace(doc, y, 15);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`5. Evidências anexadas (${evidencias.length})`, MARGIN, y); y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    evidencias.forEach(e => {
      y = ensureSpace(doc, y, 5);
      y = drawWrappedText(doc, y, `• ${e.file_name}${e.descricao ? ' — ' + e.descricao : ''}`, MARGIN, CONTENT_W, 4.1);
    });
    y += 3;
    y = await renderEvidenceImages(doc, evidencias, { marginX: MARGIN, contentW: CONTENT_W, pageH: PAGE_H, startY: y });
    y += 3;
  }

  // 6. Assinatura
  y = ensureSpace(doc, y, 40);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('6. Responsável Técnico', MARGIN, y); y += 10;
  const sig = signatures || {};
  doc.line(MARGIN, y, MARGIN + 90, y); y += 4;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text((sig.technicianName || '').trim() || aep.responsible_name || '—', MARGIN, y); y += 4;
  doc.setFont('helvetica', 'normal');
  if (aep.responsible_role) { doc.text(aep.responsible_role, MARGIN, y); y += 4; }
  if ((sig.technicianCpf || '').trim()) { doc.text(`CPF: ${sig.technicianCpf!.trim()}`, MARGIN, y); y += 4; }
  const cReg = (sig.technicianRegistration || '').trim() || aep.responsible_registration;
  if (cReg) { doc.text(`Registro: ${cReg}`, MARGIN, y); y += 4; }
  if ((sig.orgResponsibleName || '').trim() || (sig.orgResponsibleRole || '').trim() || (sig.orgResponsibleCpf || '').trim()) {
    y += 12;
    y = ensureSpace(doc, y, 20);
    doc.line(MARGIN, y, MARGIN + 90, y); y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text((sig.orgResponsibleName || '').trim() || 'Responsável pela empresa', MARGIN, y); y += 4;
    doc.setFont('helvetica', 'normal');
    if ((sig.orgResponsibleRole || '').trim()) { doc.text(sig.orgResponsibleRole!.trim(), MARGIN, y); y += 4; }
    if ((sig.orgResponsibleCpf || '').trim()) { doc.text(`CPF: ${sig.orgResponsibleCpf!.trim()}`, MARGIN, y); y += 4; }
  }
  if (aep.signed_at) { doc.text(`Assinado em: ${new Date(aep.signed_at).toLocaleString('pt-BR')}`, MARGIN, y); y += 4; }
  if (aep.signature_hash) {
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Hash: ${aep.signature_hash}`, MARGIN, y);
    doc.setTextColor(0);
  }
}

export async function generateAEPConsolidatedReportPDF(input: Input): Promise<void> {
  const { company, bundles } = input;
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });

  // ===== CAPA =====
  try {
    await renderReportLogos(doc, PAGE_W, {
      sstLogoUrl: input.sstLogoUrl || null,
      companyLogoUrl: company.logo_url || null,
      topY: 12,
      maxHeight: 16,
    });
  } catch { /* noop */ }

  let y = 60;
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('Avaliação Ergonômica Preliminar', PAGE_W / 2, y, { align: 'center' }); y += 8;
  doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text('Documento Consolidado — NR-17 item 17.3.1', PAGE_W / 2, y, { align: 'center' }); y += 20;

  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(company.name, PAGE_W / 2, y, { align: 'center' }); y += 6;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${company.cnpj || '—'}`, PAGE_W / 2, y, { align: 'center' }); y += 20;

  // Sumário executivo
  const totalFatores = bundles.reduce((s, b) => s + b.fatores.length, 0);
  const catCount: Record<string, number> = { ergonomico_fisico: 0, ergonomico_organizacional: 0, ergonomico_cognitivo: 0, psicossocial: 0 };
  let intolerable = 0, substantial = 0;
  bundles.forEach(b => b.fatores.forEach(f => {
    if (catCount[f.categoria] !== undefined) catCount[f.categoria]++;
    const lv = classifyRisk(5, f.severity, f.probability);
    if (lv === 'intolerable') intolerable++;
    if (lv === 'substantial') substantial++;
  }));

  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('Sumário executivo', MARGIN, y); y += 6;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  const setores = new Set(bundles.map(b => b.aep.setor_nome).filter(Boolean));
  doc.text(`• AEPs incluídas: ${bundles.length}`, MARGIN, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('• Setores avaliados:', MARGIN, y); y += 5;
  doc.setFont('helvetica', 'normal');
  (setores.size > 0 ? [...setores] : ['Todos']).forEach(setor => {
    y = drawWrappedText(doc, y, `   • ${formatPdfSector(setor)}`, MARGIN + 4, CONTENT_W - 4, 4.5);
  });
  doc.text(`• Fatores levantados: ${totalFatores}`, MARGIN, y); y += 5;
  doc.text(`   - Ergonômico físico: ${catCount.ergonomico_fisico}`, MARGIN + 4, y); y += 5;
  doc.text(`   - Ergonômico organizacional: ${catCount.ergonomico_organizacional}`, MARGIN + 4, y); y += 5;
  doc.text(`   - Ergonômico cognitivo: ${catCount.ergonomico_cognitivo}`, MARGIN + 4, y); y += 5;
  doc.text(`   - Psicossocial: ${catCount.psicossocial}`, MARGIN + 4, y); y += 5;
  doc.setTextColor(200, 50, 50);
  doc.text(`• Fatores em nível INTOLERÁVEL: ${intolerable}`, MARGIN, y); y += 5;
  doc.setTextColor(200, 120, 30);
  doc.text(`• Fatores em nível SUBSTANCIAL: ${substantial}`, MARGIN, y); y += 5;
  doc.setTextColor(0); y += 5;

  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, PAGE_W / 2, PAGE_H - 25, { align: 'center' });
  doc.setTextColor(0);

  // ===== ÍNDICE =====
  doc.addPage();
  y = 20;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Índice das AEPs', MARGIN, y); y += 8;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  bundles.forEach((b, i) => {
    y = ensureSpace(doc, y, 6);
    const line = `${i + 1}. ${b.aep.setor_nome || '—'} — ${b.aep.funcao_nome || '—'}  ·  ${new Date(b.aep.assessment_date).toLocaleDateString('pt-BR')}  ·  v${b.aep.version || 1}  ·  ${AEP_STATUS_LABELS[b.aep.status] || b.aep.status}`;
    const wrapped = doc.splitTextToSize(line, CONTENT_W);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 5;
  });

  // ===== SEÇÕES POR AEP =====
  for (let i = 0; i < bundles.length; i++) {
    const b = bundles[i];
    await renderAEPSection(doc, b.aep, b.fatores, b.participantes, b.evidencias, i + 1, bundles.length, input.signatures);
  }

  // ===== ANEXO: TABELA CONSOLIDADA =====
  doc.addPage();
  y = 20;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Anexo — Consolidação de fatores', MARGIN, y); y += 8;
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');

  const cols = [
    { label: 'Setor',      x: MARGIN,        w: 30 },
    { label: 'Categoria',  x: MARGIN + 30,   w: 32 },
    { label: 'Fator',      x: MARGIN + 62,   w: 70 },
    { label: 'Sev',        x: MARGIN + 132,  w: 10 },
    { label: 'Prob',       x: MARGIN + 142,  w: 12 },
    { label: 'Nível',      x: MARGIN + 154,  w: 26 },
  ];
  cols.forEach(c => doc.text(c.label, c.x, y));
  y += 3;
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 3;

  doc.setFont('helvetica', 'normal');
  bundles.forEach(b => b.fatores.forEach(f => {
    y = ensureSpace(doc, y, 6);
    const level = classifyRisk(5, f.severity, f.probability);
    const setor = doc.splitTextToSize(b.aep.setor_nome || '—', cols[0].w - 2);
    const categ = AEP_CATEGORIAS[f.categoria as keyof typeof AEP_CATEGORIAS] || f.categoria;
    const catTxt = doc.splitTextToSize(categ, cols[1].w - 2);
    const fat = doc.splitTextToSize(f.fator_nome, cols[2].w - 2);
    const rows = Math.max(setor.length, catTxt.length, fat.length);
    doc.text(setor, cols[0].x, y);
    doc.text(catTxt, cols[1].x, y);
    doc.text(fat, cols[2].x, y);
    doc.text(String(f.severity), cols[3].x, y);
    doc.text(String(f.probability), cols[4].x, y);
    doc.text(LEVEL_LABELS[level], cols[5].x, y);
    y += rows * 4 + 1;
  }));


  const safeName = company.name.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  doc.save(`AEP-Consolidado-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}
