import { useEffect, useMemo, useState } from 'react';
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
import { CheckCircle2, Loader2, Plus, Scale, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LtcatExposure, LtcatGhe } from '@/pages/LTCATDetail';
import {
  consultLegalEngine, loadEngineCatalog, OUTCOME_LABELS,
  type LegalRuleOption, type OccupationalAgent,
} from '@/lib/ltcatEngine';

interface Props {
  ltcatId: string;
  ghes: LtcatGhe[];
  exposures: LtcatExposure[];
  readOnly: boolean;
  onChanged: () => void;
}

const EXPOSURE_TYPES: Array<{ value: string; label: string }> = [
  { value: 'habitual_permanente', label: 'Habitual e permanente' },
  { value: 'intermitente', label: 'Intermitente' },
  { value: 'eventual', label: 'Eventual' },
];

const CONCLUSION_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  RECONHECIDO: 'Reconhecido',
  NAO_RECONHECIDO: 'Não reconhecido',
  REVISAO_HUMANA: 'Revisão humana',
};

const isConcluded = (s: string) => s === 'RECONHECIDO' || s === 'NAO_RECONHECIDO';

const triState = (v: string) => (v === '' ? undefined : v);

/** Exposições ocupacionais por GHE + consulta ao motor jurídico + conclusão humana. */
const LtcatExposuresPanel = ({ ltcatId, ghes, exposures, readOnly, onChanged }: Props) => {
  const [agents, setAgents] = useState<OccupationalAgent[]>([]);
  const [rules, setRules] = useState<LegalRuleOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ghe_id: '', agent_id: '', exposure_type: 'habitual_permanente',
    measured_value: '', unit: '', notes: '',
  });

  const [engineExp, setEngineExp] = useState<LtcatExposure | null>(null);
  const [engineRule, setEngineRule] = useState('');
  const [showAllRules, setShowAllRules] = useState(false);
  const [engineForm, setEngineForm] = useState({
    exposure_date: new Date().toISOString().slice(0, 10),
    measured_value: '', evidence_present: '', activity_listed: '', epi_effective_declared: '',
  });
  const [engineBusy, setEngineBusy] = useState(false);
  const [engineResult, setEngineResult] = useState<any>(null);

  const [concExp, setConcExp] = useState<LtcatExposure | null>(null);
  const [concStatus, setConcStatus] = useState('RECONHECIDO');
  const [concText, setConcText] = useState('');
  const [concBusy, setConcBusy] = useState(false);

  useEffect(() => {
    loadEngineCatalog()
      .then(({ rules, agents }) => { setRules(rules); setAgents(agents); })
      .catch((e) => { console.error(e); toast.error('Falha ao carregar catálogo do motor jurídico.'); });
  }, []);

  const gheName = useMemo(() => {
    const m = new Map(ghes.map((g) => [g.id, g.name]));
    return (id: string) => m.get(id) || 'GHE';
  }, [ghes]);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const openNew = () => {
    if (ghes.length === 0) { toast.error('Cadastre um GHE antes de adicionar exposições.'); return; }
    setForm({ ghe_id: ghes[0].id, agent_id: '', exposure_type: 'habitual_permanente', measured_value: '', unit: '', notes: '' });
    setDialogOpen(true);
  };

  const save = async () => {
    const agent = agentById.get(form.agent_id);
    if (!form.ghe_id) { toast.error('Selecione o GHE.'); return; }
    if (!agent) { toast.error('Selecione o agente do catálogo interno.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('ltcat_exposures' as any).insert({
        ltcat_id: ltcatId,
        ghe_id: form.ghe_id,
        agent_code: agent.internal_code,
        agent_name: agent.name,
        source: 'MANUAL',
        exposure_type: form.exposure_type || null,
        measured_value: form.measured_value !== '' ? Number(form.measured_value) : null,
        unit: form.unit.trim() || null,
        notes: form.notes.trim() || null,
      } as any);
      if (error) throw error;
      toast.success('Exposição cadastrada.');
      setDialogOpen(false);
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar exposição.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e: LtcatExposure) => {
    if (!confirm(`Excluir a exposição a "${e.agent_name}"?`)) return;
    const { error } = await supabase.from('ltcat_exposures' as any).delete().eq('id', e.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Exposição excluída.');
    onChanged();
  };

  // ─── Motor jurídico ────────────────────────────────────────
  const openEngine = (e: LtcatExposure) => {
    setEngineExp(e);
    setEngineResult(e.engine_output || null);
    setEngineRule(e.engine_rule_key || '');
    setShowAllRules(false);
    setEngineForm({
      exposure_date: new Date().toISOString().slice(0, 10),
      measured_value: e.measured_value != null ? String(e.measured_value) : '',
      evidence_present: '', activity_listed: '', epi_effective_declared: '',
    });
  };

  const agentRules = useMemo(() => {
    if (!engineExp) return rules;
    const agent = agents.find((a) => a.internal_code === engineExp.agent_code);
    if (!agent || showAllRules) return rules;
    const filtered = rules.filter((r) => r.agent_id === agent.id);
    return filtered.length ? filtered : rules;
  }, [engineExp, rules, agents, showAllRules]);

  const runEngine = async () => {
    if (!engineExp) return;
    if (!engineRule) { toast.error('Selecione a regra jurídica.'); return; }
    setEngineBusy(true);
    setEngineResult(null);
    try {
      const input: Record<string, unknown> = { exposure_date: engineForm.exposure_date };
      if (engineForm.measured_value !== '') input.measured_value = engineForm.measured_value;
      if (triState(engineForm.evidence_present)) input.evidence_present = engineForm.evidence_present;
      if (triState(engineForm.activity_listed)) input.activity_listed = engineForm.activity_listed;
      if (triState(engineForm.epi_effective_declared)) input.epi_effective_declared = engineForm.epi_effective_declared;

      const output = await consultLegalEngine({
        rule_key: engineRule, input, ltcat_id: ltcatId, exposure_id: engineExp.id,
      });
      setEngineResult(output);
      const { error } = await supabase.from('ltcat_exposures' as any).update({
        engine_rule_key: engineRule,
        engine_input: input,
        engine_output: output,
        engine_consulted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq('id', engineExp.id);
      if (error) throw error;
      toast.success('Consulta registrada na exposição.');
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha na consulta ao motor.');
    } finally {
      setEngineBusy(false);
    }
  };

  // ─── Conclusão humana ──────────────────────────────────────
  const openConclusion = (e: LtcatExposure) => {
    setConcExp(e);
    setConcStatus(e.conclusion_status === 'PENDING' ? 'RECONHECIDO' : e.conclusion_status);
    setConcText(e.conclusion_text || '');
  };

  const saveConclusion = async () => {
    if (!concExp) return;
    if (!concText.trim()) { toast.error('Informe a fundamentação da conclusão.'); return; }
    setConcBusy(true);
    try {
      const { error } = await supabase.from('ltcat_exposures' as any).update({
        conclusion_status: concStatus,
        conclusion_text: concText.trim(),
        concluded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq('id', concExp.id);
      if (error) throw error;
      toast.success('Conclusão registrada.');
      setConcExp(null);
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar conclusão.');
    } finally {
      setConcBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova exposição</Button>
      )}

      {exposures.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma exposição cadastrada. Cada exposição vincula um GHE a um agente do catálogo
            interno e poderá ser consultada no motor jurídico.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {exposures.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{e.agent_name}</p>
                      <Badge variant="outline">{e.agent_code}</Badge>
                      <Badge variant="secondary">{gheName(e.ghe_id)}</Badge>
                      {e.exposure_type && (
                        <Badge variant="outline">
                          {EXPOSURE_TYPES.find((t) => t.value === e.exposure_type)?.label || e.exposure_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {e.measured_value != null ? `Valor medido: ${e.measured_value} ${e.unit || ''}` : 'Sem valor medido'}
                      {e.notes ? ` · ${e.notes}` : ''}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button size="icon" variant="ghost" onClick={() => remove(e)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {e.engine_output && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Scale className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {OUTCOME_LABELS[e.engine_output.outcome] || e.engine_output.outcome}
                      </span>
                      {e.engine_rule_key && <Badge variant="outline">{e.engine_rule_key}</Badge>}
                      {e.engine_output.rule_version != null && (
                        <span className="text-xs text-muted-foreground">regra v{e.engine_output.rule_version}</span>
                      )}
                    </div>
                    {e.engine_output.reasoning_summary && (
                      <p className="text-muted-foreground">{e.engine_output.reasoning_summary}</p>
                    )}
                    {e.engine_output.rule_checksum && (
                      <p className="text-xs text-muted-foreground font-mono">
                        checksum {String(e.engine_output.rule_checksum).slice(0, 16)}…
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={isConcluded(e.conclusion_status) ? 'default' : 'secondary'}
                    className={e.conclusion_status === 'RECONHECIDO' ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
                  >
                    {CONCLUSION_LABELS[e.conclusion_status] || e.conclusion_status}
                  </Badge>
                  {!readOnly && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEngine(e)}>
                        <Scale className="h-4 w-4 mr-1" />
                        {e.engine_output ? 'Reconsultar motor' : 'Consultar motor jurídico'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openConclusion(e)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {e.conclusion_status === 'PENDING' ? 'Concluir' : 'Editar conclusão'}
                      </Button>
                    </>
                  )}
                </div>
                {e.conclusion_text && (
                  <p className="text-sm border-l-2 border-primary/30 pl-3">{e.conclusion_text}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Nova exposição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova exposição ocupacional</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>GHE *</Label>
                <Select value={form.ghe_id} onValueChange={(v) => setForm({ ...form, ghe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o GHE" /></SelectTrigger>
                  <SelectContent>
                    {ghes.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agente (catálogo interno) *</Label>
                <Select value={form.agent_id} onValueChange={(v) => setForm({ ...form, agent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o agente" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.internal_code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de exposição</Label>
                <Select value={form.exposure_type} onValueChange={(v) => setForm({ ...form, exposure_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPOSURE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor medido</Label>
                <Input
                  type="number" step="any" value={form.measured_value}
                  onChange={(e) => setForm({ ...form, measured_value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="dB(A), mg/m³..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar exposição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consulta ao motor */}
      <Dialog open={!!engineExp} onOpenChange={(o) => { if (!o) setEngineExp(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consulta ao motor jurídico — {engineExp?.agent_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Regra jurídica *</Label>
              <Select value={engineRule} onValueChange={setEngineRule}>
                <SelectTrigger><SelectValue placeholder="Selecione a regra" /></SelectTrigger>
                <SelectContent>
                  {agentRules.map((r) => (
                    <SelectItem key={r.rule_key} value={r.rule_key}>
                      {r.rule_key} — {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Checkbox checked={showAllRules} onCheckedChange={(v) => setShowAllRules(!!v)} />
                Mostrar todas as regras (não apenas as do agente)
              </label>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data da exposição</Label>
                <Input
                  type="date" value={engineForm.exposure_date}
                  onChange={(e) => setEngineForm({ ...engineForm, exposure_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor medido</Label>
                <Input
                  type="number" step="any" value={engineForm.measured_value}
                  onChange={(e) => setEngineForm({ ...engineForm, measured_value: e.target.value })}
                />
              </div>
              {([
                ['evidence_present', 'Evidência técnica presente?'],
                ['activity_listed', 'Atividade listada no Anexo IV?'],
                ['epi_effective_declared', 'EPI eficaz declarado?'],
              ] as const).map(([key, label]) => (
                <div className="space-y-1.5" key={key}>
                  <Label>{label}</Label>
                  <Select
                    value={(engineForm as any)[key]}
                    onValueChange={(v) => setEngineForm({ ...engineForm, [key]: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {engineResult && (
              <div className="rounded-md border p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{OUTCOME_LABELS[engineResult.outcome] || engineResult.outcome}</Badge>
                  {engineResult.rule_version != null && (
                    <span className="text-xs text-muted-foreground">regra v{engineResult.rule_version}</span>
                  )}
                </div>
                {engineResult.reasoning_summary && <p>{engineResult.reasoning_summary}</p>}
                {engineResult.threshold != null && (
                  <p className="text-muted-foreground">
                    Limite: {engineResult.operator} {engineResult.threshold} {engineResult.unit || ''}
                    {engineResult.measured_value != null ? ` · Medido: ${engineResult.measured_value}` : ''}
                  </p>
                )}
                {Array.isArray(engineResult.blocking_conflicts) && engineResult.blocking_conflicts.length > 0 && (
                  <p className="text-destructive">Conflitos bloqueantes: {engineResult.blocking_conflicts.join(', ')}</p>
                )}
                {Array.isArray(engineResult.missing_information) && engineResult.missing_information.length > 0 && (
                  <p className="text-amber-600">Informações faltantes: {engineResult.missing_information.join(', ')}</p>
                )}
                {engineResult.advisory && <p className="text-muted-foreground italic">{engineResult.advisory}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEngineExp(null)}>Fechar</Button>
            <Button onClick={runEngine} disabled={engineBusy}>
              {engineBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Consultar e registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conclusão humana */}
      <Dialog open={!!concExp} onOpenChange={(o) => { if (!o) setConcExp(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conclusão humana — {concExp?.agent_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              A conclusão previdenciária é sempre humana. O motor jurídico é consultivo e seu
              resultado deve ser avaliado pelo responsável técnico.
            </p>
            <div className="space-y-1.5">
              <Label>Status da conclusão</Label>
              <Select value={concStatus} onValueChange={setConcStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECONHECIDO">Reconhecido (gera direito previdenciário)</SelectItem>
                  <SelectItem value="NAO_RECONHECIDO">Não reconhecido</SelectItem>
                  <SelectItem value="REVISAO_HUMANA">Revisão humana necessária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fundamentação *</Label>
              <Textarea
                rows={4} value={concText} onChange={(e) => setConcText(e.target.value)}
                placeholder="Fundamente o enquadramento (ou não enquadramento) previdenciário..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcExp(null)}>Cancelar</Button>
            <Button onClick={saveConclusion} disabled={concBusy}>
              {concBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LtcatExposuresPanel;
