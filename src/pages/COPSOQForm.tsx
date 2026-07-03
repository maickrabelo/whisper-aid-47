import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, FileText, Building2, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { COPSOQ_QUESTIONS_SORTED, COPSOQ_SCALES, COPSOQ_CATEGORY_LABELS, type COPSOQQuestion } from '@/data/copsoqQuestions';
import SoniaFormChat from '@/components/sonia/SoniaFormChat';


interface Assessment {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  multi_sector_enabled?: boolean | null;
  companies: { name: string; logo_url: string | null; };
}

interface Department { id: string; name: string; }

const QuestionCard = memo(({ question, selectedValue, onAnswer }: {
  question: COPSOQQuestion;
  selectedValue: number | undefined;
  onAnswer: (questionNumber: number, value: number) => void;
}) => {
  const options = COPSOQ_SCALES[question.scaleType];
  return (
    <Card className={selectedValue !== undefined ? 'border-primary/30' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">{question.number}</span>
          <div className="flex-1">
            <p className="text-foreground font-medium mb-1">{question.text}</p>
            <p className="text-xs text-muted-foreground">Dimensão: {COPSOQ_CATEGORY_LABELS[question.category]}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          {options.map(option => {
            const isSelected = selectedValue === option.value;
            return (
              <button key={option.value} type="button" onClick={() => onAnswer(question.number, option.value)}
                className={`flex items-center justify-center px-4 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                  ${isSelected ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:border-primary/50 hover:bg-muted'}`}>
                {option.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
QuestionCard.displayName = 'COPSOQQuestionCard';

export default function COPSOQForm() {
  const { companySlug, assessmentId } = useParams();
  const topRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDepartmentError, setShowDepartmentError] = useState(false);

  const questionsPerPage = 7;
  const totalPages = Math.ceil(COPSOQ_QUESTIONS_SORTED.length / questionsPerPage);
  const currentQuestions = useMemo(() => COPSOQ_QUESTIONS_SORTED.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage), [currentPage]);

  useEffect(() => { fetchAssessment(); }, [companySlug, assessmentId]);

  const fetchAssessment = async () => {
    try {
      setIsLoading(true); setError(null);
      const { data: a, error: e } = await supabase.from('copsoq_assessments' as any).select('*').eq('id', assessmentId).maybeSingle();
      if (e) throw e;
      if (!a) { setError('Avaliação não encontrada'); return; }
      if (!(a as any).is_active) { setError('Esta avaliação não está mais disponível'); return; }
      const { data: companyData } = await supabase.from('companies_public' as any).select('name, logo_url').eq('id', (a as any).company_id).maybeSingle();
      setAssessment({ ...(a as any), companies: (companyData as any) ?? null } as unknown as Assessment);
      const { data: depts } = await supabase.from('copsoq_departments' as any).select('id, name').eq('assessment_id', assessmentId).order('order_index');
      setDepartments((depts as any[]) || []);
    } catch (e) { console.error(e); setError('Erro ao carregar a avaliação'); }
    finally { setIsLoading(false); }
  };

  const handleAnswer = useCallback((qn: number, v: number) => setAnswers(prev => ({ ...prev, [qn]: v })), []);
  const getProgress = () => (Object.keys(answers).length / COPSOQ_QUESTIONS_SORTED.length) * 100;
  const isMultiSector = !!assessment?.multi_sector_enabled;
  const hasSectorSelection = isMultiSector ? selectedDepartments.length > 0 : !!selectedDepartment;

  const canGoNext = () => {
    if (currentPage === 0 && departments.length > 0 && !hasSectorSelection) return false;
    return currentQuestions.every(q => answers[q.number] !== undefined);
  };
  const scrollToTop = useCallback(() => { topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  const handleNext = () => {
    if (currentPage === 0 && departments.length > 0 && !hasSectorSelection) {
      setShowDepartmentError(true);
      toast({ title: 'Setor obrigatório', description: isMultiSector ? 'Selecione pelo menos um setor.' : 'Selecione o setor em que você trabalha.', variant: 'destructive' });
      return;
    }
    if (!canGoNext()) { toast({ title: 'Questões obrigatórias', description: 'Responda todas antes de avançar.', variant: 'destructive' }); return; }
    if (currentPage < totalPages - 1) { setCurrentPage(p => p + 1); setTimeout(scrollToTop, 50); }
  };
  const handlePrev = () => { if (currentPage > 0) { setCurrentPage(p => p - 1); setTimeout(scrollToTop, 50); } };

  const buildResponsePayload = () => {
    const finalDepartments = isMultiSector ? selectedDepartments : (selectedDepartment ? [selectedDepartment] : []);
    return {
      assessment_id: assessment!.id,
      department: finalDepartments[0] || null,
      departments: finalDepartments.length > 0 ? finalDepartments : null,
      respondent_token: crypto.randomUUID(),
      demographics: {},
      completed_at: new Date().toISOString(),
    };
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    if (departments.length > 0 && !hasSectorSelection) { toast({ title: 'Setor obrigatório', variant: 'destructive' }); return; }
    const unanswered = COPSOQ_QUESTIONS_SORTED.filter(q => answers[q.number] === undefined);
    if (unanswered.length > 0) { toast({ title: 'Questões não respondidas', description: `Faltam ${unanswered.length} questão(ões).`, variant: 'destructive' }); return; }
    try {
      setIsSubmitting(true);
      const { data: response, error: re } = await supabase.from('copsoq_responses' as any).insert(buildResponsePayload()).select('id').single();
      if (re) throw re;
      const answersData = Object.entries(answers).map(([qn, v]) => ({ response_id: (response as any).id, question_number: parseInt(qn), answer_value: v }));
      const { error: ae } = await supabase.from('copsoq_answers' as any).insert(answersData);
      if (ae) throw ae;
      setIsCompleted(true);
    } catch (e) { console.error(e); toast({ title: 'Erro ao enviar', description: 'Tente novamente.', variant: 'destructive' }); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-background p-4"><Card className="max-w-md w-full"><CardContent className="pt-6 text-center"><AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" /><h2 className="text-xl font-semibold mb-2">Avaliação Indisponível</h2><p className="text-muted-foreground">{error}</p></CardContent></Card></div>;
  if (isCompleted) return <div className="min-h-screen flex items-center justify-center bg-background p-4"><Card className="max-w-md w-full"><CardContent className="pt-6 text-center"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8 text-green-600" /></div><h2 className="text-2xl font-bold text-foreground mb-2">Obrigado!</h2><p className="text-muted-foreground mb-4">Sua avaliação foi enviada com sucesso. Suas respostas são anônimas.</p><div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Você pode fechar esta página.</p></div></CardContent></Card></div>;

  const isAiMode = (assessment as any)?.collection_mode === 'ai';
  const defaultScale = COPSOQ_SCALES['frequency'];

  const handleAiComplete = async (aiAnswers: Record<number, number>) => {
    if (!assessment) return;
    try {
      setIsSubmitting(true);
      const { data: response, error: re } = await supabase.from('copsoq_responses' as any).insert(buildResponsePayload()).select('id').single();
      if (re) throw re;
      const data = Object.entries(aiAnswers).map(([qn, v]) => ({ response_id: (response as any).id, question_number: parseInt(qn), answer_value: v }));
      const { error: ae } = await supabase.from('copsoq_answers' as any).insert(data);
      if (ae) throw ae;
      setIsCompleted(true);
    } catch (e) { console.error(e); toast({ title: 'Erro ao enviar', variant: 'destructive' }); }
    finally { setIsSubmitting(false); }
  };

  const SectorPicker = ({ compact = false }: { compact?: boolean }) => (
    isMultiSector ? (
      <div className="space-y-2">
        <div className="flex gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-foreground/90">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>Marque todos os setores em que você atua. Sua resposta será contabilizada em cada um.</p>
        </div>
        {departments.map(d => {
          const checked = selectedDepartments.includes(d.name);
          return (
            <label key={d.id} className="flex items-center gap-3 p-2 rounded-md border cursor-pointer hover:bg-muted/50">
              <Checkbox
                checked={checked}
                onCheckedChange={(c) => {
                  setSelectedDepartments(prev => c ? [...prev, d.name] : prev.filter(x => x !== d.name));
                  setShowDepartmentError(false);
                }}
              />
              <span className="text-sm">{d.name}</span>
            </label>
          );
        })}
      </div>
    ) : (
      <Select value={selectedDepartment} onValueChange={v => { setSelectedDepartment(v); setShowDepartmentError(false); }}>
        <SelectTrigger className={showDepartmentError && !selectedDepartment ? 'border-destructive' : ''}>
          <SelectValue placeholder={compact ? 'Selecione' : 'Escolha seu setor'} />
        </SelectTrigger>
        <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
      </Select>
    )
  );

  if (isAiMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8">
        <div className="container mx-auto px-4">
          {departments.length > 0 && !hasSectorSelection ? (
            <div className="max-w-md mx-auto">
              <Card><CardHeader><CardTitle>{isMultiSector ? 'Selecione seus setores' : 'Selecione seu setor'}</CardTitle></CardHeader>
              <CardContent><SectorPicker compact /></CardContent></Card>
            </div>
          ) : (
            <SoniaFormChat questions={COPSOQ_QUESTIONS_SORTED} likertOptions={defaultScale} categoryLabels={COPSOQ_CATEGORY_LABELS} onComplete={handleAiComplete} assessmentTitle={assessment?.title || 'COPSOQ II'} toolName="COPSOQ II" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div ref={topRef} />
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {assessment?.companies?.logo_url ? (
              <img src={assessment.companies.logo_url} alt={assessment.companies.name} className="h-10 w-10 object-contain" />
            ) : (
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
            )}
            <div><h1 className="font-semibold text-foreground">{assessment?.companies?.name}</h1><p className="text-sm text-muted-foreground">{assessment?.title}</p></div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {currentPage === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2"><FileText className="h-6 w-6 text-primary" /><CardTitle>Avaliação COPSOQ II</CardTitle></div>
              <CardDescription>{assessment?.description || 'Esta avaliação tem como objetivo identificar fatores de risco psicossocial no ambiente de trabalho. Suas respostas são completamente anônimas.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {isMultiSector ? 'Selecione todos os setores em que você atua' : 'Selecione seu setor'} <span className="text-destructive">*</span>
                  </Label>
                  <SectorPicker />
                  {showDepartmentError && !hasSectorSelection && (
                    <p className="text-sm text-destructive">{isMultiSector ? 'Selecione ao menos um setor.' : 'Selecione o setor.'}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2"><span>Progresso</span><span>{Object.keys(answers).length} de {COPSOQ_QUESTIONS_SORTED.length} questões</span></div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        <div className="space-y-4">{currentQuestions.map(q => <QuestionCard key={q.number} question={q} selectedValue={answers[q.number]} onAnswer={handleAnswer} />)}</div>

        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" onClick={handlePrev} disabled={currentPage === 0} className="gap-2"><ChevronLeft className="h-4 w-4" />Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {currentPage + 1} de {totalPages}</span>
          {currentPage === totalPages - 1 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting || Object.keys(answers).length < COPSOQ_QUESTIONS_SORTED.length} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Enviar Respostas
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">Próximo<ChevronRight className="h-4 w-4" /></Button>
          )}
        </div>
      </main>
      <footer className="border-t mt-12 py-6"><div className="container mx-auto px-4 text-center"><p className="text-sm text-muted-foreground">Suas respostas são anônimas e confidenciais.</p></div></footer>
    </div>
  );
}
