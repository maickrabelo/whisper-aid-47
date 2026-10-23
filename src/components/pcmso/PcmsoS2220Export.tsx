import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Download, FileCode, Loader2 } from 'lucide-react';
import { type S2220Preparation } from '@/lib/pcmso/s2220';
import { buildS2220Files } from '@/lib/pcmso/s2220Batch';
import { Checkbox } from '@/components/ui/checkbox';
import { deliverPreparedFile, prepareXmlDownload, type PreparedDownload } from '@/lib/esocial/download';

export interface S2220Candidate { id: string; signed: boolean; label: string; date: string }
type Props = { asoId: string; signed: boolean; candidates?: never } | { candidates: S2220Candidate[]; asoId?: never; signed?: never };
export function PcmsoS2220Export(props: Props) {
  const candidates: S2220Candidate[] = props.candidates ?? [{ id: props.asoId, signed: props.signed, label: 'ASO selecionado', date: '' }];
  const batch = Boolean(props.candidates);
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [ready,setReady] = useState<PreparedDownload | null>(null);
  const [selected,setSelected] = useState<string[]>([]), [reviewed,setReviewed] = useState(false), [preparations,setPreparations] = useState<S2220Preparation[]>([]);
  const reset = () => { setError(''); setReady(null); setPreparations([]); setReviewed(false); };
  const selectedRows = candidates.filter(c => selected.includes(c.id));
  const prepare = async () => {
    if (!reviewed || !selectedRows.length || selectedRows.some(c => !c.signed)) return;
    setBusy(true); setError(''); setReady(null); setPreparations([]);
    try {
      const results: S2220Preparation[] = [];
      for (const candidate of selectedRows) {
        const result = await (supabase as any).rpc('pcmso_pilot_prepare_s2220',{ _aso_id:candidate.id });
        if (result.error) throw new Error(`${candidate.label}: ${result.error.message}`);
        results.push(result.data);
      }
      const files = buildS2220Files(results);
      setReady(await prepareXmlDownload(files,results.every(r => r.payload.environment === 1) ? 'S2220' : 'S2220_SIMULADO')); setPreparations(results);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível preparar o S-2220.'); }
    finally { setBusy(false); }
  };
  return <>
    <Button size="sm" variant="outline" onClick={() => { reset(); setSelected(batch ? [] : candidates.filter(c => c.signed).map(c => c.id)); setOpen(true); }}><FileCode className="mr-1 h-4 w-4" /> {batch ? 'Exportar lote S-2220' : 'Exportar S-2220'}</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value) reset(); } }}><DialogContent className="w-[calc(100%-2rem)] max-h-[85vh] overflow-x-hidden overflow-y-auto [&>*]:min-w-0"><DialogHeader><DialogTitle>S-2220 — teste em sistema externo</DialogTitle><DialogDescription>Preparação sem assinatura digital, restrita ao piloto médico.</DialogDescription></DialogHeader>
      <Alert><AlertTitle>Arquivo para envio externo</AlertTitle><AlertDescription>ASOs reais saem em ambiente de produção (1); ASOs antigos de simulação saem em produção restrita (2). Um transmissor compatível, com certificado digital, deverá validar e assinar o XML. O portal web do eSocial não permite importar este arquivo. Download não significa envio ou aceite.</AlertDescription></Alert>
      {batch && <fieldset disabled={busy} className="min-w-0 space-y-3"><legend className="mb-2 font-medium">ASOs para exportação</legend>{!candidates.length && <p className="text-sm text-muted-foreground">Nenhum ASO disponível.</p>}{candidates.map(c => <label key={c.id} className="flex min-w-0 items-start gap-2 border-b pb-2"><Checkbox aria-label={`Selecionar ${c.label} ${c.date}`} disabled={!c.signed} checked={selected.includes(c.id)} onCheckedChange={checked => { reset(); setSelected(ids => checked === true ? [...ids,c.id] : ids.filter(id => id !== c.id)); }} /><span className="min-w-0 break-words text-sm">{c.label} · {c.date}<span className="block text-muted-foreground">{c.signed ? 'Declaração manual simulada registrada' : 'Assinatura manual pendente'}</span></span></label>)}</fieldset>}
      {!batch && !props.signed && <p role="alert" className="text-sm text-destructive">Registre a declaração de assinatura manual antes de preparar o evento.</p>}
      <label className="flex items-start gap-2 text-sm"><Checkbox aria-label="Confirmar revisão dos ASOs S-2220" disabled={busy} checked={reviewed} onCheckedChange={checked => { setReady(null); setPreparations([]); setReviewed(checked === true); }} /><span>Conferi CPF, matrícula, CNPJ, datas, procedimentos da Tabela 27 e CRM/UF nos ASOs selecionados. Este lote contém somente simulações para ambiente 2.</span></label>
      {error && <p role="alert" className="whitespace-pre-line break-words text-sm text-destructive">{error} Nenhum arquivo deste lote foi liberado.</p>}
      <Button disabled={busy || !reviewed || !selectedRows.length || selectedRows.some(c => !c.signed)} onClick={() => void prepare()} className="h-auto min-h-10 gap-2 whitespace-normal">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />} Validar e preparar XML de teste</Button>
      {preparations.length > 0 && <div className="space-y-2 text-sm"><p className="font-medium">{preparations.length} evento(s) · ambiente {preparations[0]?.payload.environment} · não transmitido(s)</p>{preparations.map(p => <div key={p.event_id} className="break-words border-b pb-2"><p>{p.payload.worker.registration_number} · {p.payload.issued_on} · {p.payload.physician.name} / CRM {p.payload.physician.crm}-{p.payload.physician.crm_uf}</p><p className="text-xs text-muted-foreground">{p.event_id} · {p.schema_version}</p></div>)}</div>}
      {ready && <Button variant="outline" className="h-auto min-h-10 gap-2 whitespace-normal" onClick={() => void deliverPreparedFile(ready).catch(() => setError('Não foi possível baixar o arquivo.'))}><Download className="h-4 w-4" /> {ready.count > 1 ? `Baixar ZIP (${ready.count} XMLs) sem assinatura` : 'Baixar XML sem assinatura'}</Button>}
      <Button variant="ghost" disabled={busy} onClick={() => { setOpen(false); reset(); }}>Fechar</Button>
    </DialogContent></Dialog>
  </>;
}