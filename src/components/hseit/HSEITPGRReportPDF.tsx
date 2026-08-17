import jsPDF from 'jspdf';
import { renderReportLogos, renderCoverBackground } from '@/lib/pdfLogos';
import fundoPsico from '@/assets/fundo-psico.jpg.asset.json';
import { installPdfTextSafety } from '@/lib/pdfTextSafety';
import {
  HSEITCategory,
  HSEIT_CATEGORY_LABELS,
  HSEIT_QUESTIONS,
  getHealthImpact,
  HEALTH_IMPACT_LABELS,
  calculateCategoryAverage,
  normalizeScore,
  getRiskLevel,
  RISK_LEVEL_LABELS
} from '@/data/hseitQuestions';
import { ActionItem } from './HSEITActionPlanEditor';
import { ScheduleItem } from './HSEITScheduleEditor';

interface Answer { questionNumber: number; value: number; }
interface Response { id: string; department: string | null; completedAt: string | null; answers: Answer[]; }

interface CategoryAverage {
  category: HSEITCategory;
  average: number;
  label: string;
}

interface PGRReportData {
  assessment: {
    id: string;
    title: string;
    description: string | null;
    companyName: string;
    createdAt: string;
  };
  companyInfo: {
    cnpj?: string;
    address?: string;
    cnae?: string;
    riskGrade?: string;
    employeeCount?: number;
  };
  responses: Response[];
  categoryAverages: CategoryAverage[];
  departments: string[];
  questionAverages: { questionNumber: number; text: string; category: string; average: number }[];
  actionItems: ActionItem[];
  scheduleItems: ScheduleItem[];
  recommendedPeriodicity?: string;
  executiveSummary: string;
  sstLogoUrl?: string | null;
  companyLogoUrl?: string | null;
  sstName?: string | null;
  sstCpf?: string;
  sstRegistration?: string;
  orgResponsible?: { name?: string; cpf?: string; role?: string };
  methodology: 'hseit' | 'copsoq';
}

const CATEGORIES: HSEITCategory[] = ['demands', 'control', 'managerSupport', 'peerSupport', 'relationships', 'role', 'change'];

const RISK_AGENTS: Record<HSEITCategory, { agent: string; risks: string[] }> = {
  demands: { agent: 'Exigências do Trabalho', risks: ['Sobrecarga quantitativa', 'Sobrecarga qualitativa', 'Pressão temporal'] },
  control: { agent: 'Autonomia e Controle', risks: ['Baixa autonomia decisória', 'Monotonia', 'Ritmo de trabalho imposto'] },
  managerSupport: { agent: 'Suporte da Gestão', risks: ['Falta de suporte gerencial', 'Comunicação deficiente', 'Ausência de feedback'] },
  peerSupport: { agent: 'Suporte dos Pares', risks: ['Isolamento social', 'Falta de cooperação', 'Clima organizacional negativo'] },
  relationships: { agent: 'Relacionamentos', risks: ['Conflitos interpessoais', 'Assédio moral', 'Violência no trabalho'] },
  role: { agent: 'Clareza de Papel', risks: ['Ambiguidade de papel', 'Conflito de papéis', 'Expectativas contraditórias'] },
  change: { agent: 'Gestão de Mudanças', risks: ['Insegurança no emprego', 'Falta de comunicação', 'Resistência organizacional'] },
};

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// ═══ Chart Drawing Helpers ═══

function drawRadarChart(
  pdf: jsPDF,
  categoryAverages: { category: HSEITCategory; average: number; label: string }[],
  centerX: number,
  centerY: number,
  radius: number,
  title: string
) {
  const n = categoryAverages.length;
  const angleStep = (2 * Math.PI) / n;
  const levels = 5;

  // Title
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 51, 102);
  pdf.text(title, centerX, centerY - radius - 8, { align: 'center' });

  // Grid circles and labels
  pdf.setDrawColor(200, 200, 200);
  for (let lvl = 1; lvl <= levels; lvl++) {
    const r = (radius * lvl) / levels;
    // Draw polygon for grid
    for (let i = 0; i < n; i++) {
      const angle1 = -Math.PI / 2 + i * angleStep;
      const angle2 = -Math.PI / 2 + ((i + 1) % n) * angleStep;
      const x1 = centerX + r * Math.cos(angle1);
      const y1 = centerY + r * Math.sin(angle1);
      const x2 = centerX + r * Math.cos(angle2);
      const y2 = centerY + r * Math.sin(angle2);
      pdf.setDrawColor(220, 220, 220);
      pdf.line(x1, y1, x2, y2);
    }
  }

  // Axis lines and labels
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const xEnd = centerX + radius * Math.cos(angle);
    const yEnd = centerY + radius * Math.sin(angle);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(centerX, centerY, xEnd, yEnd);

    // Label
    const labelR = radius + 6;
    const lx = centerX + labelR * Math.cos(angle);
    const ly = centerY + labelR * Math.sin(angle);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    const label = categoryAverages[i].label.length > 12 
      ? categoryAverages[i].label.substring(0, 12) + '.'
      : categoryAverages[i].label;
    pdf.text(label, lx, ly + 1, { align: 'center' });
  }

  // Data polygon (filled)
  const points: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = Math.min(categoryAverages[i].average, 5);
    const r = (radius * val) / 5;
    points.push([centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)]);
  }

  // Fill polygon with semi-transparent color
  pdf.setFillColor(0, 102, 204);
  pdf.setDrawColor(0, 76, 153);
  // Draw filled polygon
  if (points.length > 0) {
    const path = points.map((p, i) => 
      i === 0 ? `${p[0]} ${p[1]} m` : `${p[0]} ${p[1]} l`
    ).join(' ') + ' h';
    // Use low-level PDF path drawing
    (pdf as any).internal.write('q');
    (pdf as any).internal.write('0.2 0.4 0.8 rg'); // Fill color with opacity simulation
    (pdf as any).internal.write('0.0 0.3 0.6 RG'); // Stroke color
    (pdf as any).internal.write('1 w'); // Line width
    
    // Build path manually
    const scale = 72 / 25.4; // mm to points
    let pathStr = '';
    points.forEach((p, i) => {
      const px = p[0] * scale;
      const py = (pdf.internal.pageSize.getHeight() - p[1]) * scale;
      pathStr += i === 0 ? `${px.toFixed(2)} ${py.toFixed(2)} m ` : `${px.toFixed(2)} ${py.toFixed(2)} l `;
    });
    pathStr += 'h B';
    (pdf as any).internal.write(pathStr);
    (pdf as any).internal.write('Q');
  }

  // Data points
  for (const p of points) {
    pdf.setFillColor(0, 76, 153);
    pdf.circle(p[0], p[1], 1, 'F');
  }
}

function drawHorizontalBarChart(
  pdf: jsPDF,
  categoryAverages: { category: HSEITCategory; average: number; label: string }[],
  startX: number,
  startY: number,
  width: number,
  barHeight: number,
  title: string
) {
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 51, 102);
  pdf.text(title, startX, startY);
  let y = startY + 6;

  const labelWidth = 35;
  const barWidth = width - labelWidth - 25;
  const maxVal = 5;

  categoryAverages.forEach(cat => {
    const impact = getHealthImpact(cat.average);
    const [r, g, b] = impact === 'risk' ? [220, 53, 69] : impact === 'intermediate' ? [255, 152, 0] : [40, 167, 69];

    // Label
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    const label = cat.label.length > 16 ? cat.label.substring(0, 16) + '.' : cat.label;
    pdf.text(label, startX, y + barHeight / 2 + 1);

    // Background bar
    pdf.setFillColor(235, 235, 235);
    pdf.rect(startX + labelWidth, y, barWidth, barHeight, 'F');

    // Value bar
    const valWidth = (cat.average / maxVal) * barWidth;
    pdf.setFillColor(r, g, b);
    pdf.roundedRect(startX + labelWidth, y, valWidth, barHeight, 1, 1, 'F');

    // Value text
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(r, g, b);
    pdf.text(cat.average.toFixed(2), startX + labelWidth + barWidth + 2, y + barHeight / 2 + 1);

    y += barHeight + 2;
  });

  return y;
}

function drawSemaphore(
  pdf: jsPDF,
  categoryAverages: { category: HSEITCategory; average: number; label: string }[],
  startX: number,
  startY: number,
  title: string
) {
  const counts = { favorable: 0, intermediate: 0, risk: 0 };
  categoryAverages.forEach(cat => {
    counts[getHealthImpact(cat.average)]++;
  });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 51, 102);
  pdf.text(title, startX, startY);

  let y = startY + 8;
  const items: [string, number, [number, number, number]][] = [
    ['Favorável', counts.favorable, [40, 167, 69]],
    ['Intermediário', counts.intermediate, [255, 152, 0]],
    ['Risco', counts.risk, [220, 53, 69]],
  ];

  items.forEach(([label, count, [r, g, b]]) => {
    // Traffic light circle
    pdf.setFillColor(r, g, b);
    pdf.circle(startX + 5, y, 4, 'F');

    // Count inside circle
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(count.toString(), startX + 5, y + 2.5, { align: 'center' });

    // Label
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`${label} (${count})`, startX + 12, y + 2);

    y += 12;
  });

  return y;
}

export async function generatePGRReport(data: PGRReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  installPdfTextSafety(pdf);
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const m = 20;
  let y = m;

  // ═══ Helpers ═══
  const checkPage = (need: number) => {
    if (y + need > ph - 25) { pdf.addPage(); y = m; return true; }
    return false;
  };
  const setColor = (r: number, g: number, b: number) => { pdf.setTextColor(r, g, b); };
  const getRiskColor = (avg: number): [number, number, number] => {
    const impact = getHealthImpact(avg);
    return impact === 'risk' ? [220, 53, 69] : impact === 'intermediate' ? [255, 152, 0] : [40, 167, 69];
  };
  const getSeverity = (avg: number): string => {
    if (avg >= 3.67) return 'Baixa';
    if (avg >= 2.33) return 'Moderada';
    return 'Alta';
  };
  const getProbability = (avg: number): string => {
    if (avg >= 3.67) return 'Improvável';
    if (avg >= 2.33) return 'Possível';
    return 'Provável';
  };
  const getRiskClassification = (avg: number): string => {
    const impact = getHealthImpact(avg);
    return impact === 'risk' ? 'Intolerável' : impact === 'intermediate' ? 'Moderado' : 'Tolerável';
  };

  const drawSection = (title: string, number: string) => {
    checkPage(20);
    pdf.setFillColor(0, 51, 102);
    pdf.rect(m, y, pw - 2 * m, 10, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    setColor(255, 255, 255);
    pdf.text(number ? `${number}. ${title.toUpperCase()}` : title.toUpperCase(), m + 4, y + 7);
    y += 16;
  };

  const drawText = (text: string, indent = 0, size = 10) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', 'normal');
    setColor(40, 40, 40);
    const lines = pdf.splitTextToSize(text, pw - 2 * m - indent);
    lines.forEach((line: string) => {
      checkPage(6);
      pdf.text(line, m + indent, y);
      y += 5;
    });
  };

  const drawSubSection = (title: string) => {
    checkPage(12);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    setColor(0, 51, 102);
    pdf.text(title, m, y);
    y += 8;
  };

  // ═══════════════════════════════
  // PAGE 1: CAPA
  // ═══════════════════════════════
  await renderReportLogos(pdf, pw, {
    sstLogoUrl: data.sstLogoUrl,
    companyLogoUrl: data.companyLogoUrl,
    topY: m,
    maxHeight: 28,
    maxWidth: 50,
  });

  y = 70;
  // Fundo branco na capa para destacar as logos; linha de acento em verde Sr.SMS
  pdf.setFillColor(11, 63, 41);
  pdf.rect(m, y, pw - 2 * m, 2, 'F');
  y += 12;

  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  setColor(11, 63, 41);
  pdf.text('PROGRAMA DE GERENCIAMENTO', pw / 2, y, { align: 'center' });
  y += 10;
  pdf.text('DE RISCOS PSICOSSOCIAIS', pw / 2, y, { align: 'center' });
  y += 8;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  setColor(80, 80, 80);
  pdf.text('PGR — Conforme NR-1 e Portaria MTE 1.419/2024', pw / 2, y, { align: 'center' });

  y += 20;
  pdf.setFillColor(245, 247, 250);
  pdf.roundedRect(m, y, pw - 2 * m, 40, 3, 3, 'F');
  y += 12;
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  setColor(0, 0, 0);
  pdf.text(data.assessment.companyName, pw / 2, y, { align: 'center' });
  y += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  setColor(80, 80, 80);
  pdf.text(data.assessment.title, pw / 2, y, { align: 'center' });
  y += 10;
  if (data.companyInfo.cnpj) {
    pdf.setFontSize(10);
    pdf.text(`CNPJ: ${data.companyInfo.cnpj}`, pw / 2, y, { align: 'center' });
  }

  y += 30;
  pdf.setFontSize(10);
  setColor(100, 100, 100);
  pdf.text(`Instrumento: ${data.methodology === 'hseit' ? 'HSE-IT (Health and Safety Executive Indicator Tool)' : 'COPSOQ II (Copenhagen Psychosocial Questionnaire)'}`, pw / 2, y, { align: 'center' });
  y += 7;
  pdf.text(`Data de Elaboração: ${new Date().toLocaleDateString('pt-BR')}`, pw / 2, y, { align: 'center' });
  y += 7;
  if (data.sstName) {
    pdf.text(`Responsável Técnico: ${data.sstName}`, pw / 2, y, { align: 'center' });
  }

  // ═══════════════════════════════
  // PAGE 2: SUMÁRIO
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('SUMÁRIO', '');
  y += 2;

  const tocItems = [
    '1. Introdução ao PGR de Riscos Psicossociais',
    '2. Objetivos Específicos',
    '3. Identificação da Empresa',
    '4. Metodologia',
    '5. Inventário de Riscos Psicossociais por GHE/Setor',
    '6. Plano de Ação Geral',
    '7. Plano de Ação por Setor',
    '8. Comparativo com Avaliações Anteriores',
    '9. Encerramento',
  ];
  tocItems.forEach(item => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    setColor(40, 40, 40);
    pdf.text(item, m + 5, y);
    y += 8;
  });

  // ═══════════════════════════════
  // SECTION 1: INTRODUÇÃO
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('Introdução ao PGR de Riscos Psicossociais', '1');

  drawText('O Programa de Gerenciamento de Riscos (PGR) é o documento base que visa identificar, avaliar e controlar os riscos ocupacionais presentes no ambiente de trabalho, incluindo os riscos psicossociais, conforme determinado pela Norma Regulamentadora NR-1 (Disposições Gerais e Gerenciamento de Riscos Ocupacionais).');
  y += 3;
  drawText('Com a publicação da Portaria MTE nº 1.419, de 27 de agosto de 2024, e a atualização da NR-1, tornou-se obrigatório o gerenciamento dos riscos psicossociais relacionados ao trabalho a partir de maio de 2025. Esta obrigatoriedade exige que todas as organizações incluam a avaliação e o controle dos fatores de risco psicossocial em seu PGR.');
  y += 3;
  drawText('Os riscos psicossociais no trabalho referem-se às condições organizacionais, sociais e de gestão que, quando inadequadas, podem causar danos à saúde mental e física dos trabalhadores, incluindo estresse ocupacional, burnout, ansiedade, depressão e outros transtornos.');
  y += 5;

  drawSubSection('1.1 Base Legal');
  drawText('• NR-1 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais');
  drawText('• NR-17 — Ergonomia (fatores de organização do trabalho)');
  drawText('• Portaria MTE nº 1.419/2024 — Inclusão dos riscos psicossociais no GRO');
  drawText('• Lei nº 14.831/2024 — Programa Empresa Promotora da Saúde Mental');
  drawText('• Convenção OIT nº 155 — Segurança e Saúde dos Trabalhadores');
  y += 5;

  drawSubSection('1.2 Níveis de Ação');
  const actionLevels = [
    ['Nível 1', 'Situação ótima — manter ações atuais e monitorar'],
    ['Nível 2', 'Situação boa — atenção a dimensões específicas'],
    ['Nível 3', 'Necessidade de intervenções pontuais de curto prazo'],
    ['Nível 4', 'Necessidade de intervenções sistêmicas — risco moderado'],
    ['Nível 5', 'Necessidade urgente de ação — risco elevado'],
    ['Nível 6', 'Situação crítica — intervenção imediata obrigatória'],
  ];
  actionLevels.forEach(([level, desc]) => {
    checkPage(7);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    setColor(0, 51, 102);
    pdf.text(`${level}: `, m + 5, y);
    pdf.setFont('helvetica', 'normal');
    setColor(60, 60, 60);
    pdf.text(desc, m + 25, y);
    y += 6;
  });

  // ═══════════════════════════════
  // SECTION 2: OBJETIVOS
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('Objetivos Específicos', '2');

  const objectives = [
    'Identificar e avaliar os fatores de riscos psicossociais presentes no ambiente de trabalho;',
    'Classificar os riscos quanto à severidade e probabilidade conforme metodologia validada;',
    'Propor medidas de prevenção e controle para cada risco identificado;',
    'Estabelecer planos de ação com cronogramas e responsáveis definidos;',
    'Permitir o acompanhamento longitudinal da evolução dos indicadores;',
    'Atender às exigências legais da NR-1, NR-17 e Portaria MTE 1.419/2024;',
    'Promover um ambiente de trabalho saudável e psicologicamente seguro.',
  ];
  objectives.forEach((obj, i) => {
    drawText(`${i + 1}. ${obj}`, 5);
    y += 2;
  });

  // ═══════════════════════════════
  // SECTION 3: IDENTIFICAÇÃO DA EMPRESA
  // ═══════════════════════════════
  y += 10;
  drawSection('Identificação da Empresa', '3');

  const companyFields = [
    ['Razão Social / Nome', data.assessment.companyName],
    ['CNPJ', data.companyInfo.cnpj || 'Não informado'],
    ['Endereço', data.companyInfo.address || 'Não informado'],
    ['CNAE', data.companyInfo.cnae || 'Não informado'],
    ['Grau de Risco', data.companyInfo.riskGrade || 'Não informado'],
    ['Nº Colaboradores', data.companyInfo.employeeCount?.toString() || `${data.responses.length} respondentes`],
    ['Setores Avaliados', data.departments.join(', ') || 'Todos'],
  ];

  companyFields.forEach(([label, value]) => {
    checkPage(10);
    pdf.setFillColor(248, 249, 250);
    pdf.rect(m, y - 3, pw - 2 * m, 9, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    setColor(0, 51, 102);
    pdf.text(`${label}:`, m + 3, y + 3);
    pdf.setFont('helvetica', 'normal');
    setColor(0, 0, 0);
    pdf.text(value, m + 55, y + 3);
    y += 10;
  });

  // ═══════════════════════════════
  // SECTION 4: METODOLOGIA
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('Metodologia', '4');

  drawText('A avaliação de riscos psicossociais foi realizada utilizando instrumento validado internacionalmente, reconhecido pela comunidade científica como ferramenta confiável para identificação e mensuração de fatores de risco psicossocial no ambiente laboral.');
  y += 3;

  if (data.methodology === 'hseit') {
    drawSubSection('4.1 Instrumento: HSE-IT (Health and Safety Executive Indicator Tool)');
    drawText('O HSE-IT é uma ferramenta desenvolvida pelo Health and Safety Executive do Reino Unido, amplamente utilizada em mais de 100 países. O questionário avalia 7 dimensões fundamentais dos riscos psicossociais:');
    y += 3;

    CATEGORIES.forEach(cat => {
      const qCount = HSEIT_QUESTIONS.filter(q => q.category === cat).length;
      drawText(`• ${HSEIT_CATEGORY_LABELS[cat]} (${qCount} questões)`, 5);
    });

    y += 5;
    drawSubSection('4.2 Escala e Pontuação');
    drawText('O questionário utiliza escala Likert de 5 pontos:');
    drawText('1 = Nunca  |  2 = Raramente  |  3 = Às vezes  |  4 = Frequentemente  |  5 = Sempre', 5);
    y += 3;
    drawText('Questões sobre fatores negativos têm pontuação invertida, de modo que scores mais altos representam condições mais favoráveis.');
    y += 5;

    drawSubSection('4.3 Classificação de Risco');
    const riskThresholds = [
      ['Muito Baixo', 'acima de 4,20', 'Condição muito favorável', [34, 197, 94]],
      ['Baixo', '3,41 – 4,20', 'Condição favorável', [132, 204, 22]],
      ['Moderado', '2,61 – 3,40', 'Atenção necessária', [234, 179, 8]],
      ['Alto', '1,81 – 2,60', 'Intervenção necessária', [249, 115, 22]],
      ['Muito Alto', '< 1,81', 'Ação imediata requerida', [239, 68, 68]],
    ] as [string, string, string, number[]][];

    riskThresholds.forEach(([label, range, desc, color]) => {
      checkPage(8);
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.circle(m + 6, y - 1, 3, 'F');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      setColor(0, 0, 0);
      pdf.text(`${label} (${range})`, m + 12, y);
      pdf.setFont('helvetica', 'normal');
      setColor(80, 80, 80);
      pdf.text(`— ${desc}`, m + 70, y);
      y += 7;
    });

    y += 5;
    drawSubSection('4.4 Semáforo de Impacto na Saúde');
    drawText('Verde — Favorável (abaixo de 2,33): Ambiente psicossocial saudável', 5);
    drawText('Amarelo — Intermediário (2,33 a 3,66): Atenção e monitoramento necessários', 5);
    drawText('Vermelho — Risco (3,67 ou mais): Intervenção urgente necessária', 5);
  }

  y += 5;
  drawSubSection(`4.${data.methodology === 'hseit' ? '5' : '4'} Amostra e Participação`);
  drawText(`Total de respostas válidas: ${data.responses.length}`);
  drawText(`Setores avaliados: ${data.departments.length || 1}`);
  drawText(`Data da avaliação: ${new Date(data.assessment.createdAt).toLocaleDateString('pt-BR')}`);

  // ═══════════════════════════════
  // CHARTS PAGE: VISÃO GERAL GRÁFICA
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('Análise Gráfica — Visão Geral', '4A');
  y += 5;

  // Radar chart (left side)
  drawRadarChart(pdf, data.categoryAverages, pw / 4 + 5, y + 45, 35, 'Perfil por Categoria');

  // Semaphore (right side)
  drawSemaphore(pdf, data.categoryAverages, pw / 2 + 15, y, 'Semáforo de Saúde');

  y += 95;

  // Horizontal bar chart
  const barEndY = drawHorizontalBarChart(pdf, data.categoryAverages, m, y, pw - 2 * m, 7, 'Detalhamento por Categoria');
  y = barEndY + 10;

  // ═══════════════════════════════
  // SECTION 5: INVENTÁRIO POR GHE/SETOR
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('Inventário de Riscos Psicossociais por GHE/Setor', '5');

  drawText('O inventário abaixo apresenta os riscos identificados em cada Grupo Homogêneo de Exposição (GHE), conforme a metodologia de avaliação utilizada. Para cada setor/GHE, são detalhados os agentes de risco, a classificação quanto à severidade e probabilidade, e as medidas propostas.');
  y += 8;

  // Overall risk inventory table
  drawSubSection('5.1 Visão Geral — Resultado por Dimensão');
  
  // Table header
  const colW = [50, 18, 23, 25, 25, pw - 2 * m - 141];
  const headers = ['Dimensão', 'Média', 'Severidade', 'Probabilidade', 'Classificação', 'Medida Proposta'];
  
  pdf.setFillColor(0, 51, 102);
  pdf.rect(m, y, pw - 2 * m, 10, 'F');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  setColor(255, 255, 255);
  let xPos = m + 2;
  headers.forEach((h, i) => {
    pdf.text(h, xPos, y + 7);
    xPos += colW[i];
  });
  y += 12;

  data.categoryAverages.forEach((cat, idx) => {
    checkPage(12);
    const bgCol = idx % 2 === 0 ? 250 : 240;
    pdf.setFillColor(bgCol, bgCol, bgCol);
    pdf.rect(m, y - 3, pw - 2 * m, 10, 'F');

    const impact = getHealthImpact(cat.average);
    const [cr, cg, cb] = getRiskColor(cat.average);
    pdf.setFillColor(cr, cg, cb);
    pdf.circle(m + 4, y + 2, 2, 'F');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    setColor(0, 0, 0);
    let x = m + 8;
    const dimName = cat.label;
    pdf.text(dimName, x, y + 3); x += colW[0] - 6;
    pdf.text(cat.average.toFixed(2), x, y + 3); x += colW[1];
    pdf.text(getSeverity(cat.average), x, y + 3); x += colW[2];
    pdf.text(getProbability(cat.average), x, y + 3); x += colW[3];
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(cr, cg, cb);
    pdf.text(getRiskClassification(cat.average), x, y + 3); x += colW[4];
    
    pdf.setFont('helvetica', 'normal');
    setColor(60, 60, 60);
    const measure = impact === 'risk' ? 'Ação imediata' : impact === 'intermediate' ? 'Monitoramento' : 'Manter';
    pdf.text(measure, x, y + 3);
    
    y += 10;
  });

  // Per-department detailed analysis
  if (data.departments.length > 0) {
    y += 10;
    drawSubSection('5.2 Análise Detalhada por Setor/GHE');

    for (const dept of data.departments) {
      pdf.addPage(); y = m;
      
      pdf.setFillColor(0, 76, 153);
      pdf.rect(m, y, pw - 2 * m, 12, 'F');
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      setColor(255, 255, 255);
      pdf.text(`GHE: ${dept}`, m + 4, y + 8);
      y += 18;

      const deptResponses = data.responses.filter(r => r.department === dept);
      const deptAnswers = deptResponses.flatMap(r => r.answers);
      
      drawText(`Número de respondentes: ${deptResponses.length}`);
      y += 5;

      // Risk specification table for this department
      pdf.setFillColor(0, 51, 102);
      pdf.rect(m, y, pw - 2 * m, 10, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      setColor(255, 255, 255);
      const deptCols = ['Agente de Risco', 'Exposição', 'Média', 'Sev.', 'Prob.', 'Nível', 'Medida'];
      const deptColW = [48, 25, 15, 18, 18, 22, pw - 2 * m - 146];
      let dx = m + 2;
      deptCols.forEach((h, i) => { pdf.text(h, dx, y + 7); dx += deptColW[i]; });
      y += 12;

      CATEGORIES.forEach((cat, idx) => {
        checkPage(12);
        const catAvg = calculateCategoryAverage(deptAnswers, cat);
        const impact = getHealthImpact(catAvg);
        const [cr, cg, cb] = getRiskColor(catAvg);
        
        const bgCol = idx % 2 === 0 ? 250 : 240;
        pdf.setFillColor(bgCol, bgCol, bgCol);
        pdf.rect(m, y - 3, pw - 2 * m, 10, 'F');

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        setColor(0, 0, 0);
        
        let x2 = m + 2;
        const agentInfo = RISK_AGENTS[cat];
        const agentName = agentInfo.agent;
        pdf.text(agentName, x2, y + 3); x2 += deptColW[0];
        pdf.text('Habitual', x2, y + 3); x2 += deptColW[1];
        pdf.text(catAvg.toFixed(2), x2, y + 3); x2 += deptColW[2];
        pdf.text(getSeverity(catAvg), x2, y + 3); x2 += deptColW[3];
        pdf.text(getProbability(catAvg), x2, y + 3); x2 += deptColW[4];
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(cr, cg, cb);
        pdf.text(getRiskClassification(catAvg), x2, y + 3); x2 += deptColW[5];
        
        pdf.setFont('helvetica', 'normal');
        setColor(60, 60, 60);
        const measure = impact === 'risk' ? 'Intervenção urgente' : impact === 'intermediate' ? 'Plano de ação' : 'Manter';
        pdf.text(measure, x2, y + 3);
        
        y += 10;
      });

      // Department charts page
      pdf.addPage(); y = m;
      
      pdf.setFillColor(0, 76, 153);
      pdf.rect(m, y, pw - 2 * m, 10, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      setColor(255, 255, 255);
      pdf.text(`Gráficos — ${dept}`, m + 4, y + 7);
      y += 16;

      // Build department category averages array
      const deptCatAvgs: { category: HSEITCategory; average: number; label: string }[] = CATEGORIES.map(cat => ({
        category: cat,
        average: calculateCategoryAverage(deptAnswers, cat),
        label: HSEIT_CATEGORY_LABELS[cat]
      }));

      // Radar (left) + Semaphore (right)
      drawRadarChart(pdf, deptCatAvgs, pw / 4 + 5, y + 45, 32, 'Perfil por Categoria');
      drawSemaphore(pdf, deptCatAvgs, pw / 2 + 15, y, 'Semáforo de Saúde');
      y += 95;

      // Bar chart
      const deptBarEnd = drawHorizontalBarChart(pdf, deptCatAvgs, m, y, pw - 2 * m, 7, 'Detalhamento por Categoria');
      y = deptBarEnd + 5;
    }
  }

  // ═══════════════════════════════
  // SECTION 6: PLANO DE AÇÃO GERAL
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('Plano de Ação Geral', '6');

  drawText('O plano de ação abaixo contempla as medidas propostas para mitigação dos riscos psicossociais identificados, com cronograma mensal para acompanhamento da execução.');
  y += 8;

  if (data.actionItems.length > 0) {
    // Action items table with monthly grid — landscape-style layout
    const gridColW = 10;
    const monthsW = 12 * gridColW;
    const respColW = 22;
    const descColW = pw - 2 * m - monthsW - respColW;
    const monthsStartX = m + descColW + respColW;
    
    // Header
    checkPage(30);
    pdf.setFillColor(0, 51, 102);
    pdf.rect(m, y, pw - 2 * m, 14, 'F');
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    setColor(255, 255, 255);
    pdf.text('Ação / Medida', m + 2, y + 6);
    pdf.text('Resp.', m + descColW + 2, y + 6);
    
    MONTHS.forEach((month, i) => {
      pdf.text(month, monthsStartX + i * gridColW + 1, y + 6);
    });
    y += 16;

    data.actionItems.forEach((item, idx) => {
      // Build full cell content: category, problem description and recommendation
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      const parts: string[] = [];
      const catLabel = HSEIT_CATEGORY_LABELS[item.category as HSEITCategory];
      if (catLabel) parts.push(`[${catLabel}]`);
      if (item.description && item.description.trim()) parts.push(item.description.trim());
      if (item.recommendation && item.recommendation.trim()) parts.push(item.recommendation.trim());
      const wrappedLines = pdf.splitTextToSize(parts.join(' ') || '-', descColW - 4);
      const rowH = Math.max(10, wrappedLines.length * 4 + 4);

      checkPage(rowH + 2);
      const bgCol = idx % 2 === 0 ? 250 : 240;
      pdf.setFillColor(bgCol, bgCol, bgCol);
      pdf.rect(m, y - 3, pw - 2 * m, rowH, 'F');

      setColor(0, 0, 0);
      wrappedLines.forEach((line: string, li: number) => {
        pdf.text(line, m + 2, y + 3 + li * 4);
      });
      pdf.text('RH/SST', m + descColW + 2, y + 3);

      // Mark months based on priority
      const startMonth = item.priority === 'immediate' ? 0 : item.priority === 'short_term' ? 1 : 3;
      const endMonth = item.priority === 'immediate' ? 2 : item.priority === 'short_term' ? 5 : 8;
      
      MONTHS.forEach((_, i) => {
        const cx = monthsStartX + i * gridColW + 2;
        if (i >= startMonth && i <= endMonth) {
          pdf.setFillColor(0, 128, 0);
          pdf.rect(cx, y - 1, 6, 6, 'F');
        }
      });
      
      y += rowH;
    });
  } else {
    drawText('Nenhuma ação foi definida no plano.', 5);
  }

  // Cronograma definido na configuração do relatório
  const schedule = (data.scheduleItems || []).filter(s => s && (s.action || '').trim());
  if (schedule.length > 0) {
    y += 8;
    checkPage(40);
    drawSubSection('Cronograma de Implementação');

    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      in_progress: 'Em andamento',
      completed: 'Concluído',
    };
    const colW = [(pw - 2 * m) * 0.46, (pw - 2 * m) * 0.18, (pw - 2 * m) * 0.2, (pw - 2 * m) * 0.16];

    checkPage(20);
    pdf.setFillColor(0, 51, 102);
    pdf.rect(m, y, pw - 2 * m, 8, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    setColor(255, 255, 255);
    ['Ação', 'Prazo', 'Responsável', 'Status'].forEach((h, i) => {
      const x = m + colW.slice(0, i).reduce((a, b) => a + b, 0) + 2;
      pdf.text(h, x, y + 5.5);
    });
    y += 10;

    schedule.forEach((item, idx) => {
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const cells = [
        item.action || '-',
        item.deadline || '-',
        item.responsible || '-',
        statusLabels[item.status as string] || 'Pendente',
      ];
      const wrapped = cells.map((c, i) => pdf.splitTextToSize(c, colW[i] - 4));
      const rowH = Math.max(8, Math.max(...wrapped.map(w => w.length)) * 4 + 4);

      checkPage(rowH + 2);
      const bgCol = idx % 2 === 0 ? 250 : 240;
      pdf.setFillColor(bgCol, bgCol, bgCol);
      pdf.rect(m, y - 3, pw - 2 * m, rowH, 'F');
      setColor(0, 0, 0);
      wrapped.forEach((lines: string[], i: number) => {
        const x = m + colW.slice(0, i).reduce((a, b) => a + b, 0) + 2;
        lines.forEach((line: string, li: number) => pdf.text(line, x, y + 2 + li * 4));
      });
      y += rowH;
    });
  }

  // ═══════════════════════════════
  // SECTION 7: PLANO POR SETOR
  // ═══════════════════════════════
  y += 10;
  checkPage(30);
  drawSection('Plano de Ação por Setor', '7');

  if (data.departments.length > 0) {
    data.departments.forEach(dept => {
      checkPage(40);
      drawSubSection(`Setor: ${dept}`);

      const deptResponses = data.responses.filter(r => r.department === dept);
      const deptAnswers = deptResponses.flatMap(r => r.answers);
      
      const criticalCats = CATEGORIES.filter(cat => {
        const avg = calculateCategoryAverage(deptAnswers, cat);
        return getHealthImpact(avg) === 'risk';
      });

      if (criticalCats.length === 0) {
        drawText('Nenhuma dimensão em nível de risco identificada neste setor. Manter monitoramento periódico.', 5);
      } else {
        criticalCats.forEach(cat => {
          const avg = calculateCategoryAverage(deptAnswers, cat);
          const agentInfo = RISK_AGENTS[cat];
          drawText(`• ${HSEIT_CATEGORY_LABELS[cat]} (média: ${avg.toFixed(2)})`, 5);
          drawText(`  Riscos: ${agentInfo.risks.join(', ')}`, 10);
          drawText(`  Medida: Intervenção imediata com plano específico para o setor`, 10);
          y += 3;
        });
      }
      y += 5;
    });
  } else {
    drawText('Não foram identificados setores específicos nesta avaliação.', 5);
  }

  // ═══════════════════════════════
  // SECTION 8: COMPARATIVO
  // ═══════════════════════════════
  pdf.addPage(); y = m;
  drawSection('Comparativo com Avaliações Anteriores', '8');

  drawText('A comparação com avaliações anteriores permite acompanhar a evolução dos fatores de riscos psicossociais ao longo do tempo, verificando a eficácia das medidas implementadas.');
  y += 5;
  drawText('Nota: Os dados comparativos estão disponíveis na plataforma digital e serão incluídos automaticamente quando houver avaliações anteriores para a mesma empresa. Consulte a tela de resultados para análise detalhada da evolução.', 5);
  y += 8;

  drawSubSection('Periodicidade Recomendada');
  const periodicityText = (data.recommendedPeriodicity || '').trim();
  if (periodicityText) {
    periodicityText.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      drawText(line.startsWith('•') || line.startsWith('-') ? line.replace(/^-/, '•') : `• ${line}`);
    });
  } else {
    drawText('• Reavaliação a cada 30 dias: Para dimensões em nível crítico (Intolerável)');
    drawText('• Reavaliação a cada 90 dias: Para dimensões em nível moderado');
    drawText('• Reavaliação a cada 180 dias: Monitoramento regular');
    drawText('• Reavaliação anual: Avaliação completa obrigatória');
  }

  // ═══════════════════════════════
  // SECTION 9: ENCERRAMENTO
  // ═══════════════════════════════
  y += 15;
  checkPage(80);
  drawSection('Encerramento', '9');

  drawText(`O presente Programa de Gerenciamento de Riscos Psicossociais foi elaborado em conformidade com a NR-1 (Gerenciamento de Riscos Ocupacionais), a Portaria MTE nº 1.419/2024, e demais legislações aplicáveis.`);
  y += 5;
  drawText(`A avaliação foi conduzida utilizando o instrumento ${data.methodology === 'hseit' ? 'HSE-IT' : 'COPSOQ II'}, ferramenta validada internacionalmente para identificação e mensuração de fatores de risco psicossocial no ambiente de trabalho.`);
  y += 5;
  drawText('Este documento deve ser revisado periodicamente, conforme cronograma definido no plano de ação, e atualizado sempre que houver mudanças significativas na organização do trabalho ou na legislação vigente.');
  y += 20;

  // Signature block
  pdf.setDrawColor(0, 0, 0);
  pdf.line(m + 20, y, pw / 2 - 10, y);
  pdf.line(pw / 2 + 10, y, pw - m - 20, y);
  y += 5;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  setColor(0, 0, 0);
  const orgName = data.orgResponsible?.name?.trim();
  pdf.text(data.sstName || 'Responsável Técnico SST', m + 20, y);
  pdf.text(orgName || 'Representante Legal da Empresa', pw / 2 + 10, y);
  const sigTop = y;
  y += 5;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  setColor(80, 80, 80);
  let leftY = y;
  if (data.sstCpf) { pdf.text(`CPF: ${data.sstCpf}`, m + 20, leftY); leftY += 5; }
  if (data.sstRegistration) { pdf.text(`Registro MTE: ${data.sstRegistration}`, m + 20, leftY); leftY += 5; }

  let rightY = y;
  if (data.orgResponsible?.role?.trim()) { pdf.text(data.orgResponsible.role.trim(), pw / 2 + 10, rightY); rightY += 5; }
  if (data.orgResponsible?.cpf?.trim()) { pdf.text(`CPF: ${data.orgResponsible.cpf.trim()}`, pw / 2 + 10, rightY); rightY += 5; }
  pdf.text(`${data.assessment.companyName}`, pw / 2 + 10, rightY);
  rightY += 5;

  y = Math.max(leftY, rightY, sigTop + 10) + 5;
  pdf.text(`Local e Data: _______________, ${new Date().toLocaleDateString('pt-BR')}`, m + 20, y);

  // ═══ RODAPÉ EM TODAS AS PÁGINAS ═══
  const totalPages = (pdf as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    setColor(150, 150, 150);
    pdf.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 8, { align: 'center' });
    pdf.text('PGR — Riscos Psicossociais — CONFIDENCIAL', m, ph - 8);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(m, ph - 12, pw - m, ph - 12);
  }

  // Save
  const fileName = `PGR_Riscos_Psicossociais_${data.assessment.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}
