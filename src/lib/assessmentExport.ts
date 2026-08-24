import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import {
  HSEIT_QUESTIONS_SORTED,
  HSEIT_CATEGORY_LABELS,
  HSEIT_LIKERT_OPTIONS,
} from '@/data/hseitQuestions';
import { getCOPSOQVersionData } from '@/lib/copsoqVersion';
import {
  BURNOUT_QUESTIONS,
  BURNOUT_CATEGORY_LABELS,
  BURNOUT_LIKERT_OPTIONS,
} from '@/data/burnoutQuestions';

export type AssessmentType = 'hseit' | 'copsoq' | 'burnout' | 'climate';

interface QuestionMeta {
  number: number;
  text: string;
  category: string;
  categoryLabel: string;
}

interface ExportConfig {
  assessmentType: AssessmentType;
  assessmentId: string;
  assessmentTitle: string;
  companyName?: string;
}

interface FetchedData {
  assessment: any;
  responses: any[];
  answers: any[];
  questions: QuestionMeta[];
  scaleLabels: Record<number, string>;
}

const HSEIT_LABELS: Record<number, string> = HSEIT_LIKERT_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<number, string>
);
const BURNOUT_LABELS: Record<number, string> = BURNOUT_LIKERT_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<number, string>
);

function getQuestions(type: AssessmentType, copsoqVersion?: string | null): QuestionMeta[] {
  if (type === 'hseit') {
    return HSEIT_QUESTIONS_SORTED.map(q => ({
      number: q.number,
      text: q.text,
      category: q.category,
      categoryLabel: HSEIT_CATEGORY_LABELS[q.category],
    }));
  }
  if (type === 'copsoq') {
    const vd = getCOPSOQVersionData(copsoqVersion);
    return vd.questions.map(q => ({
      number: q.number,
      text: q.text,
      category: q.category,
      categoryLabel: vd.categoryLabels[q.category] || q.category,
    }));
  }
  if (type === 'burnout') {
    return BURNOUT_QUESTIONS.map(q => ({
      number: q.number,
      text: q.text,
      category: q.category,
      categoryLabel: BURNOUT_CATEGORY_LABELS[q.category],
    }));
  }
  return [];
}

function getScaleLabels(type: AssessmentType): Record<number, string> {
  if (type === 'hseit') return HSEIT_LABELS;
  if (type === 'burnout') return BURNOUT_LABELS;
  return {};
}

async function fetchAssessmentData(config: ExportConfig): Promise<FetchedData> {
  const { assessmentType, assessmentId } = config;

  if (assessmentType === 'climate') {
    const [a1, a2, a3] = await Promise.all([
      supabase.from('climate_surveys').select('*').eq('id', assessmentId).maybeSingle(),
      supabase.from('survey_responses').select('*').eq('survey_id', assessmentId),
      supabase.from('survey_questions').select('*').eq('survey_id', assessmentId).order('order_index'),
    ]);
    const responses = (a2.data as any[]) || [];
    const responseIds = responses.map((r: any) => r.id);
    let answers: any[] = [];
    if (responseIds.length > 0) {
      const { data: ansData } = await supabase
        .from('survey_answers')
        .select('*')
        .in('response_id', responseIds);
      answers = ansData || [];
    }
    const rawQuestions = (a3.data as any[]) || [];
    // Mapeia question_id -> number sequencial
    const idToNumber = new Map<string, number>();
    rawQuestions.forEach((q: any, i: number) => {
      idToNumber.set(q.id, q.order_index ?? i + 1);
    });
    // Reescreve answers com question_number derivado
    const normalizedAnswers = answers.map((a: any) => ({
      ...a,
      question_number: idToNumber.get(a.question_id) ?? 0,
      answer_value: Number(a.answer_value) || 0,
    }));
    const qList: QuestionMeta[] = rawQuestions.map((q: any, i: number) => ({
      number: q.order_index ?? i + 1,
      text: q.question_text,
      category: q.category || 'geral',
      categoryLabel: q.category || 'Geral',
    }));
    return {
      assessment: a1.data,
      responses,
      answers: normalizedAnswers,
      questions: qList,
      scaleLabels: {},
    };
  }

  const tableMap = {
    hseit: { a: 'hseit_assessments', r: 'hseit_responses', ans: 'hseit_answers' },
    copsoq: { a: 'copsoq_assessments', r: 'copsoq_responses', ans: 'copsoq_answers' },
    burnout: { a: 'burnout_assessments', r: 'burnout_responses', ans: 'burnout_answers' },
  } as const;
  const t = tableMap[assessmentType];

  const { data: assessment } = await supabase.from(t.a as any).select('*').eq('id', assessmentId).maybeSingle();
  const { data: responses } = await supabase.from(t.r as any).select('*').eq('assessment_id', assessmentId);
  const responseIds = (responses || []).map((r: any) => r.id);
  let answers: any[] = [];
  if (responseIds.length > 0) {
    const { data: ansData } = await supabase
      .from(t.ans as any)
      .select('*')
      .in('response_id', responseIds);
    answers = ansData || [];
  }

  return {
    assessment,
    responses: responses || [],
    answers,
    questions: getQuestions(assessmentType, assessmentType === 'copsoq' ? (assessment as any)?.questionnaire_version : null),
    scaleLabels: getScaleLabels(assessmentType),
  };
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function buildLongRows(config: ExportConfig, data: FetchedData) {
  const { responses, answers, questions } = data;
  const responseMap = new Map(responses.map(r => [r.id, r]));
  const questionMap = new Map(questions.map(q => [q.number, q]));
  const labels = data.scaleLabels;

  return answers.map(a => {
    const resp = responseMap.get(a.response_id) || {};
    const demo = resp.demographics || {};
    const q = questionMap.get(a.question_number) || {
      number: a.question_number,
      text: '',
      category: '',
      categoryLabel: '',
    };
    return {
      assessment_id: config.assessmentId,
      assessment_type: config.assessmentType,
      assessment_title: config.assessmentTitle,
      company: config.companyName || '',
      respondent_id: shortId(resp.id || ''),
      department: resp.department || demo.department || '',
      gender: demo.gender || '',
      age_range: demo.ageRange || demo.age_range || '',
      tenure: demo.tenure || demo.timeAtCompany || '',
      role_level: demo.roleLevel || demo.role_level || '',
      response_date: resp.completed_at || resp.created_at || '',
      question_number: q.number,
      question_text: q.text,
      category: q.category,
      category_label: q.categoryLabel,
      answer_value: a.answer_value,
      answer_label: labels[a.answer_value] || '',
    };
  });
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF065F46' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
}

export async function exportAssessmentToExcel(config: ExportConfig): Promise<void> {
  const data = await fetchAssessmentData(config);
  const { responses, answers, questions } = data;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SOIA';
  wb.created = new Date();

  // Sheet 1: Resumo
  const s1 = wb.addWorksheet('Resumo');
  s1.addRows([
    ['Relatório de Avaliação - SOIA'],
    [''],
    ['Tipo', config.assessmentType.toUpperCase()],
    ['Título', config.assessmentTitle],
    ['Empresa', config.companyName || '-'],
    ['Data do Export', new Date().toLocaleString('pt-BR')],
    [''],
    ['Total de Respostas', responses.length],
    ['Total de Questões', questions.length],
    ['Total de Answers (registros)', answers.length],
    ['Respostas Concluídas', responses.filter(r => r.completed_at).length],
  ]);
  s1.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF065F46' } };
  s1.getColumn(1).width = 32;
  s1.getColumn(2).width = 40;

  // Sheet 2: Respostas (uma linha por respondente)
  const s2 = wb.addWorksheet('Respostas');
  const headers2 = [
    'ID Respondente', 'Departamento', 'Gênero', 'Faixa Etária',
    'Tempo na Empresa', 'Cargo/Nível', 'Data Resposta', 'Score Total', 'Nível de Risco',
  ];
  s2.addRow(headers2);
  styleHeader(s2.getRow(1));
  responses.forEach(r => {
    const d = r.demographics || {};
    s2.addRow([
      shortId(r.id),
      r.department || d.department || '',
      d.gender || '',
      d.ageRange || d.age_range || '',
      d.tenure || d.timeAtCompany || '',
      d.roleLevel || d.role_level || '',
      r.completed_at || r.created_at || '',
      r.total_score ?? '',
      r.risk_level ?? '',
    ]);
  });
  s2.columns.forEach(c => { c.width = 20; });

  // Sheet 3: Respostas por Questão (wide format - matriz)
  const s3 = wb.addWorksheet('Matriz Respostas');
  const wideHeaders = ['ID Respondente', 'Departamento', 'Data', ...questions.map(q => `Q${q.number}`)];
  s3.addRow(wideHeaders);
  styleHeader(s3.getRow(1));
  // Linha 2 com texto da questão
  s3.addRow(['', '', 'Pergunta:', ...questions.map(q => q.text)]);
  s3.getRow(2).font = { italic: true, color: { argb: 'FF6B7280' } };

  const ansByResp = new Map<string, Map<number, number>>();
  answers.forEach(a => {
    if (!ansByResp.has(a.response_id)) ansByResp.set(a.response_id, new Map());
    ansByResp.get(a.response_id)!.set(a.question_number, a.answer_value);
  });
  responses.forEach(r => {
    const d = r.demographics || {};
    const map = ansByResp.get(r.id) || new Map();
    const row = [
      shortId(r.id),
      r.department || d.department || '',
      r.completed_at || r.created_at || '',
      ...questions.map(q => map.get(q.number) ?? ''),
    ];
    s3.addRow(row);
  });
  s3.getColumn(1).width = 14;
  s3.getColumn(2).width = 20;
  s3.getColumn(3).width = 20;

  // Sheet 4: Long format (analítico)
  const s4 = wb.addWorksheet('Por Questão (Long)');
  const longRows = buildLongRows(config, data);
  const longHeaders = [
    'Assessment ID', 'Tipo', 'Empresa', 'ID Respondente', 'Departamento',
    'Gênero', 'Faixa Etária', 'Tempo Empresa', 'Data',
    'Q#', 'Pergunta', 'Categoria', 'Valor', 'Rótulo',
  ];
  s4.addRow(longHeaders);
  styleHeader(s4.getRow(1));
  longRows.forEach(r => {
    s4.addRow([
      r.assessment_id, r.assessment_type, r.company, r.respondent_id, r.department,
      r.gender, r.age_range, r.tenure, r.response_date,
      r.question_number, r.question_text, r.category_label, r.answer_value, r.answer_label,
    ]);
  });
  s4.columns.forEach(c => { c.width = 18; });

  // Sheet 5: Por Departamento
  const s5 = wb.addWorksheet('Por Departamento');
  s5.addRow(['Departamento', 'Total Respostas', 'Score Médio']);
  styleHeader(s5.getRow(1));
  const byDept = new Map<string, { count: number; sum: number; n: number }>();
  responses.forEach(r => {
    const d = r.department || (r.demographics?.department) || 'Não Informado';
    if (!byDept.has(d)) byDept.set(d, { count: 0, sum: 0, n: 0 });
    const e = byDept.get(d)!;
    e.count += 1;
    if (typeof r.total_score === 'number') { e.sum += r.total_score; e.n += 1; }
  });
  byDept.forEach((v, k) => {
    s5.addRow([k, v.count, v.n > 0 ? Number((v.sum / v.n).toFixed(2)) : '-']);
  });
  s5.columns.forEach(c => { c.width = 25; });

  // Sheet 6: Por Categoria
  const s6 = wb.addWorksheet('Por Categoria');
  s6.addRow(['Categoria', 'Score Médio', 'Total Answers']);
  styleHeader(s6.getRow(1));
  const qByNum = new Map(questions.map(q => [q.number, q]));
  const byCat = new Map<string, { sum: number; n: number }>();
  answers.forEach(a => {
    const q = qByNum.get(a.question_number);
    if (!q) return;
    const key = q.categoryLabel;
    if (!byCat.has(key)) byCat.set(key, { sum: 0, n: 0 });
    const e = byCat.get(key)!;
    e.sum += a.answer_value;
    e.n += 1;
  });
  byCat.forEach((v, k) => {
    s6.addRow([k, Number((v.sum / v.n).toFixed(2)), v.n]);
  });
  s6.columns.forEach(c => { c.width = 28; });

  // Save
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeTitle = config.assessmentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.download = `${config.assessmentType}-${safeTitle}-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportAssessmentToPowerBICSV(config: ExportConfig): Promise<void> {
  const data = await fetchAssessmentData(config);
  const longRows = buildLongRows(config, data);

  const headers = [
    'assessment_id', 'assessment_type', 'assessment_title', 'company',
    'respondent_id', 'department', 'gender', 'age_range', 'tenure', 'role_level',
    'response_date', 'question_number', 'question_text', 'category', 'category_label',
    'answer_value', 'answer_label',
  ];

  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[;"\n\r]/.test(s) ? `"${s}"` : s;
  };

  const csvLines = [headers.join(';')];
  longRows.forEach(r => {
    csvLines.push(headers.map(h => escape((r as any)[h])).join(';'));
  });

  // UTF-8 BOM para Power BI / Excel reconhecerem encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeTitle = config.assessmentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.download = `${config.assessmentType}-${safeTitle}-powerbi-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
