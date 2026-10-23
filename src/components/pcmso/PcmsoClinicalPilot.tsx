import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileCheck, Plus, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { procedureName, buildS2220, type S2220Preparation } from '@/lib/pcmso/s2220';
import { createPcmsoAsoPDF } from './pcmsoAsoPDF';

type Row = Record<string, any>;
const today = () => new Date().toLocaleDateString('en-CA');
const empty = () => ({ order: '', date: today(), notes: '', code: '', procedureDate: today(), procedureNote: '', procedureOrder: '' });
const rpc = async (name: string, args: Row) => { const r = await (supabase as any).rpc(name, args); if (r.error) throw new Error(r.error.message); return r.data; };
const saveFile = (text: string, name: string, type: string) => { const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

export function PcmsoClinicalPilot({ companyId }: { companyId: string }) {
  const [access, setAccess] = useState({ pilot: false, clinical: false, responsible: false });
  const [orders, setOrders] = useState<Row[]>([]), [entries, setEntries] = useState<Row[]>([]), [asos, setAsos] = useState<Row[]>([]), [reports, setReports] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [year, setYear] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState(empty()), [open, setOpen] = useState(false), [procedures, setProcedures] = useState<Row[]>([]);
  const [issue, setIssue] = useState<Row | null>(null), [fitness, setFitness] = useState(''), [issueDate, setIssueDate] = useState(today());
  const [signature, setSignature] = useState<Row | null>(null), [signedOn, setSignedOn] = useState(today()), [reference, setReference] = useState('');

  const load = async () => {
    setError('');
    try {
      const [pilot, clinical, responsible] = await Promise.all([rpc('pcmso_pilot_can', { _company_id: companyId, _clinical: false }), rpc('pcmso_pilot_can', { _company_id: companyId, _clinical: true }), rpc('pcmso_can', { _company_id: companyId, _permission: 'program.approve' })]);
      setAccess({ pilot: pilot === true, clinical: clinical === true, responsible: responsible === true });
      setEntries([]); setAsos([]); setOrders([]); setReports([]);
      if (!pilot) return;
      const r = await supabase.from('pcmso_annual_reports').select('*').eq('company_id', companyId).order('year', { ascending: false }).order('revision', { ascending: false });
      if (r.error) throw r.error; setReports(r.data ?? []);
      if (clinical) {
        const [data, o] = await Promise.all([rpc('pcmso_pilot_clinical_read', { _company_id: companyId }), supabase.from('pcmso_exam_orders').select('id,worker_snapshot,status,scheduled_date').eq('company_id', companyId).eq('status', 'compareceu')]);
        if (o.error) throw o.error;
        setEntries(data.entries); setAsos(data.asos); setOrders(o.data ?? []);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar o piloto.'); }
  };
  useEffect(() => { setAccess({ pilot: false, clinical: false, responsible: false }); void load(); }, [companyId]);
  const act = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Operação não concluída.'); } finally { setBusy(false); } };
  if (!access.pilot && !error) return null;
  return <section className="space-y-5" aria-label="Piloto clínico PCMSO">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {access.clinical && <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><Stethoscope className="h-4 w-4" /> Atendimentos e ASO <Badge variant="outline">Simulação</Badge></CardTitle><Button size="sm" onClick={() => { setForm(empty()); setProcedures([]); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Novo atendimento</Button></CardHeader>
      <CardContent className="space-y-3">
        {!entries.length && <p className="text-sm text-muted-foreground">Nenhum atendimento simulado registrado.</p>}
        {entries.map(e => { const a = asos.find(a => a.clinical_entry_id === e.id); const o = orders.find(o => o.id === e.order_id); return <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
          <div className="min-w-0"><p className="break-words font-medium">{o?.worker_snapshot?.name ?? 'Atendimento'} — revisão {e.revision}</p><p className="text-sm text-muted-foreground">{e.exam_date} · {a ? a.signed_on ? 'Assinatura manual declarada (simulada)' : 'ASO com assinatura pendente' : 'ASO não emitido'}</p></div>
          <div className="flex flex-wrap gap-2">{!a ? <Button size="sm" variant="outline" onClick={() => { setIssue(e); setFitness(''); setIssueDate(today()); }}>Emitir ASO simulado</Button> : <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(async () => { const p = await rpc('pcmso_pilot_aso_payload', { _aso_id: a.id }); createPcmsoAsoPDF(p).save(`ASO_SIMULADO_${a.id}.pdf`); })}><Download className="mr-1 h-4 w-4" /> ASO</Button>
            {!a.signed_on && <Button size="sm" variant="outline" onClick={() => { setSignature(a); setSignedOn(today()); setReference(''); }}><FileCheck className="mr-1 h-4 w-4" /> Assinatura manual</Button>}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(async () => { const p: S2220Preparation = await rpc('pcmso_pilot_prepare_s2220', { _aso_id: a.id }); saveFile(buildS2220(p), `S2220_PREPARACAO_NAO_TRANSMITIDA_${p.event_id}.xml`, 'application/xml'); })}><Download className="mr-1 h-4 w-4" /> Preparação S-2220</Button>
          </>}</div>
        </div>; })}
      </CardContent>
    </Card>}
    {access.pilot && <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><CardTitle className="text-base">Relatório anual <Badge variant="outline">Simulação</Badge></CardTitle>{access.responsible && <div className="flex items-center gap-2"><Input className="w-24" aria-label="Ano do relatório" type="number" value={year} onChange={e => setYear(e.target.value)} /><Button size="sm" disabled={busy} onClick={() => void act(async () => { await rpc('pcmso_pilot_annual_report', { _company_id: companyId, _year: Number(year) }); toast.success('Revisão do relatório registrada.'); })}>Preparar relatório</Button></div>}</CardHeader>
      <CardContent className="space-y-3">{!reports.length && <p className="text-sm text-muted-foreground">Nenhum relatório preparado pelo médico responsável.</p>}{reports.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><p className="font-medium">{r.year} — revisão {r.revision}</p><p className="text-sm text-muted-foreground">{r.content.status === 'suprimido' ? 'Grupo abaixo de 5 pessoas: totais ocultos.' : `Incompleto · solicitações ${r.content.totals?.requests} · com ASO ${r.content.totals?.with_aso} · sem ASO ${r.content.totals?.without_aso}`}</p><p className="text-xs text-muted-foreground">Indicadores clínicos não coletados.</p></div><Button size="sm" variant="outline" onClick={() => saveFile(JSON.stringify({ year: r.year, revision: r.revision, content: r.content, hash: r.content_hash }, null, 2), `PCMSO_RELATORIO_SIMULADO_${r.year}_R${r.revision}.json`, 'application/json')}><Download className="mr-1 h-4 w-4" /> Relatório</Button></div>)}</CardContent>
    </Card>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Atendimento simulado</DialogTitle></DialogHeader><div className="space-y-3">
      <Label>Convocação com comparecimento</Label><Select value={form.order} onValueChange={order => setForm({ ...form, order })}><SelectTrigger aria-label="Convocação do atendimento"><SelectValue placeholder="Selecionar trabalhador" /></SelectTrigger><SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.worker_snapshot?.name ?? o.id} — {o.scheduled_date}</SelectItem>)}</SelectContent></Select>
      <Label htmlFor="clinical-date">Data do atendimento</Label><Input id="clinical-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      <Label htmlFor="clinical-notes">Registro clínico simulado</Label><Textarea id="clinical-notes" maxLength={10000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      <Label htmlFor="procedure-code">Código Tabela 27</Label><Input id="procedure-code" maxLength={4} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /><p className="text-sm text-muted-foreground">{procedureName(form.code) || 'Procedimento não selecionado'}</p>
      <Label htmlFor="procedure-date">Data do procedimento</Label><Input id="procedure-date" type="date" value={form.procedureDate} onChange={e => setForm({ ...form, procedureDate: e.target.value })} />
      <Label htmlFor="procedure-note">Observação do procedimento</Label><Input id="procedure-note" maxLength={999} value={form.procedureNote} onChange={e => setForm({ ...form, procedureNote: e.target.value })} />
      {form.code === '0281' && <Select value={form.procedureOrder} onValueChange={procedureOrder => setForm({ ...form, procedureOrder })}><SelectTrigger aria-label="Ordem do exame"><SelectValue placeholder="Ordem" /></SelectTrigger><SelectContent><SelectItem value="1">Inicial</SelectItem><SelectItem value="2">Sequencial</SelectItem></SelectContent></Select>}
      <Button variant="outline" disabled={!procedureName(form.code) || procedures.length >= 99} onClick={() => { setProcedures([...procedures, { code: form.code, name: procedureName(form.code), date: form.procedureDate, note: form.procedureNote, order: form.procedureOrder || undefined }]); setForm({ ...form, code: '', procedureNote: '', procedureOrder: '' }); }}>Adicionar procedimento</Button>
      {procedures.map((p, i) => <div key={i} className="flex items-center justify-between gap-2 text-sm"><span>{p.code} · {p.date}</span><Button variant="ghost" size="sm" onClick={() => setProcedures(procedures.filter((_, j) => j !== i))}>Remover</Button></div>)}
      <Button disabled={busy || !form.order || !form.notes.trim() || !procedures.length} onClick={() => void act(async () => { await rpc('pcmso_pilot_record_encounter', { _order_id: form.order, _exam_date: form.date, _notes: form.notes, _procedures: procedures }); setOpen(false); toast.success('Revisão clínica simulada registrada.'); })}>Salvar atendimento simulado</Button>
    </div></DialogContent></Dialog>
    <Dialog open={!!issue} onOpenChange={v => { if (!v) setIssue(null); }}><DialogContent><DialogHeader><DialogTitle>Emitir ASO simulado</DialogTitle></DialogHeader><Label>Conclusão manual do médico</Label><Select value={fitness} onValueChange={setFitness}><SelectTrigger aria-label="Conclusão de aptidão"><SelectValue placeholder="Escolher conclusão" /></SelectTrigger><SelectContent><SelectItem value="apto">Apto</SelectItem><SelectItem value="inapto">Inapto</SelectItem></SelectContent></Select><Label htmlFor="aso-date">Data de emissão</Label><Input id="aso-date" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /><Button disabled={busy || !fitness} onClick={() => void act(async () => { if (!issue) return; await rpc('pcmso_pilot_issue_aso', { _entry_id: issue.id, _fitness: fitness, _issued_on: issueDate }); setIssue(null); toast.success('ASO simulado emitido, assinatura pendente.'); })}>Confirmar emissão simulada</Button></DialogContent></Dialog>
    <Dialog open={!!signature} onOpenChange={v => { if (!v) setSignature(null); }}><DialogContent><DialogHeader><DialogTitle>Declarar assinatura manual simulada</DialogTitle></DialogHeader><Label htmlFor="signature-date">Data da assinatura manual</Label><Input id="signature-date" type="date" value={signedOn} onChange={e => setSignedOn(e.target.value)} /><Label htmlFor="signature-reference">Referência do documento externo</Label><Input id="signature-reference" maxLength={300} value={reference} onChange={e => setReference(e.target.value)} /><Button disabled={busy || reference.trim().length < 3} onClick={() => void act(async () => { if (!signature) return; await rpc('pcmso_pilot_attest_manual_signature', { _aso_id: signature.id, _signed_on: signedOn, _reference: reference }); setSignature(null); toast.success('Declaração simulada registrada, assinatura não verificada.'); })}>Registrar declaração simulada</Button></DialogContent></Dialog>
  </section>;
}