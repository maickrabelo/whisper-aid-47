import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Stethoscope, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LtcatEvaluation, LtcatExposure, LtcatGhe } from '@/pages/LTCATDetail';

interface Props {
  ltcatId: string;
  exposures: LtcatExposure[];
  ghes: LtcatGhe[];
  evaluations: LtcatEvaluation[];
  readOnly: boolean;
  onChanged: () => void;
}

const METHODOLOGIES = ['NHO-01', 'NHO-06', 'NHO-11', 'AVALIACAO_QUALITATIVA', 'NR-15_ANEXO'];

const emptyForm = (exposureId: string) => ({
  exposure_id: exposureId,
  evaluation_date: new Date().toISOString().slice(0, 10),
  methodology_code: '', instrument_name: '', instrument_serial: '',
  calibration_date: '', result_value: '', unit: '', report_reference: '', notes: '',
});

const fmtDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '—';

/** Avaliações quantitativas/qualitativas e instrumentos vinculados às exposições. */
const LtcatEvaluationsPanel = ({ ltcatId, exposures, ghes, evaluations, readOnly, onChanged }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm(''));

  const gheName = (id: string) => ghes.find((g) => g.id === id)?.name || '';
  const exposureLabel = (e: LtcatExposure) => `${e.agent_name} — ${gheName(e.ghe_id)}`;

  const openNew = () => {
    if (exposures.length === 0) { toast.error('Cadastre uma exposição antes de registrar avaliações.'); return; }
    setForm(emptyForm(exposures[0].id));
    setOpen(true);
  };

  const save = async () => {
    if (!form.exposure_id) { toast.error('Selecione a exposição.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('ltcat_evaluations' as any).insert({
        ltcat_id: ltcatId,
        exposure_id: form.exposure_id,
        evaluation_date: form.evaluation_date || null,
        methodology_code: form.methodology_code || null,
        instrument_name: form.instrument_name.trim() || null,
        instrument_serial: form.instrument_serial.trim() || null,
        calibration_date: form.calibration_date || null,
        result_value: form.result_value !== '' ? Number(form.result_value) : null,
        unit: form.unit.trim() || null,
        report_reference: form.report_reference.trim() || null,
        notes: form.notes.trim() || null,
      } as any);
      if (error) throw error;
      toast.success('Avaliação registrada.');
      setOpen(false);
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar avaliação.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ev: LtcatEvaluation) => {
    if (!confirm('Excluir esta avaliação?')) return;
    const { error } = await supabase.from('ltcat_evaluations' as any).delete().eq('id', ev.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Avaliação excluída.');
    onChanged();
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova avaliação</Button>
      )}

      {evaluations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma avaliação registrada. Registre aqui as medições (metodologia, instrumento,
            calibração e resultado) que servem de evidência técnica às exposições.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {evaluations.map((ev) => {
            const exp = exposures.find((e) => e.id === ev.exposure_id);
            return (
              <Card key={ev.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <span className="font-medium">{exp ? exposureLabel(exp) : 'Exposição'}</span>
                      {ev.methodology_code && <Badge variant="outline">{ev.methodology_code}</Badge>}
                    </div>
                    <p className="text-muted-foreground">
                      Data: {fmtDate(ev.evaluation_date)}
                      {ev.result_value != null && ` · Resultado: ${ev.result_value} ${ev.unit || ''}`}
                    </p>
                    {(ev.instrument_name || ev.instrument_serial) && (
                      <p className="text-muted-foreground">
                        Instrumento: {[ev.instrument_name, ev.instrument_serial && `s/n ${ev.instrument_serial}`].filter(Boolean).join(' ')}
                        {ev.calibration_date && ` · Calibração: ${fmtDate(ev.calibration_date)}`}
                      </p>
                    )}
                    {ev.report_reference && (
                      <p className="text-muted-foreground">Relatório/laudo de origem: {ev.report_reference}</p>
                    )}
                    {ev.notes && <p className="text-muted-foreground">{ev.notes}</p>}
                  </div>
                  {!readOnly && (
                    <Button size="icon" variant="ghost" onClick={() => remove(ev)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova avaliação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Exposição *</Label>
              <Select value={form.exposure_id} onValueChange={(v) => setForm({ ...form, exposure_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a exposição" /></SelectTrigger>
                <SelectContent>
                  {exposures.map((e) => <SelectItem key={e.id} value={e.id}>{exposureLabel(e)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data da avaliação</Label>
                <Input type="date" value={form.evaluation_date} onChange={(e) => setForm({ ...form, evaluation_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Metodologia</Label>
                <Select value={form.methodology_code} onValueChange={(v) => setForm({ ...form, methodology_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {METHODOLOGIES.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Instrumento</Label>
                <Input value={form.instrument_name} onChange={(e) => setForm({ ...form, instrument_name: e.target.value })} placeholder="Ex.: Dosímetro de ruído" />
              </div>
              <div className="space-y-1.5">
                <Label>Nº de série</Label>
                <Input value={form.instrument_serial} onChange={(e) => setForm({ ...form, instrument_serial: e.target.value })} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Calibração (data)</Label>
                <Input type="date" value={form.calibration_date} onChange={(e) => setForm({ ...form, calibration_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <Input type="number" step="any" value={form.result_value} onChange={(e) => setForm({ ...form, result_value: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="dB(A)" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Relatório / laudo de origem</Label>
              <Input value={form.report_reference} onChange={(e) => setForm({ ...form, report_reference: e.target.value })} placeholder="Ex.: Relatório nº 123/2026 — Empresa X" />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LtcatEvaluationsPanel;
