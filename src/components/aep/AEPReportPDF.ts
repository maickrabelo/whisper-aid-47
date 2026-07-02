import jsPDF from 'jspdf';
import { renderReportLogos } from '@/lib/pdfLogos';
import { classifyRisk, LEVEL_LABELS } from '@/lib/aepRiskLevel';
import { AEP_CATEGORIAS } from '@/hooks/useAEPFatoresCatalog';

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
  line('Setor:', aep.setor_nome || '—');
  line('Função/cargo:', aep.funcao_nome || '—');
  line('Data da avaliação:', new Date(aep.assessment_date).toLocaleDateString('pt-BR'));
  if (aep.next_review_date) line('Próxima revisão:', new Date(aep.next_review_date).toLocaleDateString('pt-BR'));
  line('Situação avaliada:', aep.situacao_trabalho || '—');
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

  // Fatores
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`3. Fatores levantados (${fatores.length})`, MARGIN, y); y += 6;

  fatores.forEach((f, idx) => {
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
  });

  // Participantes
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`4. Participação dos trabalhadores (${participantes.length})`, MARGIN, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  participantes.forEach(p => {
    if (y > 275) { doc.addPage(); y = 20; }
    const nome = p.anonimizado ? '(Anonimizado)' : (p.nome || '—');
    const t = `• ${nome}${p.funcao ? ' — ' + p.funcao : ''} [${p.tipo_participacao || 'outro'}]`;
    doc.text(t, MARGIN, y); y += 4.5;
  });
  y += 4;

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
