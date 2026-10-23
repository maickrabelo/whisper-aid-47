import { useEffect, useState } from 'react';
import { CalendarCheck, History, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
const statuses = { planejada: 'Planejadas', em_andamento: 'Em andamento', concluida: 'Concluídas', cancelada: 'Canceladas' };
type Action = Tables<'pcmso_actions'>;
const blank = { title: '', responsible: '', due_date: '', status: 'planejada', notes: '' };
export function PcmsoActions({ programId, companyId, editable }: { programId: string; companyId: string; editable: boolean }) {
  const [rows, setRows] = useState<Action[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Action | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Tables<'pcmso_action_history'>[] | null>(null);
  const load = async () => {
    const result = await supabase.from('pcmso_actions').select('*').eq('program_id', programId).order('due_date').order('created_at');
    setRows(result.data ?? []); setError(result.error ? 'Não foi possível carregar as ações.' : '');
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [programId, editable]);
  const edit = (row: Action | null) => { setEditing(row); setForm(row ? { title: row.title, responsible: row.responsible, due_date: row.due_date ?? '', status: row.status, notes: row.notes } : blank); setOpen(true); };
  const save = async () => {
    if (!editable || busy) return;
    if (editing && form.status !== editing.status && ['concluida', 'cancelada'].includes(form.status) && !window.confirm(`Confirmar ação ${form.status === 'concluida' ? 'concluída' : 'cancelada'}?`)) return;
    setBusy(true);
    const payload = { ...form, title: form.title.trim(), program_id: programId, company_id: companyId, due_date: form.due_date || null };
    const result = editing ? await supabase.from('pcmso_actions').update(payload).eq('id', editing.id).select('id').single() : await supabase.from('pcmso_actions').insert(payload).select('id').single();
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    setOpen(false); await load(); toast.success('Ação salva.');
  };
  const showHistory = async (row: Action) => {
    const result = await supabase.from('pcmso_action_history').select('*').eq('action_id', row.id).order('recorded_at', { ascending: false });
    if (result.error) { toast.error('Não foi possível consultar o histórico.'); return; }
    setHistory(result.data ?? []);
  };
  const list = (items: Action[]) => items.length ? items.map(row => <div key={row.id} className="space-y-2 border-b py-3">
    <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 break-words font-medium">{row.title}</h3><div className="flex shrink-0">{editable && <Button variant="ghost" size="icon" aria-label={`Editar ação ${row.title}`} title="Editar ação" onClick={() => edit(row)}><Pencil className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" aria-label={`Histórico da ação ${row.title}`} title="Histórico da ação" onClick={() => void showHistory(row)}><History className="h-4 w-4" /></Button></div></div>
    <p className="break-words text-sm text-muted-foreground">{row.responsible || 'Responsável pendente'} · {row.due_date ? row.due_date.split('-').reverse().join('/') : 'Prazo pendente'} · {statuses[row.status as keyof typeof statuses]}</p>{row.notes && <p className="whitespace-pre-wrap break-words text-sm">{row.notes}</p>}
  </div>) : <p className="py-4 text-sm text-muted-foreground">Nenhuma ação nesta situação.</p>;
  return <section className="space-y-4 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck className="h-5 w-5 text-primary" /> Ações e cronograma</h2>{editable && <Button onClick={() => edit(null)}><Plus className="mr-2 h-4 w-4" /> Nova ação</Button>}</div>
    {error ? <p role="alert" className="text-destructive">{error}</p> : <Tabs defaultValue="cronograma"><TabsList><TabsTrigger value="cronograma">Cronograma</TabsTrigger><TabsTrigger value="quadro">Quadro</TabsTrigger></TabsList><TabsContent value="cronograma">{list(rows)}</TabsContent><TabsContent value="quadro"><div className="grid gap-6 sm:grid-cols-2">{Object.entries(statuses).map(([key, name]) => <div key={key} className="min-w-0"><h3 className="border-b pb-2 font-semibold">{name} ({rows.filter(r => r.status === key).length})</h3>{list(rows.filter(r => r.status === key))}</div>)}</div></TabsContent></Tabs>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Editar ação preventiva' : 'Nova ação preventiva'}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}>
      {(['title', 'responsible', 'due_date'] as const).map(key => <div key={key} className="space-y-2"><Label htmlFor={`action-${key}`}>{key === 'title' ? 'Ação' : key === 'responsible' ? 'Responsável' : 'Prazo'}</Label><Input id={`action-${key}`} required={key === 'title'} minLength={key === 'title' ? 3 : undefined} maxLength={300} type={key === 'due_date' ? 'date' : 'text'} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} /></div>)}
      <Select value={form.status} onValueChange={status => setForm(prev => ({ ...prev, status }))}><SelectTrigger aria-label="Situação da ação"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statuses).map(([key, name]) => <SelectItem key={key} value={key}>{name}</SelectItem>)}</SelectContent></Select>
      <Label htmlFor="action-notes">Observações preventivas</Label><Textarea id="action-notes" value={form.notes} maxLength={10000} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
      <Button type="submit" disabled={busy}>Salvar ação</Button>
    </form></DialogContent></Dialog>
    <Dialog open={history !== null} onOpenChange={value => { if (!value) setHistory(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Histórico da ação</DialogTitle></DialogHeader>{history?.map(entry => { const item = entry.content as unknown as Action; return <div key={entry.id} className="space-y-2 border-b pb-3 text-sm"><p>{new Date(entry.recorded_at).toLocaleString('pt-BR')}</p><p className="break-words">{item.title} · {statuses[item.status as keyof typeof statuses]}</p><p className="break-words">{item.responsible} · {item.due_date}</p></div>; })}</DialogContent></Dialog>
  </section>;
}