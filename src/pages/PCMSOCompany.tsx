import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Plus, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { usePcmsoCan } from '@/hooks/usePcmsoAccess';
import { toast } from 'sonner';
import NotFound from './NotFound';

interface Program {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  arquivado: 'Arquivado',
};

const PCMSOCompany = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const view = usePcmsoCan(companyId, 'program.view');
  const prepare = usePcmsoCan(companyId, 'program.prepare');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    if (!companyId) return;

    setLoading(true);
    setLoadError(null);

    const [programsResult, companiesResult] = await Promise.all([
      (supabase as any)
        .from('pcmso_programs')
        .select('id,title,status,created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      (supabase as any).rpc('pcmso_accessible_companies'),
    ]);

    if (programsResult.error || companiesResult.error) {
      setPrograms([]);
      setCompanyName('');
      setLoadError('Não foi possível carregar os dados desta empresa.');
      setLoading(false);
      return;
    }

    setPrograms((programsResult.data as Program[]) ?? []);
    setCompanyName(
      ((companiesResult.data as Array<{ company_id: string; company_name: string }>) ?? []).find(
        (company) => company.company_id === companyId,
      )?.company_name ?? '',
    );
    setLoading(false);
  };

  useEffect(() => {
    if (view.allowed) void load();
    // A autorização é a dependência que libera a leitura da empresa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.allowed, companyId]);

  if (view.loading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando empresa" />
      </div>
    );
  }

  if (!view.allowed) return <NotFound />;

  const create = async () => {
    if (!companyId || !title.trim() || !prepare.allowed) return;

    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    const payload: Record<string, string> = {
      company_id: companyId,
      title: title.trim(),
    };
    if (userId) payload.created_by = userId;

    const { error } = await (supabase as any).from('pcmso_programs').insert(payload);
    setSaving(false);

    if (error) {
      toast.error('Não foi possível criar o programa.');
      return;
    }

    setTitle('');
    toast.success('Programa criado como rascunho.');
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pcmso')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{companyName || 'Empresa'}</h1>
          <p className="text-sm text-muted-foreground">Programas PCMSO</p>
        </div>

        {loadError && (
          <Card className="border-destructive/40">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {prepare.allowed && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Novo programa</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Ex.: PCMSO 2026/2027 — Matriz"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                aria-label="Título do novo programa"
              />
              <Button onClick={() => void create()} disabled={saving || !title.trim()}>
                <Plus className="mr-1 h-4 w-4" /> Criar
              </Button>
            </CardContent>
          </Card>
        )}

        {programs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum programa cadastrado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 text-left hover:text-primary"
                    onClick={() => navigate(`/pcmso/programa/${program.id}`)}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{program.title}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{STATUS_LABEL[program.status] ?? program.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/pcmso/programa/${program.id}`)}>
                      Abrir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PCMSOCompany;
