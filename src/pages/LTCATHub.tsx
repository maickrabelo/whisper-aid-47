import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, FilePlus2, FileText, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { supabase } from '@/integrations/supabase/client';
import BetaBadge from '@/components/feature-flags/BetaBadge';
import BetaFeedbackButton from '@/components/feature-flags/BetaFeedbackButton';
import usePageSEO from '@/hooks/usePageSEO';
import { toast } from 'sonner';

interface CompanyOption { id: string; name: string; cnpj: string | null }

interface LtcatDocRow {
  id: string;
  company_id: string;
  title: string;
  status: string;
  version_number: number;
  reference_period_start: string | null;
  reference_period_end: string | null;
  published_at: string | null;
  updated_at: string;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '—';

/**
 * LTCAT Beta — Hub de documentos.
 * Lista os LTCATs acessíveis (RLS restringe ao tenant + flag LTCAT_BETA) e
 * permite criar um novo documento para uma empresa vinculada ao usuário.
 */
const LTCATHub = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useRealAuth();

  const [docs, setDocs] = useState<LtcatDocRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ company_id: '', title: '', start: '', end: '' });

  usePageSEO({
    title: 'LTCAT — Beta Privado | SR SMS',
    description: 'Módulo LTCAT previdenciário em beta privado restrito.',
  });

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: docRows, error: e1 }, { data: compRows, error: e2 }] = await Promise.all([
        supabase
          .from('ltcat_documents' as any)
          .select('id, company_id, title, status, version_number, reference_period_start, reference_period_end, published_at, updated_at')
          .order('updated_at', { ascending: false }),
        supabase.from('companies').select('id, name, cnpj').order('name'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setDocs((docRows as any[] || []) as LtcatDocRow[]);
      setCompanies((compRows || []) as CompanyOption[]);
    } catch (err: any) {
      console.error(err);
      toast.error('Falha ao carregar documentos LTCAT.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name || 'Empresa';

  const handleCreate = async () => {
    if (!form.company_id) { toast.error('Selecione a empresa.'); return; }
    if (!form.title.trim()) { toast.error('Informe o título do documento.'); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('ltcat_documents' as any)
        .insert({
          company_id: form.company_id,
          title: form.title.trim(),
          reference_period_start: form.start || null,
          reference_period_end: form.end || null,
          emission_date: new Date().toISOString().slice(0, 10),
          created_by: user?.id ?? null,
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      toast.success('LTCAT criado. Complete a identificação e os GHEs.');
      setCreateOpen(false);
      setForm({ company_id: '', title: '', start: '', end: '' });
      navigate(`/ltcat/${(data as any).id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao criar o LTCAT.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">LTCAT</h1>
              <BetaBadge label="BETA PRIVADO" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Laudo Técnico das Condições Ambientais do Trabalho — finalidade previdenciária
              (Decreto 3.048/99, Anexo IV) e preparação do estado do evento S-2240.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BetaFeedbackButton />
            <Button onClick={() => setCreateOpen(true)}>
              <FilePlus2 className="h-4 w-4 mr-2" /> Novo LTCAT
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2 mb-6">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Módulo em validação beta. Todo PDF gerado é marcado como
            <strong> “BETA — DOCUMENTO PARA VALIDAÇÃO INTERNA”</strong>.
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">Nenhum LTCAT cadastrado ainda.</p>
              <p className="text-sm text-muted-foreground">
                Clique em “Novo LTCAT” para iniciar o primeiro documento de uma empresa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {docs.map((d) => (
              <Card
                key={d.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate(`/ltcat/${d.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{d.title}</p>
                      <Badge variant="outline">v{d.version_number}</Badge>
                      {d.status === 'published' ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          <Lock className="h-3 w-3 mr-1" /> Publicado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {companyName(d.company_id)} · Período: {fmtDate(d.reference_period_start)} a {fmtDate(d.reference_period_end)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {new Date(d.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo LTCAT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Select
                value={form.company_id}
                onValueChange={(v) => {
                  const c = companies.find((x) => x.id === v);
                  setForm((f) => ({ ...f, company_id: v, title: f.title || `LTCAT — ${c?.name ?? ''}` }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.cnpj ? ` — ${c.cnpj}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título do documento *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="LTCAT — Empresa"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início do período de referência</Label>
                <Input type="date" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fim do período de referência</Label>
                <Input type="date" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar LTCAT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default LTCATHub;
