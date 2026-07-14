import jsPDF from 'jspdf';
import { renderReportLogos } from '@/lib/pdfLogos';
import { classifyRisk, LEVEL_LABELS } from '@/lib/aepRiskLevel';
import { AEP_CATEGORIAS } from '@/hooks/useAEPFatoresCatalog';
import { renderEvidenceImages } from './aepPdfImage';

interface AEPPDFInput {
  aep: any;
  company: { name: string; cnpj: string; logo_url?: string | null };
  sstLogoUrl?: string | null;
  fatores: any[];
  participantes: any[];
  evidencias: any[];
}

const PAGE_W = 210;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

const METOD_LABELS: Record<string, string> = {
  observacao: 'Observação da atividade',
  entrevista: 'Entrevista individual',
  grupo_focal: 'Grupo focal',
  questionario: 'Questionário validado',
  outro: 'Outro',
};

export async function generateAEPReportPDF(input: AEPPDFInput): Promise<void> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const { aep, company, fatores, participantes, evidencias } = input;

  let y = 20;

  // Cabeçalho com logos
  try {
    await renderReportLogos(doc, PAGE_W, {
      sstLogoUrl: input.sstLogoUrl || null,
      companyLogoUrl: company.logo_url || null,
      topY: 8,
      maxHeight: 14,
    });
  } catch { /* noop */ }
  y = 32;

  // Título
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('AEP — Avaliação Ergonômica Preliminar', PAGE_W / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('NR-17 — item 17.3.1', PAGE_W / 2, y, { align: 'center' });
  y += 10;

  // Empresa
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(company.name, MARGIN, y); y += 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${company.cnpj || '—'}`, MARGIN, y); y += 8;

  // Identificação
  const line = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold'); doc.text(label, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(value || '—', CONTENT_W - 45);
    doc.text(wrapped, MARGIN + 45, y);
    y += Math.max(5, wrapped.length * 4.5);
  };

  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('1. Identificação', MARGIN, y); y += 6;
  doc.setFontSize(9);

  const escopo: any[] = Array.isArray(aep.escopo_json) ? aep.escopo_json : [];
  const hasBlocos = escopo.length > 0;
  if (hasBlocos) {
    doc.setFont('helvetica', 'bold'); doc.text('Escopo avaliado:', MARGIN, y); y += 5;
    doc.setFont('helvetica', 'normal');
    escopo.forEach((it: any, idx: number) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const t = `${idx + 1}. ${it.setor || '—'} — ${it.funcao || '—'}${it.cbo ? ` (CBO ${it.cbo})` : ''} · ${it.worker_count || 1} trab.`;
      doc.text(t, MARGIN + 3, y); y += 4.5;
    });
    const total = escopo.reduce((s: number, i: any) => s + (i.worker_count || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total coberto: ${total} trabalhador(es)`, MARGIN, y); y += 5;
    doc.setFont('helvetica', 'normal');
  } else {
    line('Setor:', aep.setor_nome || '—');
    line('Função/cargo:', aep.funcao_nome || '—');
  }
  line('Data da avaliação:', new Date(aep.assessment_date).toLocaleDateString('pt-BR'));
  if (aep.next_review_date) line('Próxima revisão:', new Date(aep.next_review_date).toLocaleDateString('pt-BR'));
  // Situação: se blocos têm situação própria, exibimos por bloco na seção 3; aqui só o fallback
  const hasBlocoSituacao = escopo.some((e: any) => e.situacao_trabalho);
  if (!hasBlocoSituacao) {
    line('Situação avaliada:', aep.situacao_trabalho || '—');
  }
  y += 4;

  // Metodologia
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('2. Metodologia', MARGIN, y); y += 6;
  doc.setFontSize(9);
  const metods = (aep.methodologies || []).map((m: string) => METOD_LABELS[m] || m).join(', ');
  line('Métodos aplicados:', metods || '—');
  if (aep.instrument_name) line('Instrumento:', aep.instrument_name);
  line('Anonimato garantido:', aep.anonymity_ensured ? 'Sim' : 'Não');
  if (aep.methodology_details) line('Detalhes:', aep.methodology_details);
  y += 4;

  // Avaliação por bloco (GHE)
  const renderFator = (f: any, idx: number) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${f.fator_nome}`, MARGIN, y); y += 4;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Categoria: ${AEP_CATEGORIAS[f.categoria as keyof typeof AEP_CATEGORIAS] || f.categoria}`, MARGIN, y); y += 4;
    const level = classifyRisk(5, f.severity, f.probability);
    doc.text(`Severidade: ${f.severity}  |  Probabilidade: ${f.probability}  |  Nível: ${LEVEL_LABELS[level]}`, MARGIN, y); y += 4;
    if (f.fonte_causa) {
      const w = doc.splitTextToSize(`Fonte/causa: ${f.fonte_causa}`, CONTENT_W);
      doc.text(w, MARGIN, y); y += w.length * 4;
    }
    if (f.grupos_expostos) {
      const w = doc.splitTextToSize(`Grupos expostos: ${f.grupos_expostos}`, CONTENT_W);
      doc.text(w, MARGIN, y); y += w.length * 4;
    }
    if (f.evidencia_texto) {
      const w = doc.splitTextToSize(`Evidência: ${f.evidencia_texto}`, CONTENT_W);
      doc.text(w, MARGIN, y); y += w.length * 4;
    }
    y += 3;
  };

  const renderParticipante = (p: any) => {
    if (y > 275) { doc.addPage(); y = 20; }
    const nome = p.anonimizado ? '(Anonimizado)' : (p.nome || '—');
    const t = `• ${nome}${p.funcao ? ' — ' + p.funcao : ''} [${p.tipo_participacao || 'outro'}]`;
    doc.text(t, MARGIN, y); y += 4.5;
  };

  if (hasBlocos) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('3. Avaliação por bloco (GHE)', MARGIN, y); y += 6;

    const blocos = [
      ...escopo.map((e: any, i: number) => ({ key: e.tempId, label: `${i + 1}. ${e.setor || '—'} / ${e.funcao || '—'}${e.cbo ? ` · CBO ${e.cbo}` : ''}`, item: e })),
      { key: '__geral__', label: 'Geral (aplicável a todos os GHEs)', item: null },
    ];

    blocos.forEach(b => {
      const fats = fatores.filter(f => (b.key === '__geral__') ? !f.escopo_ref : f.escopo_ref === b.key);
      const parts = participantes.filter(p => (b.key === '__geral__') ? !p.escopo_ref : p.escopo_ref === b.key);
      if (fats.length === 0 && parts.length === 0 && !b.item?.situacao_trabalho) return;

      if (y > 250) { doc.addPage(); y = 20; }
      // Barra do bloco
      doc.setFillColor(30, 64, 175);
      doc.rect(MARGIN, y - 4, CONTENT_W, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(b.label, MARGIN + 2, y);
      if (b.item?.worker_count) doc.text(`${b.item.worker_count} trab.`, PAGE_W - MARGIN - 2, y, { align: 'right' });
      doc.setTextColor(0); y += 6;

      if (b.item?.situacao_trabalho) {
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text('Situação de trabalho avaliada:', MARGIN, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(b.item.situacao_trabalho, CONTENT_W);
        doc.text(wrapped, MARGIN, y); y += wrapped.length * 4 + 2;
      }

      if (fats.length) {
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(`Fatores levantados (${fats.length}):`, MARGIN, y); y += 5;
        fats.forEach((f, i) => renderFator(f, i));
      }

      if (parts.length) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(`Participantes ouvidos (${parts.length}):`, MARGIN, y); y += 4;
        doc.setFont('helvetica', 'normal');
        parts.forEach(renderParticipante);
      }
      y += 4;
    });

    // Renumerar as próximas seções mantendo compatibilidade — usamos 4./5./6.
  } else {
    // Comportamento legado (AEP antigas sem escopo_json)
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`3. Fatores levantados (${fatores.length})`, MARGIN, y); y += 6;
    fatores.forEach((f, idx) => renderFator(f, idx));

    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`4. Participação dos trabalhadores (${participantes.length})`, MARGIN, y); y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    participantes.forEach(renderParticipante);
    y += 4;
  }

  // Evidências
  if (evidencias.length) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`5. Evidências anexadas (${evidencias.length})`, MARGIN, y); y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    evidencias.forEach(e => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`• ${e.file_name}${e.descricao ? ' — ' + e.descricao : ''}`, MARGIN, y); y += 4.5;
    });
    y += 3;
    // Embutir imagens
    y = await renderEvidenceImages(doc, evidencias, { marginX: MARGIN, contentW: CONTENT_W, pageH: 297, startY: y });
    y += 4;
  }

  // Assinatura
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('6. Responsável Técnico', MARGIN, y); y += 8;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');

  y += 12;
  doc.line(MARGIN, y, MARGIN + 90, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(aep.responsible_name || '—', MARGIN, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(aep.responsible_role || '', MARGIN, y); y += 4;
  if (aep.responsible_registration) { doc.text(`Registro: ${aep.responsible_registration}`, MARGIN, y); y += 4; }
  if (aep.signed_at) {
    doc.text(`Assinado em: ${new Date(aep.signed_at).toLocaleString('pt-BR')}`, MARGIN, y); y += 4;
  }
  if (aep.signature_hash) {
    doc.setFontSize(7); doc.setTextColor(120);
    doc.text(`Hash de assinatura: ${aep.signature_hash}`, MARGIN, y);
    doc.setTextColor(0);
  }

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`AEP v${aep.version || 1} — ${company.name} — Página ${i}/${pageCount}`, PAGE_W / 2, 290, { align: 'center' });
    doc.setTextColor(0);
  }

  doc.save(`AEP-${(aep.setor_nome || 'setor').replace(/\s+/g, '_')}-v${aep.version || 1}.pdf`);
}
