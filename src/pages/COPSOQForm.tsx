import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Sparkles, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COPSOQ_SCALES } from "@/data/copsoqQuestions";
import { MEDIUM_SECTION_NOTES } from "@/data/copsoqMediumQuestions";
import { getCOPSOQVersionData, type COPSOQGenericQuestion } from "@/lib/copsoqVersion";
import { buildResponsePayload, buildDepartmentsPayload } from "@/lib/surveyResponsePayload";
import SoniaFormChat from "@/components/sonia/SoniaFormChat";
import { useAiAccess } from "@/hooks/useAiAccess";
import { useAccessLogger } from "@/hooks/useAccessLogger";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  company_id: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  collection_mode: string | null;
  multi_sector_enabled: boolean;
  questionnaire_version: string | null;
}

const questionsPerPage = 7;

// Question card component
const QuestionCard = ({
  question,
  categoryLabel,
  selectedValue,
  onAnswer
}: {
  question: COPSOQGenericQuestion;
  categoryLabel: string;
  selectedValue?: number;
  onAnswer: (value: number) => void;
}) => {
  const scale = COPSOQ_SCALES[question.scaleType];

  return (
    <Card className={`transition-all duration-300 ${selectedValue !== undefined ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Badge variant="outline" className="mb-2 text-xs">
              {categoryLabel}
            </Badge>
            <CardTitle className="text-base font-medium leading-relaxed">
              {question.text}
            </CardTitle>
          </div>
          <span className="text-sm text-muted-foreground font-mono shrink-0">
            {question.number}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {scale.map((option) => (
            <button
              key={option.value}
              onClick={() => onAnswer(option.value)}
              className={`px-3 py-2.5 text-sm rounded-md border-2 transition-all duration-200 font-medium ${
                selectedValue === option.value
                  ? 'border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]'
                  : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function COPSOQForm() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { logAccess } = useAccessLogger();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [aiMode, setAiMode] = useState(false);

  // Verifica se a empresa vinculada à avaliação tem acesso à SOnIA
  const { aiEnabled, loading: aiLoading } = useAiAccess(assessment?.company_id);

  useEffect(() => {
    if (assessmentId) fetchAssessment();
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from("copsoq_assessments")
        .select("*")
        .eq("id", assessmentId)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      if (!data) { toast.error("Avaliação não encontrada ou inativa"); navigate("/"); return; }

      const today = new Date().toISOString().split('T')[0];
      if (data.start_date && data.start_date > today) { toast.error("Esta avaliação ainda não iniciou"); navigate("/"); return; }
      if (data.end_date && data.end_date < today) { toast.error("Esta avaliação já foi encerrada"); navigate("/"); return; }

      setAssessment(data as unknown as Assessment);
      logAccess('form_view', { module: 'copsoq', assessment_id: assessmentId, action: 'view' });

      const { data: companyData } = await supabase
        .from("companies")
        .select("name")
        .eq("id", data.company_id)
        .single();
      if (companyData) setCompanyName(companyData.name);

      const { data: deptData } = await supabase
        .from("copsoq_departments")
        .select("name")
        .eq("assessment_id", assessmentId)
        .order("name");
      if (deptData) setDepartments(deptData.map(d => d.name));
    } catch (error) {
      console.error("Error fetching assessment:", error);
      logAccess('error', { module: 'copsoq', assessment_id: assessmentId, action: 'fetch_error', error: String(error) });
      toast.error("Erro ao carregar avaliação");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  // Dados do questionário conforme a versão configurada na avaliação
  const versionData = useMemo(
    () => getCOPSOQVersionData(assessment?.questionnaire_version),
    [assessment?.questionnaire_version]
  );
  const questions = versionData.questions;
  const categoryLabels = versionData.categoryLabels;
  const defaultScale = COPSOQ_SCALES.always_never;

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = useMemo(
    () => questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage),
    [questions, currentPage]
  );

  const handleAnswer = (questionNumber: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: value }));
  };

  const getProgress = () => (Object.keys(answers).length / questions.length) * 100;

  const handleNext = () => {
    const unanswered = currentQuestions.filter(q => answers[q.number] === undefined);
    if (unanswered.length > 0) {
      toast.warning(`Responda todas as questões antes de avançar (${unanswered.length} pendente${unanswered.length > 1 ? 's' : ''})`);
      return;
    }
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => answers[q.number] === undefined);
    if (unanswered.length > 0) {
      toast.error(`Ainda há ${unanswered.length} questões sem resposta`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: response, error: responseError } = await supabase
        .from("copsoq_responses")
        .insert(buildResponsePayload({ assessmentId: assessmentId!, respondentName, department }))
        .select().single();

      if (responseError) throw responseError;

      const answersData = questions.map(q => ({
        response_id: response.id,
        question_number: q.number,
        answer_value: answers[q.number],
      }));

      const { error: answersError } = await supabase.from("copsoq_answers").insert(answersData);
      if (answersError) throw answersError;

      const { error: updateError } = await supabase
        .from("copsoq_responses")
        .update(buildDepartmentsPayload(department, departments.length))
        .eq("id", response.id);

      if (updateError) throw updateError;

      setIsComplete(true);
      toast.success("Avaliação enviada com sucesso!");
    } catch (error) {
      console.error("Error submitting assessment:", error);
      logAccess('error', { module: 'copsoq', assessment_id: assessmentId, action: 'submit_error', error: String(error) });
      toast.error("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando avaliação...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Avaliação Concluída!</CardTitle>
            <CardDescription className="text-base mt-2">
              Obrigado por participar da avaliação COPSOQ II. Suas respostas são anônimas e contribuirão para melhorar o ambiente de trabalho.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">
                  Avaliação COPSOQ II
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    ({versionData.versionLabel} — {versionData.versionDescription})
                  </span>
                </CardTitle>
                <CardDescription className="text-base">{assessment?.title}</CardDescription>
                {companyName && <Badge variant="secondary" className="mt-2">{companyName}</Badge>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm text-muted-foreground mb-1">Progresso</div>
                <div className="text-2xl font-bold text-primary">
                  {Object.keys(answers).length}/{questions.length}
                </div>
              </div>
            </div>
            <Progress value={getProgress()} className="h-2 mt-4" />
          </CardHeader>
        </Card>

        {/* AI Assistant Button */}
        {!aiLoading && aiEnabled && !aiMode && currentPage === 0 && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Prefere responder com ajuda da SOnIA?</p>
                    <p className="text-xs text-muted-foreground">Nossa IA guia você pergunta por pergunta</p>
                  </div>
                </div>
                <Button onClick={() => setAiMode(true)} size="sm" className="gap-2 shrink-0">
                  <Sparkles className="h-4 w-4" />
                  Responder com IA
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Chat Mode */}
        {aiMode ? (
          <SoniaFormChat
            questions={questions}
            likertOptions={defaultScale}
            getOptions={(q) => COPSOQ_SCALES[(q as COPSOQGenericQuestion).scaleType] || defaultScale}
            categoryLabels={categoryLabels}
            onComplete={(aiAnswers) => { setAnswers(aiAnswers); setAiMode(false); setCurrentPage(totalPages); }}
            assessmentTitle={assessment?.title || "COPSOQ II"}
            toolName="COPSOQ II"
          />
        ) : (
          <>
            {/* Respondent Info */}
            {currentPage === 0 && (
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-lg">Suas Informações (Opcional)</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <Input placeholder="Seu nome (opcional)" value={respondentName} onChange={e => setRespondentName(e.target.value)} />
                  {assessment?.multi_sector_enabled !== false && (
                    departments.length > 0 ? (
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger><SelectValue placeholder="Selecione seu setor (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Setor/Departamento (opcional)" value={department} onChange={e => setDepartment(e.target.value)} />
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {/* Questions */}
            <div className="space-y-4 mb-6">
              {currentQuestions.map(q => (
                <div key={q.number} className="space-y-4">
                  {versionData.version === 'medium' && MEDIUM_SECTION_NOTES[q.number] && (
                    <div className="flex gap-2 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm text-foreground/90">
                      <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <p>{MEDIUM_SECTION_NOTES[q.number]}</p>
                    </div>
                  )}
                  <QuestionCard
                    question={q}
                    categoryLabel={categoryLabels[q.category] || q.category}
                    selectedValue={answers[q.number]}
                    onAnswer={(value) => handleAnswer(q.number, value)}
                  />
                </div>
              ))}
            </div>

            {/* Navigation */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={handlePrevious} disabled={currentPage === 0}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">Página {currentPage + 1} de {totalPages}</span>
                  {currentPage < totalPages - 1 ? (
                    <Button onClick={handleNext}>Próxima <ChevronRight className="h-4 w-4 ml-2" /></Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || Object.keys(answers).length < questions.length}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Finalizar Avaliação</>}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
