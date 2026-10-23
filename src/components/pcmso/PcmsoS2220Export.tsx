import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Download, FileCode, Loader2 } from 'lucide-react';
import { buildS2220, type S2220Preparation } from '@/lib/pcmso/s2220';
import { deliverPreparedFile, prepareXmlDownload, type PreparedDownload } from '@/lib/esocial/download';

export function PcmsoS2220Export({ asoId, signed }: { asoId: string; signed: boolean }) {
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [ready,setReady] = useState<PreparedDownload | null>(null);
  const prepare = async () => {
    setBusy(true); setError(''); setReady(null);
    try {
      const result = await (supabase as any).rpc('pcmso_pilot_prepare_s2220',{ _aso_id:asoId });
      if (result.error) throw result.error;
      const p: S2220Preparation = result.data;
      setReady(await prepareXmlDownload([{ name:`S2220_SIMULADO_${p.event_id}.xml`,xml:buildS2220(p) }],'S2220_SIMULADO'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível preparar o S-2220.'); }
    finally { setBusy(false); }
  };
  return <>
    <Button size="sm" variant="outline" onClick={() => { setOpen(true); setError(''); setReady(null); }}><FileCode className="mr-1 h-4 w-4" /> Exportar S-2220 — teste</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>S-2220 — teste em sistema externo</DialogTitle><DialogDescription>Preparação sem assinatura digital, restrita ao piloto médico.</DialogDescription></DialogHeader>
      <Alert><AlertTitle>Simulação — não enviar em produção</AlertTitle><AlertDescription>O arquivo usa produção restrita (ambiente 2) e ASO simulado, sem validade ocupacional. Um transmissor compatível deverá validar e assinar o XML. O portal web do eSocial não permite importar este arquivo. Download não significa envio ou aceite.</AlertDescription></Alert>
      {!signed && <p role="alert" className="text-sm text-destructive">Registre a declaração de assinatura manual simulada antes de preparar o evento.</p>}
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      <Button disabled={busy || !signed} onClick={() => void prepare()} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />} Validar e preparar XML de teste</Button>
      {ready && <Button variant="outline" className="gap-2" onClick={() => void deliverPreparedFile(ready).catch(() => setError('Não foi possível baixar o arquivo.'))}><Download className="h-4 w-4" /> Baixar XML simulado sem assinatura</Button>}
      <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
    </DialogContent></Dialog>
  </>;
}