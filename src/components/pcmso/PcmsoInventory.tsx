import { useEffect, useState } from 'react';
import { RefreshCw, Loader2, FileSearch, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface Risk { id: string; agent_name: string; category: string; ghe_id: string | null; risk_level: string; source?: string; exposure_description?: string; existing_epc?: string; existing_epi?: string }
interface Factor { id: string; fator_nome: string; categoria: string; evidencia_texto?: string }
interface Snapshot {
  id: string; pgr_document_id: string; captured_at: string; source_hash: string;
  content: { document: { title: string; version: number }; ghes: { id: string; name: string; sector: string; role: string }[]; risks: Risk[]; aeps: { assessment: { id: string; ghe_id: string | null; setor_nome: string; funcao_nome: string }; factors: Factor[] }[]; links: { aep_fator_id: string; pgr_risk_id: string }[] };
}

export const PcmsoInventory = ({ programId, companyId, canPrepare, locked }: { programId: string; companyId: string; canPrepare: boolean; locked: boolean }) => {
  const [documents, setDocuments] = useState<{ id: string; title: string; version: number }[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Risk | Factor | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [reviewFor, setReviewFor] = useState<Snapshot | null>(null);
  const [notes, setNotes] = useState('');
  const [reviews, setReviews] = useState<{ snapshot_id: string; notes: string; reviewed_at: string }[]>([]);
  const load = async () => {
    setLoading(true);
    const [docs, copies, changes, reviewRows] = await Promise.all([
      supabase.from('pgr_documents').select('id,title,version').eq('company_id', companyId).order('version', { ascending: false }),
      supabase.from('pcmso_source_snapshots').select('*').eq('program_id', programId),
      supabase.from('pcmso_change_requests').select('pgr_document_id').eq('program_id', programId).is('resolved_at', null),
      supabase.from('pcmso_inventory_reviews').select('snapshot_id,notes,reviewed_at').eq('company_id', companyId),
    ]);
    setError(docs.error || copies.error || changes.error ? 'Não foi possível consultar o inventário.' : '');
    setDocuments(docs.data ?? []);
    setSnapshots((copies.data ?? []) as unknown as Snapshot[]);
    setPending((changes.data ?? []).map(c => c.pgr_document_id));
    setReviews(reviewRows.data ?? []);
    setSelected(prev => prev || docs.data?.[0]?.id || '');
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [programId, companyId]);
  const importSource = async () => {
    if (!selected || locked || !canPrepare) return;
    setBusy(true);
    const result = await supabase.rpc('pcmso_import_inventory', { _program_id: programId, _pgr_id: selected });
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    setConfirm(false);
    toast.success('Inventário atualizado com a origem selecionada.');
    await load();
  };
  const saveReview = async () => {
    if (!reviewFor || locked || !canPrepare) return;
    setBusy(true);
    const result = await supabase.from('pcmso_inventory_reviews').upsert({ company_id: companyId, snapshot_id: reviewFor.id, notes: notes.trim() }, { onConflict: 'snapshot_id' });
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    setReviewFor(null);
    toast.success('Revisão registrada.');
    await load();
  };
  return <section className="space-y-4 border-t pt-6">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><FileSearch className="h-5 w-5 text-primary" /> Fontes e inventário de riscos</h2>
    {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Carregando inventário" /> : error ? <p role="alert" className="text-destructive">{error}</p> : <>
      {pending.length > 0 && <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"><AlertTriangle className="h-5 w-5 shrink-0 text-destructive" /><span>O PGR ou a AEP mudou após a importação. {locked ? 'O conteúdo aprovado permanece preservado; será necessária uma nova revisão do programa.' : 'Há alterações pendentes de revisão no inventário.'}</span></div>}
      {canPrepare && !locked && <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selected} onValueChange={setSelected}><SelectTrigger className="sm:max-w-md" aria-label="PGR de origem"><SelectValue placeholder="Selecionar PGR" /></SelectTrigger><SelectContent>{documents.map(d => <SelectItem key={d.id} value={d.id}>{d.title} · v{d.version}</SelectItem>)}</SelectContent></Select>
        <Button onClick={() => setConfirm(true)} disabled={!selected || busy}><RefreshCw className="mr-2 h-4 w-4" /> Importar / atualizar inventário</Button>
      </div>}
      {snapshots.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fonte importada.{documents.length === 0 ? ' A empresa ainda não tem PGR cadastrado.' : ''}</p>}
      {snapshots.map(s => <div key={s.id} className="space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{s.content.document.title} · v{s.content.document.version}</h3><span className="text-xs text-muted-foreground">Importado em {new Date(s.captured_at).toLocaleString('pt-BR')}</span></div>
        {reviews.filter(r => r.snapshot_id === s.id).map(r => <div key={r.snapshot_id} className="space-y-1 text-sm"><Badge variant="outline">{new Date(r.reviewed_at) >= new Date(s.captured_at) ? 'Revisão registrada' : 'Revisão anterior à atualização'}</Badge><p className="whitespace-pre-wrap text-muted-foreground">{r.notes}</p></div>)}
        {canPrepare && !locked && <Button variant="outline" size="sm" onClick={() => { setReviewFor(s); setNotes(reviews.find(r => r.snapshot_id === s.id)?.notes ?? ''); }}>Registrar revisão manual</Button>}
        {s.content.risks.map(r => { const g = s.content.ghes.find(g => g.id === r.ghe_id); const linked = s.content.links.some(l => l.pgr_risk_id === r.id); return <div key={r.id} className="flex items-start justify-between gap-3 border-t py-3"><div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{r.agent_name}</span><Badge variant="outline">{linked ? 'PGR · AEP' : 'PGR'}</Badge><Badge variant="secondary">{r.risk_level}</Badge></div><p className="text-sm text-muted-foreground">{g ? `${g.name} · ${g.sector} · ${g.role}` : 'GHE não vinculado — pendência'} · {r.category}</p></div><Button variant="ghost" size="icon" aria-label={`Revisar ${r.agent_name}`} title="Consultar risco" onClick={() => setDetail(r)}><FileSearch className="h-4 w-4" /></Button></div>; })}
        {s.content.aeps.map(a => a.factors.filter(f => !s.content.links.some(l => l.aep_fator_id === f.id)).map(f => <div key={f.id} className="flex items-start justify-between gap-3 border-t py-3"><div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{f.fator_nome}</span><Badge variant="outline">AEP</Badge></div><p className="text-sm text-muted-foreground">{a.assessment.setor_nome || 'Setor não informado'} · {a.assessment.funcao_nome || 'Função não informada'}{!a.assessment.ghe_id && ' · GHE não vinculado — pendência'}</p></div><Button variant="ghost" size="icon" title="Consultar fator" aria-label={`Revisar ${f.fator_nome}`} onClick={() => setDetail(f)}><FileSearch className="h-4 w-4" /></Button></div>))}
        {s.content.risks.length === 0 && s.content.aeps.every(a => a.factors.length === 0) && <p className="text-sm text-muted-foreground">Origem sem riscos ou fatores registrados — inventário pendente.</p>}
      </div>)}
    </>}
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogHeader><DialogTitle>Revisar importação</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Os riscos, os GHEs e os fatores da AEP vinculados serão copiados do PGR selecionado. Atualizar substitui a cópia anterior dessa origem neste rascunho, sem alterar o PGR.</p><Button disabled={busy} onClick={importSource}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar importação</Button></DialogContent></Dialog>
    <Dialog open={reviewFor !== null} onOpenChange={open => { if (!open) setReviewFor(null); }}><DialogContent><DialogHeader><DialogTitle>Revisão manual do inventário</DialogTitle></DialogHeader><Textarea aria-label="Observações da revisão" placeholder="Observações e pendências" value={notes} onChange={e => setNotes(e.target.value)} maxLength={10000} /><Button disabled={busy} onClick={saveReview}>Salvar revisão</Button></DialogContent></Dialog>
    <Dialog open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{detail && ('agent_name' in detail ? detail.agent_name : detail.fator_nome)}</DialogTitle></DialogHeader>{detail && ('agent_name' in detail ? <dl className="space-y-3 text-sm">{[['Fonte', detail.source], ['Exposição', detail.exposure_description], ['EPC', detail.existing_epc], ['EPI', detail.existing_epi]].map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="whitespace-pre-wrap text-muted-foreground">{value || 'Não informado'}</dd></div>)}</dl> : <p className="whitespace-pre-wrap text-sm">{detail.evidencia_texto || 'Evidência não informada'}</p>)}</DialogContent></Dialog>
  </section>;
};