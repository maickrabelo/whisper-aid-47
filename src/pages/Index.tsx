import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const HOTMART_URL = 'https://prgnovoplano.manus.space';
const WHATSAPP_URL = 'https://wa.me/5527998443852?text=' + encodeURIComponent('Olá! Quero conhecer o Sr.SMS.');

const features = [
  {
    icon: Brain,
    title: 'Riscos Psicossociais (NR-01)',
    description: 'Avaliações HSE-IT e COPSOQ II com indicadores em múltiplas dimensões e plano de ação automatizado.',
    tags: ['HSE-IT', 'COPSOQ II', 'NR-01'],
  },
  {
    icon: Flame,
    title: 'Avaliação de Burnout',
    description: 'Questionário validado cientificamente para medir exaustão, despersonalização e realização profissional.',
    tags: ['Validado', 'Relatório PDF', 'Dashboard'],
  },
  {
    icon: ClipboardList,
    title: 'Pesquisa de Clima',
    description: 'Templates prontos (GPTW/Sr.SMS) ou pesquisas personalizadas. Anônimas e segmentadas por setor.',
    tags: ['Personalizável', 'Anônima', 'Por setor'],
  },
  {
    icon: FileText,
    title: 'PGR Psicossocial',
    description: 'Inventário de riscos, GHEs, matrizes e plano de ação de 12 meses em conformidade com NR-01/NR-17.',
    tags: ['GHEs', 'Matriz de riscos', 'Plano 12 meses'],
  },
  {
    icon: Printer,
    title: 'Versão para Impressão',
    description: 'Imprima qualquer avaliação (HSE-IT, COPSOQ, Burnout, Clima) para aplicação manual em papel.',
    tags: ['PDF', 'Aplicação manual'],
  },
  {
    icon: BarChart3,
    title: 'Dashboards e Evolução',
    description: 'Reavaliações periódicas (30/90/180/365 dias), histórico de deltas e gráficos comparativos.',
    tags: ['Ciclos', 'Comparativos', 'Tempo real'],
  },
  {
    icon: FileSpreadsheet,
    title: 'Exportação Power BI',
    description: 'Exporte os dados de qualquer módulo em Excel multi-aba e CSV long-format para análise externa.',
    tags: ['Excel', 'CSV', 'Power BI'],
  },
  {
    icon: Users,
    title: 'Gestão Multi-Empresa',
    description: 'Atenda múltiplas empresas, segmente por departamentos/GHEs e convide colaboradores para sua equipe.',
    tags: ['Multi-tenant', 'Setores', 'Equipe'],
  },
];

const planFeatures = [
  'HSE-IT — Avaliação de Riscos Psicossociais',
  'COPSOQ II — Questionário Psicossocial Copenhagen',
  'Avaliação de Burnout',
  'Pesquisa de Clima Organizacional',
  'PGR Psicossocial completo (Inventário, GHEs, Plano de Ação)',
  'Dashboards e relatórios PDF',
  'Reavaliações periódicas e histórico',
  'Exportação Excel / CSV / Power BI',
  'Versão impressa dos questionários',
  'Gestão multi-empresa e multi-usuário',
  'Suporte por e-mail e WhatsApp',
];

const faqs = [
  {
    q: 'O que é o Sr.SMS?',
    a: 'O Sr.SMS é uma plataforma completa de gestão de riscos psicossociais, burnout, clima organizacional e PGR, em conformidade com a NR-01 e NR-17.',
  },
  {
    q: 'Quanto custa?',
    a: 'R$ 99,90 por mês, com todas as ferramentas liberadas. Sem taxa de adesão e sem limite de uso das avaliações.',
  },
  {
    q: 'Como funciona a contratação?',
    a: 'A contratação é feita exclusivamente pela Hotmart. Após o pagamento você recebe as credenciais de acesso por e-mail.',
  },
  {
    q: 'Tem teste grátis?',
    a: 'Sim. Oferecemos um plano de teste por 7 dias com todos os recursos liberados. Após o período, basta migrar para o plano definitivo.',
  },
  {
    q: 'Quais avaliações estão incluídas?',
    a: 'HSE-IT (35 questões, 7 dimensões), COPSOQ II (40 questões, escala 0-100), Avaliação de Burnout (20 questões, 3 dimensões) e Pesquisa de Clima personalizável.',
  },
  {
    q: 'Posso atender mais de uma empresa?',
    a: 'Sim. O Sr.SMS suporta múltiplas empresas, com segmentação por departamentos e GHEs, ideal para gestoras SST e consultorias.',
  },
  {
    q: 'O sistema gera o PGR?',
    a: 'Sim. O módulo PGR Psicossocial gera o inventário de riscos, GHEs, matriz de riscos e plano de ação de 12 meses, prontos para auditoria.',
  },
];

const Index = () => {
  usePageSEO({
    title: 'Sr.SMS — Riscos Psicossociais, Burnout, Clima e PGR | NR-01',
    description:
      'Plataforma completa para gestão de riscos psicossociais conforme NR-01: HSE-IT, COPSOQ II, Burnout, Clima Organizacional e PGR. R$ 99,90/mês.',
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {/* HERO */}
        <section className="relative overflow-hidden bg-background">
          <div className="absolute top-0 right-0 w-[60%] h-[80%] bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="container mx-auto max-w-7xl px-4 relative z-10 py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in">
                <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="h-3 w-3 mr-1" /> Conformidade NR-01
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                  Gestão completa de <span className="text-primary">Riscos Psicossociais</span> com o Sr.SMS
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                  HSE-IT, COPSOQ II, Burnout, Clima Organizacional e PGR — tudo em uma só plataforma,
                  por <strong className="text-foreground">R$ 99,90/mês</strong>.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    onClick={() => window.open(HOTMART_URL, '_blank')}
                    className="font-semibold group"
                  >
                    Assinar agora
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => window.open(WHATSAPP_URL, '_blank')}>
                    Falar no WhatsApp
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Conformidade NR-01 · LGPD · Pagamento seguro via Hotmart</span>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <div className="bg-card rounded-3xl shadow-2xl border border-border p-8 md:p-10 max-w-md w-full text-center">
                  <img src={srSmsLogo.url} alt="Sr.SMS" className="h-24 mx-auto mb-4 object-contain" />
                  <p className="text-sm text-muted-foreground mb-6">Plano único · Todas as ferramentas liberadas</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-primary">R$ 99,90</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full font-semibold"
                    onClick={() => window.open(HOTMART_URL, '_blank')}
                  >
                    Assinar pela Hotmart
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">7 dias de teste disponível</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="ferramentas" className="py-20 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <p className="text-sm uppercase tracking-widest text-primary font-bold mb-3">Ferramentas</p>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Tudo o que você precisa para cumprir a <span className="text-primary">NR-01</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Uma plataforma única para avaliar, documentar e gerir riscos psicossociais com agilidade.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="group bg-card rounded-2xl border border-border p-6 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                      <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{f.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10"
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

        {/* PRICING */}
        <section id="planos" className="py-20 bg-background">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Plano único</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Um plano. Todas as ferramentas.
              </h2>
              <p className="text-lg text-muted-foreground">
                Sem upsell, sem cobrança por usuário, sem limite de avaliações.
              </p>
            </div>

            <Card className="border-2 border-primary shadow-2xl overflow-hidden">
              <div className="bg-primary text-primary-foreground text-center py-3 text-sm font-semibold uppercase tracking-wider">
                Sr.SMS — Plano Completo
              </div>
              <CardContent className="p-8 md:p-12">
                <div className="text-center mb-8">
                  <img src={srSmsLogo.url} alt="Sr.SMS" className="h-20 mx-auto mb-6 object-contain" />
                  <div className="mb-2">
                    <span className="text-6xl font-bold text-primary">R$ 99,90</span>
                    <span className="text-xl text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Cobrado mensalmente via Hotmart</p>
                </div>

                <ul className="space-y-3 mb-8 max-w-md mx-auto">
                  {planFeatures.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  <Button
                    size="lg"
                    className="flex-1 font-semibold"
                    onClick={() => window.open(HOTMART_URL, '_blank')}
                  >
                    Assinar agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(WHATSAPP_URL, '_blank')}
                  >
                    Tirar dúvidas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 bg-muted/30">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-widest text-primary font-bold mb-3">FAQ</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Perguntas frequentes
              </h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-semibold text-foreground">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para colocar sua empresa em conformidade com a NR-01?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Comece hoje mesmo com o Sr.SMS por apenas R$ 99,90/mês. Todas as ferramentas, sem letras miúdas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => window.open(HOTMART_URL, '_blank')}
                className="font-semibold"
              >
                Assinar pela Hotmart
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.open(WHATSAPP_URL, '_blank')}
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
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
