import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, History, Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { usePcmsoCan } from '@/hooks/usePcmsoAccess';
import { toast } from 'sonner';
import NotFound from './NotFound';

interface Program {
  id: string;
  company_id: string;
  title: string;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  result: string;
  justification: string | null;
  created_at: string;
  actor_id: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  arquivado: 'Arquivado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  rascunho: 'outline',
  em_revisao: 'secondary',
  aprovado: 'default',
  arquivado: 'destructive',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const PCMSOProgram = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const prepare = usePcmsoCan(program?.company_id, 'program.prepare');
  const approve = usePcmsoCan(program?.company_id, 'program.approve');

  const load = async () => {
    if (!programId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('pcmso_programs')
      .select('id,company_id,title,status,created_by,updated_by,created_at,updated_at')
      .eq('id', programId)
      .maybeSingle();

    if (error || !data) {
      setProgram(null);
      setLoading(false);
      return;
    }

    const currentProgram = data as Program;
    setProgram(currentProgram);
    setTitle(currentProgram.title);

    const [{ data: companies }, { data: events }] = await Promise.all([
      (supabase as any).rpc('pcmso_accessible_companies'),
      (supabase as any)
        .from('pcmso_audit_events')
        .select('id,action,entity,entity_id,result,justification,created_at,actor_id')
        .eq('entity_id', currentProgram.id)
        .order('created_at', { ascending: false }),
    ]);

    setCompanyName(
      ((companies as Array<{ company_id: string; company_name: string }>) ?? []).find(
        (company) => company.company_id === currentProgram.company_id,
      )?.company_name ?? '',
    );
    setAuditEvents((events as AuditEvent[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // A troca do programa deve recarregar todos os dados do editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const updateProgram = async (updates: Partial<Pick<Program, 'title' | 'status'>>) => {
    if (!program) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from('pcmso_programs')
      .update(updates)
      .eq('id', program.id);
    setSaving(false);

    if (error) {
      toast.error('Não foi possível salvar o programa.');
      return;
    }

    toast.success('Programa atualizado.');
    await load();
  };

  const saveTitle = async () => {
    if (!title.trim() || !prepare.allowed || program?.status === 'aprovado') return;
    await updateProgram({ title: title.trim() });
  };

  const submitForReview = async () => {
    if (!prepare.allowed || program?.status !== 'rascunho') return;
    await updateProgram({ status: 'em_revisao' });
  };

  const approveProgram = async () => {
    if (!approve.allowed || program?.status !== 'em_revisao') return;
    await updateProgram({ status: 'aprovado' });
  };

  if (loading || (program && (prepare.loading || approve.loading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando programa" />
      </div>
    );
  }

  if (!program || !program.company_id || (!prepare.allowed && !approve.allowed)) {
    return <NotFound />;
  }

  const isApproved = program.status === 'aprovado';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/pcmso/empresa/${program.company_id}`)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para a empresa
        </Button>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 text-primary" />
              <span>PCMSO</span>
              {companyName && <span>· {companyName}</span>}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Editor do programa</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepare o documento e encaminhe-o para revisão médica conforme as permissões da empresa.
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[program.status] ?? 'outline'} className="w-fit">
            {STATUS_LABEL[program.status] ?? program.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="program-title">Título do programa</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="program-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={!prepare.allowed || isApproved || saving}
                  maxLength={200}
                />
                {prepare.allowed && !isApproved && (
                  <Button onClick={saveTitle} disabled={saving || !title.trim() || title.trim() === program.title}>
                    Salvar título
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">Criado em:</span> {formatDate(program.created_at)}
              </div>
              <div>
                <span className="font-medium text-foreground">Atualizado em:</span> {formatDate(program.updated_at)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de revisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O programa começa como rascunho. A preparação pode encaminhá-lo para revisão; somente o médico responsável atribuído pode aprovar.
            </p>
            <div className="flex flex-wrap gap-2">
              {prepare.allowed && program.status === 'rascunho' && (
                <Button onClick={submitForReview} disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Enviar para revisão
                </Button>
              )}
              {approve.allowed && program.status === 'em_revisao' && (
                <Button onClick={approveProgram} disabled={saving}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar programa
                </Button>
              )}
              {isApproved && (
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Programa aprovado e protegido contra edição.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" /> Histórico de auditoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento de auditoria disponível para este programa.</p>
            ) : (
              <div className="space-y-4">
                {auditEvents.map((event, index) => (
                  <div key={event.id}>
                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{event.action}</Badge>
                        <span className="text-foreground">{event.entity}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                    </div>
                    {event.justification && <p className="mt-1 text-xs text-muted-foreground">{event.justification}</p>}
                    {index < auditEvents.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PCMSOProgram;
