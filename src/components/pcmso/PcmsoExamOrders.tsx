import { useEffect, useState } from 'react';
import { CalendarClock, History, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { examDeadline } from '@/lib/pcmsoExamStatus';
import { toast } from 'sonner';

type Order = Tables<'pcmso_exam_orders'>;
type Worker = Pick<Tables<'pcmso_workers'>, 'id' | 'full_name' | 'status'>;
type Protocol = Pick<Tables<'pcmso_protocols'>, 'id' | 'exam_name' | 'exam_type' | 'program_id'>;
const statuses: Record<string, string> = { solicitado: 'Solicitado', agendado: 'Agendado', compareceu: 'Compareceu', cancelado: 'Cancelado' };
const types: Record<string, string> = { admissional: 'Admissional', periodico: 'Periódico', retorno: 'Retorno', mudanca_risco: 'Mudança de riscos', demissional: 'Demissional' };
const deadlines: Record<string, string> = { vencido: 'Vencido', hoje: 'Vence hoje', a_vencer: 'A vencer', encerrado: 'Encerrado' };
const dateLabel = (date: string | null) => date ? date.split('-').reverse().join('/') : '—';
function snapshotText(value: unknown, key: string): string {
  if (typeof value !== 'object' || value === null || !(key in value)) return '';
  const item = (value as Record<string, unknown>)[key];
  return typeof item === 'string' ? item : '';
}

export function PcmsoExamOrders({ companyId }: { companyId: string }) {
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<Tables<'pcmso_exam_order_history'>[] | null>(null);
  const [form, setForm] = useState({ worker: '', protocol: '', due: '', status: 'agendado', scheduled: '', location: '', reason: '', key: '' });
  const load = async () => {
    const results = await Promise.all([
      supabase.from('pcmso_exam_orders').select('*').eq('company_id', companyId).order('due_date'),
      supabase.from('pcmso_workers').select('id,full_name,status').eq('company_id', companyId).order('full_name'),
      supabase.from('pcmso_protocols').select('id,exam_name,exam_type,program_id').eq('company_id', companyId).eq('active', true),
    ]);
    setError(results.some(r => r.error) ? 'Não foi possível carregar as convocações.' : '');
    setRows(results[0].data ?? []); setWorkers(results[1].data ?? []); setProtocols(results[2].data ?? []);
  };
  useEffect(() => {
    let cancelled = false;
    setAllowed(false); setRows([]); setWorkers([]); setProtocols([]);
    void supabase.rpc('pcmso_exam_can', { _company_id: companyId }).then(result => {
      if (cancelled || result.error || !result.data) return;
      setAllowed(true); void load();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);
  if (!allowed) return null;
  const today = new Date().toLocaleDateString('en-CA');
  const visible = rows.filter(row => (filter === 'todos' || examDeadline(row.due_date, row.status, today) === filter) && snapshotText(row.worker_snapshot, 'name').toLowerCase().includes(search.toLowerCase()));
  const edit = (row: Order | null) => {
    setEditing(row);
    setForm({ worker: row?.worker_id ?? '', protocol: row?.protocol_id ?? '', due: row?.due_date ?? '', status: row?.status === 'agendado' ? 'agendado' : 'agendado', scheduled: row?.scheduled_date ?? '', location: row?.location ?? '', reason: '', key: crypto.randomUUID() });
    setOpen(true);
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    const result = editing
      ? await supabase.rpc('pcmso_update_exam_order', { _order_id: editing.id, _status: form.status, _scheduled_date: form.scheduled || null, _location: form.location, _reason: form.reason })
      : await supabase.rpc('pcmso_request_exam', { _company_id: companyId, _worker_id: form.worker, _protocol_id: form.protocol, _due_date: form.due, _request_key: form.key });
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    setOpen(false); await load(); toast.success(editing ? 'Convocação atualizada.' : 'Solicitação de teste criada.');
  };
  const showHistory = async (row: Order) => {
    const result = await supabase.from('pcmso_exam_order_history').select('*').eq('company_id', companyId).eq('order_id', row.id).order('recorded_at', { ascending: false });
    if (result.error) { toast.error('Não foi possível consultar o histórico.'); return; }
    setHistory(result.data ?? []);
  };
  return <section className="space-y-4 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="h-5 w-5 text-primary" /> Convocações de exames <Badge variant="outline">Simulação</Badge></h2><Button onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" /> Nova solicitação</Button></div>
    <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Buscar convocação por trabalhador" placeholder="Buscar trabalhador" value={search} onChange={e => setSearch(e.target.value)} /><Select value={filter} onValueChange={setFilter}><SelectTrigger className="sm:w-48" aria-label="Filtrar vencimentos"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os prazos</SelectItem>{Object.entries(deadlines).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
    {error ? <div role="alert" className="text-destructive">{error}<Button variant="ghost" onClick={() => void load()}>Tentar novamente</Button></div> : visible.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Nenhuma convocação encontrada.</p> : visible.map(row => {
      const deadline = examDeadline(row.due_date, row.status, today);
      return <div key={row.id} className="space-y-2 border-b py-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0 space-y-1"><h3 className="break-words font-medium">{snapshotText(row.worker_snapshot, 'name')}</h3><p className="break-words text-sm">{snapshotText(row.protocol_snapshot, 'exam_name')} · {types[snapshotText(row.protocol_snapshot, 'exam_type')]}</p></div><div className="flex shrink-0">{!['cancelado', 'compareceu'].includes(row.status) && <Button variant="ghost" size="icon" title="Atualizar convocação" aria-label={`Atualizar convocação de ${snapshotText(row.worker_snapshot, 'name')}`} onClick={() => edit(row)}><Pencil className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" title="Histórico" aria-label={`Histórico da convocação de ${snapshotText(row.worker_snapshot, 'name')}`} onClick={() => void showHistory(row)}><History className="h-4 w-4" /></Button></div></div><div className="flex flex-wrap items-center gap-2 text-sm"><Badge variant={deadline === 'vencido' ? 'destructive' : 'outline'}>{deadlines[deadline]}</Badge><span>{statuses[row.status]} · Prazo {dateLabel(row.due_date)} · Agendamento {dateLabel(row.scheduled_date)}</span></div>{row.location && <p className="break-words text-sm text-muted-foreground">{row.location}</p>}</div>;
    })}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Atualizar convocação de teste' : 'Nova solicitação de teste'}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}>
      {!editing ? <><Label>Trabalhador</Label><Select value={form.worker} onValueChange={worker => setForm(prev => ({ ...prev, worker }))}><SelectTrigger aria-label="Trabalhador da convocação"><SelectValue placeholder="Selecionar trabalhador" /></SelectTrigger><SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}{w.status === 'desligado' ? ' · Desligado' : ''}</SelectItem>)}</SelectContent></Select><Label>Protocolo</Label><Select value={form.protocol} onValueChange={protocol => setForm(prev => ({ ...prev, protocol }))}><SelectTrigger aria-label="Protocolo da convocação"><SelectValue placeholder="Selecionar protocolo ativo" /></SelectTrigger><SelectContent>{protocols.map(p => <SelectItem key={p.id} value={p.id}>{p.exam_name} · {types[p.exam_type]}</SelectItem>)}</SelectContent></Select><Label htmlFor="exam-due">Prazo</Label><Input id="exam-due" type="date" required value={form.due} onChange={e => setForm(prev => ({ ...prev, due: e.target.value }))} /></> : <><Label>Situação</Label><Select value={form.status} onValueChange={status => setForm(prev => ({ ...prev, status }))}><SelectTrigger aria-label="Situação da convocação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="agendado">Agendado</SelectItem>{editing.status === 'agendado' && <SelectItem value="compareceu">Compareceu</SelectItem>}<SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select><Label htmlFor="exam-scheduled">Data do agendamento</Label><Input id="exam-scheduled" type="date" required={form.status === 'agendado'} value={form.scheduled} onChange={e => setForm(prev => ({ ...prev, scheduled: e.target.value }))} /><Label htmlFor="exam-location">Local</Label><Input id="exam-location" maxLength={300} value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} /><Label htmlFor="exam-reason">Motivo da alteração</Label><Input id="exam-reason" required minLength={3} maxLength={1000} value={form.reason} onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))} /></>}
      <Button type="submit" disabled={busy || (!editing && (!form.worker || !form.protocol || !form.due))}>{editing ? 'Salvar convocação' : 'Criar solicitação'}</Button>
    </form></DialogContent></Dialog>
    <Dialog open={history !== null} onOpenChange={value => { if (!value) setHistory(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Histórico da convocação</DialogTitle></DialogHeader>{history?.map(entry => <div key={entry.id} className="space-y-1 border-b pb-3 text-sm"><p>{new Date(entry.recorded_at).toLocaleString('pt-BR')} · {statuses[snapshotText(entry.content, 'status')]}</p><p className="break-words">{entry.reason}</p><p>Agendamento: {dateLabel(snapshotText(entry.content, 'scheduled_date') || null)}</p></div>)}</DialogContent></Dialog>
  </section>;
}