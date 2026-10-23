import { useEffect, useState } from 'react';
import { ClipboardList, History, Loader2, Pencil, Plus, Archive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Protocol = Tables<'pcmso_protocols'>;
type Catalog = Tables<'pcmso_exam_catalog'>;
interface Source { id: string; source_hash: string; content: { ghes: { id: string; name: string; role: string }[]; risks: { id: string; ghe_id: string | null; agent_name: string }[] } }
const TYPES: Record<string, string> = { admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno ao trabalho', mudanca_risco: 'Mudança de riscos ocupacionais', demissional: 'Demissional' };
const emptyForm = { exam: '', newExam: '', type: 'admissional', months: '12', group: 'todos', risk: 'nenhum', justification: '', notes: '' };

export function PcmsoProtocols({ programId, companyId, editable, onChange }: { programId: string; companyId: string; editable: boolean; onChange: () => void }) {
  const [rows, setRows] = useState<Protocol[]>([]);
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Protocol | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState<Tables<'pcmso_protocol_history'>[] | null>(null);

  const load = async () => {
    const [protocols, exams, snapshots] = await Promise.all([
      supabase.from('pcmso_protocols').select('*').eq('program_id', programId).order('created_at'),
      supabase.from('pcmso_exam_catalog').select('*').eq('company_id', companyId).order('name'),
      supabase.from('pcmso_source_snapshots').select('id,source_hash,content').eq('program_id', programId),
    ]);
    setError(protocols.error || exams.error || snapshots.error ? 'Não foi possível carregar os protocolos.' : '');
    setRows(protocols.data ?? []); setCatalog(exams.data ?? []); setSources((snapshots.data ?? []) as unknown as Source[]); setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [programId, companyId, editable]);
  const groups = sources.flatMap(s => s.content.ghes.map(g => ({ key: `${s.id}:${g.id}`, snapshot: s, ghe: g })));
  const group = groups.find(g => g.key === form.group);
  const risks = group?.snapshot.content.risks.filter(r => r.ghe_id === group.ghe.id) ?? [];
  const change = (key: keyof typeof emptyForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const edit = (row: Protocol | null) => {
    setEditing(row);
    setForm(row ? { exam: row.exam_id, newExam: '', type: row.exam_type, months: String(row.periodicity_months ?? 12), group: row.snapshot_id ? `${row.snapshot_id}:${row.ghe_id}` : 'todos', risk: row.risk_id ?? 'nenhum', justification: row.justification, notes: row.notes } : emptyForm);
    setOpen(true); void load();
  };
  const save = async () => {
    if (!editable || busy) return;
    if ((!form.exam || form.exam === 'novo') && form.newExam.trim().length < 2) { toast.error('Informe o exame.'); return; }
    if (form.justification.trim().length < 3) { toast.error('Informe a justificativa do protocolo.'); return; }
    const months = Number(form.months);
    if (form.type === 'periodico' && (!Number.isInteger(months) || months < 1 || months > 120)) { toast.error('Periodicidade deve ser de 1 a 120 meses.'); return; }
    if (form.group !== 'todos' && !group) { toast.error('Selecione um GHE do inventário atual.'); return; }
    setBusy(true);
    let examId = form.exam;
    if (!examId || examId === 'novo') {
      const name = form.newExam.trim();
      const existing = catalog.find(e => e.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      if (existing) examId = existing.id;
      else {
        const result = await supabase.from('pcmso_exam_catalog').insert({ company_id: companyId, name }).select('id').single();
        if (result.error) { toast.error(result.error.message); setBusy(false); return; }
        examId = result.data.id;
      }
    }
    const payload = { company_id: companyId, program_id: programId, exam_id: examId, exam_name: '', exam_type: form.type, periodicity_months: form.type === 'periodico' ? months : null, scope: group ? 'ghe' : 'todos', snapshot_id: group?.snapshot.id ?? null, ghe_id: group?.ghe.id ?? null, risk_id: group && form.risk !== 'nenhum' ? form.risk : null, justification: form.justification.trim(), notes: form.notes.trim() };
    const result = editing ? await supabase.from('pcmso_protocols').update(payload).eq('id', editing.id).select('id').single() : await supabase.from('pcmso_protocols').insert(payload).select('id').single();
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    setOpen(false); toast.success('Protocolo salvo para revisão médica.'); await load(); onChange();
  };
  const toggle = async (row: Protocol) => {
    if (!editable || busy) return;
    setBusy(true);
    const result = await supabase.from('pcmso_protocols').update({ active: !row.active }).eq('id', row.id).select('id').single();
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    await load(); onChange();
  };
  const showHistory = async (row: Protocol) => {
    const result = await supabase.from('pcmso_protocol_history').select('*').eq('protocol_id', row.id).order('recorded_at', { ascending: false });
    if (result.error) { toast.error('Não foi possível consultar o histórico.'); return; }
    setHistory(result.data ?? []);
  };

  return <section className="space-y-4 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardList className="h-5 w-5 text-primary" /> Protocolos de exames</h2>{editable && <Button onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" /> Novo protocolo</Button>}</div>
    {loading ? <Loader2 aria-label="Carregando protocolos" className="h-5 w-5 animate-spin text-primary" /> : error ? <p role="alert" className="text-destructive">{error}</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum protocolo de exame cadastrado.</p> : rows.map(row => {
      const source = sources.find(s => s.id === row.snapshot_id);
      const ghe = source?.content.ghes.find(g => g.id === row.ghe_id);
      const risk = source?.content.risks.find(r => r.id === row.risk_id);
      return <div key={row.id} className="space-y-2 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{row.exam_name}</h3><Badge variant={row.active ? 'outline' : 'secondary'}>{row.active ? TYPES[row.exam_type] : 'Inativo'}</Badge></div><div className="flex gap-1">{editable && <><Button variant="ghost" size="icon" title="Editar protocolo" aria-label={`Editar ${row.exam_name}`} onClick={() => edit(row)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={busy} title={row.active ? 'Desativar protocolo' : 'Reativar protocolo'} aria-label={`${row.active ? 'Desativar' : 'Reativar'} ${row.exam_name}`} onClick={() => void toggle(row)}><Archive className="h-4 w-4" /></Button></>}<Button variant="ghost" size="icon" title="Histórico do protocolo" aria-label={`Histórico de ${row.exam_name}`} onClick={() => void showHistory(row)}><History className="h-4 w-4" /></Button></div></div>
        <p className="text-sm text-muted-foreground">{ghe ? `${ghe.name} · ${ghe.role || 'Função não informada'}` : row.scope === 'todos' ? 'Todos os trabalhadores' : 'GHE ausente — revisar'}{risk && ` · ${risk.agent_name}`}{row.periodicity_months && ` · A cada ${row.periodicity_months} meses`}</p>
        {source && row.source_hash !== source.source_hash && <p role="alert" className="text-sm text-destructive">Inventário atualizado — revise e salve este protocolo novamente.</p>}
        <p className="whitespace-pre-wrap break-words text-sm">{row.justification}</p>{row.notes && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{row.notes}</p>}
      </div>;
    })}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? 'Editar protocolo' : 'Novo protocolo de exame'}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}>
      <div className="space-y-2"><Label>Exame</Label><Select value={form.exam || 'novo'} onValueChange={v => change('exam', v)}><SelectTrigger aria-label="Exame"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="novo">Cadastrar exame</SelectItem>{catalog.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>{(!form.exam || form.exam === 'novo') && <Input aria-label="Nome do exame" placeholder="Nome do exame" value={form.newExam} maxLength={200} onChange={e => change('newExam', e.target.value)} required />}</div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Tipo de exame ocupacional</Label><Select value={form.type} onValueChange={v => change('type', v)}><SelectTrigger aria-label="Tipo de exame"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>{form.type === 'periodico' && <div className="space-y-2"><Label htmlFor="protocol-months">Periodicidade (meses)</Label><Input id="protocol-months" type="number" min={1} max={120} required value={form.months} onChange={e => change('months', e.target.value)} /></div>}</div>
      <div className="space-y-2"><Label>Grupo / função</Label><Select value={form.group} onValueChange={v => setForm(prev => ({ ...prev, group: v, risk: 'nenhum' }))}><SelectTrigger aria-label="Grupo do protocolo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os trabalhadores</SelectItem>{groups.map(g => <SelectItem key={g.key} value={g.key}>{g.ghe.name} · {g.ghe.role || 'Função não informada'}</SelectItem>)}</SelectContent></Select></div>
      {group && <div className="space-y-2"><Label>Risco de origem</Label><Select value={form.risk} onValueChange={v => change('risk', v)}><SelectTrigger aria-label="Risco do protocolo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nenhum">Grupo completo</SelectItem>{risks.map(r => <SelectItem key={r.id} value={r.id}>{r.agent_name}</SelectItem>)}</SelectContent></Select></div>}
      <div className="space-y-2"><Label htmlFor="protocol-justification">Justificativa</Label><Textarea id="protocol-justification" required minLength={3} maxLength={10000} value={form.justification} onChange={e => change('justification', e.target.value)} /></div><div className="space-y-2"><Label htmlFor="protocol-notes">Observações</Label><Textarea id="protocol-notes" maxLength={10000} value={form.notes} onChange={e => change('notes', e.target.value)} /></div>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar protocolo</Button>
    </form></DialogContent></Dialog>
    <Dialog open={history !== null} onOpenChange={v => { if (!v) setHistory(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Histórico do protocolo</DialogTitle></DialogHeader>{history?.map(h => { const content = h.content as unknown as Protocol; return <div key={h.id} className="space-y-2 border-b pb-3 text-sm"><p className="font-medium">{new Date(h.recorded_at).toLocaleString('pt-BR')} · {content.exam_name}</p><p>{TYPES[content.exam_type]}{content.periodicity_months ? ` · ${content.periodicity_months} meses` : ''} · {content.active ? 'Ativo' : 'Inativo'}</p><p className="whitespace-pre-wrap break-words text-muted-foreground">{content.justification}</p></div>; })}</DialogContent></Dialog>
  </section>;
}