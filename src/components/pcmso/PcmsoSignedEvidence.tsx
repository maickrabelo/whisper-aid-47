import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

const digest = async (file: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))).map(x => x.toString(16).padStart(2, '0')).join('');
export function PcmsoSignedEvidence({ asoId, programId }: { asoId?: string; programId?: string }) {
  const [rows, setRows] = useState<any[]>([]), [can, setCan] = useState(false), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA')), [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const args = { _aso_id: asoId ?? null, _program_id: programId ?? null };
  const load = async () => { const r = await supabase.rpc('pcmso_evidence_list', args); setCan(!r.error); if (!r.error) setRows(r.data as any[]); else setRows([]); };
  useEffect(() => { void load(); }, [asoId, programId]);
  if (!can) return null;
  const upload = async () => {
    if (!file || busy) return; setBusy(true);
    try {
      if (file.type !== 'application/pdf' || file.size > 10485760 || file.size < 1 || new TextDecoder().decode((await file.arrayBuffer()).slice(0, 5)) !== '%PDF-') throw Error('Selecione um PDF válido de até 10 MB.');
      const r = await supabase.rpc('pcmso_evidence_reserve', { ...args, _filename: file.name, _bytes: file.size, _sha256: await digest(file), _signed_on: date }); if (r.error) throw r.error;
      const ticket = r.data as { id: string; path: string };
      const stored = await supabase.storage.from('pcmso-signed-evidence').upload(ticket.path, file, { contentType: 'application/pdf', upsert: false }); if (stored.error) throw stored.error;
      const result = await supabase.rpc('pcmso_evidence_finalize', { _upload_id: ticket.id }); if (result.error) throw result.error;
      await load(); setOpen(false); setFile(null); toast.success('PDF guardado no piloto; assinatura manual não verificada.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível guardar o PDF.'); } finally { setBusy(false); }
  };
  const download = async (id: string) => {
    setBusy(true); try {
      const auth = await supabase.rpc('pcmso_evidence_list', args); if (auth.error) throw auth.error;
      const row = (auth.data as any[]).find(x => x.id === id); if (!row) throw Error('Documento não autorizado.');
      const r = await supabase.storage.from('pcmso-signed-evidence').download(row.path); if (r.error) throw r.error;
      if (await digest(r.data) !== row.sha256) throw Error('Integridade divergente: download bloqueado.');
      const url = URL.createObjectURL(r.data), a = document.createElement('a'); a.href = url; a.download = `SIMULACAO_${row.filename}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Download não autorizado.'); } finally { setBusy(false); }
  };
  return <div className="space-y-2"><Button size="sm" variant="outline" onClick={() => { setFile(null); setOpen(true); }}><Upload className="mr-1 h-4 w-4" /> PDF assinado</Button>
    {rows.map(row => <div key={row.id} className="flex flex-wrap items-center gap-2 text-xs"><span className="max-w-48 break-words">{row.filename} · {row.signed_on}</span><Button variant="ghost" size="icon" title="Baixar PDF guardado" aria-label="Baixar PDF guardado" disabled={busy} onClick={() => void download(row.id)}><Download className="h-4 w-4" /></Button></div>)}
    <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v); }}><DialogContent><DialogHeader><DialogTitle>Guardar PDF com assinatura manual — simulação</DialogTitle></DialogHeader>
      <Label htmlFor={`signed-date-${asoId ?? programId}`}>Data da assinatura</Label><Input id={`signed-date-${asoId ?? programId}`} type="date" value={date} onChange={e => setDate(e.target.value)} />
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <Button variant="outline" onClick={() => input.current?.click()}><Upload className="mr-2 h-4 w-4" /> Selecionar PDF</Button><p className="break-words text-sm">{file?.name ?? 'Nenhum PDF selecionado'}</p>
      <p className="text-xs text-muted-foreground">Documento simulado. A guarda do arquivo não verifica a assinatura nem confere validade clínica.</p><Button disabled={!file || busy} onClick={() => void upload()}>Guardar PDF simulado</Button>
    </DialogContent></Dialog>
  </div>;
}