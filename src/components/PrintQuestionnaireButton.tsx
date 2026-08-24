import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Printer } from 'lucide-react';
import { HSEIT_QUESTIONS_SORTED, HSEIT_LIKERT_OPTIONS, HSEIT_CATEGORY_LABELS } from '@/data/hseitQuestions';
import { COPSOQ_QUESTIONS_SORTED, COPSOQ_SCALES, COPSOQ_CATEGORY_LABELS } from '@/data/copsoqQuestions';
import { COPSOQ_MEDIUM_QUESTIONS_SORTED, COPSOQ_MEDIUM_CATEGORY_LABELS } from '@/data/copsoqMediumQuestions';
import { BURNOUT_QUESTIONS_SORTED, BURNOUT_LIKERT_OPTIONS, BURNOUT_CATEGORY_LABELS } from '@/data/burnoutQuestions';
import { gptwQuestions, npsQuestion, openQuestions, likertOptions as gptwLikert, gptwCategories } from '@/data/gptwQuestions';
import { soiaQuestions, soiaOpenQuestions, soiaCategories } from '@/data/soiaQuestions';

type Variant = 'hseit' | 'copsoq' | 'copsoq-medium' | 'burnout' | 'climate-gptw' | 'climate-soia';

interface PrintItem {
  number: number | string;
  text: string;
  category?: string;
  options: string[];
  type?: 'likert' | 'open' | 'scale_0_10';
}

const headerHtml = (title: string, subtitle: string, instructions: string) => `
  <header>
    <h1>${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <div class="meta">
      <div><strong>Nome (opcional):</strong> ____________________________________________</div>
      <div><strong>Setor / Departamento:</strong> _________________________________________</div>
      <div><strong>Data:</strong> ____/____/______</div>
    </div>
    <div class="instructions">${instructions}</div>
  </header>
`;

const renderItems = (items: PrintItem[]) => items.map((q) => {
  if (q.type === 'open') {
    return `
      <div class="q">
        <div class="qtext"><span class="qnum">${q.number}.</span> ${escapeHtml(q.text)}</div>
        <div class="openlines">${'<div class="line"></div>'.repeat(4)}</div>
      </div>`;
  }
  if (q.type === 'scale_0_10') {
    const opts = Array.from({ length: 11 }, (_, i) => i);
    return `
      <div class="q">
        <div class="qtext"><span class="qnum">${q.number}.</span> ${escapeHtml(q.text)}${q.category ? ` <span class="cat">[${escapeHtml(q.category)}]</span>` : ''}</div>
        <div class="opts opts-nps">
          ${opts.map(n => `<label><span class="box"></span>${n}</label>`).join('')}
        </div>
      </div>`;
  }
  return `
    <div class="q">
      <div class="qtext"><span class="qnum">${q.number}.</span> ${escapeHtml(q.text)}${q.category ? ` <span class="cat">[${escapeHtml(q.category)}]</span>` : ''}</div>
      <div class="opts">
        ${q.options.map(o => `<label><span class="box"></span>${escapeHtml(o)}</label>`).join('')}
      </div>
    </div>`;
}).join('');

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function buildHseit(): { title: string; subtitle: string; instructions: string; items: PrintItem[] } {
  return {
    title: 'Questionário HSE-IT',
    subtitle: 'Health and Safety Executive — Indicator Tool (35 questões)',
    instructions: 'Para cada afirmação, marque <strong>uma</strong> opção que melhor represente sua percepção sobre o trabalho nas últimas semanas.',
    items: HSEIT_QUESTIONS_SORTED.map(q => ({
      number: q.number,
      text: q.text,
      category: HSEIT_CATEGORY_LABELS[q.category],
      options: HSEIT_LIKERT_OPTIONS.map(o => `${o.value} – ${o.label}`),
    })),
  };
}

function buildCopsoq(): { title: string; subtitle: string; instructions: string; items: PrintItem[] } {
  return {
    title: 'Questionário COPSOQ II',
    subtitle: 'Copenhagen Psychosocial Questionnaire — Versão Curta (41 questões)',
    instructions: 'Para cada questão, marque <strong>uma</strong> opção, observando que algumas perguntas utilizam escalas diferentes (frequência, intensidade, satisfação).',
    items: COPSOQ_QUESTIONS_SORTED.map(q => ({
      number: q.number,
      text: q.text,
      category: COPSOQ_CATEGORY_LABELS[q.category],
      options: (COPSOQ_SCALES as any)[q.scaleType].map((o: any) => `${o.value} – ${o.label}`),
    })),
  };
}

function buildCopsoqMedium(): { title: string; subtitle: string; instructions: string; items: PrintItem[] } {
  return {
    title: 'Questionário COPSOQ II',
    subtitle: 'Copenhagen Psychosocial Questionnaire — Versão Média (76 questões · Silva et al., 2011)',
    instructions: 'Para cada questão, marque <strong>uma</strong> opção, observando que algumas perguntas utilizam escalas diferentes (frequência, extensão, satisfação, saúde).',
    items: COPSOQ_MEDIUM_QUESTIONS_SORTED.map(q => ({
      number: q.number,
      text: q.text,
      category: COPSOQ_MEDIUM_CATEGORY_LABELS[q.category],
      options: ((COPSOQ_SCALES as any)[q.scaleType] || COPSOQ_SCALES.frequency).map((o: any) => `${o.value} – ${o.label}`),
    })),
  };
}

function buildBurnout(): { title: string; subtitle: string; instructions: string; items: PrintItem[] } {
  return {
    title: 'Questionário de Burnout',
    subtitle: 'Avaliação de Esgotamento Profissional (20 questões)',
    instructions: 'Indique com que <strong>frequência</strong> você experimentou cada situação no trabalho.',
    items: BURNOUT_QUESTIONS_SORTED.map(q => ({
      number: q.number,
      text: q.text,
      category: BURNOUT_CATEGORY_LABELS[q.category],
      options: BURNOUT_LIKERT_OPTIONS.map(o => `${o.value} – ${o.label}`),
    })),
  };
}

function buildGptw(): { title: string; subtitle: string; instructions: string; items: PrintItem[] } {
  const catMap = Object.fromEntries(gptwCategories.map(c => [c.id, c.name]));
  const items: PrintItem[] = gptwQuestions.map((q, i) => ({
    number: i + 1,
    text: q.text,
    category: catMap[q.category],
    options: gptwLikert.map(o => `${o.value} – ${o.label}`),
  }));
  items.push({
    number: 'NPS',
    text: npsQuestion.text,
    options: [],
    type: 'scale_0_10',
  });
  openQuestions.forEach((q, i) => items.push({
    number: `A${i + 1}`,
    text: q.text,
    options: [],
    type: 'open',
  }));
  return {
    title: 'Pesquisa de Clima — GPTW',
    subtitle: 'Modelo Great Place to Work® (Trust Index — adaptado)',
    instructions: 'Para cada afirmação, marque o quanto você concorda ou discorda. Ao final, responda à pergunta NPS (0 a 10) e às perguntas abertas.',
    items,
  };
}

function buildSoia(): { title: string; subtitle: string; instructions: string; items: PrintItem[] } {
  const catMap = Object.fromEntries(soiaCategories.map(c => [c.id, c.name]));
  const items: PrintItem[] = soiaQuestions.map((q, i) => ({
    number: i + 1,
    text: q.text,
    category: catMap[q.category],
    options: gptwLikert.map(o => `${o.value} – ${o.label}`),
  }));
  soiaOpenQuestions.forEach((q, i) => items.push({
    number: `A${i + 1}`,
    text: q.text,
    options: [],
    type: 'open',
  }));
  return {
    title: 'Pesquisa de Clima — Modelo SOIA',
    subtitle: 'Avaliação de Clima Organizacional',
    instructions: 'Para cada afirmação, marque o quanto você concorda. Ao final, responda às perguntas abertas.',
    items,
  };
}

const builders: Record<Variant, () => { title: string; subtitle: string; instructions: string; items: PrintItem[] }> = {
  hseit: buildHseit,
  copsoq: buildCopsoq,
  'copsoq-medium': buildCopsoqMedium,
  burnout: buildBurnout,
  'climate-gptw': buildGptw,
  'climate-soia': buildSoia,
};

function openPrintWindow(variant: Variant) {
  const { title, subtitle, instructions, items } = builders[variant]();
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 24px; font-size: 11pt; line-height: 1.35; }
  header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { margin: 0 0 4px; font-size: 18pt; }
  .subtitle { margin: 0 0 12px; color: #444; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 10pt; margin-bottom: 10px; }
  .meta div:last-child { grid-column: 1 / -1; }
  .instructions { background: #f4f4f4; padding: 8px 10px; border-left: 3px solid #444; font-size: 10pt; }
  .q { padding: 8px 0; border-bottom: 1px dashed #ccc; page-break-inside: avoid; }
  .qtext { font-weight: 500; margin-bottom: 6px; }
  .qnum { font-weight: 700; margin-right: 4px; }
  .cat { color: #666; font-weight: 400; font-size: 9pt; }
  .opts { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 10pt; }
  .opts label { display: inline-flex; align-items: center; gap: 6px; }
  .opts-nps label { gap: 4px; }
  .box { display: inline-block; width: 12px; height: 12px; border: 1.2px solid #111; border-radius: 2px; }
  .openlines { margin-top: 4px; }
  .line { border-bottom: 1px solid #999; height: 20px; }
  .actions { position: fixed; top: 12px; right: 12px; }
  .actions button { font-size: 10pt; padding: 6px 12px; cursor: pointer; }
  @media print { .actions { display: none; } body { margin: 14mm; } }
  footer { margin-top: 18px; font-size: 9pt; color: #666; text-align: center; }
</style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Imprimir</button></div>
  ${headerHtml(title, subtitle, instructions)}
  <main>${renderItems(items)}</main>
  <footer>Versão para preenchimento manual — transcreva as respostas para a plataforma após coletar.</footer>
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

interface Props {
  variant: 'hseit' | 'copsoq' | 'burnout' | 'climate';
  className?: string;
  buttonClassName?: string;
}

export default function PrintQuestionnaireButton({ variant, className, buttonClassName }: Props) {
  if (variant === 'copsoq') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={buttonClassName ?? 'gap-2'}>
            <Printer className="h-4 w-4" /> Imprimir questionário
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover z-50">
          <DropdownMenuItem onClick={() => openPrintWindow('copsoq')}>Versão Curta (41 questões)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openPrintWindow('copsoq-medium')}>Versão Média (76 questões)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (variant === 'climate') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={buttonClassName ?? 'gap-2'}>
            <Printer className="h-4 w-4" /> Imprimir questionário
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover z-50">
          <DropdownMenuItem onClick={() => openPrintWindow('climate-gptw')}>Modelo GPTW</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openPrintWindow('climate-soia')}>Modelo SOIA</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <Button
      variant="outline"
      className={buttonClassName ?? 'gap-2'}
      onClick={() => openPrintWindow(variant as Variant)}
    >
      <Printer className="h-4 w-4" /> Imprimir questionário
    </Button>
  );
}
