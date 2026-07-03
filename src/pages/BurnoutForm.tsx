import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BURNOUT_QUESTIONS_SORTED, 
  BURNOUT_LIKERT_OPTIONS,
  BURNOUT_CATEGORY_LABELS,
  calculateTotalScore,
  getBurnoutRiskLevel 
} from "@/data/burnoutQuestions";
import { Flame, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import SoniaFormChat from "@/components/sonia/SoniaFormChat";


interface Assessment {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  companies: {
    name: string;
    logo_url: string | null;
  } | null;
}

interface Department {
  id: string;
  name: string;
}

const QUESTIONS_PER_PAGE = 5;

export default function BurnoutForm() {
  const { companySlug, assessmentId } = useParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(BURNOUT_QUESTIONS_SORTED.length / QUESTIONS_PER_PAGE);
  
  const currentQuestions = useMemo(() => {
    const start = currentPage * QUESTIONS_PER_PAGE;
    return BURNOUT_QUESTIONS_SORTED.slice(start, start + QUESTIONS_PER_PAGE);
  }, [currentPage]);

  useEffect(() => {
    fetchAssessment();
  }, [companySlug, assessmentId]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('burnout_assessments')
        .select('id, title, description, is_active, company_id')
        .eq('id', assessmentId)
        .maybeSingle();

      if (assessmentError) throw assessmentError;

      if (!assessmentData) {
        setError('Avaliação não encontrada.');
        return;
      }

      if (!assessmentData.is_active) {
        setError('Esta avaliação não está ativa no momento.');
        return;
      }

      const { data: companyData } = await supabase
        .from('companies_public' as any)
        .select('name, logo_url')
        .eq('id', (assessmentData as any).company_id)
        .maybeSingle();

      setAssessment({
        ...(assessmentData as any),
        companies: (companyData as any) ?? null,
      } as Assessment);
      
      // Fetch departments
      const { data: depts } = await supabase
        .from('burnout_departments')
        .select('id, name')
        .eq('assessment_id', assessmentId)
        .order('order_index');
        
      setDepartments(depts || []);
    } catch (err) {
      console.error('Error fetching assessment:', err);
      setError('Erro ao carregar a avaliação.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionNumber: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: value }));
  };

  const getProgress = () => {
    const answered = Object.keys(answers).length;
    return (answered / BURNOUT_QUESTIONS_SORTED.length) * 100;
  };

  const canGoNext = () => {
    return currentQuestions.every(q => answers[q.number] !== undefined);
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    // Check if all questions answered
    const allAnswered = BURNOUT_QUESTIONS_SORTED.every(q => answers[q.number] !== undefined);
    
    if (!allAnswered) {
      toast({
        title: "Respostas incompletas",
        description: "Por favor, responda todas as questões antes de enviar.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Generate unique token
      const respondentToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate total score and risk level
      const answersList = Object.entries(answers).map(([questionNumber, value]) => ({
        questionNumber: parseInt(questionNumber),
        value
      }));
      
      const totalScore = calculateTotalScore(answersList);
      const riskLevel = getBurnoutRiskLevel(totalScore);
      
      // Insert response
      const { data: response, error: responseError } = await supabase
        .from('burnout_responses')
        .insert({
          assessment_id: assessmentId,
          department: selectedDepartment || null,
          respondent_token: respondentToken,
          total_score: totalScore,
          risk_level: riskLevel,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (responseError) throw responseError;
      
      // Insert answers
      const answersToInsert = Object.entries(answers).map(([questionNumber, value]) => ({
        response_id: response.id,
        question_number: parseInt(questionNumber),
        answer_value: value
      }));
      
      const { error: answersError } = await supabase
        .from('burnout_answers')
        .insert(answersToInsert);
        
      if (answersError) throw answersError;
      
      setIsCompleted(true);
    } catch (err) {
      console.error('Error submitting:', err);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar suas respostas. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Avaliação Indisponível</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua avaliação foi enviada com sucesso. Suas respostas são completamente anônimas e 
              serão utilizadas para melhorar o ambiente de trabalho.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = assessment?.companies;
  const isAiMode = (assessment as any)?.collection_mode === 'ai';

  const handleAiComplete = async (aiAnswers: Record<number, number>) => {
    try {
      setSubmitting(true);
      const respondentToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const answersList = Object.entries(aiAnswers).map(([qn, v]) => ({ questionNumber: parseInt(qn), value: v }));
      const totalScore = calculateTotalScore(answersList);
      const riskLevel = getBurnoutRiskLevel(totalScore);
      const { data: response, error: re } = await supabase.from('burnout_responses').insert({ assessment_id: assessmentId, department: selectedDepartment || null, respondent_token: respondentToken, total_score: totalScore, risk_level: riskLevel, completed_at: new Date().toISOString() }).select().single();
      if (re) throw re;
      const data = Object.entries(aiAnswers).map(([qn, v]) => ({ response_id: response.id, question_number: parseInt(qn), answer_value: v }));
      const { error: ae } = await supabase.from('burnout_answers').insert(data);
      if (ae) throw ae;
      setIsCompleted(true);
    } catch (e) { console.error(e); toast({ title: 'Erro ao enviar', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };




  if (isAiMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8">
        <div className="container mx-auto px-4">
          {departments.length > 0 && !selectedDepartment ? (
            <div className="max-w-md mx-auto">
              <Card><CardHeader><CardTitle>Selecione seu setor</CardTitle></CardHeader>
              <CardContent><Select value={selectedDepartment} onValueChange={setSelectedDepartment}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>
            </div>
          ) : (
            <SoniaFormChat questions={BURNOUT_QUESTIONS_SORTED} likertOptions={BURNOUT_LIKERT_OPTIONS} categoryLabels={BURNOUT_CATEGORY_LABELS} onComplete={handleAiComplete} assessmentTitle={assessment?.title || 'Burnout'} toolName="Burnout (MBI)" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="h-8 w-8 text-orange-500" />
            <h1 className="text-2xl font-bold">Avaliação de Burnout</h1>
          </div>
          <p className="text-muted-foreground">{assessment?.title}</p>
          {company?.name && (
            <p className="text-sm text-muted-foreground mt-1">{company.name}</p>
          )}
        </div>

        {/* Introduction (first page) */}
        {currentPage === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sobre esta Avaliação</CardTitle>
              <CardDescription>
                Este questionário é baseado no Link Burnout Questionnaire (LBQ) e no 
                Maslach Burnout Inventory (MBI), ferramentas validadas para avaliação 
                de sintomas relacionados à Síndrome de Burnout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Instruções:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Responda com base em como você se sente em relação ao seu trabalho</li>
                  <li>Não há respostas certas ou erradas</li>
                  <li>Suas respostas são completamente anônimas</li>
                  <li>Leia cada afirmação com atenção antes de responder</li>
                </ul>
              </div>
              
              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label>Selecione seu setor/departamento (opcional)</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progresso</span>
            <span>{Math.round(getProgress())}% completo</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {currentQuestions.map((question, index) => (
            <Card key={question.number}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <span className="bg-orange-100 text-orange-700 text-sm font-medium px-2 py-1 rounded">
                    {question.number}
                  </span>
                  <div>
                    <CardTitle className="text-base font-normal">
                      {question.text}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {BURNOUT_CATEGORY_LABELS[question.category]}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[question.number]?.toString()}
                  onValueChange={(value) => handleAnswer(question.number, parseInt(value))}
                  className="grid grid-cols-2 md:grid-cols-3 gap-2"
                >
                  {BURNOUT_LIKERT_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem
                        value={option.value.toString()}
                        id={`q${question.number}-${option.value}`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`q${question.number}-${option.value}`}
                        className={`
                          flex-1 p-3 text-sm text-center rounded-lg border cursor-pointer transition-all
                          ${answers[question.number] === option.value
                            ? 'bg-orange-100 border-orange-500 text-orange-700'
                            : 'bg-white border-gray-200 hover:border-orange-300'
                          }
                        `}
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          
          {currentPage === totalPages - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canGoNext() || submitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {submitting ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Page indicator */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Página {currentPage + 1} de {totalPages}
        </p>
      </div>
    </div>
  );
}
