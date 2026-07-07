import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Pencil, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PUBLIC_BASE_URL } from "@/lib/publicUrl";

interface Survey { id: string; title: string; frequency: string; use_emojis: boolean; status: string; manager_email: string; companies?: { name: string } | null }
interface Cycle { id: string; cycle_number: number; started_at: string; ended_at: string; closed_at: string | null; total_responses: number; summary_email_sent_at: string | null }

export default function PulseSurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleAverages, setCycleAverages] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from('pulse_surveys').select('*, companies(name)').eq('id', id).single();
      setSurvey(s as any);

      const { data: cs } = await supabase
        .from('pulse_survey_cycles').select('*').eq('pulse_survey_id', id)
        .order('cycle_number', { ascending: true });
      setCycles((cs || []) as any);

      // Médias por ciclo
      const cycleIds = (cs || []).map((c: any) => c.id);
      if (cycleIds.length) {
        const { data: ans } = await supabase
          .from('pulse_survey_answers')
          .select('score, response_id, pulse_survey_responses!inner(cycle_id)')
          .in('pulse_survey_responses.cycle_id', cycleIds);
        const agg: Record<string, { sum: number; n: number }> = {};
        for (const a of ans || []) {
          const cId = (a as any).pulse_survey_responses.cycle_id;
          const cur = agg[cId] || { sum: 0, n: 0 };
          cur.sum += Number(a.score); cur.n += 1;
          agg[cId] = cur;
        }
        const avgs: Record<string, number> = {};
        for (const [k, v] of Object.entries(agg)) avgs[k] = v.n ? v.sum / v.n : 0;
        setCycleAverages(avgs);
      }
      setLoading(false);
    })();
  }, [id]);

  const chartData = useMemo(() =>
    cycles.map((c) => ({
      name: `#${c.cycle_number}`,
      média: Number((cycleAverages[c.id] || 0).toFixed(2)),
      respostas: c.total_responses,
    })),
  [cycles, cycleAverages]);

  const publicUrl = `${PUBLIC_BASE_URL}/pulse/${id}`;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!survey) return <div className="min-h-screen flex items-center justify-center"><p>Não encontrado</p></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="outline" size="sm" onClick={() => navigate('/pulse-survey')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">{survey.title}</h1>
            <p className="text-muted-foreground">{survey.companies?.name} · {survey.frequency}</p>
            <Badge className="mt-2" variant={survey.status === 'active' ? 'default' : 'outline'}>{survey.status}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: 'Link copiado!' }); }}>
              <Copy className="h-4 w-4" /> Copiar link
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(publicUrl, '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate(`/pulse-survey/editar/${id}`)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </div>
        </div>

        {chartData.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Evolução da média geral</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="média" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Histórico de ciclos</CardTitle></CardHeader>
          <CardContent>
            {cycles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum ciclo ainda.</p>
            ) : (
              <div className="space-y-2">
                {[...cycles].reverse().map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">Ciclo {c.cycle_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(c.started_at), 'dd/MM/yy', { locale: ptBR })} →{' '}
                        {format(new Date(c.ended_at), 'dd/MM/yy', { locale: ptBR })}
                        {c.closed_at && ` · fechado ${format(new Date(c.closed_at), 'dd/MM/yy', { locale: ptBR })}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Média</div>
                        <div className="font-semibold">{(cycleAverages[c.id] || 0).toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Respostas</div>
                        <div className="font-semibold">{c.total_responses}</div>
                      </div>
                      <Badge variant={c.closed_at ? 'secondary' : 'default'}>
                        {c.closed_at ? 'Fechado' : 'Aberto'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
