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

interface Program { id: string; title: string; status: string; created_at: string }

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', em_revisao: 'Em revisão', aprovado: 'Aprovado', arquivado: 'Arquivado',
};

const PCMSOCompany = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const view = usePcmsoCan(companyId, 'program.view');
  const prepare = usePcmsoCan(companyId, 'program.prepare');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!companyId) return;
    const [{ data }, { data: comps }] = await Promise.all([
      (supabase as any).from('pcmso_programs').select('id,title,status,created_at')
        .eq('company_id', companyId).order('created_at', { ascending: false }),
      (supabase as any).rpc('pcmso_accessible_companies'),
    ]);
    setPrograms((data as Program[]) ?? []);
    setCompanyName(((comps as any[]) ?? []).find((c) => c.company_id === companyId)?.company_name ?? '');
  };

  useEffect(() => { if (view.allowed) load(); /* eslint-disable-next-line */ }, [view.allowed, companyId]);

  if (view.loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!view.allowed) return <NotFound />;

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from('pcmso_programs').insert({ company_id: companyId, title: title.trim() });
    setSaving(false);
    if (error) { toast.error('Não foi possível criar o programa.'); return; }
    setTitle('');
    toast.success('Programa criado como rascunho.');
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pcmso')}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{companyName || 'Empresa'}</h1>
          <p className="text-sm text-muted-foreground">Programas PCMSO</p>
        </div>

        {prepare.allowed && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Novo programa</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input placeholder="Ex.: PCMSO 2026/2027 — Matriz" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              <Button onClick={create} disabled={saving || !title.trim()}><Plus className="mr-1 h-4 w-4" /> Criar</Button>
            </CardContent>
          </Card>
        )}

        {programs.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum programa cadastrado.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {programs.map((p) => (
              <Card key={p.id}><CardContent className="flex items-center justify-between py-4">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left hover:text-primary"
                  onClick={() => navigate(`/pcmso/programa/${p.id}`)}
                >
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{p.title}</span>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{STATUS_LABEL[p.status] ?? p.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/pcmso/programa/${p.id}`)}>
                    Abrir
                  </Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PCMSOCompany;
