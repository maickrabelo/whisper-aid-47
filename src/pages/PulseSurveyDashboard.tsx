import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, Activity, Building2, ArrowLeft, Copy, ExternalLink, Eye, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PUBLIC_BASE_URL } from "@/lib/publicUrl";

interface PulseSurvey {
  id: string;
  title: string;
  description: string | null;
  company_id: string;
  frequency: string;
  use_emojis: boolean;
  status: string;
  manager_email: string;
  created_at: string;
  companies?: { name: string } | null;
}

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
};

export default function PulseSurveyDashboard() {
  const navigate = useNavigate();
  const { user, role, profile, isLoading: authLoading } = useRealAuth();
  const [surveys, setSurveys] = useState<PulseSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!['admin', 'sst', 'company', 'sales'].includes(role || '')) {
      navigate('/dashboard');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, authLoading]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSurveys((data || []) as any);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Excluir a campanha "${title}"? Todas as respostas serão removidas.`)) return;
    const { error } = await supabase.from('pulse_surveys').delete().eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Campanha excluída' });
    setSurveys((p) => p.filter((s) => s.id !== id));
  };

  const copyLink = (id: string) => {
    const url = `${PUBLIC_BASE_URL}/pulse/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  const filtered = surveys.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.companies?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(role === 'company' ? '/dashboard' : '/sst-dashboard')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Pulse Survey
            </h1>
            <p className="text-muted-foreground mt-1">
              Avaliações curtas e periódicas com envio automático de resumo por email
            </p>
          </div>
          <Button onClick={() => navigate('/pulse-survey/nova')} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Campanha
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">Nenhuma campanha encontrada</h3>
                <Button onClick={() => navigate('/pulse-survey/nova')} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Nova Campanha
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Escala</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {s.companies?.name}
                        </div>
                      </TableCell>
                      <TableCell>{FREQ_LABEL[s.frequency] || s.frequency}</TableCell>
                      <TableCell>{s.use_emojis ? '😄 Emojis' : '1-5 Likert'}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'active' ? 'default' : 'outline'}>
                          {s.status === 'active' ? 'Ativa' : s.status === 'paused' ? 'Pausada' : 'Arquivada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Copiar link" onClick={() => copyLink(s.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Abrir formulário"
                            onClick={() => window.open(`/pulse/${s.id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver detalhes"
                            onClick={() => navigate(`/pulse-survey/${s.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            onClick={() => handleDelete(s.id, s.title)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
