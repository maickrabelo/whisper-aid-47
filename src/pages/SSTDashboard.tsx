import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Loader2, ExternalLink, Copy, ClipboardList, Plus, Brain, Flame, Building2, Pencil, Trash2, Link2, ArrowRight, BarChart3, Shield, KeyRound, GraduationCap, SlidersHorizontal, FileText, Activity, ClipboardCheck } from "lucide-react";
import ManageFeaturesDialog from '@/components/sst/ManageFeaturesDialog';
import { usePGRModuleAccess } from "@/hooks/usePGRModuleAccess";
import { useAEPBetaAccess } from "@/hooks/useAEPBetaAccess";
import { QRCodeDownloader } from "@/components/QRCodeDownloader";
import { useNavigate } from 'react-router-dom';
import EmbeddedDashboard from '@/components/EmbeddedDashboard';
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { useToast } from "@/hooks/use-toast";
import AddCompanyDialog from '@/components/sst/AddCompanyDialog';
import EditCompanyDialog from '@/components/sst/EditCompanyDialog';
import DeleteCompanyDialog from '@/components/sst/DeleteCompanyDialog';
import ResetPasswordDialog from '@/components/sst/ResetPasswordDialog';
import SSTCompanyCounter from '@/components/sst/SSTCompanyCounter';
import TrialBanner from '@/components/TrialBanner';
import TrialExpiredOverlay from '@/components/TrialExpiredOverlay';
import OnboardingTour, { TourStep } from '@/components/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import SoniaChat from '@/components/SoniaChat';
import { SoniaChatProvider, SoniaChatLayout } from '@/contexts/SoniaChatContext';
import TeamManagementCard from '@/components/collaborators/TeamManagementCard';
import { BETA_OUVIDORIA_COMPANY_IDS } from '@/lib/betaOuvidoria';
import { useSmartOnlyPlan } from '@/hooks/useSmartOnlyPlan';
import { usePgrShortcutPlan } from '@/hooks/usePgrShortcutPlan';
import { useSmsPlan } from '@/hooks/useSmsPlan';

const sstDashboardSteps: TourStep[] = [
  {
    targetId: 'sst-tools-bar',
    title: '🛠️ Suas Ferramentas',
    description: 'Aqui ficam todas as ferramentas disponíveis para você gerenciar a saúde ocupacional das suas empresas.',
    position: 'bottom',
  },
  {
    targetId: 'tool-hseit',
    title: '🧠 Riscos Psicossociais',
    description: 'Avalie os riscos psicossociais das empresas usando metodologias HSE-IT e COPSOQ, reconhecidas internacionalmente.',
    position: 'bottom',
  },
  {
    targetId: 'tool-burnout',
    title: '🔥 Avaliação Burnout',
    description: 'Aplique questionários de avaliação de risco de Síndrome de Burnout nos colaboradores.',
    position: 'bottom',
  },
  {
    targetId: 'tool-climate',
    title: '📋 Pesquisas de Clima',
    description: 'Crie e gerencie pesquisas de clima organizacional personalizadas.',
    position: 'bottom',
  },
  {
    targetId: 'tool-new-company',
    title: '🏢 Nova Empresa',
    description: 'Cadastre novas empresas para gerenciar. No plano trial, você pode ter até 2 empresas.',
    position: 'bottom',
  },
  {
    targetId: 'sst-link',
    title: '🔗 Link da Página Inicial',
    description: 'Este é o link da sua página pública. Compartilhe com suas empresas clientes para que acessem o canal de ouvidoria.',
    position: 'bottom',
  },
  {
    targetId: 'company-cards',
    title: '📊 Empresas Cadastradas',
    description: 'Aqui você visualiza todas as empresas cadastradas e acessa o portal de ouvidoria de cada uma.',
    position: 'top',
  },
];

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  reportCount: number;
  newReports: number;
  createdAt: string | null;
  lastActivityAt: string | null;
}

type SortOption = 'alphabetical' | 'newest' | 'last_activity';

const onlyDigits = (value: string | null | undefined) => String(value ?? '').replace(/\D/g, '');

const tools = [
  {
    id: 'tool-hseit',
    icon: Brain,
    title: 'Riscos Psicossociais',
    description: 'HSE-IT e COPSOQ validados internacionalmente',
    highlights: ['HSE-IT', 'COPSOQ II', 'Plano de ação'],
    path: '/psychosocial-dashboard',
  },
  {
    id: 'tool-burnout',
    icon: Flame,
    title: 'Avaliação Burnout',
    description: 'Questionários científicos de esgotamento',
    highlights: ['MBI validado', 'Relatório PDF', 'Dashboard'],
    path: '/burnout-dashboard',
  },
  {
    id: 'tool-climate',
    icon: ClipboardList,
    title: 'Pesquisas de Clima',
    description: 'Clima organizacional personalizado',
    highlights: ['NPS', 'Personalizável', 'Relatórios'],
    path: '/climate-dashboard',
  },
  {
    id: 'tool-pulse',
    icon: Activity,
    title: 'Pulse Survey',
    description: 'Avaliações curtas e periódicas com resumo automático',
    highlights: ['Semanal/Mensal', 'Emojis ou Likert', 'Email automático'],
    path: '/pulse-survey',
  },
  {
    id: 'tool-trainings',
    icon: GraduationCap,
    title: 'Treinamentos',
    description: 'Crie módulos educativos para suas empresas',
    highlights: ['Vídeos', 'PDFs', 'Artigos'],
    path: '/sst/treinamentos',
  },
];

const SSTDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalPsychosocialResponses, setTotalPsychosocialResponses] = useState(0);
  const [totalPgrs, setTotalPgrs] = useState(0);
  const [smartOuvidoriaIds, setSmartOuvidoriaIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [isDeleteCompanyOpen, setIsDeleteCompanyOpen] = useState(false);
  const [resetPasswordCompany, setResetPasswordCompany] = useState<Company | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [featuresCompany, setFeaturesCompany] = useState<Company | null>(null);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [sstManagerId, setSstManagerId] = useState<string | null>(null);
  const [maxCompanies, setMaxCompanies] = useState(50);
  const [extraSlots, setExtraSlots] = useState(0);
  const [sstSlug, setSstSlug] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading, isTrialExpired, trialEndsAt } = useRealAuth();
  const { toast } = useToast();
  const { shouldShowTour, completeTour } = useOnboarding('sst-dashboard');
  const { hasAccess: hasPGRAccess } = usePGRModuleAccess();
  const { allowed: aepAllowed } = useAEPBetaAccess();
  const { isSmartOnly } = useSmartOnlyPlan();
  const { hasShortcut: hasPgrShortcut } = usePgrShortcutPlan();
  const { isSmsPlan } = useSmsPlan();

  const fetchCompanies = async (highlightCompanyId?: string) => {
    try {
      setIsLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('sst_manager_id')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData?.sst_manager_id) {
        toast({ title: "Erro", description: "Seu perfil não está vinculado a uma gestora SST.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const currentSstManagerId = profileData.sst_manager_id;
      setSstManagerId(currentSstManagerId);

      const [sstResult, assignmentsResult] = await Promise.all([
        supabase.from('sst_managers').select('max_companies, slug, extra_company_slots').eq('id', currentSstManagerId).single(),
        supabase
          .from('company_sst_assignments')
          .select('company_id, companies:company_id(id, name, logo_url, slug, cnpj, email, phone, address, employee_count, created_at)')
          .eq('sst_manager_id', currentSstManagerId)
          .limit(5000),
      ]);

      const { data: sstData } = sstResult;
      const { data: assignmentsData, error: assignmentsError } = assignmentsResult;

      if (sstData?.max_companies) setMaxCompanies(sstData.max_companies);
      if (typeof (sstData as any)?.extra_company_slots === 'number') setExtraSlots((sstData as any).extra_company_slots);
      if (sstData?.slug) setSstSlug(sstData.slug);
      if (assignmentsError) throw assignmentsError;

      const companiesList = ((assignmentsData || [])
        .map((a: any) => a.companies)
        .filter(Boolean)) as any[];

      if (companiesList.length === 0) {
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      const fetchedIds = companiesList.map(c => c.id);

      // Única query agregada para TODOS os reports das empresas desse gestor
      const { data: allReports } = fetchedIds.length > 0
        ? await supabase
            .from('reports')
            .select('company_id, status, created_at')
            .in('company_id', fetchedIds)
        : { data: [] as any[] };

      // Fetch PGR Documents Count
      const { count: pgrCount } = fetchedIds.length > 0
        ? await supabase
            .from('pgr_documents')
            .select('id', { count: 'exact', head: true })
            .in('company_id', fetchedIds)
        : { count: 0 };
      setTotalPgrs(pgrCount || 0);

      // Fetch Psychosocial responses count
      try {
        if (fetchedIds.length > 0) {
          const [hseitA, copsoqA, burnoutA, climateA] = await Promise.all([
            supabase.from("hseit_assessments" as any).select("id").in("company_id", fetchedIds),
            supabase.from("copsoq_assessments" as any).select("id").in("company_id", fetchedIds),
            supabase.from("burnout_assessments" as any).select("id").in("company_id", fetchedIds),
            supabase.from("climate_surveys" as any).select("id").in("company_id", fetchedIds),
          ]);

          const hseitIds = (hseitA.data || []).map((a: any) => a.id);
          const copsoqIds = (copsoqA.data || []).map((a: any) => a.id);
          const burnoutIds = (burnoutA.data || []).map((a: any) => a.id);
          const climateIds = (climateA.data || []).map((a: any) => a.id);

          const [hseitR, copsoqR, burnoutR, climateR] = await Promise.all([
            hseitIds.length > 0
              ? supabase.from("hseit_responses" as any).select("id", { count: "exact", head: true }).in("assessment_id", hseitIds).not("completed_at", "is", null)
              : { count: 0 },
            copsoqIds.length > 0
              ? supabase.from("copsoq_responses" as any).select("id", { count: "exact", head: true }).in("assessment_id", copsoqIds).not("completed_at", "is", null)
              : { count: 0 },
            burnoutIds.length > 0
              ? supabase.from("burnout_responses" as any).select("id", { count: "exact", head: true }).in("assessment_id", burnoutIds).not("completed_at", "is", null)
              : { count: 0 },
            climateIds.length > 0
              ? supabase.from("survey_responses" as any).select("id", { count: "exact", head: true }).in("survey_id", climateIds)
              : { count: 0 },
          ]);

          const totalResps = (hseitR?.count || 0) + (copsoqR?.count || 0) + (burnoutR?.count || 0) + (climateR?.count || 0);
          setTotalPsychosocialResponses(totalResps);
        } else {
          setTotalPsychosocialResponses(0);
        }
      } catch (e) {
        console.error("Failed to fetch psychosocial response counts", e);
      }

      const reportsByCompany = new Map<string, { total: number; pending: number; lastAt: string | null }>();
      (allReports || []).forEach((r: any) => {
        const entry = reportsByCompany.get(r.company_id) || { total: 0, pending: 0, lastAt: null };
        entry.total += 1;
        if (r.status === 'pending') entry.pending += 1;
        if (!entry.lastAt || new Date(r.created_at) > new Date(entry.lastAt)) {
          entry.lastAt = r.created_at;
        }
        reportsByCompany.set(r.company_id, entry);
      });

      const companiesWithCounts = companiesList.map((company) => {
        const agg = reportsByCompany.get(company.id) || { total: 0, pending: 0, lastAt: null };
        return {
          ...company,
          reportCount: agg.total,
          newReports: agg.pending,
          createdAt: company.created_at ?? null,
          lastActivityAt: agg.lastAt,
        };
      });

      setCompanies(companiesWithCounts);

      // Check Smart Ouvidoria access for these companies (SST Smart plan)
      try {
        const checks = await Promise.all(
          companiesWithCounts.map(async (c) => {
            const { data } = await (supabase as any).rpc('company_has_smart_ouvidoria', { _company_id: c.id });
            return data ? c.id : null;
          })
        );
        setSmartOuvidoriaIds(new Set(checks.filter(Boolean) as string[]));
      } catch (e) {
        console.warn('smart ouvidoria check failed', e);
      }

      if (highlightCompanyId) {
        const createdCompany = companiesWithCounts.find((company) => company.id === highlightCompanyId);
        setSearchTerm('');
        setSortBy('newest');
        if (createdCompany) {
          toast({
            title: "Empresa disponível na lista",
            description: `${createdCompany.name} aparece em “Últimas cadastradas”.`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast({ title: "Erro ao carregar empresas", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (role !== 'sst') {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      fetchCompanies();
    }
  }, [user, role, authLoading, navigate, toast]);

  const filteredCompanies = companies
    .filter(company => {
      const term = searchTerm.toLowerCase().trim();
      const termDigits = onlyDigits(term);
      if (!term) return true;
      return (
        company.name.toLowerCase().includes(term) ||
        (company.cnpj || '').toLowerCase().includes(term) ||
        (!!termDigits && onlyDigits(company.cnpj).includes(termDigits)) ||
        (company.email || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }
      if (sortBy === 'newest') {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bT - aT;
      }
      // last_activity
      const aT = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bT = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bT - aT;
    });

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const handleCompanyClick = (companySlug: string) => {
    setSelectedCompany(companySlug);
  };

  const copyToClipboard = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Link copiado!", description: "O link foi copiado para a área de transferência." });
    } catch {
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar o link.", variant: "destructive" });
    }
  };

  const totalReports = companies.reduce((sum, c) => sum + c.reportCount, 0);
  const pendingReports = companies.reduce((sum, c) => sum + c.newReports, 0);

  return (
    <SoniaChatProvider>
    <SoniaChatLayout>
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-background">
        {/* Hero Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary py-12 md:py-16">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="audit-container relative z-10">
            {isTrialExpired && <TrialExpiredOverlay category="manager" />}
            {trialEndsAt && !isTrialExpired && <TrialBanner trialEndsAt={trialEndsAt} />}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-4">
                  <Shield className="h-4 w-4" />
                  <span>Painel de Gestão SST</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Gestão SST</h1>
                <p className="text-white/70 mt-1">Monitore todas as empresas sob sua gestão</p>
              </div>
              {selectedCompany && (
                <Button variant="secondary" onClick={() => setSelectedCompany(null)} className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  Voltar para lista de empresas
                </Button>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {[
                { value: companies.length.toString(), label: 'Empresas', icon: Building2 },
                { value: totalPsychosocialResponses.toString(), label: 'Avaliações Psicossociais', icon: BarChart3 },
                { value: totalPgrs.toString(), label: 'PGR Emitidos', icon: ClipboardCheck },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <stat.icon className="h-5 w-5 text-white/80" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/60">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="audit-container py-8">
          {/* Tools Section */}
          <div id="sst-tools-bar" className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Suas Ferramentas</h2>
                <p className="text-muted-foreground text-sm mt-1">Ferramentas para gestão de saúde ocupacional</p>
              </div>
              <Button
                id="tool-new-company"
                onClick={() => setIsAddCompanyOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Empresa
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(() => {
                const hasBetaCompany = isSmartOnly || companies.some(c => BETA_OUVIDORIA_COMPANY_IDS.includes(c.id) || smartOuvidoriaIds.has(c.id));
                let base = tools;
                if (isSmartOnly) {
                  // Smart plan: only HSE-IT/COPSOQ (Psicossocial), Clima, Pulse, Trainings opcional
                  base = tools.filter(t => ['tool-hseit', 'tool-climate', 'tool-pulse'].includes(t.id));
                }
                let displayedTools = hasBetaCompany
                  ? [...base, {
                      id: 'tool-ouvidoria-smart',
                      icon: ClipboardList,
                      title: 'Ouvidoria Smart',
                      description: 'Canal anônimo (formulário estático)',
                      highlights: ['Anônimo'],
                      path: '/ouvidoria-beta/painel',
                    }]
                  : base;
                if (hasPgrShortcut || hasPGRAccess) {
                  displayedTools = [...displayedTools, {
                    id: 'tool-pgr',
                    icon: FileText,
                    title: 'PGR',
                    description: 'Programa de Gerenciamento de Riscos (NR-1/NR-17)',
                    highlights: ['Inventário', 'Plano de ação', 'e-Social'],
                    path: '/pgr',
                  }];
                }
                if (aepAllowed) {
                  displayedTools = [...displayedTools, {
                    id: 'tool-aep',
                    icon: ClipboardCheck,
                    title: 'AEP',
                    description: 'Avaliação Ergonômica Preliminar (NR-17)',
                    highlights: ['Avaliações', 'Importação', 'PGR'],
                    path: '/aep',
                  }];
                }
                return displayedTools;
              })().map((tool, idx) => (
                <Card
                  key={tool.id}
                  id={tool.id}
                  className="group cursor-pointer border border-border hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 animate-fade-in"
                  style={{ animationDelay: `${idx * 100 + 200}ms` }}
                  onClick={() => navigate(tool.path)}
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
                      <tool.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tool.highlights.map((h, hIdx) => (
                        <span key={hIdx} className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                          {h}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      Acessar <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* SST Link */}
          {sstSlug && (
            <div id="sst-link" className="mb-8 flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Sua página pública</p>
                <a
                  href={`${window.location.origin}/sst/${sstSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate block"
                >
                  {window.location.origin}/sst/{sstSlug}
                </a>
              </div>
              <Button variant="outline" size="sm" onClick={(e) => copyToClipboard(`${window.location.origin}/sst/${sstSlug}`, e)} className="gap-1.5">
                <Copy className="h-4 w-4" /> Copiar
              </Button>
            </div>
          )}

          {selectedCompany ? (
            <EmbeddedDashboard companyId={selectedCompany} />
          ) : (
            <>
              {/* Companies Section */}
              <div className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{(isSmartOnly || isSmsPlan) ? 'Empresas' : 'Portal de Ouvidoria'}</h2>
                    <p className="text-muted-foreground text-sm">{isSmsPlan ? 'Clique para acessar o PGR de cada empresa' : (isSmartOnly ? 'Empresas sob sua gestão' : 'Clique para acessar o canal de ouvidoria de cada empresa')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue placeholder="Ordenar por..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alphabetical">Ordem alfabética</SelectItem>
                        <SelectItem value="newest">Últimas cadastradas</SelectItem>
                        <SelectItem value="last_activity">Últimas atividades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SSTCompanyCounter currentCount={companies.length} maxCompanies={maxCompanies} extraSlots={extraSlots} />
              </div>

              <div id="company-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((company, idx) => (
                  <Card
                    key={company.id}
                    className="overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer border border-border animate-fade-in"
                    style={{ animationDelay: `${idx * 80}ms` }}
                    onClick={() => isSmsPlan ? navigate(`/pgr/${company.id}`) : handleCompanyClick(company.slug)}
                  >
                    <div className="relative">
                      {company.newReports > 0 && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="bg-destructive text-destructive-foreground border-none shadow-lg animate-pulse">
                            {company.newReports} {company.newReports === 1 ? 'nova' : 'novas'}
                          </Badge>
                        </div>
                      )}
                      <div className="h-28 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 group-hover:from-primary/10 group-hover:to-secondary/10 transition-colors duration-500">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={`Logo ${company.name}`} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="text-3xl font-bold text-primary/30 group-hover:text-primary/50 transition-colors">
                            {company.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <CardTitle className="text-lg flex-1 min-w-0">{company.name}</CardTitle>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Gerar acesso da empresa"
                            onClick={(e) => {
                              e.stopPropagation();
                              setResetPasswordCompany(company);
                              setIsResetPasswordOpen(true);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          {hasPGRAccess && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="PGR + e-Social (BETA)"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/pgr/${company.id}`);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {aepAllowed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="AEP — Avaliação Ergonômica Preliminar (NR-17)"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/aep/${company.id}`);
                            }}
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Ferramentas disponíveis"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFeaturesCompany(company);
                              setIsFeaturesOpen(true);
                            }}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Editar empresa"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCompany(company);
                              setIsEditCompanyOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Excluir empresa"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCompany(company);
                              setIsDeleteCompanyOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2 space-y-3">
                      {!isSmsPlan && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total de denúncias:</span>
                          <span className="font-semibold text-foreground">{company.reportCount}</span>
                        </div>
                      )}

                      {!isSmsPlan && (
                        <div className="pt-2 border-t border-border space-y-2">
                          {(isSmartOnly || smartOuvidoriaIds.has(company.id)) ? (
                            <>
                              <p className="text-xs text-muted-foreground font-medium">Ouvidoria Smart</p>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`${window.location.origin}/ouvidoria-beta/${company.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-primary hover:underline flex items-center gap-1 flex-1 truncate"
                                >
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{window.location.origin}/ouvidoria-beta/{company.id.substring(0,8)}…</span>
                                </a>
                                <Button variant="ghost" size="sm" onClick={(e) => copyToClipboard(`${window.location.origin}/ouvidoria-beta/${company.id}`, e)} className="h-6 px-2">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <QRCodeDownloader url={`${window.location.origin}/ouvidoria-beta/${company.id}`} filename={`qrcode-ouvidoria-${company.slug}.png`} size="sm" className="w-full" />
                              <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); navigate(`/ouvidoria-beta/painel?company=${company.id}`); }}>
                                Abrir painel da empresa
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground font-medium">Canal de Denúncias:</p>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`${window.location.origin}/report/${company.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-primary hover:underline flex items-center gap-1 flex-1 truncate"
                                >
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{window.location.origin}/report/{company.slug}</span>
                                </a>
                                <Button variant="ghost" size="sm" onClick={(e) => copyToClipboard(`${window.location.origin}/report/${company.slug}`, e)} className="h-6 px-2">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <QRCodeDownloader url={`${window.location.origin}/report/${company.slug}`} filename={`qrcode-${company.slug}.png`} size="sm" className="w-full" />
                            </>
                          )}
                        </div>

                      )}
                    </CardContent>
                    <CardFooter className="pt-0">
                      {isSmsPlan ? (
                        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Acessar PGR
                        </Button>
                      ) : company.newReports > 0 ? (
                        <div className="w-full py-2 text-sm flex items-center justify-center text-destructive bg-destructive/10 rounded-lg font-medium">
                          <AlertCircle className="h-4 w-4 mr-1.5" />
                          Nova atividade detectada
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Ver dashboard
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}

                {filteredCompanies.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-muted rounded-full p-4 mb-4">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Nenhuma empresa encontrada</h3>
                    <p className="text-muted-foreground">Tente ajustar sua busca ou adicione uma nova empresa.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {sstManagerId && (
            <div className="mt-8">
              <TeamManagementCard accountType="sst" accountId={sstManagerId} />
            </div>
          )}
        </div>
      </main>
      <Footer />

      {sstManagerId && (
        <AddCompanyDialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen} sstManagerId={sstManagerId} onCompanyAdded={fetchCompanies} />
      )}
      <EditCompanyDialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen} company={editingCompany} onCompanyUpdated={fetchCompanies} />
      <DeleteCompanyDialog open={isDeleteCompanyOpen} onOpenChange={setIsDeleteCompanyOpen} company={deletingCompany} onCompanyDeleted={fetchCompanies} />
      <ResetPasswordDialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen} company={resetPasswordCompany} />
      <ManageFeaturesDialog open={isFeaturesOpen} onOpenChange={setIsFeaturesOpen} company={featuresCompany} />
      {shouldShowTour && <OnboardingTour steps={sstDashboardSteps} onComplete={() => completeTour()} />}
    </div>
    </SoniaChatLayout>
    <SoniaChat sstManagerId={sstManagerId} contextType="sst" />
    </SoniaChatProvider>
  );
};

export default SSTDashboard;
