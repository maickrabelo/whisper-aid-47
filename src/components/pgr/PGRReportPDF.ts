import jsPDF from 'jspdf';
import { renderReportLogos } from '@/lib/pdfLogos';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface PGRReportInput {
  pgr: {
    id: string;
    title?: string | null;
    version: number;
    status?: string | null;
    validity_start: string | null;
    validity_end: string | null;
    executive_summary: string | null;
    responsible_name: string | null;
    responsible_cpf: string | null;
    responsible_registration: string | null;
    cnae: string | null;
    risk_grade: string | null;
    address: string | null;
  };
  company: {
    name: string;
    cnpj: string;
    logo_url?: string | null;
  };
  sstLogoUrl?: string | null;
  ghes: Array<{
    id: string;
    name: string;
    sector?: string | null;
    role?: string | null;
    worker_count?: number | null;
    work_schedule?: string | null;
    activities_description?: string | null;
  }>;
  risks: Array<{
    id: string;
    ghe_id?: string | null;
    category: string;
    agent_name: string;
    esocial_agent_code?: string | null;
    source?: string | null;
    exposure_type?: string | null;
    measurement_value?: number | string | null;
    measurement_unit?: string | null;
    exposure_limit?: number | string | null;
    severity: number;
    probability: number;
    matrix_size?: number | null;
    risk_level?: string | null;
    existing_epc?: string | null;
    existing_epi?: string | null;
    epi_ca?: string | null;
    observations?: string | null;
  }>;
  actions: Array<{
    description: string;
    control_hierarchy?: string | null;
    responsible?: string | null;
    deadline?: string | null;
    status: string;
    cost?: number | string | null;
  }>;
}

// ─────────────────────────────────────────────────────────────
// Constantes de layout
// ─────────────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 14;
const FOOTER_H = 12;
const TOP_Y = MARGIN + HEADER_H;
const BOT_Y = PAGE_H - MARGIN - FOOTER_H;

const COLORS = {
  primary: [30, 58, 138] as [number, number, number],   // navy
  accent: [79, 70, 229] as [number, number, number],    // indigo
  text: [30, 30, 30] as [number, number, number],
  muted: [110, 110, 110] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  headerBg: [240, 244, 250] as [number, number, number],
  // matrix
  green: [167, 243, 168] as [number, number, number],
  yellow: [253, 230, 138] as [number, number, number],
  orange: [253, 186, 116] as [number, number, number],
  red: [248, 113, 113] as [number, number, number],
  darkRed: [153, 27, 27] as [number, number, number],
};

const todayBR = () => new Date().toLocaleDateString('pt-BR');
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return day ? `${day}/${m}/${y}` : d;
};
const placeholder = (v: any) => {
  const s = String(v ?? '').trim();
  return s ? s : '[A PREENCHER]';
};
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'empresa';

// ─────────────────────────────────────────────────────────────
// Gerador
// ─────────────────────────────────────────────────────────────

export async function generatePGRReportPDF(input: PGRReportInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const state = { y: TOP_Y, page: 1, skipChrome: true };

  const setText = (size: number, bold = false, color: [number, number, number] = COLORS.text) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const addHeader = () => {
    if (state.skipChrome) return;
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(0, 0, PAGE_W, MARGIN + 6, 'F');
    setText(8, true, COLORS.primary);
    doc.text('PGR – PROGRAMA DE GERENCIAMENTO DE RISCOS', MARGIN, MARGIN);
    setText(8, false, COLORS.muted);
    const rev = `Revisão ${String(input.pgr.version).padStart(2, '0')}  •  ${todayBR()}`;
    doc.text(rev, PAGE_W - MARGIN, MARGIN, { align: 'right' });
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, MARGIN + 3, PAGE_W - MARGIN, MARGIN + 3);
  };

  const addFooter = () => {
    if (state.skipChrome) return;
    setText(7, false, COLORS.muted);
    doc.text(input.company.name || 'Empresa', MARGIN, PAGE_H - MARGIN + 2);
    doc.text(`Página ${state.page}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 2, { align: 'right' });
  };

  const newPage = () => {
    addFooter();
    doc.addPage();
    state.page += 1;
    state.skipChrome = false;
    addHeader();
    state.y = TOP_Y;
  };

  const ensure = (h: number) => {
    if (state.y + h > BOT_Y) newPage();
  };

  const sectionTitle = (text: string) => {
    ensure(14);
    state.y += 4;
    setText(13, true, COLORS.primary);
    doc.text(text, MARGIN, state.y);
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, state.y + 1.5, MARGIN + 30, state.y + 1.5);
    state.y += 8;
  };

  const subTitle = (text: string) => {
    ensure(10);
    state.y += 2;
    setText(10.5, true, COLORS.text);
    doc.text(text, MARGIN, state.y);
    state.y += 5.5;
  };

  const paragraph = (text: string, opts: { size?: number; gap?: number } = {}) => {
    const size = opts.size ?? 9.5;
    setText(size, false, COLORS.text);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      ensure(size * 0.45 + 1.2);
      doc.text(line, MARGIN, state.y);
      state.y += size * 0.45 + 1.2;
    }
    state.y += opts.gap ?? 2;
  };

  const bullets = (items: string[]) => {
    setText(9.5, false, COLORS.text);
    for (const item of items) {
      const lines = doc.splitTextToSize(item, CONTENT_W - 5);
      ensure(lines.length * 4.5 + 1);
      doc.setFillColor(...COLORS.accent);
      doc.circle(MARGIN + 1.2, state.y - 1.2, 0.7, 'F');
      doc.text(lines, MARGIN + 4, state.y);
      state.y += lines.length * 4.3 + 1;
    }
    state.y += 2;
  };

  // Tabela com larguras de coluna (em mm). Quebra linhas e páginas.
  const table = (
    headers: string[],
    rows: string[][],
    colWidths: number[],
    opts: { headerColor?: [number, number, number] } = {}
  ) => {
    const headerBg = opts.headerColor ?? COLORS.primary;
    const cellPad = 1.5;
    const fontSize = 8.2;

    const drawHeader = () => {
      ensure(8);
      doc.setFillColor(...headerBg);
      doc.rect(MARGIN, state.y, CONTENT_W, 7, 'F');
      setText(fontSize, true, [255, 255, 255]);
      let x = MARGIN;
      headers.forEach((h, i) => {
        doc.text(h, x + cellPad, state.y + 4.7);
        x += colWidths[i];
      });
      state.y += 7;
    };

    drawHeader();

    setText(fontSize, false, COLORS.text);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.15);

    for (const row of rows) {
      // wrap each cell, find row height
      const wrapped = row.map((cell, i) =>
        doc.splitTextToSize(String(cell ?? ''), colWidths[i] - cellPad * 2)
      );
      const rowH = Math.max(6, ...wrapped.map(w => w.length * 3.6 + 2.4));

      if (state.y + rowH > BOT_Y) {
        newPage();
        drawHeader();
        setText(fontSize, false, COLORS.text);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.15);
      }

      // background zebra
      if ((rows.indexOf(row) % 2) === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(MARGIN, state.y, CONTENT_W, rowH, 'F');
      }

      let x = MARGIN;
      wrapped.forEach((lines, i) => {
        doc.rect(x, state.y, colWidths[i], rowH);
        doc.text(lines, x + cellPad, state.y + 4);
        x += colWidths[i];
      });
      state.y += rowH;
    }
    state.y += 3;
  };

  // ─── Matriz N×N ───────────────────────────────────────────
  const classifyLevel = (size: number, score: number): 'trivial' | 'tolerable' | 'moderate' | 'substantial' | 'intolerable' => {
    if (size === 3) {
      if (score >= 9) return 'intolerable';
      if (score >= 6) return 'substantial';
      if (score >= 3) return 'moderate';
      if (score >= 2) return 'tolerable';
      return 'trivial';
    }
    if (size === 4) {
      if (score >= 15) return 'intolerable';
      if (score >= 9) return 'substantial';
      if (score >= 5) return 'moderate';
      if (score >= 3) return 'tolerable';
      return 'trivial';
    }
    if (score >= 20) return 'intolerable';
    if (score >= 15) return 'substantial';
    if (score >= 8) return 'moderate';
    if (score >= 4) return 'tolerable';
    return 'trivial';
  };

  const levelColor = (lvl: string): [number, number, number] => {
    switch (lvl) {
      case 'trivial': return COLORS.green;
      case 'tolerable': return COLORS.yellow;
      case 'moderate': return COLORS.orange;
      case 'substantial': return COLORS.red;
      case 'intolerable': return COLORS.darkRed;
      default: return COLORS.green;
    }
  };

  const legendForSize = (size: number): Array<[string, [number, number, number]]> => {
    if (size === 3) return [
      ['Trivial (1)', COLORS.green],
      ['Tolerável (2)', COLORS.yellow],
      ['Moderado (3–4)', COLORS.orange],
      ['Substancial (6)', COLORS.red],
      ['Intolerável (9)', COLORS.darkRed],
    ];
    if (size === 4) return [
      ['Trivial (1–2)', COLORS.green],
      ['Tolerável (3–4)', COLORS.yellow],
      ['Moderado (5–8)', COLORS.orange],
      ['Substancial (9–12)', COLORS.red],
      ['Intolerável (15–16)', COLORS.darkRed],
    ];
    return [
      ['Trivial (1–3)', COLORS.green],
      ['Tolerável (4–7)', COLORS.yellow],
      ['Moderado (8–14)', COLORS.orange],
      ['Substancial (15–19)', COLORS.red],
      ['Intolerável (20–25)', COLORS.darkRed],
    ];
  };

  const riskMatrix = (size: number = 5) => {
    const cell = size === 5 ? 14 : size === 4 ? 16 : 20;
    const labelW = 22;
    ensure(size * cell + 30);
    const x0 = MARGIN + labelW + 6;
    const y0 = state.y + 14;

    setText(8, true, COLORS.primary);
    doc.text('PROBABILIDADE', MARGIN + 3, y0 + (size * cell) / 2, { angle: 90, align: 'center' });

    setText(8, true, COLORS.text);
    doc.text('SEVERIDADE →', x0, state.y + 5);
    for (let i = 0; i < size; i++) {
      const cx = x0 + i * cell + cell / 2;
      doc.text(String(i + 1), cx, state.y + 10, { align: 'center' });
    }

    // Probabilidade: maior no topo, menor embaixo
    for (let r = 0; r < size; r++) {
      const probVal = size - r;
      setText(7.5, true, COLORS.text);
      const ly = y0 + r * cell + cell / 2 + 1;
      doc.text(String(probVal), MARGIN + labelW - 1, ly, { align: 'right' });
      for (let c = 0; c < size; c++) {
        const sevVal = c + 1;
        const score = probVal * sevVal;
        const col = levelColor(classifyLevel(size, score));
        doc.setFillColor(col[0], col[1], col[2]);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.2);
        doc.rect(x0 + c * cell, y0 + r * cell, cell, cell, 'FD');
        setText(10, true, COLORS.text);
        doc.text(String(score), x0 + c * cell + cell / 2, y0 + r * cell + cell / 2 + 1, {
          align: 'center',
        });
      }
    }

    state.y = y0 + size * cell + 4;

    let lx = MARGIN;
    setText(7.5, false, COLORS.text);
    for (const [lbl, col] of legendForSize(size)) {
      doc.setFillColor(col[0], col[1], col[2]);
      doc.rect(lx, state.y, 4, 4, 'F');
      doc.text(lbl, lx + 5, state.y + 3.2);
      lx += 38;
    }
    state.y += 8;
  };


  // ─── CAPA ─────────────────────────────────────────────────
  state.skipChrome = true;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, 90, 'F');
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 86, PAGE_W, 4, 'F');

  await renderReportLogos(doc, PAGE_W, {
    sstLogoUrl: input.sstLogoUrl,
    companyLogoUrl: input.company.logo_url,
    topY: 8,
    maxHeight: 24,
    maxWidth: 45,
  });

  setText(36, true, [255, 255, 255]);
  doc.text('PGR', PAGE_W / 2, 50, { align: 'center' });
  setText(13, false, [220, 230, 255]);
  doc.text('Programa de Gerenciamento de Riscos', PAGE_W / 2, 60, { align: 'center' });
  setText(9, false, [200, 215, 255]);
  doc.text('NR-01 — Portaria 6.730/2020', PAGE_W / 2, 67, { align: 'center' });

  setText(18, true, COLORS.primary);
  const compLines = doc.splitTextToSize(input.company.name || 'EMPRESA', CONTENT_W);
  doc.text(compLines, PAGE_W / 2, 120, { align: 'center' });

  setText(10, false, COLORS.text);
  doc.text(`CNPJ: ${placeholder(input.company.cnpj)}`, PAGE_W / 2, 140, { align: 'center' });
  doc.text(`CNAE: ${placeholder(input.pgr.cnae)}  •  Grau de Risco (NR-4): ${placeholder(input.pgr.risk_grade)}`,
    PAGE_W / 2, 148, { align: 'center' });

  setText(10, true, COLORS.muted);
  doc.text(
    `Vigência: ${fmtDate(input.pgr.validity_start)}  até  ${fmtDate(input.pgr.validity_end)}`,
    PAGE_W / 2, 170, { align: 'center' }
  );
  setText(9, false, COLORS.muted);
  doc.text(`Revisão ${String(input.pgr.version).padStart(2, '0')}  •  Emitido em ${todayBR()}`,
    PAGE_W / 2, 178, { align: 'center' });

  // Rodapé capa
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, PAGE_H - 30, PAGE_W - MARGIN, PAGE_H - 30);
  setText(8, false, COLORS.muted);
  doc.text('Documento gerado pela plataforma SOIA – Saúde Ocupacional Integrada com IA',
    PAGE_W / 2, PAGE_H - 24, { align: 'center' });
  doc.text('Conforme NR-01 (item 1.5) e diretrizes do Gerenciamento de Riscos Ocupacionais (GRO)',
    PAGE_W / 2, PAGE_H - 19, { align: 'center' });

  // ─── INTERIOR ─────────────────────────────────────────────
  newPage();

  // 1. Identificação da Empresa
  sectionTitle('Identificação da Empresa');
  const idRows: string[][] = [
    ['Razão Social', placeholder(input.company.name), 'CNPJ', placeholder(input.company.cnpj)],
    ['Endereço', placeholder(input.pgr.address), 'CNAE', placeholder(input.pgr.cnae)],
    ['Ramo de Atividade', '—', 'Grau de Risco (NR-4)', placeholder(input.pgr.risk_grade)],
    ['Vigência', `${fmtDate(input.pgr.validity_start)} a ${fmtDate(input.pgr.validity_end)}`, 'Revisão', String(input.pgr.version).padStart(2, '0')],
  ];
  table(['Campo', 'Valor', 'Campo', 'Valor'], idRows, [35, 60, 35, CONTENT_W - 35 - 60 - 35]);

  subTitle('Regime de Trabalho');
  paragraph('O regime de trabalho é em horário comercial, de cunho administrativo/operacional, com jornadas conforme escala definida em cada GHE (Grupo Homogêneo de Exposição) detalhado neste documento.');

  subTitle('Controle de Revisões');
  table(
    ['Revisão', 'Motivo da Revisão', 'Data'],
    [[String(input.pgr.version).padStart(2, '0'), input.pgr.version === 1 ? 'EMISSÃO INICIAL' : 'REVISÃO PERIÓDICA', todayBR()]],
    [25, CONTENT_W - 25 - 35, 35]
  );

  // ─── PARTE I ──────────────────────────────────────────────
  sectionTitle('PARTE I — Disposições Gerais');

  subTitle('1.1 Introdução');
  paragraph(
    `O Documento Base do Programa de Gerenciamento de Riscos (PGR) se insere no contexto da Política de Gestão de SST de ${input.company.name || '(EMPRESA)'} buscando a melhoria contínua do ambiente de trabalho e a preservação da saúde dos seus colaboradores e contratados. Está estruturado conforme disposto na NR-01, Portaria 3.214 de 08 de junho de 1978, com redação atualizada pela Portaria 6.730 de 12 de março de 2020.`
  );

  subTitle('1.2 Objetivo');
  paragraph(
    'O PGR tem por objetivo estabelecer as diretrizes para o Gerenciamento de Riscos Ocupacionais (GRO) e as medidas de prevenção em Segurança e Saúde no Trabalho (SST), promovendo a identificação, avaliação, controle e monitoramento dos riscos ocupacionais existentes na organização.'
  );

  subTitle('1.3 Termos e Definições');
  bullets([
    'Risco Ambiental / Ocupacional: combinação da probabilidade de ocorrer lesão ou agravo à saúde causados por evento perigoso, exposição a agente nocivo ou exigência da atividade e da severidade dessa lesão ou agravo.',
    'Agente Físico: qualquer forma de energia (ruído, vibrações, temperaturas extremas, radiações, pressões anormais) capaz de causar lesão ou agravo à saúde do trabalhador.',
    'Agente Químico: substância química — pura ou em mistura — utilizada, produzida ou gerada no trabalho, capaz de causar lesão ou agravo à saúde.',
    'Agente Biológico: microrganismos, parasitas ou materiais derivados, capazes de acarretar lesão ou agravo à saúde do trabalhador.',
    'Agente Ergonômico: fatores físicos, organizacionais e cognitivos que podem provocar distúrbios osteomusculares ou fadiga.',
    'Agente Psicossocial: fatores relacionados à organização e gestão do trabalho que podem afetar a saúde mental (estresse, sobrecarga, assédio, baixo suporte social, etc.).',
    'Limite de Tolerância (LT — NR-15): concentração ou intensidade máxima/mínima, ligada à natureza e tempo de exposição, que não causará dano à saúde durante a vida laboral.',
    'Nível de Ação: valor a partir do qual devem ser iniciadas ações preventivas de monitoramento e controle.',
    'GHE / GSE: Grupos Homogêneos (ou Similares) de Exposição — trabalhadores que experimentam exposição semelhante, de forma que o resultado da avaliação de qualquer membro seja representativo do grupo.',
  ]);

  subTitle('1.4 Responsabilidades');
  paragraph(`${input.company.name || '(EMPRESA)'}, cumpridora de requisitos legais, vem por meio deste documento implantar o seu PGR, conforme preconiza a Lei nº 6.514/1977 e a Portaria nº 6.730/2020 (NR-01). As responsabilidades estão distribuídas conforme abaixo:`);

  subTitle('Empregador');
  bullets([
    'Assumir responsabilidade no que se refere às medidas técnicas e operacionais que devem ser implantadas para atender às exigências deste PGR e da NR-01.',
    'Garantir os recursos necessários à execução e ao monitoramento contínuo do programa.',
    'Promover a análise global anual deste PGR, ou sempre que necessário, para ajustes, novas metas e prioridades.',
  ]);

  subTitle('Direção e Coordenação');
  bullets([
    'Estabelecer, implementar e assegurar recursos para o cumprimento do PGR conforme a legislação.',
    'Coordenar a implantação e o desenvolvimento do programa, delegar responsabilidades e revisar o controle.',
    'Elaborar orçamentos anuais, alocando recursos para execução do plano de ação.',
  ]);

  subTitle('Supervisores e Líderes');
  bullets([
    'Supervisionar os trabalhadores para assegurar que os procedimentos corretos estão sendo observados.',
    'Garantir o perfeito estado de funcionamento de equipamentos e máquinas e a ordem/limpeza dos setores.',
    'Comunicar os riscos e os procedimentos de controle adotados, consultando e orientando os trabalhadores.',
    'Colaborar com a CIPA na investigação de acidentes e na adoção de medidas preventivas.',
  ]);

  subTitle('SESMT / Segurança do Trabalho');
  bullets([
    'Assessorar a empresa no desenvolvimento e implantação do PGR e realizar a reavaliação anual junto à CIPA.',
    'Manter os registros e a integridade dos equipamentos de Segurança e Higiene Ocupacional (manutenção, calibração, guarda).',
    'Assegurar treinamento adequado para todas as funções relativas ao escopo deste PGR.',
    'Divulgar dados e resultados; prever e manter os recursos para execução do programa.',
  ]);

  subTitle('Empregados');
  bullets([
    'Colaborar e participar da implantação do PGR como agentes de melhoria contínua.',
    'Seguir as orientações dos treinamentos e cumprir as normas de Segurança e Saúde Ocupacional.',
    'Comunicar imediatamente o responsável sobre condições inseguras encontradas.',
    'Utilizar obrigatoriamente o EPI indicado e cooperar com a CIPA na prevenção de acidentes.',
    'Estar ciente dos riscos relacionados às suas atividades, através das integrações e atualizações periódicas do PGR.',
  ]);

  subTitle('CIPA — Comissão Interna de Prevenção de Acidentes');
  bullets([
    'Acompanhar e avaliar o desempenho deste programa e zelar pelo cumprimento das medidas preventivas e corretivas.',
    'Manter uma cópia atualizada do Relatório Anual de Atividades no livro de atas.',
    'Desenvolver o Mapa de Risco e demais atividades prevencionistas (NR-05).',
  ]);

  subTitle('1.5 Documentos Complementares');
  bullets([
    'Inventário de Riscos do PGR (Parte IV).',
    'Matriz de Risco 5×5 (Parte II, item 2.4).',
    'Plano de Ação no Gerenciamento de Riscos (Parte V).',
    'Laudos quantitativos de agentes físicos, químicos e biológicos (quando aplicáveis).',
    'PCMSO, ASO, fichas de EPI e registros de treinamento.',
  ]);

  subTitle('1.6 Estratégia e Metodologia de Ação');
  paragraph('O presente programa foi elaborado com base na ANTECIPAÇÃO, RECONHECIMENTO e AVALIAÇÃO dos riscos ocupacionais existentes nas atividades dos empregados, considerando os diversos locais de trabalho. O controle desses riscos é tratado no PLANO DE AÇÃO (Parte V), também conhecido como Planilha de Gerenciamento de Riscos. Como suporte técnico, são consideradas constatações de campo, informações da CIPA e laudos específicos quando existentes. A metodologia aplicada é a da legislação atualizada das Normas Regulamentadoras (NR) do Ministério do Trabalho e Emprego e, na ausência de limites previstos na NR-15, adotam-se os critérios técnicos da ACGIH (TLV-TWA, TLV-STEL, TLV-C).');

  // ─── PARTE II ─────────────────────────────────────────────
  sectionTitle('PARTE II — Antecipação, Reconhecimento e Avaliação dos Riscos');

  subTitle('2.1 Antecipação');
  paragraph('A antecipação visa identificar riscos potenciais ainda na fase de projeto de novas instalações, modificações de projetos existentes ou introdução de novos produtos químicos. Os riscos identificados são incorporados nas revisões deste PGR.');

  subTitle('2.2 Reconhecimento');
  paragraph('O reconhecimento é realizado através de inspeções e auditorias nas diversas áreas, considerando a percepção dos trabalhadores sobre o processo produtivo, informações da CIPA e demais fontes técnicas de apoio. Visa registrar as possíveis interferências na saúde e integridade física do trabalhador.');

  subTitle('2.3 Avaliação');
  paragraph('A avaliação dos riscos é realizada após a antecipação e reconhecimento, considerando o agente, fonte geradora, GHE, função, atividade, medidas de controle existentes e propostas. Apenas os resultados das avaliações são inseridos no Inventário de Riscos (NR-09 item 4.3).');

  // Matrizes efetivamente utilizadas no inventário (admitidas pela NR-1 / ABNT NBR ISO 31000)
  const usedMatrixSizes = Array.from(
    new Set(input.risks.map(r => Number(r.matrix_size) || 5).filter(s => s === 3 || s === 4 || s === 5))
  ).sort() as number[];
  const matricesToRender = usedMatrixSizes.length ? usedMatrixSizes : [5];

  subTitle(`2.4 Matriz${matricesToRender.length > 1 ? 'es' : ''} de Risco Utilizada${matricesToRender.length > 1 ? 's' : ''}`);
  paragraph('A avaliação da classificação de risco é realizada para cada GHE em relação a cada agente, considerando a interação Probabilidade × Severidade. Conforme a NR-1 e a ABNT NBR ISO 31000, é admitido o uso de matrizes qualitativas de diferentes ordens (3×3, 4×4 ou 5×5), desde que devidamente documentadas. As matrizes efetivamente utilizadas neste documento são apresentadas a seguir:');
  for (const sz of matricesToRender) {
    subTitle(`Matriz ${sz}×${sz}`);
    riskMatrix(sz);
  }


  // ─── PARTE III ────────────────────────────────────────────
  sectionTitle('PARTE III — Avaliação Quantitativa e Medidas de Controle');

  subTitle('3.1 Objetivos e Critérios');
  paragraph('O objetivo das determinações quantitativas é dimensionar a exposição dos trabalhadores e subsidiar o equacionamento das medidas de controle. São priorizadas atividades de Grau de Exposição Alto ou Muito Alto e exposições com Limite de Curta Duração (STEL) ou Valor Teto. As avaliações utilizam equipamentos calibrados e metodologias reconhecidas (NHO da Fundacentro, NIOSH, OSHA, ACGIH).');

  subTitle('3.2 Critérios Específicos');
  bullets([
    'Agentes Químicos: amostragem conforme NHO/NIOSH/OSHA, com tratamento estatístico quando aplicável.',
    'Ruído (Físico): dosímetro e medidor de pressão sonora; limites da NR-15 Anexo I e NHO-01.',
    'Vibração (Físico): medidores integradores com transdutores triaxiais; limites ACGIH (aren 2,5 m/s² nível de ação; 5 m/s² limite).',
    'Calor, radiações e demais agentes físicos: NHO-06, NHO-04 e normas correlatas.',
  ]);

  subTitle('3.3 Níveis de Ação');
  bullets([
    'Agentes químicos: 50% do limite de exposição ocupacional (NR-15, ACGIH, NIOSH, OSHA ou acordos coletivos).',
    'Ruído: dose de 0,5 (superior a 50%), conforme NR-15, Anexo I, item 6.',
    'Vibração mão-braço: aren = 2,5 m/s².',
  ]);

  subTitle('3.4 Medidas de Controle — Hierarquia');
  bullets([
    '1) Eliminação do agente agressivo.',
    '2) Substituição por agente/processo menos agressivo.',
    '3) Controles de engenharia (enclausuramento, ventilação, modificação de projeto).',
    '4) Controles administrativos (rodízio, limitação de tempo de exposição, procedimentos).',
    '5) Equipamento de Proteção Individual (EPI) — último recurso, quando os demais não eliminam a exposição.',
  ]);

  subTitle('3.5 Treinamentos, Eficácia, Registro e Divulgação');
  paragraph('Todos os colaboradores devem receber treinamento sobre as medidas de controle adotadas. A eficácia é verificada por auditorias, inspeções da CIPA e do SESMT, monitoramentos ambientais e avaliação dos resultados do PCMSO. O histórico do PGR deve ser mantido por no mínimo 20 anos (NR-1.5.7.3.3.1). Os dados ficam disponíveis aos trabalhadores, seus representantes e às autoridades competentes, e a divulgação ocorre via treinamentos, reuniões setoriais, reuniões de CIPA e integração de novos empregados.');

  // ─── Resumo Executivo (se houver) ─────────────────────────
  if (input.pgr.executive_summary && input.pgr.executive_summary.trim()) {
    sectionTitle('Resumo Executivo');
    paragraph(input.pgr.executive_summary);
  }

  // ─── PARTE IV — Inventário de Riscos ──────────────────────
  sectionTitle('PARTE IV — Inventário de Riscos');
  paragraph('A seguir, o inventário dos riscos identificados, agrupados por Grupo Homogêneo de Exposição (GHE).');

  if (input.ghes.length === 0) {
    paragraph('Nenhum GHE cadastrado até o momento.', { size: 9 });
  } else {
    for (const ghe of input.ghes) {
      subTitle(`GHE: ${ghe.name}`);
      const meta = [
        `Setor: ${ghe.sector || '—'}`,
        `Cargo/Função: ${ghe.role || '—'}`,
        `Trabalhadores: ${ghe.worker_count ?? 0}`,
        `Jornada: ${ghe.work_schedule || '—'}`,
      ].join('   •   ');
      paragraph(meta, { size: 8.5 });
      if (ghe.activities_description) {
        paragraph(`Atividades: ${ghe.activities_description}`, { size: 8.5 });
      }

      const gheRisks = input.risks.filter(r => r.ghe_id === ghe.id);
      if (gheRisks.length === 0) {
        paragraph('— Sem riscos cadastrados para este GHE —', { size: 8.5 });
        continue;
      }

      const rows = gheRisks.map(r => [
        r.category || '—',
        `${r.agent_name}${r.esocial_agent_code ? ` (${r.esocial_agent_code})` : ''}`,
        r.source || '—',
        r.measurement_value != null ? `${r.measurement_value} ${r.measurement_unit || ''}` : '—',
        r.exposure_limit != null ? String(r.exposure_limit) : '—',
        `S${r.severity}×P${r.probability} (${Number(r.matrix_size) || 5}×${Number(r.matrix_size) || 5})\n${(r.risk_level || '').toUpperCase()}`,
        [r.existing_epc, r.existing_epi ? `EPI: ${r.existing_epi}${r.epi_ca ? ` (CA ${r.epi_ca})` : ''}` : '']
          .filter(Boolean).join('\n') || '—',
      ]);

      table(
        ['Cat.', 'Agente', 'Fonte', 'Medição', 'Limite', 'Risco', 'Controles'],
        rows,
        [16, 38, 24, 22, 18, 22, CONTENT_W - 16 - 38 - 24 - 22 - 18 - 22]
      );
    }
  }

  // ─── PARTE V — Plano de Ação ─────────────────────────────
  sectionTitle('PARTE V — Plano de Ação');
  paragraph('Conjunto de ações para eliminação, mitigação e controle dos riscos identificados, respeitando a hierarquia de controle estabelecida na Parte III.');

  if (input.actions.length === 0) {
    paragraph('Nenhuma ação cadastrada até o momento.', { size: 9 });
  } else {
    const statusLabel = (s: string) =>
      ({ pending: 'Pendente', in_progress: 'Em andamento', done: 'Concluída', cancelled: 'Cancelada' } as any)[s] || s;
    const hierLabel = (h?: string | null) =>
      ({
        elimination: 'Eliminação',
        substitution: 'Substituição',
        engineering: 'Engenharia',
        administrative: 'Administrativo',
        epi: 'EPI',
      } as any)[h || ''] || (h || '—');

    const actionRows = input.actions.map(a => [
      a.description || '—',
      hierLabel(a.control_hierarchy),
      a.responsible || '—',
      fmtDate(a.deadline),
      statusLabel(a.status),
      a.cost != null ? `R$ ${Number(a.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—',
    ]);
    table(
      ['Descrição da Ação', 'Hierarquia', 'Responsável', 'Prazo', 'Status', 'Custo'],
      actionRows,
      [CONTENT_W - 26 - 30 - 22 - 22 - 24, 26, 30, 22, 22, 24]
    );
  }

  // ─── PARTE VI — Conclusão ────────────────────────────────
  sectionTitle('PARTE VI — Conclusão e Recomendações');
  paragraph('Os propósitos da avaliação de exposição a agentes de risco ocupacionais foram cumpridos: determinaram-se os riscos a que os trabalhadores estão expostos, diferenciaram-se exposições aceitáveis das inaceitáveis e foram propostas medidas de controle. A organização deve prosseguir com seus programas de controle, introduzindo melhorias contínuas.');

  subTitle('6.1 Medidas de Engenharia (Coletivas)');
  bullets([
    'Realizar estudos de engenharia para tratamento acústico em equipamentos ruidosos das áreas produtivas e de utilidades.',
    'Avaliar a necessidade de sistemas de exaustão localizada em postos com emissão de agentes químicos.',
    'Implementar proteções coletivas contra quedas em altura, quando aplicável.',
  ]);

  subTitle('6.2 Procedimentos e Controles Administrativos');
  bullets([
    'Reavaliar anualmente o PGR conforme exigência legal (NR-01).',
    'Solicitar dos fornecedores as FISPQs das matérias-primas e divulgá-las aos empregados.',
    'Minimizar o tempo de execução em atividades de alto potencial de risco e manter distância segura de fontes emissoras.',
  ]);

  subTitle('6.3 Treinamentos');
  bullets([
    'Saúde / Higiene Ocupacional: PGR, resultados das avaliações quantitativas, aspectos toxicológicos, primeiros socorros.',
    'Segurança Industrial: utilização de EPIs, FISPQ e melhores práticas de trabalho.',
  ]);

  subTitle('6.4 Monitoramento');
  paragraph(`${input.company.name || '(EMPRESA)'} deverá continuar com a estratégia de avaliação quantitativa para os agentes priorizados, conforme o Programa de Monitoramento Ambiental.`);

  subTitle('6.5 Equipamentos de Proteção Individual');
  paragraph('Quando os procedimentos de trabalho e os controles coletivos não forem suficientes para reduzir a exposição a níveis aceitáveis, deve-se adotar o EPI como último recurso, garantindo treinamento, fornecimento, troca e fiscalização do uso.');

  // ─── Assinatura ───────────────────────────────────────────
  ensure(50);
  state.y += 18;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(MARGIN + 20, state.y, MARGIN + 110, state.y);
  setText(9.5, true, COLORS.text);
  doc.text(placeholder(input.pgr.responsible_name), MARGIN + 65, state.y + 5, { align: 'center' });
  setText(8.5, false, COLORS.muted);
  doc.text(
    `CPF: ${placeholder(input.pgr.responsible_cpf)}  •  Registro: ${placeholder(input.pgr.responsible_registration)}`,
    MARGIN + 65, state.y + 10, { align: 'center' }
  );
  doc.text('Responsável Técnico — Segurança do Trabalho', MARGIN + 65, state.y + 15, { align: 'center' });

  addFooter();
  return doc;
}

export async function downloadPGRReport(input: PGRReportInput) {
  const doc = await generatePGRReportPDF(input);
  const fname = `PGR_${slugify(input.company.name)}_v${input.pgr.version}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fname);
}
