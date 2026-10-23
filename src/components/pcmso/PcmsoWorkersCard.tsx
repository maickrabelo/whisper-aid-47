import { useEffect, useMemo, useState } from 'react';
import { Loader2, Users, Download, Plus, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Worker {
  id: string; full_name: string; cpf: string; registration_number: string | null; status: string;
}
interface HistoryRow {
  id: string; worker_id: string; event_type: string; role: string | null; sector: string | null;
  start_date: string | null; end_date: string | null; source: string;
}
interface ImportResult {
  novos: number; ja_cadastrados: number; duplicados_no_pgr: number; cpf_invalido: number; ja_importados: number; simulacao: boolean;
}

const EVENT_LABEL: Record<string, string> = {
  admissao: 'Admissão', mudanca_funcao: 'Mudança de função', desligamento: 'Desligamento', readmissao: 'Readmissão',
};

const maskCpf = (cpf: string) => `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
const fmtDate = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');

export const isValidCpf = (raw: string) => {
  const cpf = raw.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
};

export const PcmsoWorkersCard = ({ companyId, canManage }: { companyId: string; canManage: boolean }) => {
  const db = supabase as any;
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', cpf: '', registration_number: '', role: '', sector: '', date: '' });
  const [eventFor, setEventFor] = useState<Worker | null>(null);
  const [eventForm, setEventForm] = useState({ event: 'mudanca_funcao', date: '', role: '', sector: '' });
  const [historyFor, setHistoryFor] = useState<Worker | null>(null);

  const load = async () => {
    setLoading(true);
    const [w, h] = await Promise.all([
      db.from('pcmso_workers').select('id,full_name,cpf,registration_number,status').eq('company_id', companyId).order('full_name'),
      db.from('pcmso_worker_history').select('id,worker_id,event_type,role,sector,start_date,end_date,source').eq('company_id', companyId).order('created_at'),
    ]);
    setWorkers(w.data ?? []);
    setHistory(h.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId]);

  const current = useMemo(() => {
    const map = new Map<string, HistoryRow>();
    history.forEach((h) => { if (h.event_type !== 'desligamento') map.set(h.worker_id, h); });
    return map;
  }, [history]);

  const filtered = workers.filter((w) => {
    const q = search.trim().toLowerCase();
    return !q || w.full_name.toLowerCase().includes(q) || w.cpf.includes(q.replace(/\D/g, '') || '§') || (w.registration_number ?? '').toLowerCase().includes(q);
  });

  const runImport = async (dryRun: boolean) => {
    setBusy(true);
    const { data, error } = await db.rpc('pcmso_import_pgr_workers', { _company_id: companyId, _dry_run: dryRun });
    setBusy(false);
    if (error) { toast.error('Não foi possível ler os trabalhadores do PGR.'); return; }
    if (dryRun) { setPreview(data as ImportResult); return; }
    const r = data as ImportResult;
    toast.success(`${r.novos} trabalhadores importados.`);
    setPreview(null);
    await load();
  };

  const addWorker = async () => {
    const cpf = form.cpf.replace(/\D/g, '');
    if (!form.full_name.trim() || !isValidCpf(cpf)) { toast.error('Informe o nome e um CPF válido.'); return; }
    setBusy(true);
    const { data, error } = await db.from('pcmso_workers').insert({
      company_id: companyId, full_name: form.full_name.trim(), cpf,
      registration_number: form.registration_number.trim() || null,
    }).select('id').single();
    if (error) {
      setBusy(false);
      toast.error(error.code === '23505' ? 'Já existe um trabalhador com esse CPF nesta empresa.' : 'Não foi possível salvar.');
      return;
    }
    await db.from('pcmso_worker_history').insert({
      worker_id: data.id, company_id: companyId, event_type: 'admissao',
      role: form.role.trim() || null, sector: form.sector.trim() || null, start_date: form.date || null,
    });
    setBusy(false);
    setAddOpen(false);
    setForm({ full_name: '', cpf: '', registration_number: '', role: '', sector: '', date: '' });
    toast.success('Trabalhador cadastrado.');
    await load();
  };

  const saveEvent = async () => {
    if (!eventFor) return;
    setBusy(true);
    const { error } = await db.rpc('pcmso_worker_event', {
      _worker_id: eventFor.id, _event: eventForm.event, _date: eventForm.date || null,
      _role: eventForm.role.trim() || null, _sector: eventForm.sector.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message || 'Não foi possível registrar.'); return; }
    toast.success('Registrado no histórico.');
    setEventFor(null);
    await load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Trabalhadores ({workers.length})</CardTitle>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void runImport(true)} disabled={busy}>
              <Download className="mr-1 h-4 w-4" /> Importar do PGR
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Novo</Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Buscar por nome, CPF ou matrícula" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar trabalhador" />
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum trabalhador cadastrado.</p>
        ) : (
          <div className="max-h-[420px] divide-y overflow-y-auto rounded-md border">
            {filtered.map((w) => {
              const c = current.get(w.id);
              return (
                <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{w.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      CPF {maskCpf(w.cpf)}{w.registration_number ? ` · Matr. ${w.registration_number}` : ''}
                      {c?.role ? ` · ${c.role}` : ''}{c?.sector ? ` · ${c.sector}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={w.status === 'ativo' ? 'secondary' : 'outline'}>{w.status === 'ativo' ? 'Ativo' : 'Desligado'}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setHistoryFor(w)} aria-label="Ver histórico"><History className="h-4 w-4" /></Button>
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEventForm({ event: w.status === 'ativo' ? 'mudanca_funcao' : 'readmissao', date: '', role: c?.role ?? '', sector: c?.sector ?? '' });
                        setEventFor(w);
                      }}>Registrar evento</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar trabalhadores do PGR</DialogTitle>
            <DialogDescription>Prévia — nada foi gravado ainda. Trabalhadores nunca são unidos pelo nome, só pelo CPF.</DialogDescription>
          </DialogHeader>
          {preview && (
            <ul className="space-y-1 text-sm">
              <li><b>{preview.novos}</b> novos serão cadastrados</li>
              <li><b>{preview.ja_cadastrados}</b> já existem (CPF igual) e só ganham o vínculo ao GHE</li>
              <li><b>{preview.duplicados_no_pgr}</b> aparecem mais de uma vez no PGR</li>
              <li><b>{preview.cpf_invalido}</b> com CPF inválido serão ignorados</li>
              <li><b>{preview.ja_importados}</b> já foram importados antes</li>
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button>
            <Button onClick={() => void runImport(false)} disabled={busy || !preview || preview.novos + preview.ja_cadastrados + preview.duplicados_no_pgr + preview.cpf_invalido === 0}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Confirmar importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo trabalhador</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={200} /></div>
            <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} maxLength={14} /></div>
            <div><Label>Matrícula</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} maxLength={50} /></div>
            <div><Label>Função</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} maxLength={150} /></div>
            <div><Label>Setor</Label><Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} maxLength={150} /></div>
            <div><Label>Data de admissão</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => void addWorker()} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eventFor} onOpenChange={(o) => !o && setEventFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar evento</DialogTitle>
            <DialogDescription>{eventFor?.full_name} — o histórico anterior é mantido.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Tipo</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={eventForm.event} onChange={(e) => setEventForm({ ...eventForm, event: e.target.value })}>
                {eventFor?.status === 'ativo' ? (
                  <><option value="mudanca_funcao">Mudança de função</option><option value="desligamento">Desligamento</option></>
                ) : <option value="readmissao">Readmissão</option>}
              </select>
            </div>
            <div><Label>Data</Label><Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} /></div>
            {eventForm.event !== 'desligamento' && (
              <>
                <div><Label>Função</Label><Input value={eventForm.role} onChange={(e) => setEventForm({ ...eventForm, role: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Setor</Label><Input value={eventForm.sector} onChange={(e) => setEventForm({ ...eventForm, sector: e.target.value })} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventFor(null)}>Cancelar</Button>
            <Button onClick={() => void saveEvent()} disabled={busy}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Histórico — {historyFor?.full_name}</DialogTitle></DialogHeader>
          <ul className="space-y-2 text-sm">
            {history.filter((h) => h.worker_id === historyFor?.id).map((h) => (
              <li key={h.id} className="rounded-md border px-3 py-2">
                <p className="font-medium">{EVENT_LABEL[h.event_type] ?? h.event_type}{h.source === 'pgr_import' ? ' (importado do PGR)' : ''}</p>
                <p className="text-xs text-muted-foreground">
                  {[h.role, h.sector].filter(Boolean).join(' · ') || '—'} · {fmtDate(h.start_date)}{h.end_date ? ` até ${fmtDate(h.end_date)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
