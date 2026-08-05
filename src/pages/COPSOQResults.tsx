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
import { Loader2, ArrowLeft, Users, AlertTriangle, TrendingUp, BarChart3, FileText, Share2, ClipboardList } from 'lucide-react';
import ShareSectorDialog from '@/components/sector-sharing/ShareSectorDialog';
import { toast } from '@/hooks/use-toast';
import { COPSOQReportEditor } from '@/components/psychosocial/COPSOQReportEditor';
import { loadReportDraft, PsychosocialReportDraftConfig } from '@/lib/psychosocialReportDrafts';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  COPSOQ_QUESTIONS, COPSOQ_CATEGORY_LABELS, COPSOQCategory,
  calculateCategoryAverage, calculateOverallAverage, getRiskLevel, normalizeScore,
  RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, ALL_CATEGORIES, CATEGORY_GROUPS
} from '@/data/copsoqQuestions';
import { AssessmentComparison } from '@/components/psychosocial/AssessmentComparison';

interface Assessment { id: string; title: string; description: string | null; createdAt: string; multiSectorEnabled?: boolean; companies: { id: string; name: string; }; }
interface Answer { questionNumber: number; value: number; }
interface Response { id: string; department: string | null; departments: string[]; completedAt: string | null; answers: Answer[]; }

export default function COPSOQResults() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, role, isLoading: authLoading } = useRealAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isReportEditorOpen, setIsReportEditorOpen] = useState(false);
  const [savedDraft, setSavedDraft] = useState<PsychosocialReportDraftConfig | null>(null);
  const [editingLastVersion, setEditingLastVersion] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { navigate('/auth'); return; }
      if (!['admin', 'sst', 'company', 'sales'].includes((role as string) || '')) { navigate('/dashboard'); return; }
      fetchData();
    }
  }, [user, role, authLoading, id]);

  useEffect(() => {
    if (id) loadReportDraft('copsoq', id).then(setSavedDraft);
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: ad, error: ae } = await supabase.from('copsoq_assessments' as any).select('id, title, description, created_at, multi_sector_enabled, companies(id, name)').eq('id', id).single();
      if (ae) throw ae;
      const a = ad as any;
      setAssessment({ id: a.id, title: a.title, description: a.description, createdAt: a.created_at, multiSectorEnabled: !!a.multi_sector_enabled, companies: a.companies });

      const { data: rd, error: re } = await supabase.from('copsoq_responses' as any).select('id, department, departments, completed_at').eq('assessment_id', id).not('completed_at', 'is', null);
      if (re) throw re;
      const responseIds = (rd as any[])?.map((r: any) => r.id) || [];
      let allAnswers: any[] = [];
      if (responseIds.length > 0) {
        // Fetch in chunks to avoid PostgREST default 1000-row cap
        // (each response has ~41 answers, so >24 responses would truncate).
        const chunkSize = 20;
        for (let i = 0; i < responseIds.length; i += chunkSize) {
          const chunk = responseIds.slice(i, i + chunkSize);
          const { data: ans, error: anErr } = await supabase
            .from('copsoq_answers' as any)
            .select('response_id, question_number, answer_value')
            .in('response_id', chunk)
            .range(0, 99999);
          if (anErr) throw anErr;
          if (ans) allAnswers = allAnswers.concat(ans as any[]);
        }
      }
      const mapped: Response[] = ((rd as any[]) || []).map((r: any) => {
        const deptList: string[] = Array.isArray(r.departments) && r.departments.length > 0 ? r.departments : (r.department ? [r.department] : []);
        return {
          id: r.id, department: r.department, departments: deptList, completedAt: r.completed_at,
          answers: allAnswers.filter((a: any) => a.response_id === r.id).map((a: any) => ({ questionNumber: a.question_number, value: a.answer_value }))
        };
      });
      setResponses(mapped);
      setDepartments([...new Set(mapped.flatMap(r => r.departments))]);
    } catch (e) { console.error(e); toast({ title: 'Erro ao carregar dados', variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  const filteredResponses = useMemo(() => selectedDepartment === 'all' ? responses : responses.filter(r => r.departments.includes(selectedDepartment)), [responses, selectedDepartment]);
  const aggregatedAnswers = useMemo(() => filteredResponses.flatMap(r => r.answers), [filteredResponses]);

  const categoryAverages = useMemo(() => {
    if (aggregatedAnswers.length === 0) return {};
    const avgs: Record<string, number> = {};
    ALL_CATEGORIES.forEach(cat => { avgs[cat] = calculateCategoryAverage(aggregatedAnswers, cat); });
    return avgs;
  }, [aggregatedAnswers]);

  const overallAverage = useMemo(() => calculateOverallAverage(aggregatedAnswers), [aggregatedAnswers]);
  const overallRisk = getRiskLevel(overallAverage);

  const radarData = useMemo(() => {
    // Select key categories for radar (max ~10 for readability)
    const keyCats: COPSOQCategory[] = ['quantitativeDemands', 'workPace', 'emotionalDemands', 'influence', 'developmentPossibilities', 'leadershipQuality', 'socialSupport', 'socialCommunity', 'burnout', 'stress'];
    return keyCats.map(cat => ({ category: COPSOQ_CATEGORY_LABELS[cat].replace(/\s+/g, '\n').substring(0, 20), value: categoryAverages[cat] || 0, fullMark: 5 }));
  }, [categoryAverages]);

  const riskDistribution = useMemo(() => {
    const dist = { favorable: 0, intermediate: 0, risk: 0 };
    Object.values(categoryAverages).forEach(avg => { dist[getRiskLevel(avg)]++; });
    return [
      { name: 'Favorável', value: dist.favorable, color: '#22c55e' },
      { name: 'Intermediário', value: dist.intermediate, color: '#eab308' },
      { name: 'Risco', value: dist.risk, color: '#ef4444' },
    ];
  }, [categoryAverages]);

  const riskCount = useMemo(() => Object.values(categoryAverages).filter(avg => getRiskLevel(avg) === 'risk').length, [categoryAverages]);

  const questionAverages = useMemo(() => {
    const groups: Record<number, number[]> = {};
    aggregatedAnswers.forEach(a => { if (!groups[a.questionNumber]) groups[a.questionNumber] = []; groups[a.questionNumber].push(a.value); });
    return COPSOQ_QUESTIONS.map(q => {
      const values = groups[q.number] || [];
      const normalizedAvg = values.length > 0 ? values.reduce((s, v) => s + normalizeScore(v, q.isInverted), 0) / values.length : 0;
      return { number: q.number, text: q.text, category: COPSOQ_CATEGORY_LABELS[q.category], average: normalizedAvg, riskLevel: getRiskLevel(normalizedAvg), responseCount: values.length };
    }).sort((a, b) => a.average - b.average);
  }, [aggregatedAnswers]);

  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!assessment || filteredResponses.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto"><CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sem Respostas</h2>
            <p className="text-muted-foreground mb-4">Esta avaliação ainda não possui respostas.</p>
            <Button onClick={() => navigate('/psychosocial-dashboard')}>Voltar ao Dashboard</Button>
          </CardContent></Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/psychosocial-dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><BarChart3 className="h-8 w-8 text-primary" />Resultados COPSOQ II</h1>
              <p className="text-muted-foreground mt-1">{assessment.title} - {assessment.companies?.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {departments.length > 0 && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <AssessmentExportButton
              assessmentType="copsoq"
              assessmentId={assessment.id}
              assessmentTitle={assessment.title}
              companyName={assessment.companies?.name}
            />
            {(role === 'sst' || role === 'admin') && departments.length > 0 && assessment.companies?.id && (
              <Button variant="outline" onClick={() => setIsShareOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar setor
              </Button>
            )}
            <Button onClick={() => { setEditingLastVersion(false); setIsReportEditorOpen(true); }} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-2" />}
              Gerar Relatório PDF
            </Button>
            {savedDraft && (
              <Button variant="outline" onClick={() => { setEditingLastVersion(true); setIsReportEditorOpen(true); }}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Editar última versão
              </Button>
            )}
          </div>
        </div>

        <COPSOQReportEditor
          open={isReportEditorOpen}
          onOpenChange={setIsReportEditorOpen}
          assessment={{
            id: assessment.id,
            title: assessment.title,
            description: assessment.description,
            createdAt: assessment.createdAt,
          }}
          companyName={assessment.companies?.name || ''}
          companyId={assessment.companies?.id || null}
          responses={responses}
          departments={departments}
          selectedDepartment={selectedDepartment}
          categoryAverages={categoryAverages}
          initialConfig={editingLastVersion ? savedDraft : null}
          onSaved={() => { if (id) loadReportDraft('copsoq', id).then(setSavedDraft); }}
        />


        {assessment.companies?.id && (
          <ShareSectorDialog
            open={isShareOpen}
            onOpenChange={setIsShareOpen}
            assessmentId={assessment.id}
            assessmentType="copsoq"
            companyId={assessment.companies.id}
            availableDepartments={departments}
          />
        )}

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-primary/10 rounded-lg"><Users className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Respostas</p><p className="text-2xl font-bold">{filteredResponses.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-500/10 rounded-lg"><TrendingUp className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Média Geral</p><p className="text-2xl font-bold">{overallAverage.toFixed(2)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 rounded-lg" style={{ backgroundColor: `${RISK_LEVEL_COLORS[overallRisk]}20` }}><div className="h-6 w-6 rounded-full" style={{ backgroundColor: RISK_LEVEL_COLORS[overallRisk] }} /></div><div><p className="text-sm text-muted-foreground">Classificação</p><p className="text-2xl font-bold">{RISK_LEVEL_LABELS[overallRisk]}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-red-500/10 rounded-lg"><AlertTriangle className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Dimensões em Risco</p><p className="text-2xl font-bold">{riskCount}</p></div></div></CardContent></Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Perfil por Dimensão</CardTitle><CardDescription>Principais dimensões COPSOQ II (1-5)</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Radar name="Média" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Distribuição de Risco</CardTitle><CardDescription>Classificação das 23 dimensões</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Details by Group */}
        {Object.entries(CATEGORY_GROUPS).map(([groupName, cats]) => (
          <Card key={groupName} className="mb-6">
            <CardHeader><CardTitle>{groupName}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cats.map(cat => {
                  const avg = categoryAverages[cat] || 0;
                  const risk = getRiskLevel(avg);
                  return (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{COPSOQ_CATEGORY_LABELS[cat]}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{avg.toFixed(2)}</span>
                        <Badge style={{ backgroundColor: `${RISK_LEVEL_COLORS[risk]}20`, color: RISK_LEVEL_COLORS[risk], borderColor: RISK_LEVEL_COLORS[risk] }} variant="outline">
                          {RISK_LEVEL_LABELS[risk]}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Assessment Comparison */}
        {assessment?.companies?.id && (
          <div className="mb-6">
            <AssessmentComparison
              currentAssessmentId={assessment.id}
              companyId={assessment.companies.id}
              currentCategoryAverages={Object.entries(categoryAverages).map(([cat, avg]) => ({
                category: cat,
                label: COPSOQ_CATEGORY_LABELS[cat as COPSOQCategory],
                average: avg,
              }))}
              assessmentType="copsoq"
              currentTitle={assessment.title}
            />
          </div>
        )}
        {/* Top 10 Critical Questions */}
        <Card>
          <CardHeader><CardTitle>Questões Mais Críticas</CardTitle><CardDescription>Top 10 questões com menor pontuação</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Questão</TableHead><TableHead>Dimensão</TableHead><TableHead className="text-center">Média</TableHead><TableHead className="text-center">Nível</TableHead></TableRow></TableHeader>
              <TableBody>
                {questionAverages.slice(0, 10).map(q => (
                  <TableRow key={q.number}>
                    <TableCell className="font-medium">{q.number}</TableCell>
                    <TableCell className="max-w-md"><p className="truncate" title={q.text}>{q.text}</p></TableCell>
                    <TableCell><Badge variant="outline">{q.category}</Badge></TableCell>
                    <TableCell className="text-center font-medium">{q.average.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge style={{ backgroundColor: `${RISK_LEVEL_COLORS[q.riskLevel]}20`, color: RISK_LEVEL_COLORS[q.riskLevel], borderColor: RISK_LEVEL_COLORS[q.riskLevel] }} variant="outline">{RISK_LEVEL_LABELS[q.riskLevel]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
