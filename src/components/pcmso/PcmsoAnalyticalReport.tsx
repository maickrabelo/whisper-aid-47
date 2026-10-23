import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { blankAnalyticalGroup, indicatorLabels, type Indicator, type AnalyticalContent, type AnalyticalGroup } from '@/lib/pcmso/analyticalReport';
import { createAnalyticalPDF } from './pcmsoAnalyticalPDF';

const blank = () => ({ year: new Date().getFullYear(), groups: [blankAnalyticalGroup()], analysis: '', recommendations: '', sources: '', discussion: '' });
export function PcmsoAnalyticalReport({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<any[]>([]), [can, setCan] = useState(false), [busy, setBusy] = useState(false), [open, setOpen] = useState(false);
  const [form, setForm] = useState<AnalyticalContent>(blank());
  const load = async () => { const r = await supabase.rpc('pcmso_analytical_list', { _company_id: companyId }); setCan(!r.error); setRows(!r.error ? r.data as any[] : []); };
  useEffect(() => { void load(); }, [companyId]);
  if (!can) return null;
  const groupChange = (i: number, values: Partial<AnalyticalGroup>) => setForm({ ...form, groups: form.groups.map((g, j) => j === i ? { ...g, ...values } : g) });
  return <section className="space-y-4 border-t py-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Relatório analítico <Badge variant="outline">Simulação</Badge></h3><Button size="sm" onClick={() => { setForm(blank()); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Novo relatório analítico</Button></div>
    {!rows.length && <p className="text-sm text-muted-foreground">Nenhum relatório analítico registrado.</p>}
    {rows.map(row => <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3" key={row.id}><div><p className="font-medium">{row.year} — revisão {row.revision}</p><p className="text-sm text-muted-foreground">{row.content.status === 'incompleto' ? 'Incompleto — indicadores não informados' : 'Preenchido em simulação — homologação pendente'}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setForm(structuredClone(row.content)); setOpen(true); }}><RotateCcw className="mr-1 h-4 w-4" /> Nova revisão</Button><Button variant="outline" size="sm" disabled={busy} onClick={async () => { setBusy(true); try { const r = await supabase.rpc('pcmso_analytical_list', { _company_id: companyId }); if (r.error) throw r.error; const snapshot = (r.data as any[]).find(x => x.id === row.id); if (!snapshot) throw Error('Sem autorização'); createAnalyticalPDF(snapshot.content, snapshot.revision, snapshot.content_hash).save(`PCMSO_ANALITICO_SIMULADO_${row.year}_R${row.revision}.pdf`); } catch { toast.error('Não foi possível baixar o relatório.'); } finally { setBusy(false); } }}><Download className="mr-1 h-4 w-4" /> PDF</Button></div></div>)}
    <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v); }}><DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Relatório analítico simulado</DialogTitle></DialogHeader>
      <Label htmlFor="analytical-year">Ano do relatório analítico</Label><Input id="analytical-year" type="number" min={2000} max={new Date().getFullYear()} value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
      {form.groups.map((g, i) => <div key={i} className="space-y-3 border-t pt-4"><div className="flex items-center justify-between"><h4 className="font-medium">Grupo {i + 1}</h4><Button size="icon" variant="ghost" title="Remover grupo" aria-label={`Remover grupo ${i + 1}`} disabled={form.groups.length === 1} onClick={() => setForm({ ...form, groups: form.groups.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-3 sm:grid-cols-2">{(['sector', 'role'] as const).map(k => <div key={k}><Label htmlFor={`group-${i}-${k}`}>{k === 'sector' ? 'Setor' : 'Função'}</Label><Input id={`group-${i}-${k}`} maxLength={200} value={g[k]} onChange={e => groupChange(i, { [k]: e.target.value })} /></div>)}</div>
        <div className="grid gap-3 sm:grid-cols-3">{Object.entries(indicatorLabels).map(([key, label]) => <div key={key}><Label htmlFor={`group-${i}-${key}`}>{label}</Label><Input id={`group-${i}-${key}`} type="number" min={0} max={1000000} placeholder="Não informado" value={g[key as Indicator] ?? ''} onChange={e => groupChange(i, { [key]: e.target.value === '' ? null : Number(e.target.value) })} /></div>)}</div>
      </div>)}<Button variant="outline" disabled={form.groups.length >= 100} onClick={() => setForm({ ...form, groups: [...form.groups, blankAnalyticalGroup()] })}><Plus className="mr-1 h-4 w-4" /> Adicionar grupo</Button>
      {Object.entries({ sources: 'Fontes, população e limitações', analysis: 'Análise e comparação com o período anterior', recommendations: 'Medidas e acompanhamento', discussion: 'Discussão com a empresa e CIPA' }).map(([key, label]) => <div key={key}><Label htmlFor={`analytical-${key}`}>{label}</Label><Textarea id={`analytical-${key}`} maxLength={key === 'sources' ? 5000 : key === 'discussion' ? 10000 : 20000} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>)}
      <Button disabled={busy} onClick={async () => { setBusy(true); try { const r = await supabase.rpc('pcmso_analytical_save', { _company_id: companyId, _year: form.year, _content: JSON.parse(JSON.stringify(form)) }); if (r.error) throw r.error; await load(); setOpen(false); toast.success('Revisão analítica simulada preservada.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.'); } finally { setBusy(false); } }}>Salvar relatório analítico simulado</Button>
    </DialogContent></Dialog>
  </section>;
}