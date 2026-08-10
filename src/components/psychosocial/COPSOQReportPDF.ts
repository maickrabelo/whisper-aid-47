import jsPDF from 'jspdf';
import { renderReportLogos } from '@/lib/pdfLogos';
import { installPdfTextSafety } from '@/lib/pdfTextSafety';
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
  executiveSummary?: string;
  actionItems?: { id?: string; category?: string; priority?: string; description?: string; recommendation?: string }[];
  scheduleItems?: { id?: string; action?: string; deadline?: string; responsible?: string; status?: string }[];
  recommendedPeriodicity?: string;
  companyInfo?: { cnpj?: string; address?: string; cnae?: string; riskGrade?: string };
  responsibleInfo?: { name?: string; cpf?: string; registration?: string };
  orgResponsible?: { name?: string; cpf?: string; role?: string };
}

const COLORS = {
  primary: [30, 58, 138] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  bg: [241, 245, 249] as [number, number, number],
  favorable: [34, 197, 94] as [number, number, number],
  intermediate: [234, 179, 8] as [number, number, number],
  risk: [239, 68, 68] as [number, number, number],
  neutral: [148, 163, 184] as [number, number, number],
};

type CopsoqRiskLevel = 'favorable' | 'intermediate' | 'risk';
type CellRisk = CopsoqRiskLevel | 'na';

const riskColor = (level: CellRisk) =>
  level === 'favorable' ? COLORS.favorable
  : level === 'intermediate' ? COLORS.intermediate
  : level === 'risk' ? COLORS.risk
  : COLORS.neutral;

// Recomendações por dimensão (23) — 3 níveis de intervenção
export const COPSOQ_RECOMMENDATIONS: Record<COPSOQCategory, Record<CopsoqRiskLevel, string>> = {
  quantitativeDemands: {
    risk: 'Redistribuir carga, revisar prazos, dimensionar equipe adequadamente e monitorar horas extras.',
    intermediate: 'Monitorar volume de trabalho e ajustar cronogramas quando necessário.',
    favorable: 'Manter equilíbrio atual de demandas quantitativas.',
  },
  workPace: {
    risk: 'Reduzir picos de trabalho, planejar folgas entre ciclos intensos e revisar metas de produção.',
    intermediate: 'Acompanhar picos de ritmo e implementar pausas programadas.',
    favorable: 'Manter ritmo de trabalho sustentável.',
  },
  cognitiveDemands: {
    risk: 'Oferecer capacitação, simplificar processos decisórios e apoiar tarefas complexas.',
    intermediate: 'Revisar processos que exigem alta concentração e oferecer suporte técnico.',
    favorable: 'Manter estímulo cognitivo saudável.',
  },
  emotionalDemands: {
    risk: 'Implementar apoio psicológico, rotação em atividades emocionalmente intensas e supervisão clínica.',
    intermediate: 'Oferecer canais de apoio emocional e treinamento em manejo emocional.',
    favorable: 'Manter cuidados atuais com carga emocional.',
  },
  influence: {
    risk: 'Ampliar autonomia decisória, envolver equipe em decisões e delegar responsabilidades.',
    intermediate: 'Avaliar oportunidades de maior participação em decisões operacionais.',
    favorable: 'Manter práticas de autonomia e influência.',
  },
  developmentPossibilities: {
    risk: 'Criar plano de carreira, oferecer treinamentos e aproveitar as competências dos colaboradores.',
    intermediate: 'Ampliar oportunidades de aprendizado e uso de habilidades.',
    favorable: 'Manter cultura de desenvolvimento profissional.',
  },
  meaningOfWork: {
    risk: 'Comunicar propósito da organização, alinhar valores e demonstrar impacto do trabalho.',
    intermediate: 'Reforçar comunicação sobre a importância das atividades realizadas.',
    favorable: 'Manter cultura de significado no trabalho.',
  },
  commitment: {
    risk: 'Fortalecer identidade organizacional, ouvir colaboradores e agir em problemas do local de trabalho.',
    intermediate: 'Estimular pertencimento e participação em iniciativas internas.',
    favorable: 'Manter engajamento atual.',
  },
  predictability: {
    risk: 'Comunicar mudanças com antecedência, criar canais formais de informação e planejamento transparente.',
    intermediate: 'Melhorar comunicação sobre decisões e mudanças futuras.',
    favorable: 'Manter transparência atual.',
  },
  roleClarity: {
    risk: 'Revisar descrições de cargo, esclarecer responsabilidades e definir objetivos por colaborador.',
    intermediate: 'Reforçar clareza de papéis em reuniões periódicas.',
    favorable: 'Manter clareza atual de papéis.',
  },
  roleConflicts: {
    risk: 'Alinhar prioridades entre gestores, eliminar exigências contraditórias e padronizar processos.',
    intermediate: 'Monitorar conflitos de demandas e alinhar expectativas.',
    favorable: 'Manter alinhamento atual.',
  },
  leadershipQuality: {
    risk: 'Treinar lideranças, implementar feedback estruturado e avaliações 360°.',
    intermediate: 'Desenvolver competências de liderança em nível intermediário.',
    favorable: 'Manter práticas de liderança.',
  },
  socialSupport: {
    risk: 'Instituir reuniões 1:1 regulares, capacitar chefias em escuta ativa e apoio à equipe.',
    intermediate: 'Fortalecer disponibilidade e comunicação gestor-equipe.',
    favorable: 'Manter apoio da liderança.',
  },
  socialCommunity: {
    risk: 'Promover integração da equipe, atividades colaborativas e mediar conflitos entre pares.',
    intermediate: 'Incentivar cooperação e ambiente colaborativo.',
    favorable: 'Manter cultura de cooperação.',
  },
  jobInsecurity: {
    risk: 'Comunicar estabilidade, planos de contingência e transparência sobre o futuro da organização.',
    intermediate: 'Reforçar comunicação sobre estabilidade e perspectivas.',
    favorable: 'Manter percepção de segurança.',
  },
  jobSatisfaction: {
    risk: 'Investigar causas de insatisfação, revisar remuneração, benefícios e condições gerais.',
    intermediate: 'Levantar aspectos de melhoria na experiência do trabalho.',
    favorable: 'Manter fatores que geram satisfação.',
  },
  workFamilyConflict: {
    risk: 'Revisar jornada, implementar flexibilidade, políticas de desconexão e apoio à família.',
    intermediate: 'Monitorar equilíbrio trabalho-vida e ajustar demandas fora do horário.',
    favorable: 'Manter equilíbrio atual.',
  },
  burnout: {
    risk: 'Ação imediata: apoio psicológico, redução de carga, licenças e monitoramento clínico.',
    intermediate: 'Programa de bem-estar, pausas estruturadas e sinais de alerta acompanhados.',
    favorable: 'Manter cuidados preventivos de saúde mental.',
  },
  stress: {
    risk: 'Intervenção clínica e organizacional: reduzir gatilhos, treinar manejo de estresse, apoio profissional.',
    intermediate: 'Oferecer recursos de manejo de estresse e monitorar sintomas.',
    favorable: 'Manter fatores de proteção ao estresse.',
  },
  selfRatedHealth: {
    risk: 'Programas de saúde ocupacional, exames periódicos e acompanhamento clínico intensivo.',
    intermediate: 'Reforçar campanhas de saúde e prevenção.',
    favorable: 'Manter iniciativas de saúde no trabalho.',
  },
  trust: {
    risk: 'Reconstruir confiança com comunicação transparente, coerência entre discurso e prática, escuta ativa.',
    intermediate: 'Aumentar transparência e consistência das decisões da gestão.',
    favorable: 'Manter cultura de confiança.',
  },
  justice: {
    risk: 'Revisar processos de distribuição de tarefas e resolução de conflitos com critérios claros.',
    intermediate: 'Reforçar critérios objetivos e transparência em decisões.',
    favorable: 'Manter cultura de justiça organizacional.',
  },
  offensiveBehaviors: {
    risk: 'Ação urgente: canal de denúncia ativo, política antiassédio, investigação e responsabilização.',
    intermediate: 'Reforçar política antiassédio, capacitação e canais de denúncia.',
    favorable: 'Manter ambiente respeitoso.',
  },
};

export async function generateCOPSOQReport(input: COPSOQReportInput): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  installPdfTextSafety(pdf);
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  const setText = (size: number, bold = false, color: [number, number, number] = COLORS.text) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  const drawPageHeader = () => {
    setText(9, false, COLORS.muted);
    pdf.text(`Relatório COPSOQ II — ${input.companyName}`, margin, 10);
    pdf.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 12, pw - margin, 12);
    y = 20;
  };

  const newPage = () => {
    pdf.addPage();
    y = margin;
    drawPageHeader();
  };

  const ensure = (needed: number) => {
    if (y + needed > ph - 20) newPage();
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

  const drawSubTitle = (title: string) => {
    ensure(10);
    setText(11, true, COLORS.text);
    pdf.text(title, margin, y);
    y += 6;
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

  // Tabela com TODAS as perguntas e suas pontuações (geral ou por setor)
  const drawAllQuestionsTable = (answers: Answer[]) => {
    const tableW = pw - 2 * margin;
    const colNum = 9;
    const colAvg = 16;
    const colLevel = 28;
    const colText = tableW - colNum - colAvg - colLevel - 4;
    const xText = margin + colNum + 2;
    const xAvg = margin + colNum + colText + 4;
    const xLevel = xAvg + colAvg;

    const header = () => {
      ensure(12);
      pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      pdf.rect(margin, y, tableW, 7, 'F');
      setText(8, true, [255, 255, 255]);
      pdf.text('#', margin + 2, y + 4.8);
      pdf.text('Pergunta', xText, y + 4.8);
      pdf.text('Média', xAvg, y + 4.8);
      pdf.text('Nível', xLevel, y + 4.8);
      y += 9;
    };

    header();

    COPSOQ_QUESTIONS.forEach((q, index) => {
      const vals = answers.filter(a => a.questionNumber === q.number)
        .map(a => normalizeScore(a.value, q.isInverted));
      const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : NaN;
      const level: CellRisk = vals.length > 0 ? getRiskLevel(avg) : 'na';

      setText(8, false, COLORS.text);
      const lines: string[] = pdf.splitTextToSize(q.text, colText - 2);
      const rowH = Math.max(7, lines.length * 3.8 + 3);

      if (y + rowH > ph - 20) {
        newPage();
        header();
      }

      const bg = index % 2 === 0 ? 250 : 242;
      pdf.setFillColor(bg, bg, bg);
      pdf.rect(margin, y, tableW, rowH, 'F');

      setText(8, false, COLORS.muted);
      pdf.text(String(q.number), margin + 2, y + 4.5);
      setText(8, false, COLORS.text);
      pdf.text(lines, xText, y + 4.5);

      const rc = riskColor(level);
      if (vals.length === 0) {
        setText(8, false, COLORS.neutral);
        pdf.text('-', xAvg, y + 4.5);
        pdf.text('sem dados', xLevel, y + 4.5);
      } else {
        setText(8, true, rc);
        pdf.text(avg.toFixed(2), xAvg, y + 4.5);
        pdf.text(RISK_LEVEL_LABELS[level as CopsoqRiskLevel], xLevel, y + 4.5);
      }

      y += rowH;
    });
    y += 4;
  };


  // ══════════════════════════════════════════
  // COVER
  // ══════════════════════════════════════════
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
  pdf.text('Relatório de Avaliação', pw / 2, y, { align: 'center' });
  y += 10;
  setText(18, true, COLORS.accent);
  pdf.text('Riscos Psicossociais — COPSOQ II', pw / 2, y, { align: 'center' });
  y += 20;
  setText(11, false, COLORS.muted);
  pdf.text('Copenhagen Psychosocial Questionnaire (versão curta)', pw / 2, y, { align: 'center' });
  y += 30;

  // Company card
  pdf.setFillColor(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);
  pdf.roundedRect(margin, y, pw - 2 * margin, 60, 3, 3, 'F');
  const cardX = margin + 8;
  let cardY = y + 12;
  setText(10, true, COLORS.muted); pdf.text('EMPRESA', cardX, cardY);
  cardY += 6; setText(14, true, COLORS.text); pdf.text(input.companyName, cardX, cardY);
  cardY += 10; setText(10, true, COLORS.muted); pdf.text('AVALIAÇÃO', cardX, cardY);
  cardY += 5; setText(11, false, COLORS.text); pdf.text(input.assessment.title, cardX, cardY);
  cardY += 8; setText(10, true, COLORS.muted); pdf.text('ESCOPO DO RELATÓRIO', cardX, cardY);
  cardY += 5; setText(11, false, COLORS.text);
  const scopeLabel = input.selectedDepartment === 'all'
    ? `Consolidado — ${input.departments.length || 1} setor(es)`
    : `Setor: ${input.selectedDepartment}`;
  pdf.text(scopeLabel, cardX, cardY);

  y = ph - 25;
  setText(9, false, COLORS.muted);
  pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, pw / 2, y, { align: 'center' });
  if (input.sstName) {
    pdf.text(`Elaborado por ${input.sstName}`, pw / 2, y + 5, { align: 'center' });
  }

  // ══════════════════════════════════════════
  // Data
  // ══════════════════════════════════════════
  const filtered = input.selectedDepartment === 'all'
    ? input.responses
    : input.responses.filter(r => r.departments.includes(input.selectedDepartment));
  const allAnswers = filtered.flatMap(r => r.answers);
  const overallAverage = calculateOverallAverage(allAnswers);
  const overallRisk = getRiskLevel(overallAverage);

  // Per-category averages (with hasData flag)
  const catData: Record<string, { avg: number; hasData: boolean; level: CellRisk }> = {};
  ALL_CATEGORIES.forEach(cat => {
    const catQuestions = COPSOQ_QUESTIONS.filter(q => q.category === cat).map(q => q.number);
    const catAnswers = allAnswers.filter(a => catQuestions.includes(a.questionNumber));
    const avg = calculateCategoryAverage(allAnswers, cat);
    const hasData = catAnswers.length > 0;
    catData[cat] = { avg, hasData, level: hasData ? getRiskLevel(avg) : 'na' };
  });

  const criticalCount = ALL_CATEGORIES.filter(c => catData[c].level === 'risk').length;
  const intermediateCount = ALL_CATEGORIES.filter(c => catData[c].level === 'intermediate').length;
  const favorableCount = ALL_CATEGORIES.filter(c => catData[c].level === 'favorable').length;

  // ─── Agregação setorizada (para consolidar riscos por setor no resumo) ───
  const isConsolidated = input.selectedDepartment === 'all' && input.departments.length > 0;
  const dimensionsAtRiskInAnySector = new Set<COPSOQCategory>();
  let sectorRiskOccurrences = 0;
  let sectorAttentionOccurrences = 0;
  let sectorsWithRisk = 0;
  let sectorsWithAttention = 0;

  if (isConsolidated) {
    input.departments.forEach(dept => {
      const deptAnswers = input.responses
        .filter(r => r.departments.includes(dept))
        .flatMap(r => r.answers);
      let deptHasRisk = false;
      let deptHasAttention = false;
      ALL_CATEGORIES.forEach(cat => {
        const catQs = COPSOQ_QUESTIONS.filter(q => q.category === cat).map(q => q.number);
        const catAns = deptAnswers.filter(a => catQs.includes(a.questionNumber));
        if (catAns.length === 0) return;
        const lvl = getRiskLevel(calculateCategoryAverage(deptAnswers, cat));
        if (lvl === 'risk') {
          sectorRiskOccurrences++;
          deptHasRisk = true;
          dimensionsAtRiskInAnySector.add(cat);
        } else if (lvl === 'intermediate') {
          sectorAttentionOccurrences++;
          deptHasAttention = true;
        }
      });
      if (deptHasRisk) sectorsWithRisk++;
      if (deptHasAttention) sectorsWithAttention++;
    });
    // União com riscos observados no consolidado geral
    ALL_CATEGORIES.forEach(c => {
      if (catData[c].level === 'risk') dimensionsAtRiskInAnySector.add(c);
    });
  }

  const unionRiskCount = isConsolidated ? dimensionsAtRiskInAnySector.size : criticalCount;

  const drawSignatureBlock = () => {
    ensure(45);
    y += 12;
    drawSubTitle('Assinaturas');
    const colW = (pw - 2 * margin) / 2;
    const lineY = y + 10;
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, lineY, margin + colW - 12, lineY);
    pdf.line(margin + colW + 12, lineY, pw - margin, lineY);

    let leftY = lineY + 5;
    let rightY = lineY + 5;
    const leftX = margin;
    const rightX = margin + colW + 12;

    setText(10, true, COLORS.text);
    pdf.text(input.responsibleInfo?.name || input.sstName || 'Responsável Técnico', leftX, leftY);
    pdf.text(input.orgResponsible?.name || 'Representante Legal da Empresa', rightX, rightY);
    leftY += 5; rightY += 5;

    setText(8.5, false, COLORS.muted);
    if (input.responsibleInfo?.cpf) { pdf.text(`CPF: ${input.responsibleInfo.cpf}`, leftX, leftY); leftY += 4.5; }
    if (input.responsibleInfo?.registration) { pdf.text(`Registro profissional: ${input.responsibleInfo.registration}`, leftX, leftY); leftY += 4.5; }
    if (input.orgResponsible?.role) { pdf.text(input.orgResponsible.role, rightX, rightY); rightY += 4.5; }
    if (input.orgResponsible?.cpf) { pdf.text(`CPF: ${input.orgResponsible.cpf}`, rightX, rightY); rightY += 4.5; }
    pdf.text(input.companyName, rightX, rightY); rightY += 4.5;

    y = Math.max(leftY, rightY) + 4;
    pdf.text(`Local e Data: _______________, ${new Date().toLocaleDateString('pt-BR')}`, leftX, y);
    y += 6;
  };

  const finalizeDocument = () => {
    drawSignatureBlock();
    const totalPages = (pdf as any).internal.getNumberOfPages();
    for (let p = 2; p <= totalPages; p++) {
      pdf.setPage(p);
      setText(8, false, COLORS.muted);
      pdf.text(`Página ${p} de ${totalPages}`, pw - margin, ph - 8, { align: 'right' });
      pdf.text('Relatório COPSOQ II', margin, ph - 8);
    }
    const safeName = input.companyName.replace(/[^\w]+/g, '_').substring(0, 40);
    pdf.save(`Relatorio_COPSOQ_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const drawPeriodicity = () => {
    const lines = (input.recommendedPeriodicity || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    ensure(12);
    drawSubTitle('Periodicidade Recomendada');
    lines.forEach(line => {
      drawParagraph(line.startsWith('•') ? line : `• ${line.replace(/^-\s*/, '')}`);
    });
  };

  // ══════════════════════════════════════════
  // PAGE 2 — Executive Summary
  // ══════════════════════════════════════════
  newPage();
  drawSectionTitle('1. Resumo Executivo');
  if (input.executiveSummary && input.executiveSummary.trim()) {
    input.executiveSummary.split(/\n{2,}/).forEach(par => {
      const t = par.trim();
      if (t) drawParagraph(t);
    });
  } else {
  drawParagraph(
    `Este relatório apresenta os resultados da avaliação de riscos psicossociais aplicada aos colaboradores da ${input.companyName} utilizando o instrumento COPSOQ II (Copenhagen Psychosocial Questionnaire), validado internacionalmente para identificação e mensuração de fatores psicossociais no ambiente de trabalho.`
  );
  drawParagraph(
    `A avaliação contou com ${filtered.length} respostas válidas, distribuídas em ${input.departments.length || 1} setor(es). A pontuação média geral foi de ${overallAverage.toFixed(2)} em escala normalizada de 1 a 5, classificada como "${RISK_LEVEL_LABELS[overallRisk]}". Das 23 dimensões avaliadas, ${criticalCount} estão em Risco, ${intermediateCount} em nível Intermediário e ${favorableCount} em condição Favorável no consolidado geral da empresa.`
  );
  if (isConsolidated) {
    drawParagraph(
      `Considerando também a análise setorizada, ${dimensionsAtRiskInAnySector.size} dimensão(ões) apresentam Risco em pelo menos um setor — totalizando ${sectorRiskOccurrences} ocorrência(s) de risco em ${sectorsWithRisk} setor(es). Foram ainda identificadas ${sectorAttentionOccurrences} ocorrência(s) em nível Intermediário distribuídas em ${sectorsWithAttention} setor(es). Estas informações complementam a visão geral e evidenciam focos localizados de atenção mesmo quando o consolidado da empresa é favorável.`
    );
  }
  }

  if (input.companyInfo && (input.companyInfo.cnpj || input.companyInfo.address || input.companyInfo.cnae || input.companyInfo.riskGrade)) {
    drawSubTitle('Identificação da Empresa');
    if (input.companyInfo.cnpj) drawParagraph(`CNPJ: ${input.companyInfo.cnpj}`);
    if (input.companyInfo.address) drawParagraph(`Endereço: ${input.companyInfo.address}`);
    if (input.companyInfo.cnae) drawParagraph(`CNAE: ${input.companyInfo.cnae}`);
    if (input.companyInfo.riskGrade) drawParagraph(`Grau de risco: ${input.companyInfo.riskGrade}`);
  }

  // KPI cards
  ensure(30);
  const kpiW = (pw - 2 * margin - 12) / 4;
  const kpiY = y;
  const kpiRiskLabel = isConsolidated ? 'Risco (Geral / Setores)' : 'Dimensões em Risco';
  const kpiRiskValue = isConsolidated
    ? `${criticalCount} / ${unionRiskCount}`
    : String(criticalCount);
  const kpis: Array<{ label: string; value: string; color: [number, number, number] }> = [
    { label: 'Respostas', value: String(filtered.length), color: COLORS.accent },
    { label: 'Média Geral', value: overallAverage.toFixed(2), color: COLORS.primary },
    { label: 'Classificação', value: RISK_LEVEL_LABELS[overallRisk], color: riskColor(overallRisk) },
    { label: kpiRiskLabel, value: kpiRiskValue, color: COLORS.risk },
  ];
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 4);
    pdf.setFillColor(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);
    pdf.roundedRect(x, kpiY, kpiW, 22, 2, 2, 'F');
    pdf.setFillColor(k.color[0], k.color[1], k.color[2]);
    pdf.rect(x, kpiY, 2, 22, 'F');
    setText(8, true, COLORS.muted);
    pdf.text(k.label.toUpperCase(), x + 5, kpiY + 6);
    setText(11, true, k.color);
    pdf.text(k.value, x + 5, kpiY + 15);
  });
  y = kpiY + 28;

  // ══════════════════════════════════════════
  // 2 — Methodology
  // ══════════════════════════════════════════
  drawSectionTitle('2. Metodologia');
  drawParagraph(
    'O COPSOQ II (Copenhagen Psychosocial Questionnaire) é um instrumento internacionalmente validado, desenvolvido pelo National Research Centre for the Working Environment (Dinamarca). A versão curta utilizada compreende 41 questões distribuídas em 23 dimensões psicossociais, agrupadas em seis domínios principais.'
  );
  drawParagraph(
    'A pontuação varia de 1 a 5 em escala Likert. Para dimensões que representam riscos (ex.: exigências quantitativas, conflitos, burnout, estresse), a pontuação é invertida — de forma que valores mais altos após normalização sempre representam condições mais favoráveis, e valores mais baixos indicam maior risco psicossocial.'
  );
  drawSubTitle('Classificação de Risco:');
  drawParagraph('• Favorável (3,67 ou mais): condição adequada — manter práticas atuais.');
  drawParagraph('• Intermediário (2,33 – 3,66): atenção necessária — planejar melhorias.');
  drawParagraph('• Risco (< 2,33): intervenção prioritária.');

  // ══════════════════════════════════════════
  // 3 — Results by Dimension (all 23, grouped)
  // ══════════════════════════════════════════
  drawSectionTitle('3. Resultados por Dimensão');

  Object.entries(CATEGORY_GROUPS).forEach(([groupName, cats]) => {
    ensure(14);
    setText(11, true, COLORS.primary);
    pdf.text(groupName, margin, y);
    y += 5;

    (cats as COPSOQCategory[]).forEach(cat => {
      const d = catData[cat];
      const rc = riskColor(d.level);
      ensure(9);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y - 4, pw - 2 * margin, 8, 1.5, 1.5, 'F');
      pdf.setFillColor(rc[0], rc[1], rc[2]);
      pdf.rect(margin, y - 4, 1.5, 8, 'F');
      setText(9.5, false, COLORS.text);
      pdf.text(COPSOQ_CATEGORY_LABELS[cat], margin + 4, y + 1);
      setText(9, true, rc);
      const label = d.hasData
        ? `${d.avg.toFixed(2)} — ${RISK_LEVEL_LABELS[d.level as CopsoqRiskLevel]}`
        : 'Sem dados';
      pdf.text(label, pw - margin - 2, y + 1, { align: 'right' });
      y += 9;
    });
    y += 3;
  });

  // ══════════════════════════════════════════
  // 4 — Results by Sector (per department)
  // ══════════════════════════════════════════
  if (input.departments.length > 0 && input.selectedDepartment === 'all') {
    newPage();
    drawSectionTitle('4. Resultados por Setor');
    drawParagraph(
      'Detalhamento das 23 dimensões avaliadas em cada setor. Colaboradores que atuam em mais de um setor (avaliação multisetorial) são contabilizados em cada setor selecionado.'
    );

    input.departments.forEach(dept => {
      const deptResponses = input.responses.filter(r => r.departments.includes(dept));
      const deptAnswers = deptResponses.flatMap(r => r.answers);

      ensure(20);
      // Sector header block
      pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      pdf.roundedRect(margin, y, pw - 2 * margin, 10, 1.5, 1.5, 'F');
      setText(11, true, [255, 255, 255]);
      pdf.text(dept, margin + 4, y + 6.5);
      setText(9, false, [255, 255, 255]);
      pdf.text(`${deptResponses.length} respondente(s)`, pw - margin - 3, y + 6.5, { align: 'right' });
      y += 13;

      // Sector-level per-category
      const rows: Array<{ cat: COPSOQCategory; avg: number; level: CellRisk; hasData: boolean }> = ALL_CATEGORIES.map(cat => {
        const catQs = COPSOQ_QUESTIONS.filter(q => q.category === cat).map(q => q.number);
        const catAns = deptAnswers.filter(a => catQs.includes(a.questionNumber));
        const avg = calculateCategoryAverage(deptAnswers, cat);
        const hasData = catAns.length > 0;
        return { cat, avg, hasData, level: hasData ? getRiskLevel(avg) : 'na' };
      });

      // Sector overall
      const sectorOverall = calculateOverallAverage(deptAnswers);
      const sectorLevel: CellRisk = deptAnswers.length > 0 ? getRiskLevel(sectorOverall) : 'na';
      const sectorRc = riskColor(sectorLevel);
      const sCritical = rows.filter(r => r.level === 'risk').length;
      const sInter = rows.filter(r => r.level === 'intermediate').length;
      const sFav = rows.filter(r => r.level === 'favorable').length;

      ensure(14);
      pdf.setFillColor(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);
      pdf.roundedRect(margin, y, pw - 2 * margin, 11, 1.5, 1.5, 'F');
      setText(9, true, COLORS.muted);
      pdf.text('MÉDIA GERAL DO SETOR', margin + 4, y + 5);
      setText(11, true, sectorRc);
      pdf.text(
        deptAnswers.length > 0
          ? `${sectorOverall.toFixed(2)} — ${RISK_LEVEL_LABELS[sectorLevel as CopsoqRiskLevel]}`
          : 'Sem dados',
        margin + 4, y + 9.5,
      );
      setText(9, false, COLORS.text);
      pdf.text(
        `Risco: ${sCritical}   Intermediário: ${sInter}   Favorável: ${sFav}`,
        pw - margin - 3, y + 7.5, { align: 'right' },
      );
      y += 14;

      // Per-category dot list (2 columns to save space)
      const colGap = 4;
      const colW = (pw - 2 * margin - colGap) / 2;
      const half = Math.ceil(rows.length / 2);
      const leftCol = rows.slice(0, half);
      const rightCol = rows.slice(half);
      const rowH = 5.5;
      const blockH = leftCol.length * rowH;
      ensure(blockH + 4);
      const startY = y;

      const drawRow = (r: typeof rows[number], x: number, yy: number) => {
        const rc = riskColor(r.level);
        pdf.setFillColor(rc[0], rc[1], rc[2]);
        pdf.circle(x + 1.5, yy - 1.4, 1.4, 'F');
        setText(8.5, false, COLORS.text);
        const label = COPSOQ_CATEGORY_LABELS[r.cat];
        const val = r.hasData
          ? `${r.avg.toFixed(2)} · ${RISK_LEVEL_LABELS[r.level as CopsoqRiskLevel]}`
          : 'sem dados';
        const maxLabelW = colW - 6 - pdf.getTextWidth(val) - 2;
        const clipped = pdf.splitTextToSize(label, Math.max(20, maxLabelW))[0];
        pdf.text(clipped, x + 5, yy);
        setText(8.5, true, rc);
        pdf.text(val, x + colW - 1, yy, { align: 'right' });
      };

      leftCol.forEach((r, i) => drawRow(r, margin, startY + i * rowH));
      rightCol.forEach((r, i) => drawRow(r, margin + colW + colGap, startY + i * rowH));
      y = startY + blockH + 4;

      ensure(16);
      setText(9.5, true, COLORS.primary);
      pdf.text(`Pontuação de todas as perguntas — ${dept}`, margin, y);
      y += 5;
      drawAllQuestionsTable(deptAnswers);
      y += 3;
    });
  }


  // ══════════════════════════════════════════
  // 5 — Todas as perguntas (consolidado)
  // ══════════════════════════════════════════
  newPage();
  drawSectionTitle('5. Detalhamento de Todas as Perguntas');
  drawParagraph(
    'Pontuação média consolidada de cada questão do instrumento, em escala normalizada de 1 a 5. Valores mais baixos indicam condição menos favorável e maior necessidade de intervenção.'
  );
  drawAllQuestionsTable(allAnswers);

  // ══════════════════════════════════════════
  // 6 — Top Critical Questions
  // ══════════════════════════════════════════
  newPage();

  const questionAverages = COPSOQ_QUESTIONS.map(q => {
    const values = allAnswers.filter(a => a.questionNumber === q.number)
      .map(a => normalizeScore(a.value, q.isInverted));
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : NaN;
    return {
      number: q.number,
      text: q.text,
      category: COPSOQ_CATEGORY_LABELS[q.category],
      average: avg,
      level: !isNaN(avg) ? getRiskLevel(avg) : null,
      responseCount: values.length,
    };
  })
    .filter(q => !isNaN(q.average))
    .sort((a, b) => a.average - b.average)
    .slice(0, 15);

  drawSectionTitle('6. Questões Mais Críticas');
  drawParagraph(
    'As 15 questões com menor pontuação normalizada (1-5). Valores mais baixos indicam maior necessidade de intervenção. Cada questão exibe também o número de respondentes considerados.'
  );

  questionAverages.forEach(q => {
    ensure(16);
    const rc = riskColor(q.level as CopsoqRiskLevel);
    pdf.setFillColor(250, 250, 252);
    pdf.roundedRect(margin, y - 3, pw - 2 * margin, 15, 1.5, 1.5, 'F');
    pdf.setFillColor(rc[0], rc[1], rc[2]);
    pdf.rect(margin, y - 3, 1.5, 15, 'F');
    setText(8.5, true, COLORS.muted);
    pdf.text(`#${q.number}`, margin + 4, y + 1);
    setText(8.5, true, rc);
    pdf.text(
      `${q.average.toFixed(2)} · ${RISK_LEVEL_LABELS[q.level as CopsoqRiskLevel]}`,
      pw - margin - 2, y + 1, { align: 'right' },
    );
    setText(9, false, COLORS.text);
    const lines = pdf.splitTextToSize(q.text, pw - 2 * margin - 8);
    pdf.text(lines[0] || '', margin + 4, y + 6);
    if (lines[1]) pdf.text(lines[1], margin + 4, y + 9.5);
    setText(7.5, false, COLORS.muted);
    pdf.text(`${q.category} · ${q.responseCount} resposta(s)`, margin + 4, y + (lines[1] ? 12.5 : 10));
    y += 17;
  });

  // ══════════════════════════════════════════
  // 6 — Action Plan
  // ══════════════════════════════════════════
  newPage();
  drawSectionTitle('7. Plano de Ação Recomendado');

  const customActions = (input.actionItems || []).filter(a => (a.description || a.recommendation));
  if (customActions.length > 0) {
    const PRIORITY_LABELS: Record<string, string> = {
      immediate: 'Imediato (até 30 dias)',
      short_term: 'Curto prazo (1-3 meses)',
      medium_term: 'Médio prazo (3-6 meses)',
    };
    customActions.forEach((item, i) => {
      ensure(20);
      const catLabel = item.category && (COPSOQ_CATEGORY_LABELS as any)[item.category]
        ? (COPSOQ_CATEGORY_LABELS as any)[item.category]
        : (item.category || '');
      setText(10, true, COLORS.primary);
      pdf.text(`${i + 1}. ${catLabel}${item.priority ? ` — ${PRIORITY_LABELS[item.priority] || item.priority}` : ''}`, margin, y);
      y += 5;
      if (item.description) {
        setText(9.5, false, COLORS.text);
        pdf.splitTextToSize(item.description, pw - 2 * margin - 5).forEach((line: string) => { ensure(5); pdf.text(line, margin + 5, y); y += 4.5; });
      }
      if (item.recommendation) {
        setText(9.5, false, COLORS.muted);
        pdf.splitTextToSize(`Ação: ${item.recommendation}`, pw - 2 * margin - 5).forEach((line: string) => { ensure(5); pdf.text(line, margin + 5, y); y += 4.5; });
      }
      y += 3;
    });

    ensure(10);
    drawSubTitle('Cronograma');
    const sched = (input.scheduleItems || []).filter(s => s.action);
    if (sched.length > 0) {
      const STATUS_LABELS: Record<string, string> = { pending: 'Pendente', in_progress: 'Em andamento', completed: 'Concluído' };
      sched.forEach(item => {
        drawParagraph(`• ${item.action} — Prazo: ${item.deadline || '-'} · Responsável: ${item.responsible || '-'} · ${STATUS_LABELS[item.status || 'pending'] || ''}`);
      });
    } else {
      drawParagraph('• Cronograma não informado.');
    }

    drawPeriodicity();
    finalizeDocument();
    return;
  }

  const criticalCats = ALL_CATEGORIES.filter(c => catData[c].level === 'risk');
  const intermediateCats = ALL_CATEGORIES.filter(c => catData[c].level === 'intermediate');

  if (criticalCats.length > 0) {
    drawSubTitle('Ações Imediatas — Dimensões em Risco');
    criticalCats.forEach((cat, i) => {
      ensure(14);
      setText(10, true, COLORS.risk);
      pdf.text(`${i + 1}. ${COPSOQ_CATEGORY_LABELS[cat]}`, margin, y);
      y += 5;
      const rec = COPSOQ_RECOMMENDATIONS[cat].risk;
      setText(9.5, false, COLORS.text);
      const lines = pdf.splitTextToSize(rec, pw - 2 * margin - 5);
      lines.forEach((line: string) => { ensure(5); pdf.text(line, margin + 5, y); y += 4.5; });
      y += 2;
    });
    y += 3;
  }

  if (intermediateCats.length > 0) {
    drawSubTitle('Ações de Médio Prazo — Dimensões em Atenção');
    intermediateCats.forEach((cat, i) => {
      ensure(14);
      setText(10, true, COLORS.intermediate);
      pdf.text(`${i + 1}. ${COPSOQ_CATEGORY_LABELS[cat]}`, margin, y);
      y += 5;
      const rec = COPSOQ_RECOMMENDATIONS[cat].intermediate;
      setText(9.5, false, COLORS.text);
      const lines = pdf.splitTextToSize(rec, pw - 2 * margin - 5);
      lines.forEach((line: string) => { ensure(5); pdf.text(line, margin + 5, y); y += 4.5; });
      y += 2;
    });
    y += 3;
  }

  if (criticalCats.length === 0 && intermediateCats.length === 0) {
    drawParagraph('Todas as dimensões avaliadas encontram-se em condição favorável. Recomenda-se manter as práticas atuais e reaplicar a avaliação em 6-12 meses para monitoramento.');
  }

  ensure(10);
  drawSubTitle('Cronograma Sugerido');
  drawParagraph('• Semanas 1-2: comunicar resultados à liderança e equipes.');
  drawParagraph('• Semanas 3-4: elaborar planos de ação específicos para as dimensões críticas.');
  drawParagraph('• Meses 2-3: implementar primeiras intervenções e apoio profissional quando indicado.');
  drawParagraph('• Meses 4-6: monitorar indicadores, ajustar ações e coletar feedback.');
  drawParagraph('• Mês 6: reaplicar avaliação para medir progresso.');

  drawPeriodicity();
  finalizeDocument();
}
