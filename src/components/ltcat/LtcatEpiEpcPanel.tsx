import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { HardHat, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LtcatEpiEpc, LtcatExposure, LtcatGhe } from '@/pages/LTCATDetail';

interface Props {
  ltcatId: string;
  ghes: LtcatGhe[];
  exposures: LtcatExposure[];
  items: LtcatEpiEpc[];
  readOnly: boolean;
  onChanged: () => void;
}

const NONE = '__none__';

/** Medidas de proteção (EPI/EPC) vinculadas a GHEs e/ou exposições do LTCAT. */
const LtcatEpiEpcPanel = ({ ltcatId, ghes, exposures, items, readOnly, onChanged }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'EPI' as 'EPI' | 'EPC',
    description: '', ca_number: '', effective: true,
    ghe_id: NONE, exposure_id: NONE, notes: '',
  });

  const openNew = () => {
    setForm({ type: 'EPI', description: '', ca_number: '', effective: true, ghe_id: NONE, exposure_id: NONE, notes: '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.description.trim()) { toast.error('Descreva a medida de proteção.'); return; }
    setSaving(true);
    try {
      const exposureId = form.exposure_id !== NONE ? form.exposure_id : null;
      const gheFromExposure = exposureId ? exposures.find((e) => e.id === exposureId)?.ghe_id : null;
      const { error } = await supabase.from('ltcat_epi_epc' as any).insert({
        ltcat_id: ltcatId,
        type: form.type,
        description: form.description.trim(),
        ca_number: form.type === 'EPI' ? (form.ca_number.trim() || null) : null,
        effective: form.effective,
        exposure_id: exposureId,
        ghe_id: form.ghe_id !== NONE ? form.ghe_id : (gheFromExposure ?? null),
        notes: form.notes.trim() || null,
      } as any);
      if (error) throw error;
      toast.success(`${form.type} registrado.`);
      setOpen(false);
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it: LtcatEpiEpc) => {
    if (!confirm(`Excluir "${it.description}"?`)) return;
    const { error } = await supabase.from('ltcat_epi_epc' as any).delete().eq('id', it.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Registro excluído.');
    onChanged();
  };

  const gheName = (id: string | null) => (id ? ghes.find((g) => g.id === id)?.name : null);
  const exposureName = (id: string | null) => (id ? exposures.find((e) => e.id === id)?.agent_name : null);

  const renderGroup = (type: 'EPI' | 'EPC', title: string) => {
    const rows = items.filter((i) => i.type === type);
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">{title} ({rows.length})</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro.</p>
        ) : (
          <div className="grid gap-2">
            {rows.map((it) => (
              <Card key={it.id}>
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{it.description}</span>
                      {it.ca_number && <Badge variant="outline">CA {it.ca_number}</Badge>}
                      <Badge variant={it.effective ? 'default' : 'secondary'}
                        className={it.effective ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
                        {it.effective ? 'Eficaz' : 'Eficácia não confirmada'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {[gheName(it.ghe_id), exposureName(it.exposure_id)].filter(Boolean).join(' · ') || 'Documento inteiro'}
                      {it.notes ? ` · ${it.notes}` : ''}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button size="icon" variant="ghost" onClick={() => remove(it)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {!readOnly && (
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova medida de proteção</Button>
      )}
      {renderGroup('EPC', 'Proteção Coletiva (EPC)')}
      {renderGroup('EPI', 'Proteção Individual (EPI)')}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" /> Nova medida de proteção
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'EPI' | 'EPC' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EPC">EPC — Proteção Coletiva</SelectItem>
                    <SelectItem value="EPI">EPI — Proteção Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type === 'EPI' && (
                <div className="space-y-1.5">
                  <Label>CA (Certificado de Aprovação)</Label>
                  <Input value={form.ca_number} onChange={(e) => setForm({ ...form, ca_number: e.target.value })} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={form.type === 'EPI' ? 'Ex.: Protetor auricular tipo plug de silicone' : 'Ex.: Enclausuramento acústico da máquina'}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vincular a exposição (opcional)</Label>
                <Select value={form.exposure_id} onValueChange={(v) => setForm({ ...form, exposure_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {exposures.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.agent_name} ({gheName(e.ghe_id)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vincular a GHE (opcional)</Label>
                <Select value={form.ghe_id} onValueChange={(v) => setForm({ ...form, ghe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {ghes.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.effective} onCheckedChange={(v) => setForm({ ...form, effective: !!v })} />
              Medida eficaz / implantada e mantida
            </label>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LtcatEpiEpcPanel;
