import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { createPcmsoPDF, type PcmsoDocumentPayload } from './pcmsoDocumentPDF';
import { PcmsoSignedEvidence } from './PcmsoSignedEvidence';

const blank = { valid_from: '', valid_to: '', objectives: '', responsibilities: '', emergency_flow: '', monitoring: '' };
const fields = { objectives: 'Objetivos', responsibilities: 'Responsabilidades', emergency_flow: 'Fluxo de urgência', monitoring: 'Acompanhamento e avaliação' };
export function PcmsoDocument({ programId, companyId, editable, approved }: { programId: string; companyId: string; editable: boolean; approved: boolean }) {
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.from('pcmso_document_settings').select('*').eq('program_id', programId).maybeSingle().then(result => {
      if (!active) return;
      setError(result.error ? 'Não foi possível carregar o documento.' : '');
      const row = result.data;
      setForm(row ? { valid_from: row.valid_from ?? '', valid_to: row.valid_to ?? '', objectives: row.objectives, responsibilities: row.responsibilities, emergency_flow: row.emergency_flow, monitoring: row.monitoring } : blank);
      setLoading(false);
    });
    return () => { active = false; };
  }, [programId, editable]);
  const save = async () => {
    if (!editable || busy) return;
    setBusy(true);
    const result = await supabase.from('pcmso_document_settings').upsert({ program_id: programId, company_id: companyId, ...form, valid_from: form.valid_from || null, valid_to: form.valid_to || null } satisfies Partial<Tables<'pcmso_document_settings'>>).select('program_id').single();
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success('Documento salvo.');
  };
  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await supabase.rpc('pcmso_document_payload', { _program_id: programId });
      if (result.error) throw result.error;
      const payload = result.data as unknown as PcmsoDocumentPayload;
      createPcmsoPDF(payload).save(`PCMSO_v${payload.content.program.revision_number}_${payload.kind === 'minuta' ? 'BETA' : 'APROVADO'}.pdf`);
    } catch { toast.error('Não foi possível gerar o PDF. Confira sua permissão e tente novamente.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-primary" /> Documento PCMSO</h2><Button variant="outline" disabled={busy || loading || !!error} onClick={() => void download()}><Download className="mr-2 h-4 w-4" />{approved ? 'Baixar versão aprovada' : 'Baixar minuta BETA'}</Button></div>
    {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando documento" /> : error ? <p role="alert" className="text-destructive">{error}</p> : <form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}>
      <div className="grid gap-4 sm:grid-cols-2">{(['valid_from', 'valid_to'] as const).map(key => <div className="space-y-2" key={key}><Label htmlFor={`pcmso-${key}`}>{key === 'valid_from' ? 'Início da vigência' : 'Fim da vigência'}</Label><Input id={`pcmso-${key}`} type="date" disabled={!editable || busy} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} /></div>)}</div>
      {Object.entries(fields).map(([key, label]) => <div className="space-y-2" key={key}><Label htmlFor={`pcmso-${key}`}>{label}</Label><Textarea id={`pcmso-${key}`} disabled={!editable || busy} maxLength={20000} value={form[key as keyof typeof fields]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} /></div>)}
      {editable && <Button type="submit" disabled={busy}><Save className="mr-2 h-4 w-4" /> Salvar documento</Button>}
      {approved && <><p className="text-sm text-muted-foreground">Aprovação médica registrada; a assinatura manual é documentada separadamente.</p><PcmsoSignedEvidence programId={programId} /></>}
    </form>}
  </section>;
}