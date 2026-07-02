import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ClipboardList, Loader2, Plus, AlertTriangle, TrendingUp, FileDown } from "lucide-react";
import { toast } from "sonner";
import { AEPWizard } from "@/components/aep/AEPWizard";
import { AEP_STATUS_LABELS, AEP_STATUS_STYLES } from "@/lib/aepRiskLevel";
import { useAEPBetaAccess } from "@/hooks/useAEPBetaAccess";
import { generateAEPConsolidatedReportPDF } from "@/components/aep/AEPConsolidatedReportPDF";

interface AEP {
  id: string;
  setor_nome: string | null;
  funcao_nome: string | null;
  situacao_trabalho: string;
  assessment_date: string;
  next_review_date: string | null;
  status: string;
  version: number;
  responsible_name: string | null;
  parent_version_id: string | null;
  created_at: string;
}

interface KPIs {
  total: number;
  concluidas: number;
  vencidas: number;
  rascunhos: number;
  fatoresTotal: number;
  fatoresVinculados: number;
}

const AEPDashboard = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useRealAuth();
  const { allowed: aepAllowed, loading: aepLoading } = useAEPBetaAccess();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [aeps, setAeps] = useState<AEP[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({ total: 0, concluidas: 0, vencidas: 0, rascunhos: 0, fatoresTotal: 0, fatoresVinculados: 0 });
  const [pgrDocId, setPgrDocId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: aepData }, { data: pgr }] = await Promise.all([
        supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
        supabase.from('aep_avaliacoes' as any).select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('pgr_documents').select('id').eq('company_id', companyId).order('version', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setCompanyName((c as any)?.name || '');
      const list = (aepData as any[]) || [];
      setAeps(list);
      setPgrDocId((pgr as any)?.id || null);

      // KPIs
      const today = new Date().toISOString().split('T')[0];
      const total = list.length;
      const concluidas = list.filter(a => a.status === 'completed' || a.status === 'revised').length;
      const rascunhos = list.filter(a => a.status === 'draft' || a.status === 'in_progress').length;
      const vencidas = list.filter(a => a.next_review_date && a.next_review_date < today).length;

      const ids = list.map(a => a.id);
      let fatoresTotal = 0, fatoresVinculados = 0;
      if (ids.length) {
        const { data: fats } = await supabase.from('aep_fatores_avaliados' as any).select('id, aep_id').in('aep_id', ids);
        const fatIds = (fats as any[] || []).map(f => f.id);
        fatoresTotal = fatIds.length;
        if (fatIds.length) {
          const { count } = await supabase.from('aep_pgr_vinculo' as any).select('aep_fator_id', { count: 'exact', head: true }).in('aep_fator_id', fatIds);
          fatoresVinculados = count || 0;
        }
      }
      setKpis({ total, concluidas, vencidas, rascunhos, fatoresTotal, fatoresVinculados });
    } catch (e: any) {
      toast.error('Erro ao carregar AEPs: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    load();
  }, [user, authLoading, companyId]);

  const filtered = aeps.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      (a.setor_nome || '').toLowerCase().includes(q) ||
      (a.funcao_nome || '').toLowerCase().includes(q) ||
      (a.responsible_name || '').toLowerCase().includes(q) ||
      a.situacao_trabalho.toLowerCase().includes(q)
    );
  });

  const today = new Date().toISOString().split('T')[0];

  const handleDownloadConsolidated = async () => {
    if (!companyId) return;
    const elegiveis = aeps.filter(a => a.status === 'completed' || a.status === 'revised');
    if (elegiveis.length === 0) {
      toast.error('Nenhuma AEP finalizada para incluir no consolidado');
      return;
    }
    setGeneratingPdf(true);
    try {
      // Buscar detalhes da empresa (com cnpj + logo)
      const { data: comp } = await supabase.from('companies').select('name, cnpj, logo_url').eq('id', companyId).maybeSingle();
      // Buscar SST logo
      let sstLogoUrl: string | null = null;
      const { data: assign } = await supabase.from('company_sst_assignments').select('sst_manager_id').eq('company_id', companyId).limit(1).maybeSingle();
      if ((assign as any)?.sst_manager_id) {
        const { data: sst } = await supabase.from('sst_managers').select('logo_url').eq('id', (assign as any).sst_manager_id).maybeSingle();
        sstLogoUrl = (sst as any)?.logo_url || null;
      }

      const ids = elegiveis.map(a => a.id);
      const [{ data: allAeps }, { data: fatores }, { data: participantes }, { data: evidencias }] = await Promise.all([
        supabase.from('aep_avaliacoes' as any).select('*').in('id', ids),
        supabase.from('aep_fatores_avaliados' as any).select('*').in('aep_id', ids),
        supabase.from('aep_participantes' as any).select('*').in('aep_id', ids),
        supabase.from('aep_evidencias' as any).select('*').in('aep_id', ids),
      ]);

      const bundles = ((allAeps as any[]) || []).map(a => ({
        aep: a,
        fatores: ((fatores as any[]) || []).filter(f => f.aep_id === a.id),
        participantes: ((participantes as any[]) || []).filter(p => p.aep_id === a.id),
        evidencias: ((evidencias as any[]) || []).filter(e => e.aep_id === a.id),
      }));
      // Ordena por setor / data
      bundles.sort((x, y) => (x.aep.setor_nome || '').localeCompare(y.aep.setor_nome || '') || (x.aep.assessment_date || '').localeCompare(y.aep.assessment_date || ''));

      await generateAEPConsolidatedReportPDF({
        company: {
          name: (comp as any)?.name || companyName,
          cnpj: (comp as any)?.cnpj || '',
          logo_url: (comp as any)?.logo_url || null,
        },
        sstLogoUrl,
        bundles,
      });
      toast.success('Documento AEP consolidado gerado com sucesso');
    } catch (e: any) {
      toast.error('Erro ao gerar consolidado: ' + e.message);
    } finally {
      setGeneratingPdf(false);
    }
  };


  if (authLoading || loading || aepLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!aepAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-semibold">Módulo em beta fechado</h2>
            <p className="text-sm text-muted-foreground">O módulo AEP está disponível apenas para contas autorizadas durante o período de testes.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/pgr/${companyId}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao PGR
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">AEP — {companyName}</h1>
                <Badge variant="secondary">NR-17</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Avaliação Ergonômica Preliminar — item 17.3.1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadConsolidated} disabled={generatingPdf} className="gap-2">
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              AEP Consolidado (PDF)
            </Button>
            <Button onClick={() => setWizardOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nova AEP
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{kpis.total}</div><div className="text-xs text-muted-foreground">AEPs totais</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{kpis.concluidas}</div><div className="text-xs text-muted-foreground">Concluídas</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{kpis.rascunhos}</div><div className="text-xs text-muted-foreground">Em andamento</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600 flex items-center gap-1">{kpis.vencidas > 0 && <AlertTriangle className="h-5 w-5" />}{kpis.vencidas}</div><div className="text-xs text-muted-foreground">Vencidas p/ revisão</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-primary flex items-center gap-1"><TrendingUp className="h-5 w-5" />{kpis.fatoresVinculados}/{kpis.fatoresTotal}</div><div className="text-xs text-muted-foreground">Fatores → Inventário PGR</div></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Filtrar por setor, função, responsável..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-md" />
          <select className="h-10 rounded-md border border-input bg-background px-3" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            {Object.entries(AEP_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>

        {/* List */}
        <Card>
          <CardContent className="pt-6">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Nenhuma AEP cadastrada</h3>
                <p className="text-sm text-muted-foreground mb-4">Crie sua primeira AEP para começar a levantar fatores ergonômicos e psicossociais.</p>
                <Button onClick={() => setWizardOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova AEP</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setor / Função</TableHead>
                    <TableHead>Situação avaliada</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Revisão</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => {
                    const overdue = a.next_review_date && a.next_review_date < today;
                    return (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/aep/${companyId}/${a.id}`)}>
                        <TableCell>
                          <div className="font-medium">{a.setor_nome || '—'}</div>
                          {a.funcao_nome && <div className="text-xs text-muted-foreground">{a.funcao_nome}</div>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{a.situacao_trabalho}</TableCell>
                        <TableCell className="text-sm">{a.responsible_name || '—'}</TableCell>
                        <TableCell className="text-sm">{new Date(a.assessment_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-sm">
                          {a.next_review_date ? (
                            <span className={overdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(a.next_review_date).toLocaleDateString('pt-BR')}
                              {overdue && ' ⚠'}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell><Badge variant="outline">v{a.version}</Badge></TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${AEP_STATUS_STYLES[a.status]}`}>
                            {AEP_STATUS_LABELS[a.status]}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {companyId && (
        <AEPWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          companyId={companyId}
          pgrDocumentId={pgrDocId}
          onCreated={(id) => { load(); navigate(`/aep/${companyId}/${id}`); }}
        />
      )}
    </div>
  );
};

export default AEPDashboard;
