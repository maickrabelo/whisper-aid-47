import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Activity } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EMOJI_SCALE, LIKERT_SCALE } from '@/data/pulseSurveyTemplates';

interface Survey {
  id: string; title: string; description: string | null;
  use_emojis: boolean; status: string;
  companies?: { name: string } | null;
}
interface Question { id: string; text: string; category: string | null; required: boolean; order_index: number }
interface OpenCycle { id: string; ended_at: string; cycle_number: number }

export default function PulseSurveyForm() {
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [cycle, setCycle] = useState<OpenCycle | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [department, setDepartment] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!surveyId) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from('pulse_surveys')
        .select('*')
        .eq('id', surveyId).eq('status', 'active').maybeSingle();
      if (!s) { setLoading(false); return; }
      const { data: companyData } = await supabase
        .from('companies_public' as any)
        .select('name')
        .eq('id', (s as any).company_id)
        .maybeSingle();
      setSurvey({ ...(s as any), companies: (companyData as any) ?? null } as any);

      const [{ data: qs }, { data: cy }, { data: deps }] = await Promise.all([
        supabase.from('pulse_survey_questions').select('*').eq('pulse_survey_id', surveyId).order('order_index'),
        supabase.from('pulse_survey_cycles')
          .select('id, ended_at, cycle_number')
          .eq('pulse_survey_id', surveyId)
          .is('closed_at', null)
          .gt('ended_at', new Date().toISOString())
          .order('cycle_number', { ascending: false })
          .limit(1),
        supabase.from('pulse_survey_departments').select('name').eq('pulse_survey_id', surveyId).order('name'),
      ]);
      setQuestions((qs || []) as any);
      setCycle((cy && cy[0]) as any || null);
      setDepartments((deps || []).map((d: any) => d.name));
      setLoading(false);
    })();
  }, [surveyId]);

  const scale = useMemo(() => survey?.use_emojis ? EMOJI_SCALE : LIKERT_SCALE, [survey]);

  const submit = async () => {
    if (!survey || !cycle) return;
    const missing = questions.filter((q) => q.required && !answers[q.id]);
    if (missing.length) return toast({ title: 'Responda todas as perguntas obrigatórias', variant: 'destructive' });

    setSubmitting(true);
    try {
      const { data: resp, error: respErr } = await supabase
        .from('pulse_survey_responses')
        .insert({
          cycle_id: cycle.id,
          pulse_survey_id: survey.id,
          department_name: department || null,
        })
        .select('id').single();
      if (respErr) throw respErr;

      const payload = Object.entries(answers).map(([question_id, score]) => ({
        response_id: resp!.id, question_id, score,
      }));
      const { error: aErr } = await supabase.from('pulse_survey_answers').insert(payload);
      if (aErr) throw aErr;

      setDone(true);
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold">Pulse Survey indisponível</h2>
            <p className="text-muted-foreground mt-2">Esta campanha não está ativa no momento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!cycle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold">Aguardando próximo ciclo</h2>
            <p className="text-muted-foreground mt-2">Volte em breve para responder.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-semibold">Obrigado! 💙</h2>
            <p className="text-muted-foreground mt-3">
              Sua resposta foi registrada de forma anônima.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background py-8">
      <main className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <Activity className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">{survey.title}</h1>
          {survey.companies?.name && (
            <p className="text-muted-foreground mt-1">{survey.companies.name} · Ciclo {cycle.cycle_number}</p>
          )}
          {survey.description && (
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">{survey.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            🔒 Anônimo · suas respostas não são vinculadas a você
          </p>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-6">
            <Label>Departamento / Setor (opcional)</Label>
            {departments.length > 0 ? (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Não informar</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Operações"
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        {questions.map((q, i) => (
          <Card key={q.id} className="mb-3">
            <CardHeader>
              <CardTitle className="text-base">
                {i + 1}. {q.text} {q.required && <span className="text-destructive">*</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {scale.map((opt: any) => {
                  const selected = answers[q.id] === opt.score;
                  return (
                    <button
                      key={opt.score}
                      type="button"
                      onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt.score }))}
                      className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition ${
                        selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {survey.use_emojis ? (
                        <span className="text-3xl">{opt.emoji}</span>
                      ) : (
                        <span className="text-2xl font-bold text-primary">{opt.score}</span>
                      )}
                      <span className="text-[10px] text-center mt-1 text-muted-foreground leading-tight">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button onClick={submit} disabled={submitting} className="w-full mt-4 gap-2" size="lg">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar respostas
        </Button>
      </main>
    </div>
  );
}
