import jsPDF from 'jspdf';
import { renderReportLogos } from '@/lib/pdfLogos';
import {
  COPSOQ_QUESTIONS,
  COPSOQ_CATEGORY_LABELS,
  COPSOQCategory,
  ALL_CATEGORIES,
  CATEGORY_GROUPS,
  calculateCategoryAverage,
  calculateOverallAverage,
  getRiskLevel,
  normalizeScore,
  RISK_LEVEL_LABELS,
} from '@/data/copsoqQuestions';

interface Answer { questionNumber: number; value: number; }
interface Response {
  id: string;
  department: string | null;
  departments: string[];
  completedAt: string | null;
  answers: Answer[];
}

export interface COPSOQReportInput {
  assessment: { id: string; title: string; description: string | null; createdAt: string; };
  companyName: string;
  responses: Response[];
  selectedDepartment: string;
  departments: string[];
  sstLogoUrl?: string | null;
  sstName?: string | null;
  companyLogoUrl?: string | null;
}

const COLORS = {
  primary: [30, 58, 138] as [number, number, number],       // slate-blue
  accent: [59, 130, 246] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  bg: [241, 245, 249] as [number, number, number],
  favorable: [34, 197, 94] as [number, number, number],
  intermediate: [234, 179, 8] as [number, number, number],
  risk: [239, 68, 68] as [number, number, number],
};

const riskColor = (level: 'favorable' | 'intermediate' | 'risk') =>
  level === 'favorable' ? COLORS.favorable : level === 'intermediate' ? COLORS.intermediate : COLORS.risk;

export async function generateCOPSOQReport(input: COPSOQReportInput): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  const setText = (size: number, bold = false, color: [number, number, number] = COLORS.text) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  const newPage = () => {
    pdf.addPage();
    y = margin;
    drawPageHeader();
  };

  const ensure = (needed: number) => {
    if (y + needed > ph - 20) newPage();
  };

  const drawPageHeader = () => {
    setText(9, false, COLORS.muted);
    pdf.text(`Relatório COPSOQ II — ${input.companyName}`, margin, 10);
    pdf.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 12, pw - margin, 12);
    y = 20;
  };

  const drawSectionTitle = (title: string) => {
    ensure(14);
    setText(14, true, COLORS.primary);
    pdf.text(title, margin, y);
    pdf.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    pdf.setLineWidth(0.4);
    const w = pdf.getTextWidth(title);
    pdf.line(margin, y + 1.5, margin + w, y + 1.5);
    y += 8;
  };

  const drawParagraph = (text: string, size = 10) => {
    setText(size, false, COLORS.text);
    const lines = pdf.splitTextToSize(text, pw - 2 * margin);
    lines.forEach((line: string) => {
      ensure(size * 0.5 + 1);
      pdf.text(line, margin, y);
      y += size * 0.45 + 1;
    });
    y += 2;
  };

  // ═══ COVER PAGE ═══
  pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.rect(0, 0, pw, 55, 'F');
  await renderReportLogos(pdf, pw, {
    sstLogoUrl: input.sstLogoUrl,
    companyLogoUrl: input.companyLogoUrl,
    topY: 10,
    maxHeight: 30,
    maxWidth: 45,
  });

  y = 80;
  setText(22, true, COLORS.primary);
  const title = 'Relatório de Avaliação';
  pdf.text(title, pw / 2, y, { align: 'center' });
  y += 10;
  setText(18, true, COLORS.accent);
  pdf.text('Riscos Psicossociais — COPSOQ II', pw / 2, y, { align: 'center' });
  y += 20;

  setText(11, false, COLORS.muted);
  pdf.text('Copenhagen Psychosocial Questionnaire (versão curta)', pw / 2, y, { align: 'center' });
  y += 30;

  // Company card
  pdf.setFillColor(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);
  pdf.roundedRect(margin, y, pw - 2 * margin, 55, 3, 3, 'F');
  const cardX = margin + 8;
  let cardY = y + 12;
  setText(10, true, COLORS.muted);
  pdf.text('EMPRESA', cardX, cardY);
  cardY += 6;
  setText(14, true, COLORS.text);
  pdf.text(input.companyName, cardX, cardY);
  cardY += 10;
  setText(10, true, COLORS.muted);
  pdf.text('AVALIAÇÃO', cardX, cardY);
  cardY += 5;
  setText(11, false, COLORS.text);
  pdf.text(input.assessment.title, cardX, cardY);
  cardY += 8;
  setText(10, true, COLORS.muted);
  pdf.text('SETOR', cardX, cardY);
  cardY += 5;
  setText(11, false, COLORS.text);
  pdf.text(input.selectedDepartment === 'all' ? 'Todos os setores' : input.selectedDepartment, cardX, cardY);

  y = ph - 25;
  setText(9, false, COLORS.muted);
  pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, pw / 2, y, { align: 'center' });
  if (input.sstName) {
    pdf.text(`Elaborado por ${input.sstName}`, pw / 2, y + 5, { align: 'center' });
  }

  // ═══ CONTENT PAGES ═══
  newPage();

  // Filter responses
  const filtered = input.selectedDepartment === 'all'
    ? input.responses
    : input.responses.filter(r => r.departments.includes(input.selectedDepartment));
  const allAnswers = filtered.flatMap(r => r.answers);
  const overallAverage = calculateOverallAverage(allAnswers);
  const overallRisk = getRiskLevel(overallAverage);

  // Category averages
  const catAverages: Record<string, number> = {};
  ALL_CATEGORIES.forEach(cat => { catAverages[cat] = calculateCategoryAverage(allAnswers, cat); });

  const criticalCount = Object.values(catAverages).filter(v => getRiskLevel(v) === 'risk').length;
  const intermediateCount = Object.values(catAverages).filter(v => getRiskLevel(v) === 'intermediate').length;
  const favorableCount = Object.values(catAverages).filter(v => getRiskLevel(v) === 'favorable').length;

  // ── 1. Resumo Executivo ──
  drawSectionTitle('1. Resumo Executivo');
  drawParagraph(
    `Este relatório apresenta os resultados da avaliação de riscos psicossociais aplicada aos colaboradores da ${input.companyName} utilizando o instrumento COPSOQ II (Copenhagen Psychosocial Questionnaire), validado internacionalmente para identificação e mensuração de fatores psicossociais no ambiente de trabalho.`
  );
  drawParagraph(
    `A avaliação contou com ${filtered.length} respostas válidas, com pontuação média geral de ${overallAverage.toFixed(2)} (escala 1-5), classificada como "${RISK_LEVEL_LABELS[overallRisk]}". Das 23 dimensões avaliadas, ${criticalCount} foram classificadas em risco, ${intermediateCount} em nível intermediário e ${favorableCount} como favoráveis.`
  );

  // KPI cards
  ensure(30);
  const kpiW = (pw - 2 * margin - 12) / 4;
  const kpiY = y;
  const kpis = [
    { label: 'Respostas', value: String(filtered.length), color: COLORS.accent },
    { label: 'Média Geral', value: overallAverage.toFixed(2), color: COLORS.primary },
    { label: 'Classificação', value: RISK_LEVEL_LABELS[overallRisk], color: riskColor(overallRisk) },
    { label: 'Dimensões em Risco', value: String(criticalCount), color: COLORS.risk },
  ];
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 4);
    pdf.setFillColor(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);
    pdf.roundedRect(x, kpiY, kpiW, 22, 2, 2, 'F');
    pdf.setFillColor(k.color[0], k.color[1], k.color[2]);
    pdf.rect(x, kpiY, 2, 22, 'F');
    setText(8, true, COLORS.muted);
    pdf.text(k.label.toUpperCase(), x + 5, kpiY + 6);
    setText(13, true, k.color);
    pdf.text(k.value, x + 5, kpiY + 15);
  });
  y = kpiY + 28;

  // ── 2. Dimensões por Grupo ──
  drawSectionTitle('2. Resultados por Dimensão');

  Object.entries(CATEGORY_GROUPS).forEach(([groupName, cats]) => {
    ensure(12);
    setText(11, true, COLORS.primary);
    pdf.text(groupName, margin, y);
    y += 5;

    (cats as COPSOQCategory[]).forEach(cat => {
      const avg = catAverages[cat] || 0;
      const level = getRiskLevel(avg);
      const rc = riskColor(level);
      ensure(9);
      // background bar
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y - 4, pw - 2 * margin, 8, 1.5, 1.5, 'F');
      pdf.setFillColor(rc[0], rc[1], rc[2]);
      pdf.rect(margin, y - 4, 1.5, 8, 'F');
      setText(9.5, false, COLORS.text);
      pdf.text(COPSOQ_CATEGORY_LABELS[cat], margin + 4, y + 1);
      setText(9, true, rc);
      pdf.text(`${avg.toFixed(2)} — ${RISK_LEVEL_LABELS[level]}`, pw - margin - 2, y + 1, { align: 'right' });
      y += 9;
    });
    y += 3;
  });

  // ── 3. Top 10 Questões Críticas ──
  const questionAverages = COPSOQ_QUESTIONS.map(q => {
    const values = allAnswers.filter(a => a.questionNumber === q.number).map(a => normalizeScore(a.value, q.isInverted));
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return { number: q.number, text: q.text, category: COPSOQ_CATEGORY_LABELS[q.category], average: avg, level: getRiskLevel(avg) };
  }).sort((a, b) => a.average - b.average).slice(0, 10);

  drawSectionTitle('3. Questões Mais Críticas');
  drawParagraph('As 10 questões com menor pontuação normalizada (1-5) — valores mais baixos indicam maior necessidade de intervenção.');

  questionAverages.forEach((q, i) => {
    ensure(14);
    const rc = riskColor(q.level);
    pdf.setFillColor(250, 250, 252);
    pdf.roundedRect(margin, y - 3, pw - 2 * margin, 13, 1.5, 1.5, 'F');
    pdf.setFillColor(rc[0], rc[1], rc[2]);
    pdf.rect(margin, y - 3, 1.5, 13, 'F');
    setText(8.5, true, COLORS.muted);
    pdf.text(`#${q.number}`, margin + 4, y + 1);
    setText(8.5, true, rc);
    pdf.text(`${q.average.toFixed(2)} · ${RISK_LEVEL_LABELS[q.level]}`, pw - margin - 2, y + 1, { align: 'right' });
    setText(9, false, COLORS.text);
    const lines = pdf.splitTextToSize(q.text, pw - 2 * margin - 8);
    pdf.text(lines[0] || '', margin + 4, y + 6);
    setText(7.5, false, COLORS.muted);
    pdf.text(q.category, margin + 4, y + 9.5);
    y += 15;
  });

  // ── 4. Metodologia ──
  drawSectionTitle('4. Metodologia');
  drawParagraph(
    'O COPSOQ II (Copenhagen Psychosocial Questionnaire) é um instrumento internacionalmente validado, desenvolvido pelo National Research Centre for the Working Environment (Dinamarca). A versão curta utilizada compreende 41 questões distribuídas em 23 dimensões psicossociais, agrupadas em cinco domínios principais.'
  );
  drawParagraph(
    'A pontuação varia de 1 a 5 em escala Likert. Para dimensões que representam riscos (ex.: exigências, conflitos), a pontuação é invertida — de forma que valores mais altos após normalização sempre representam condições mais favoráveis. Classificação: 1,00–2,66 (Risco); 2,67–3,66 (Intermediário); 3,67–5,00 (Favorável).'
  );

  // Footer with page numbers
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    pdf.setPage(p);
    setText(8, false, COLORS.muted);
    pdf.text(`Página ${p} de ${totalPages}`, pw - margin, ph - 8, { align: 'right' });
    pdf.text('Relatório COPSOQ II', margin, ph - 8);
  }

  const safeName = input.companyName.replace(/[^\w]+/g, '_').substring(0, 40);
  pdf.save(`Relatorio_COPSOQ_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
