import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AssessmentExportButton } from '@/components/assessments/AssessmentExportButton';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Users, AlertTriangle, TrendingUp, BarChart3, ClipboardList, Share2 } from 'lucide-react';
import ShareSectorDialog from '@/components/sector-sharing/ShareSectorDialog';
import { toast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import {
  HSEIT_QUESTIONS,
  HSEIT_CATEGORY_LABELS,
  HSEITCategory,
  calculateCategoryAverage,
  calculateOverallAverage,
  getRiskLevel,
  getHealthImpact,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  HEALTH_IMPACT_LABELS,
  HEALTH_IMPACT_COLORS,
  normalizeScore
} from '@/data/hseitQuestions';
import { ChartConfig } from '@/components/ui/chart';
import { CategoryRiskIndicators } from '@/components/hseit/CategoryRiskIndicators';
import { HSEITReportEditor } from '@/components/hseit/HSEITReportEditor';
import { loadReportDraft, PsychosocialReportDraftConfig } from '@/lib/psychosocialReportDrafts';
import OnboardingTour, { TourStep } from '@/components/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AssessmentComparison } from '@/components/psychosocial/AssessmentComparison';

const hseitResultsSteps: TourStep[] = [
  {
    targetId: 'hseit-results-summary',
    title: '📊 Resumo Geral',
    description: 'Veja a quantidade de respostas, média geral, impacto na saúde e categorias em risco de forma rápida.',
    position: 'bottom',
  },
  {
    targetId: 'hseit-results-charts',
    title: '🕸️ Gráficos de Análise',
    description: 'O gráfico radar mostra o perfil por categoria e o gráfico de pizza mostra a distribuição de riscos.',
    position: 'top',
  },
  {
    targetId: 'hseit-report-btn',
    title: '📄 Relatório PDF',
    description: 'Gere um relatório PDF completo com análise detalhada, plano de ação e recomendações personalizadas.',
    position: 'bottom',
  },
];

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  multiSectorEnabled?: boolean;
  companies: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
}

interface Answer {
  questionNumber: number;
  value: number;
}

interface Response {
  id: string;
  department: string | null;
  departments: string[];
  completedAt: string | null;
  answers: Answer[];
}

export default function HSEITResults() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, role, isLoading: authLoading } = useRealAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sectorViewDepartment, setSectorViewDepartment] = useState<string>('');
  const [sstLogoUrl, setSstLogoUrl] = useState<string | null>(null);
  const [sstName, setSstName] = useState<string | null>(null);
  const [isReportEditorOpen, setIsReportEditorOpen] = useState(false);
  const [savedDraft, setSavedDraft] = useState<PsychosocialReportDraftConfig | null>(null);
  const [editingLastVersion, setEditingLastVersion] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { shouldShowTour, completeTour } = useOnboarding('hseit-results');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (!['admin', 'sst', 'company'].includes(role || '')) {
        navigate('/dashboard');
        return;
      }
      fetchData();
    }
  }, [user, role, authLoading, id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('hseit_assessments')
        .select('id, title, description, created_at, multi_sector_enabled, companies(id, name, logo_url)')
        .eq('id', id)
        .single();

      if (assessmentError) throw assessmentError;
      
      const mappedAssessment = {
        id: assessmentData.id,
        title: assessmentData.title,
        description: assessmentData.description,
        createdAt: assessmentData.created_at,
        multiSectorEnabled: !!(assessmentData as any).multi_sector_enabled,
        companies: assessmentData.companies as unknown as { id: string; name: string; logo_url?: string | null }
      };
      setAssessment(mappedAssessment);

      // Fetch SST manager logo for this company
      if (mappedAssessment.companies?.id) {
        const { data: assignmentData } = await supabase
          .from('company_sst_assignments')
          .select('sst_manager_id')
          .eq('company_id', mappedAssessment.companies.id)
          .single();

        if (assignmentData?.sst_manager_id) {
          const { data: sstData } = await supabase
            .from('sst_managers')
            .select('name, logo_url')
            .eq('id', assignmentData.sst_manager_id)
            .single();

          if (sstData) {
            setSstName(sstData.name);
            setSstLogoUrl(sstData.logo_url);
          }
        }
      }

      // Fetch responses with answers
      const { data: responsesData, error: responsesError } = await supabase
        .from('hseit_responses')
        .select('id, department, departments, completed_at')
        .eq('assessment_id', id)
        .not('completed_at', 'is', null);

      if (responsesError) throw responsesError;

      // Fetch all answers for these responses
      const responseIds = responsesData?.map(r => r.id) || [];
      let allAnswers: { response_id: string; question_number: number; answer_value: number }[] = [];

      if (responseIds.length > 0) {
        // Fetch answers in chunks to avoid PostgREST default 1000-row cap
        // (each HSE-IT response has 35 answers, so >28 responses would truncate).
        const chunkSize = 20;
        for (let i = 0; i < responseIds.length; i += chunkSize) {
          const chunk = responseIds.slice(i, i + chunkSize);
          const { data: answersData, error: aErr } = await supabase
            .from('hseit_answers')
            .select('response_id, question_number, answer_value')
            .in('response_id', chunk)
            .range(0, 99999);
          if (aErr) throw aErr;
          if (answersData) allAnswers = allAnswers.concat(answersData);
        }
      }

      // Map responses with their answers
      const mappedResponses: Response[] = (responsesData || []).map((r: any) => {
        const deptList: string[] = Array.isArray(r.departments) && r.departments.length > 0
          ? r.departments
          : (r.department ? [r.department] : []);
        return {
          id: r.id,
          department: r.department,
          departments: deptList,
          completedAt: r.completed_at,
          answers: allAnswers
            .filter(a => a.response_id === r.id)
            .map(a => ({ questionNumber: a.question_number, value: a.answer_value })),
        };
      });

      setResponses(mappedResponses);

      // Extract unique departments (across all sector memberships)
      const depts = [...new Set(mappedResponses.flatMap(r => r.departments))];
      setDepartments(depts);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os resultados.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter responses by department (a response belongs to all sectors in its departments array)
  const filteredResponses = useMemo(() => {
    if (selectedDepartment === 'all') return responses;
    return responses.filter(r => r.departments.includes(selectedDepartment));
  }, [responses, selectedDepartment]);

  // Calculate aggregated answers for filtered responses
  const aggregatedAnswers = useMemo(() => {
    const allAnswers: Answer[] = [];
    filteredResponses.forEach(r => {
      allAnswers.push(...r.answers);
    });
    return allAnswers;
  }, [filteredResponses]);

  // Calculate category averages
  const categoryAverages = useMemo(() => {
    if (aggregatedAnswers.length === 0) return {};

    const categories: HSEITCategory[] = ['demands', 'control', 'managerSupport', 'peerSupport', 'relationships', 'role', 'change'];
    const averages: Record<string, number> = {};

    categories.forEach(category => {
      averages[category] = calculateCategoryAverage(aggregatedAnswers, category);
    });

    return averages;
  }, [aggregatedAnswers]);

  // Overall average
  const overallAverage = useMemo(() => {
    return calculateOverallAverage(aggregatedAnswers);
  }, [aggregatedAnswers]);

  // Radar chart data
  const radarData = useMemo(() => {
    return Object.entries(categoryAverages).map(([category, value]) => ({
      category: HSEIT_CATEGORY_LABELS[category as HSEITCategory],
      value: value,
      fullMark: 5
    }));
  }, [categoryAverages]);

  // Risk level distribution
  const riskDistribution = useMemo(() => {
    const distribution: Record<string, number> = {
      very_low: 0,
      low: 0,
      moderate: 0,
      high: 0,
      very_high: 0
    };

    Object.values(categoryAverages).forEach(avg => {
      const level = getRiskLevel(avg);
      distribution[level]++;
    });

    return Object.entries(distribution).map(([level, count]) => ({
      name: RISK_LEVEL_LABELS[level as keyof typeof RISK_LEVEL_LABELS],
      value: count,
      color: RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS]
    }));
  }, [categoryAverages]);

  // Health impact distribution
  const healthDistribution = useMemo(() => {
    const distribution = {
      favorable: 0,
      intermediate: 0,
      risk: 0
    };

    Object.values(categoryAverages).forEach(avg => {
      const impact = getHealthImpact(avg);
      distribution[impact]++;
    });

    return Object.entries(distribution).map(([impact, count]) => ({
      name: HEALTH_IMPACT_LABELS[impact as keyof typeof HEALTH_IMPACT_LABELS],
      value: count,
      color: HEALTH_IMPACT_COLORS[impact as keyof typeof HEALTH_IMPACT_COLORS]
    }));
  }, [categoryAverages]);

  // Question averages
  const questionAverages = useMemo(() => {
    const questionGroups: Record<number, number[]> = {};

    aggregatedAnswers.forEach(answer => {
      if (!questionGroups[answer.questionNumber]) {
        questionGroups[answer.questionNumber] = [];
      }
      questionGroups[answer.questionNumber].push(answer.value);
    });

    return HSEIT_QUESTIONS.map(q => {
      const values = questionGroups[q.number] || [];
      const rawAvg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const normalizedAvg = values.length > 0 
        ? values.reduce((sum, v) => sum + normalizeScore(v, q.isInverted), 0) / values.length 
        : 0;

      return {
        number: q.number,
        text: q.text,
        category: HSEIT_CATEGORY_LABELS[q.category],
        average: normalizedAvg,
        riskLevel: getRiskLevel(normalizedAvg),
        responseCount: values.length
      };
    }).sort((a, b) => a.average - b.average); // Sort by worst first
  }, [aggregatedAnswers]);

  // High risk count
  const highRiskCount = useMemo(() => {
    return Object.values(categoryAverages).filter(avg => {
      const level = getRiskLevel(avg);
      return level === 'high' || level === 'very_high';
    }).length;
  }, [categoryAverages]);

  const chartConfig: ChartConfig = {
    value: { label: 'Média' }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment || filteredResponses.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sem Respostas</h2>
              <p className="text-muted-foreground mb-4">
                Esta avaliação ainda não possui respostas suficientes para gerar o relatório.
              </p>
              <Button onClick={() => navigate('/hseit-dashboard')}>
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/hseit-dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Resultados HSE-IT
              </h1>
              <p className="text-muted-foreground mt-1">
                {assessment.title} - {assessment.companies?.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {departments.length > 0 && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <AssessmentExportButton
              assessmentType="hseit"
              assessmentId={assessment.id}
              assessmentTitle={assessment.title}
              companyName={assessment.companies?.name}
            />

            {(role === 'sst' || role === 'admin') && departments.length > 0 && (
              <Button variant="outline" onClick={() => setIsShareOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar setor
              </Button>
            )}

            <Button id="hseit-report-btn" onClick={() => { setEditingLastVersion(false); setIsReportEditorOpen(true); }}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Preparar Relatório PDF
            </Button>

            {savedDraft && (
              <Button variant="outline" onClick={() => { setEditingLastVersion(true); setIsReportEditorOpen(true); }}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Editar última versão
              </Button>
            )}
          </div>
        </div>

        {assessment.companies?.id && (
          <ShareSectorDialog
            open={isShareOpen}
            onOpenChange={setIsShareOpen}
            assessmentId={assessment.id}
            assessmentType="hseit"
            companyId={assessment.companies.id}
            availableDepartments={departments}
          />
        )}

        {/* Report Editor Modal */}
        <HSEITReportEditor
          open={isReportEditorOpen}
          onOpenChange={setIsReportEditorOpen}
          assessment={{
            id: assessment.id,
            title: assessment.title,
            description: assessment.description,
            companyName: assessment.companies?.name || '',
            createdAt: assessment.createdAt
          }}
          responses={filteredResponses}
          categoryAverages={Object.entries(categoryAverages).map(([category, average]) => ({
            category: category as HSEITCategory,
            average,
            label: HSEIT_CATEGORY_LABELS[category as HSEITCategory]
          }))}
          departments={departments}
          questionAverages={questionAverages.map(q => ({
            questionNumber: q.number,
            text: q.text,
            category: q.category,
            average: q.average
          }))}
          sstLogoUrl={sstLogoUrl}
          sstName={sstName}
          companyLogoUrl={assessment.companies?.logo_url || null}
          companyId={assessment.companies?.id || null}
          initialConfig={editingLastVersion ? savedDraft : null}
          onSaved={() => { if (assessment?.id) loadReportDraft('hseit', assessment.id).then(setSavedDraft); }}
        />

        {assessment.multiSectorEnabled && (
          <div className="mb-6 flex gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
            <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground mb-1">Avaliação multisetorial</p>
              <p className="text-muted-foreground">
                Esta avaliação foi configurada como multisetorial. Colaboradores que atuam em mais de um setor são contabilizados em <strong>cada setor selecionado</strong> — tanto na pontuação quanto no total de respondentes do setor — para refletir corretamente o percentual de participação em cada um.
              </p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div id="hseit-results-summary" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Respostas</p>
                  <p className="text-2xl font-bold">{filteredResponses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média Geral</p>
                  <p className="text-2xl font-bold">{overallAverage.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${HEALTH_IMPACT_COLORS[getHealthImpact(overallAverage)]}20` }}>
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: HEALTH_IMPACT_COLORS[getHealthImpact(overallAverage)] }}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Impacto Saúde</p>
                  <p className="text-2xl font-bold">
                    {HEALTH_IMPACT_LABELS[getHealthImpact(overallAverage)]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categorias em Risco</p>
                  <p className="text-2xl font-bold">{highRiskCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div id="hseit-results-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Perfil por Categoria</CardTitle>
              <CardDescription>Média das 7 dimensões HSE-IT (1-5)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Média"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Health Impact Pie */}
          <Card>
            <CardHeader>
              <CardTitle>Semáforo de Saúde</CardTitle>
              <CardDescription>Distribuição do impacto para saúde por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {healthDistribution.map((entry, index) => (
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

        {/* Category Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detalhamento por Categoria</CardTitle>
            <CardDescription>Média e nível de risco de cada dimensão</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={radarData}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {radarData.map((entry, index) => {
                      const riskLevel = getRiskLevel(entry.value);
                      return (
                        <Cell key={`cell-${index}`} fill={RISK_LEVEL_COLORS[riskLevel]} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Indicators with Recommendations */}
        <div className="mb-8">
          <CategoryRiskIndicators categoryAverages={categoryAverages} />
        </div>

        {/* Per-Department Breakdown */}
        {departments.length >= 2 && (
          <div className="mb-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Resultados por Setor
              </h2>
              <Select value={sectorViewDepartment} onValueChange={setSectorViewDepartment}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sectorViewDepartment ? (() => {
              const dept = sectorViewDepartment;
              const deptResponses = responses.filter(r => r.departments.includes(dept));
              const deptAnswers: Answer[] = [];
              deptResponses.forEach(r => deptAnswers.push(...r.answers));

              if (deptAnswers.length === 0) return (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Nenhuma resposta encontrada para este setor.
                  </CardContent>
                </Card>
              );

              const categories: HSEITCategory[] = ['demands', 'control', 'managerSupport', 'peerSupport', 'relationships', 'role', 'change'];
              const deptCategoryAverages: Record<string, number> = {};
              categories.forEach(cat => {
                deptCategoryAverages[cat] = calculateCategoryAverage(deptAnswers, cat);
              });

              const deptOverallAvg = calculateOverallAverage(deptAnswers);

              const deptRadarData = Object.entries(deptCategoryAverages).map(([cat, value]) => ({
                category: HSEIT_CATEGORY_LABELS[cat as HSEITCategory],
                value,
                fullMark: 5
              }));

              const deptHealthDist = (() => {
                const dist = { favorable: 0, intermediate: 0, risk: 0 };
                Object.values(deptCategoryAverages).forEach(avg => {
                  dist[getHealthImpact(avg)]++;
                });
                return Object.entries(dist).map(([impact, count]) => ({
                  name: HEALTH_IMPACT_LABELS[impact as keyof typeof HEALTH_IMPACT_LABELS],
                  value: count,
                  color: HEALTH_IMPACT_COLORS[impact as keyof typeof HEALTH_IMPACT_COLORS]
                }));
              })();

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                      <span>📍 {dept}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{deptResponses.length} respostas</Badge>
                        <Badge
                          style={{
                            backgroundColor: `${HEALTH_IMPACT_COLORS[getHealthImpact(deptOverallAvg)]}20`,
                            color: HEALTH_IMPACT_COLORS[getHealthImpact(deptOverallAvg)],
                            borderColor: HEALTH_IMPACT_COLORS[getHealthImpact(deptOverallAvg)]
                          }}
                          variant="outline"
                        >
                          Média: {deptOverallAvg.toFixed(2)} — {HEALTH_IMPACT_LABELS[getHealthImpact(deptOverallAvg)]}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Perfil por Categoria</h4>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={deptRadarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9 }} />
                              <Radar name="Média" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Semáforo de Saúde</h4>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={deptHealthDist}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {deptHealthDist.map((entry, i) => (
                                  <Cell key={`dept-cell-${i}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Detalhamento por Categoria</h4>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deptRadarData} layout="vertical" margin={{ left: 100 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 5]} />
                            <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {deptRadarData.map((entry, i) => (
                                <Cell key={`bar-${i}`} fill={RISK_LEVEL_COLORS[getRiskLevel(entry.value)]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <CategoryRiskIndicators categoryAverages={deptCategoryAverages} />
                  </CardContent>
                </Card>
              );
            })() : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Selecione um setor acima para visualizar os resultados detalhados.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Assessment Comparison */}
        {assessment?.companies?.id && (
          <div className="mb-8">
            <AssessmentComparison
              currentAssessmentId={assessment.id}
              companyId={assessment.companies.id}
              currentCategoryAverages={Object.entries(categoryAverages).map(([cat, avg]) => ({
                category: cat,
                label: HSEIT_CATEGORY_LABELS[cat as HSEITCategory],
                average: avg,
              }))}
              assessmentType="hseit"
              currentTitle={assessment.title}
            />
          </div>
        )}

        {/* Question Table - Top 10 Critical */}
        <Card>
          <CardHeader>
            <CardTitle>Questões Mais Críticas</CardTitle>
            <CardDescription>Top 10 questões com menor pontuação (maior risco)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Questão</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Média</TableHead>
                  <TableHead className="text-center">Nível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionAverages.slice(0, 10).map((q) => (
                  <TableRow key={q.number}>
                    <TableCell className="font-medium">{q.number}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate" title={q.text}>{q.text}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {q.average.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        style={{
                          backgroundColor: `${RISK_LEVEL_COLORS[q.riskLevel]}20`,
                          color: RISK_LEVEL_COLORS[q.riskLevel],
                          borderColor: RISK_LEVEL_COLORS[q.riskLevel]
                        }}
                        variant="outline"
                      >
                        {RISK_LEVEL_LABELS[q.riskLevel]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Footer />

      {shouldShowTour && (
        <OnboardingTour
          steps={hseitResultsSteps}
          onComplete={() => completeTour()}
        />
      )}
    </div>
  );
}
