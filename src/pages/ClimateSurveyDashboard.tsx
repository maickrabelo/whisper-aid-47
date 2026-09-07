import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AssessmentExportButton } from '@/components/assessments/AssessmentExportButton';
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Loader2,
  ClipboardList,
  Users,
  TrendingUp,
  Star,
  Plus,
  Calendar,
  Settings,
  Copy,
  Link as LinkIcon,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Trash2,
  Search,
  Layers,
  Building2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { ClimateSurveyExportButton } from "@/components/climate-survey/ClimateSurveyExportButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AIInsightsCard } from "@/components/climate-survey/AIInsightsCard";
import { QRCodeDownloader } from "@/components/QRCodeDownloader";
import OnboardingTour, { TourStep } from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import SoniaChat from "@/components/SoniaChat";
import { SoniaChatProvider, SoniaChatLayout } from '@/contexts/SoniaChatContext';
import PrintQuestionnaireButton from "@/components/PrintQuestionnaireButton";
import {
  computeClimateStats,
  averageLikert,
  fetchAllRows,
  NO_DEPARTMENT_LABEL,
  type ClimateResponse,
  type ClimateStats,
} from "@/lib/climateSurveyStats";
import { useCompanyEmployeeCount } from "@/hooks/useCompanyEmployeeCount";

const climateSteps: TourStep[] = [
  {
    targetId: 'climate-new-btn',
    title: '➕ Nova Pesquisa',
    description: 'Crie pesquisas de clima personalizadas com perguntas Likert, NPS e abertas.',
    position: 'bottom',
  },
  {
    targetId: 'climate-survey-selector',
    title: '📋 Seletor de Pesquisa',
    description: 'Selecione uma pesquisa para visualizar seus resultados detalhados.',
    position: 'bottom',
  },
  {
    targetId: 'climate-share-link',
    title: '🔗 Link de Compartilhamento',
    description: 'Copie o link ou baixe o QR Code para distribuir a pesquisa aos colaboradores.',
    position: 'bottom',
  },
];

interface Survey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  company_id: string;
  companies?: { name: string; slug?: string };
}

type SurveyStats = ClimateStats;
type FullResponse = ClimateResponse;

const COLORS = ['#ef4444', '#f59e0b', '#22c55e'];

export default function ClimateSurveyDashboard() {
  const { role, profile, user, isLoading: authLoading } = useRealAuth();
  const isDemoIlimitado = user?.email === 'demo.ilimitado@soia.app.br';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shouldShowTour, completeTour } = useOnboarding('climate-dashboard');

  const [isLoading, setIsLoading] = useState(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [allResponses, setAllResponses] = useState<FullResponse[]>([]);
  const [showResponses, setShowResponses] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [responseSearch, setResponseSearch] = useState('');
  const [responseSort, setResponseSort] = useState<'date_desc' | 'date_asc' | 'department'>('date_desc');
  const [groupByDepartment, setGroupByDepartment] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!role || role === 'pending') {
        navigate('/pending-approval');
        return;
      }
      fetchData();
    }
  }, [authLoading, role]);

  useEffect(() => {
    if (selectedSurvey) {
      setSelectedDepartment('all');
      setExpandedItems([]);
      fetchSurveyStats(selectedSurvey);
    }
  }, [selectedSurvey]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch companies for admin filter
      if (role === 'admin') {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');
        setCompanies(companiesData || []);
      }

      // For SST users, get assigned company IDs first
      let assignedCompanyIds: string[] = [];
      if (role === 'sst' && profile?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('sst_manager_id')
          .eq('id', profile.id)
          .single();
        
        if (profileData?.sst_manager_id) {
          const { data: assignments } = await supabase
            .from('company_sst_assignments')
            .select('company_id')
            .eq('sst_manager_id', profileData.sst_manager_id);
          
          assignedCompanyIds = assignments?.map(a => a.company_id) || [];
          
          // Also fetch companies for SST filter dropdown
          if (assignedCompanyIds.length > 0) {
            const { data: companiesData } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', assignedCompanyIds)
              .order('name');
            setCompanies(companiesData || []);
          }
        }
      }

      // Fetch surveys based on role
      let surveysData: Survey[] = [];
      
      if (role === 'company' && profile?.company_id) {
        const { data, error } = await supabase
          .from('climate_surveys')
          .select('*, companies(name, slug)')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        surveysData = data || [];
      } else if (role === 'sst' && assignedCompanyIds.length > 0) {
        const { data, error } = await supabase
          .from('climate_surveys')
          .select('*, companies(name, slug)')
          .in('company_id', assignedCompanyIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        surveysData = data || [];
      } else if (role === 'admin') {
        const { data, error } = await supabase
          .from('climate_surveys')
          .select('*, companies(name, slug)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        surveysData = data || [];
      }

      setSurveys(surveysData);
      if (surveysData.length > 0) {
        setSelectedSurvey(surveysData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSurveyStats = async (surveyId: string) => {
    setIsLoadingStats(true);
    try {
      // Respostas (paginadas — o serviço devolve no máximo 1.000 linhas por consulta)
      const responses = await fetchAllRows<any>((from, to) =>
        supabase
          .from('survey_responses')
          .select('*')
          .eq('survey_id', surveyId)
          .order('completed_at', { ascending: true })
          .range(from, to) as any,
      );

      const { data: questions, error: questionsError } = await supabase
        .from('survey_questions')
        .select('id, question_text, question_type, category')
        .eq('survey_id', surveyId);
      if (questionsError) throw questionsError;
      const questionMap = new Map(questions?.map(q => [q.id, q]) || []);

      // Respostas do questionário: buscadas em lotes de response_id, cada lote paginado
      const responseIds = responses.map(r => r.id);
      const answersData: any[] = [];
      const BATCH = 100;
      for (let i = 0; i < responseIds.length; i += BATCH) {
        const ids = responseIds.slice(i, i + BATCH);
        const rows = await fetchAllRows<any>((from, to) =>
          supabase
            .from('survey_answers')
            .select('*')
            .in('response_id', ids)
            .range(from, to) as any,
        );
        answersData.push(...rows);
      }

      const answersByResponse = new Map<string, any[]>();
      answersData.forEach(a => {
        const list = answersByResponse.get(a.response_id);
        if (list) list.push(a);
        else answersByResponse.set(a.response_id, [a]);
      });

      const fullResponsesData: FullResponse[] = responses.map(resp => ({
        id: resp.id,
        department: resp.department,
        completed_at: resp.completed_at,
        demographics: resp.demographics,
        answers: (answersByResponse.get(resp.id) || []).map(a => {
          const q = questionMap.get(a.question_id);
          return {
            question_text: q?.question_text || 'Pergunta não encontrada',
            question_type: q?.question_type || 'unknown',
            category: q?.category || null,
            answer_value: a.answer_value,
            answer_text: a.answer_text,
          };
        }),
      }));

      setAllResponses(fullResponsesData);
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      toast({ title: 'Erro ao carregar respostas', variant: 'destructive' });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const deptOf = (r: FullResponse) => r.department?.trim() || NO_DEPARTMENT_LABEL;

  /** Estatísticas do conjunto completo (usadas no gráfico de participação). */
  const overallStats = useMemo(() => computeClimateStats(allResponses), [allResponses]);

  const departments = useMemo(
    () => overallStats.departmentDistribution.map(d => d.name),
    [overallStats],
  );

  const filteredResponses = useMemo(
    () => selectedDepartment === 'all'
      ? allResponses
      : allResponses.filter(r => deptOf(r) === selectedDepartment),
    [allResponses, selectedDepartment],
  );

  const stats: SurveyStats | null = useMemo(
    () => (allResponses.length === 0 && isLoadingStats ? null : computeClimateStats(filteredResponses)),
    [filteredResponses, allResponses.length, isLoadingStats],
  );

  /** Indicadores por setor — usados no Excel por setor. */
  const perDepartmentStats = useMemo(
    () => departments.map(name => ({
      department: name,
      stats: computeClimateStats(allResponses.filter(r => deptOf(r) === name)),
    })),
    [departments, allResponses],
  );

  /** Lista da seção "Respostas Completas": filtro de texto + ordenação. */
  const listedResponses = useMemo(() => {
    const term = responseSearch.trim().toLowerCase();
    const list = filteredResponses.filter(r => {
      if (!term) return true;
      const demo = r.demographics || {};
      const haystack = [deptOf(r), demo.role, demo.gender, demo.ageRange, demo.tenure, demo.education]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (responseSort === 'department') {
        return deptOf(a).localeCompare(deptOf(b), 'pt-BR')
          || (b.completed_at || '').localeCompare(a.completed_at || '');
      }
      const cmp = (a.completed_at || '').localeCompare(b.completed_at || '');
      return responseSort === 'date_asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredResponses, responseSearch, responseSort]);

  const groupedResponses = useMemo(() => {
    const map = new Map<string, FullResponse[]>();
    listedResponses.forEach(r => {
      const key = deptOf(r);
      const list = map.get(key);
      if (list) list.push(r); else map.set(key, [r]);
    });
    return Array.from(map.entries())
      .map(([department, items]) => ({ department, items, average: averageLikert(items) }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [listedResponses]);

  const toggleExpandAll = () => {
    setExpandedItems(prev => (prev.length > 0 ? [] : listedResponses.map(r => r.id)));
  };

  const selectedSurveyCompanyId = surveys.find(s => s.id === selectedSurvey)?.company_id || null;
  const { employeeCount } = useCompanyEmployeeCount(selectedSurveyCompanyId);
  const participationRate = employeeCount > 0
    ? Math.min(100, Math.round(((stats?.totalResponses || 0) / employeeCount) * 100))
    : null;

  const departmentLabel = selectedDepartment === 'all' ? null : selectedDepartment;

  const handleCreateSurvey = () => {
    navigate('/climate-survey/new');
  };

  const getSelectedSurvey = () => surveys.find(s => s.id === selectedSurvey);

  const getSurveyUrl = (survey: Survey) => {
    if (!survey.companies?.slug) return '';
    return `${PUBLIC_BASE_URL}/pesquisa/${survey.companies.slug}/${survey.id}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Link copiado!" });
  };

  const handleDeleteSurvey = async () => {
    const survey = getSelectedSurvey();
    if (!survey) return;
    if (!window.confirm(`Excluir a pesquisa "${survey.title}"? Todas as respostas serão removidas. Esta ação é irreversível.`)) return;
    try {
      const { error } = await supabase.from('climate_surveys').delete().eq('id', survey.id);
      if (error) throw error;
      toast({ title: 'Pesquisa excluída', description: 'A pesquisa foi removida com sucesso.' });
      const remaining = surveys.filter(s => s.id !== survey.id);
      setSurveys(remaining);
      setSelectedSurvey(remaining[0]?.id || '');
    } catch (error: any) {
      console.error('Error deleting survey:', error);
      toast({ title: 'Erro ao excluir', description: error.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  // Mock open responses for AI analysis demo
  const getMockOpenResponses = () => {
    return [
      {
        question: "O que você mais gosta na empresa?",
        answers: [
          "O ambiente de trabalho é muito bom",
          "Equipe colaborativa e unida",
          "Oportunidades de crescimento",
          "Flexibilidade de horário",
          "Benefícios oferecidos"
        ]
      },
      {
        question: "O que poderia melhorar?",
        answers: [
          "Comunicação entre departamentos",
          "Processos internos mais claros",
          "Mais treinamentos",
          "Infraestrutura do escritório",
          "Feedback mais frequente"
        ]
      }
    ];
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const r = role as string;
  const backPath = r === 'sales' ? '/sales-dashboard' : r === 'company' ? '/dashboard' : '/sst-dashboard';

  return (
    <SoniaChatProvider>
    <SoniaChatLayout>
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary py-10 md:py-14">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="container mx-auto px-4 relative z-10">
            <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="mb-4 gap-2 text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-4">
                  <ClipboardList className="h-4 w-4" />
                  <span>Pesquisa de Clima</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Pesquisa de Clima</h1>
                <p className="text-white/70 mt-1">Dashboard de resultados</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {getSelectedSurvey() && getSurveyUrl(getSelectedSurvey()!) && (
                  <QRCodeDownloader
                    url={getSurveyUrl(getSelectedSurvey()!)}
                    filename={`qrcode-pesquisa-${getSelectedSurvey()?.companies?.slug || 'clima'}.png`}
                    variant="outline"
                    size="default"
                  />
                )}
                <PrintQuestionnaireButton variant="climate" buttonClassName="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm" />
                {['admin', 'sst', 'company'].includes(role || '') && (
                  <Button id="climate-new-btn" onClick={handleCreateSurvey} className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                    <Plus className="h-4 w-4" /> Nova Pesquisa
                  </Button>
                )}
                {['admin', 'sst', 'company'].includes(role || '') && getSelectedSurvey() && (
                  <Button onClick={handleDeleteSurvey} variant="outline" className="gap-2 bg-destructive/20 border-destructive/40 text-white hover:bg-destructive/40 backdrop-blur-sm">
                    <Trash2 className="h-4 w-4" /> Excluir Pesquisa
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          {/* Filters row */}
          <div className="flex flex-wrap gap-3 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {['admin', 'sst'].includes(role || '') && companies.length > 0 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas empresas</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {departments.length > 0 && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores ({allResponses.length})</SelectItem>
                  {overallStats.departmentDistribution.map(d => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name} ({d.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {surveys.length > 0 && (
              <div id="climate-survey-selector">
                <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Selecione uma pesquisa" />
                  </SelectTrigger>
                  <SelectContent>
                    {surveys.map(survey => (
                      <SelectItem key={survey.id} value={survey.id}>
                        {survey.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

        {surveys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma pesquisa encontrada</h2>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira pesquisa de clima organizacional
              </p>
              {['admin', 'sst', 'company'].includes(role || '') && (
                <Button onClick={handleCreateSurvey}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pesquisa
                </Button>
              )}
            </CardContent>
          </Card>
        ) : stats && (
          <>
            {/* Share Link Card */}
            {getSelectedSurvey() && getSurveyUrl(getSelectedSurvey()!) && (
              <Card id="climate-share-link" className="mb-6">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <LinkIcon className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 w-full">
                      <p className="text-sm font-medium mb-1">Link de compartilhamento</p>
                      <div className="flex gap-2">
                        <Input
                          value={getSurveyUrl(getSelectedSurvey()!)}
                          readOnly
                          className="bg-muted text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(getSurveyUrl(getSelectedSurvey()!))}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <QRCodeDownloader
                      url={getSurveyUrl(getSelectedSurvey()!)}
                      filename={`qrcode-pesquisa-${getSelectedSurvey()?.companies?.slug || 'clima'}.png`}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {departmentLabel && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Indicadores filtrados pelo setor <strong>{departmentLabel}</strong> —{' '}
                  {stats.totalResponses} de {allResponses.length} respostas.
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDepartment('all')}>
                  Limpar filtro
                </Button>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Respostas</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalResponses}</p>
                    </div>
                    <Users className="h-10 w-10 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">NPS</p>
                      <p className={`text-3xl font-bold ${
                        stats.npsScore >= 50 ? 'text-green-600' :
                        stats.npsScore >= 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {stats.npsScore}
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Média Geral</p>
                      <p className="text-3xl font-bold text-foreground">{stats.avgScore.toFixed(1)}</p>
                    </div>
                    <Star className="h-10 w-10 text-primary/20" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">de 5.0</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa Participação</p>
                      <p className="text-3xl font-bold text-foreground">
                        {participationRate !== null ? `${participationRate}%` : stats.totalResponses}
                      </p>
                    </div>
                    <Calendar className="h-10 w-10 text-primary/20" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {participationRate !== null
                      ? `de ${employeeCount} colaboradores`
                      : 'informe o nº de colaboradores da empresa'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Radar Chart - Category Scores */}
              <Card>
                <CardHeader>
                  <CardTitle>Scores por Categoria</CardTitle>
                  <CardDescription>Média das avaliações em cada dimensão GPTW</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={stats.categoryScores}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.5}
                        />
                        <Tooltip formatter={(value: number) => value.toFixed(2)} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* NPS Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição NPS</CardTitle>
                  <CardDescription>Detratores, Neutros e Promotores</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.npsDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${value}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.npsDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-6">
              {/* Department Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Participação por Departamento</CardTitle>
                  <CardDescription>
                    Número de respostas por área (todos os setores{departmentLabel ? `, destaque: ${departmentLabel}` : ''})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overallStats.departmentDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {overallStats.departmentDistribution.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={
                                departmentLabel && entry.name !== departmentLabel
                                  ? 'hsl(var(--muted-foreground))'
                                  : 'hsl(var(--primary))'
                              }
                              opacity={departmentLabel && entry.name !== departmentLabel ? 0.35 : 1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Complete Responses Section */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Respostas Completas
                    </CardTitle>
                    <CardDescription>
                      Visualize cada resposta individual na íntegra
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowResponses(!showResponses)}
                  >
                    {showResponses ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Ver {fullResponses.length} respostas
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {showResponses && (
                <CardContent>
                  {fullResponses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma resposta ainda.
                    </p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {fullResponses.map((resp, index) => (
                        <AccordionItem key={resp.id} value={resp.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <Badge variant="secondary" className="shrink-0">
                                #{index + 1}
                              </Badge>
                              <span className="text-sm">
                                {resp.department || 'Setor não informado'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {resp.completed_at 
                                  ? new Date(resp.completed_at).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Data não informada'}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {/* Demographics */}
                              {resp.demographics && Object.keys(resp.demographics).length > 0 && (
                                <div className="bg-muted/50 rounded-lg p-4">
                                  <h4 className="font-medium text-sm mb-2">Dados Demográficos</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                    {resp.demographics.gender && (
                                      <div>
                                        <span className="text-muted-foreground">Gênero: </span>
                                        {resp.demographics.gender}
                                      </div>
                                    )}
                                    {resp.demographics.ageRange && (
                                      <div>
                                        <span className="text-muted-foreground">Idade: </span>
                                        {resp.demographics.ageRange}
                                      </div>
                                    )}
                                    {resp.demographics.tenure && (
                                      <div>
                                        <span className="text-muted-foreground">Tempo: </span>
                                        {resp.demographics.tenure}
                                      </div>
                                    )}
                                    {resp.demographics.education && (
                                      <div>
                                        <span className="text-muted-foreground">Escolaridade: </span>
                                        {resp.demographics.education}
                                      </div>
                                    )}
                                    {resp.demographics.role && (
                                      <div>
                                        <span className="text-muted-foreground">Cargo: </span>
                                        {resp.demographics.role}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Answers */}
                              <div className="space-y-3">
                                {resp.answers.map((answer, ansIndex) => (
                                  <div 
                                    key={ansIndex} 
                                    className="border-l-2 border-primary/30 pl-4"
                                  >
                                    <p className="text-sm font-medium text-foreground mb-1">
                                      {answer.question_text}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      {answer.question_type === 'likert' && answer.answer_value && (
                                        <Badge 
                                          variant={
                                            parseInt(answer.answer_value) >= 4 
                                              ? 'default' 
                                              : parseInt(answer.answer_value) >= 3 
                                                ? 'secondary' 
                                                : 'destructive'
                                          }
                                        >
                                          {answer.answer_value}/5
                                        </Badge>
                                      )}
                                      {answer.question_type === 'scale_0_10' && answer.answer_value && (
                                        <Badge 
                                          variant={
                                            parseInt(answer.answer_value) >= 9 
                                              ? 'default' 
                                              : parseInt(answer.answer_value) >= 7 
                                                ? 'secondary' 
                                                : 'destructive'
                                          }
                                        >
                                          NPS: {answer.answer_value}
                                        </Badge>
                                      )}
                                      {answer.question_type === 'open_text' && answer.answer_text && (
                                        <p className="text-sm text-muted-foreground italic">
                                          "{answer.answer_text}"
                                        </p>
                                      )}
                                      {!answer.answer_value && !answer.answer_text && (
                                        <span className="text-xs text-muted-foreground">
                                          Não respondido
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              )}
            </Card>

            {/* AI Insights Card */}
            {!isDemoIlimitado && (
              <AIInsightsCard 
                surveyId={selectedSurvey} 
                openResponses={getMockOpenResponses()}
              />
            )}

            {/* Export Buttons */}
            <div className="flex justify-end mt-6 gap-3 flex-wrap">
              <AssessmentExportButton
                assessmentType="climate"
                assessmentId={selectedSurvey}
                assessmentTitle={getSelectedSurvey()?.title || 'Pesquisa de Clima'}
                companyName={getSelectedSurvey()?.companies?.name}
              />
              <ClimateSurveyExportButton
                surveyTitle={getSelectedSurvey()?.title || 'Pesquisa de Clima'}
                companyName={getSelectedSurvey()?.companies?.name}
                stats={stats}
              />
            </div>
          </>
        )}
        </div>
      </main>

      <Footer />

      {shouldShowTour && (
        <OnboardingTour
          steps={climateSteps}
          onComplete={() => completeTour()}
        />
      )}
    </div>
    </SoniaChatLayout>
    <SoniaChat contextType="climate" />
    </SoniaChatProvider>
  );
}
