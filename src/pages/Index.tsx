import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowRight,
  ShieldCheck,
  Check,
  ClipboardList,
  Brain,
  Flame,
  FileText,
  BarChart3,
  Printer,
  Users,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import srSmsLogo from '@/assets/sr-sms-logo.png.asset.json';
import usePageSEO from '@/hooks/usePageSEO';

const HOTMART_URL = 'https://pay.hotmart.com/Y106371701W?off=cxxuc6kw&checkoutMode=6';
const WHATSAPP_URL = 'https://wa.me/5527998443852?text=' + encodeURIComponent('Olá! Quero conhecer o Sr.SMS.');

const features = [
  { icon: Brain, title: 'Riscos Psicossociais', description: 'HSE-IT e COPSOQ II com indicadores em múltiplas dimensões e plano de ação automatizado.', tags: ['HSE-IT', 'COPSOQ II', 'NR-01'] },
  { icon: Flame, title: 'Avaliação de Burnout', description: 'Questionário validado cientificamente para medir exaustão, despersonalização e realização.', tags: ['Validado', 'PDF', 'Dashboard'] },
  { icon: ClipboardList, title: 'Pesquisa de Clima', description: 'Templates prontos (GPTW/Sr.SMS) ou pesquisas personalizadas. Anônimas e segmentadas por setor.', tags: ['Personalizável', 'Anônima', 'Setor'] },
  { icon: FileText, title: 'PGR Psicossocial', description: 'Inventário de riscos, GHEs, matrizes e plano de ação de 12 meses em conformidade NR-01/NR-17.', tags: ['GHEs', 'Matriz', '12 meses'] },
  { icon: Printer, title: 'Versão Impressa', description: 'Imprima qualquer avaliação (HSE-IT, COPSOQ, Burnout, Clima) para aplicação manual em papel.', tags: ['PDF', 'Manual'] },
  { icon: BarChart3, title: 'Dashboards & Evolução', description: 'Reavaliações periódicas (30/90/180/365 dias), histórico de deltas e gráficos comparativos.', tags: ['Ciclos', 'Comparativos'] },
  { icon: FileSpreadsheet, title: 'Exportação Power BI', description: 'Exporte os dados de qualquer módulo em Excel multi-aba e CSV long-format para análise externa.', tags: ['Excel', 'CSV'] },
  { icon: Users, title: 'Multi-Empresa', description: 'Atenda múltiplas empresas, segmente por departamentos/GHEs e convide colaboradores.', tags: ['Multi-tenant', 'Setores'] },
];

const planFeatures = [
  'HSE-IT — Avaliação de Riscos Psicossociais',
  'COPSOQ II — Questionário Psicossocial Copenhagen',
  'Avaliação de Burnout',
  'Pesquisa de Clima Organizacional',
  'PGR Psicossocial completo (Inventário, GHEs, Plano)',
  'Dashboards e relatórios PDF',
  'Reavaliações periódicas e histórico',
  'Exportação Excel / CSV / Power BI',
  'Versão impressa dos questionários',
  'Gestão multi-empresa e multi-usuário',
  'Suporte por e-mail e WhatsApp',
];

const faqs = [
  { q: 'O que é o Sr.SMS?', a: 'Plataforma completa de gestão de riscos psicossociais, burnout, clima organizacional e PGR, em conformidade com a NR-01 e NR-17.' },
  { q: 'Quanto custa?', a: 'R$ 97,90 por mês, com todas as ferramentas liberadas. Sem taxa de adesão e sem limite de uso.' },
  { q: 'Como funciona a contratação?', a: 'A contratação é feita exclusivamente pela Hotmart. Após o pagamento você recebe as credenciais por e-mail.' },
  { q: 'Quais avaliações estão incluídas?', a: 'HSE-IT (35 questões), COPSOQ II (40 questões), Burnout (20 questões) e Pesquisa de Clima personalizável.' },
  { q: 'Posso atender mais de uma empresa?', a: 'Sim. Multi-empresa com segmentação por departamentos e GHEs — ideal para gestoras SST e consultorias.' },
  { q: 'O sistema gera o PGR?', a: 'Sim. Inventário, GHEs, matriz de riscos e plano de ação de 12 meses prontos para auditoria.' },
];

const Wave = ({ from = 'hsl(var(--primary))', to = 'hsl(var(--background))' }: { from?: string; to?: string }) => (
  <svg className="wave-divider" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden>
    <path d="M0,32 C240,56 480,8 720,24 C960,40 1200,56 1440,16 L1440,56 L0,56 Z" fill={to} />
    <rect width="1440" height="32" fill={from} />
    <path d="M0,32 C240,56 480,8 720,24 C960,40 1200,56 1440,16 L1440,32 L0,32 Z" fill={to} />
  </svg>
);

const Index = () => {
  usePageSEO({
    title: 'Sr.SMS — Riscos Psicossociais, Burnout, Clima e PGR | NR-01',
    description: 'Plataforma completa para gestão de riscos psicossociais conforme NR-01: HSE-IT, COPSOQ II, Burnout, Clima e PGR. R$ 97,90/mês.',
  });

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <Navbar />
      <main className="flex-grow">
        {/* HERO — verde-floresta */}
        <section className="relative overflow-hidden bg-forest text-cream">
          {/* Camadas decorativas */}
          <div className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-lime/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 w-[420px] h-[420px] rounded-full bg-forest-soft/40 blur-3xl" />

          <div className="container mx-auto max-w-7xl px-4 relative z-10 pt-20 pb-32 md:pt-28 md:pb-40">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 animate-fade-in">
                <span className="pill bg-lime/15 text-lime border border-lime/30 mb-7">
                  <Sparkles className="h-3.5 w-3.5" /> Conformidade NR-01
                </span>
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] mb-7">
                  Saúde mental no trabalho,{' '}
                  <span className="text-lime italic font-normal">cultivada</span>{' '}
                  com método.
                </h1>
                <p className="text-lg md:text-xl text-cream/80 mb-10 max-w-xl leading-relaxed">
                  HSE-IT, COPSOQ II, Burnout, Clima e PGR — toda a NR-01 numa só plataforma, por{' '}
                  <strong className="text-lime">R$ 97,90/mês</strong>.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    onClick={() => window.open(HOTMART_URL, '_blank')}
                    className="rounded-full bg-lime text-forest-deep hover:bg-lime-bright font-semibold shadow-lime h-14 px-8 text-base group"
                  >
                    Assinar agora
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => window.open(WHATSAPP_URL, '_blank')}
                    variant="outline"
                    className="rounded-full border-cream/30 bg-transparent text-cream hover:bg-cream/10 hover:text-cream h-14 px-8 text-base"
                  >
                    Falar no WhatsApp
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-8 text-sm text-cream/60">
                  <ShieldCheck className="h-4 w-4 text-lime" />
                  <span>NR-01 · LGPD · Pagamento seguro via Hotmart</span>
                </div>
              </div>

              {/* Card preço — pílula grande */}
              <div className="lg:col-span-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <div className="relative">
                  <div className="absolute -inset-1 rounded-[2rem] bg-lime/20 blur-xl" />
                  <div className="relative bg-cream text-forest-deep rounded-[2rem] shadow-2xl p-8 md:p-10">
                    <div className="flex items-center justify-between mb-6">
                      <img src={srSmsLogo.url} alt="Sr.SMS" className="h-16 object-contain" />
                      <span className="pill bg-forest text-lime text-xs">Plano único</span>
                    </div>
                    <p className="text-sm text-forest-mid/70 mb-2">Todas as ferramentas liberadas</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="font-display text-6xl font-bold text-forest">R$ 97,90</span>
                      <span className="text-forest-mid/60">/mês</span>
                    </div>
                    <Button
                      size="lg"
                      className="w-full rounded-full bg-forest text-lime hover:bg-forest-deep h-12 font-semibold"
                      onClick={() => window.open(HOTMART_URL, '_blank')}
                    >
                      Assinar pela Hotmart
                    </Button>
                    <p className="text-xs text-forest-mid/60 mt-3 text-center">7 dias de teste grátis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Onda decorativa */}
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
            <path d="M0,48 C240,80 480,16 720,32 C960,48 1200,80 1440,24 L1440,80 L0,80 Z" fill="hsl(var(--background))" />
          </svg>
        </section>

        {/* FEATURES */}
        <section id="ferramentas" className="py-24 bg-cream relative">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="max-w-2xl mb-16">
              <span className="pill bg-forest/5 text-forest border border-forest/10 mb-5 text-xs uppercase tracking-widest font-bold">
                Ferramentas
              </span>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-forest mb-5 leading-[1.05]">
                Tudo o que você precisa para cumprir a{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">NR-01</span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-lime -z-0 rounded-sm" />
                </span>
              </h2>
              <p className="text-lg text-forest-mid/80">
                Uma plataforma única para avaliar, documentar e gerir riscos psicossociais com agilidade.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((f, i) => {
                const Icon = f.icon;
                const isHighlight = i === 0 || i === 3;
                return (
                  <div
                    key={f.title}
                    className={`group rounded-3xl p-7 transition-all hover:-translate-y-1 hover:shadow-soft ${
                      isHighlight
                        ? 'bg-forest text-cream'
                        : 'bg-cream-soft border border-forest/10 text-forest'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${
                        isHighlight ? 'bg-lime text-forest-deep' : 'bg-forest text-lime'
                      }`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-2">{f.title}</h3>
                    <p className={`text-sm mb-5 leading-relaxed ${isHighlight ? 'text-cream/75' : 'text-forest-mid/75'}`}>
                      {f.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            isHighlight
                              ? 'bg-cream/10 text-lime border border-lime/20'
                              : 'bg-forest/5 text-forest border border-forest/10'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PRICING — bloco lima dramático */}
        <section id="planos" className="py-24 bg-cream relative">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="rounded-[2.5rem] overflow-hidden shadow-soft bg-forest text-cream grid md:grid-cols-2">
              {/* Esquerda — pitch */}
              <div className="p-10 md:p-14 relative overflow-hidden">
                <span className="pill bg-lime/15 text-lime border border-lime/30 mb-6">Plano único</span>
                <h2 className="font-display text-4xl md:text-5xl font-bold leading-[1.05] mb-5">
                  Um plano.<br />
                  <span className="text-lime italic font-normal">Todas as ferramentas.</span>
                </h2>
                <p className="text-cream/75 text-lg leading-relaxed mb-8">
                  Sem upsell, sem cobrança por usuário, sem limite de avaliações. Cobrança mensal via Hotmart.
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-6xl md:text-7xl font-bold text-lime">R$ 97,90</span>
                  <span className="text-cream/60 text-lg">/mês</span>
                </div>
              </div>

              {/* Direita — features */}
              <div className="bg-cream text-forest p-10 md:p-14">
                <ul className="space-y-3 mb-8">
                  {planFeatures.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-lime flex-shrink-0">
                        <Check className="w-3 h-3 text-forest-deep" strokeWidth={3} />
                      </span>
                      <span className="text-sm text-forest-deep">{feat}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={() => window.open(HOTMART_URL, '_blank')}
                    className="rounded-full bg-forest text-lime hover:bg-forest-deep h-12 font-semibold"
                  >
                    Assinar agora <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => window.open(WHATSAPP_URL, '_blank')}
                    className="rounded-full border-forest/20 text-forest hover:bg-forest/5 h-12"
                  >
                    Tirar dúvidas
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 bg-cream-warm/40">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="text-center mb-14">
              <span className="pill bg-forest/5 text-forest border border-forest/10 mb-4 text-xs uppercase tracking-widest font-bold">
                FAQ
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-forest">
                Perguntas frequentes
              </h2>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-cream rounded-2xl border border-forest/10 px-6 data-[state=open]:bg-forest data-[state=open]:text-cream transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold font-display py-5 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-cream/80 pb-5">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative bg-forest-deep text-cream overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-forest-deep via-forest to-forest-mid" />

          <div className="container mx-auto max-w-4xl px-4 py-24 text-center relative z-10">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-6 leading-[1.05]">
              Pronto para cumprir a{' '}
              <span className="text-lime italic font-normal">NR-01</span>?
            </h2>
            <p className="text-lg md:text-xl text-cream/75 mb-10 max-w-2xl mx-auto">
              Comece hoje por R$ 97,90/mês. Todas as ferramentas, sem letras miúdas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => window.open(HOTMART_URL, '_blank')}
                className="rounded-full bg-lime text-forest-deep hover:bg-lime-bright font-semibold shadow-lime h-14 px-8 text-base"
              >
                Assinar pela Hotmart <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.open(WHATSAPP_URL, '_blank')}
                className="rounded-full bg-transparent border-cream/30 text-cream hover:bg-cream/10 hover:text-cream h-14 px-8 text-base"
              >
                Falar no WhatsApp
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
