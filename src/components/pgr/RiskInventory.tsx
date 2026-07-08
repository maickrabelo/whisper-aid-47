import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Loader2, FlaskConical, Download, Wheat, X } from "lucide-react";
import { toast } from "sonner";
import { usePgrTerminology } from "@/hooks/usePgrTerminology";
import { COPSOQ_CATEGORY_LABELS } from "@/data/copsoqQuestions";
import { AEPBadge } from "@/components/aep/AEPBadge";

type MatrixSize = 3 | 4 | 5;

interface Risk {
  id: string;
  ghe_id: string | null;
  category: string;
  agent_name: string;
  esocial_agent_code: string | null;
  source: string | null;
  exposure_description: string | null;
  matrix_size: MatrixSize;
  severity: number;
  probability: number;
  risk_level: string;
  existing_epc: string | null;
  existing_epi: string | null;
  epi_ca: string | null;
  measurement_value: number | string | null;
  measurement_unit: string | null;
  exposure_limit: number | string | null;
  source_module: string | null;
  source_module_id: string | null;
}
interface GHE { id: string; name: string; }
interface Agent { code: string; category: string; name: string; }

const CATEGORY_LABELS: Record<string, string> = {
  fisico: 'Físico', quimico: 'Químico', biologico: 'Biológico',
  ergonomico: 'Ergonômico', acidentes: 'Acidentes', psicossocial: 'Psicossocial',
};
const LEVEL_STYLES: Record<string, string> = {
  trivial: 'bg-green-100 text-green-700',
  tolerable: 'bg-lime-100 text-lime-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  substantial: 'bg-orange-100 text-orange-700',
  intolerable: 'bg-red-100 text-red-700',
};
const LEVEL_LABELS: Record<string, string> = {
  trivial: 'Trivial', tolerable: 'Tolerável', moderate: 'Moderado',
  substantial: 'Substancial', intolerable: 'Intolerável',
};

export const classifyRisk = (size: MatrixSize, severity: number, probability: number): string => {
  const v = severity * probability;
  if (size === 3) {
    if (v >= 9) return 'intolerable';
    if (v >= 6) return 'substantial';
    if (v >= 3) return 'moderate';
    if (v >= 2) return 'tolerable';
    return 'trivial';
  }
  if (size === 4) {
    if (v >= 15) return 'intolerable';
    if (v >= 9) return 'substantial';
    if (v >= 5) return 'moderate';
    if (v >= 3) return 'tolerable';
    return 'trivial';
  }
  if (v >= 20) return 'intolerable';
  if (v >= 15) return 'substantial';
  if (v >= 8) return 'moderate';
  if (v >= 4) return 'tolerable';
  return 'trivial';
};

const emptyForm = {
  ghe_id: '',
  category: 'fisico',
  agent_name: '',
  esocial_agent_code: '',
  source: '',
  exposure_description: '',
  matrix_size: 5 as MatrixSize,
  severity: 1,
  probability: 1,
  existing_epc: '',
  existing_epi: '',
  epi_ca: '',
  measurement_value: '',
  measurement_unit: '',
  exposure_limit: '',
  pesticide_product: '',
  pesticide_active_ingredient: '',
  pesticide_toxicity_class: '',
  pesticide_required_epi: '',
  pesticide_reentry_period: '',
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

interface PgtrAgent { id: string; category: string; agent_name: string; typical_severity: number | null; typical_probability: number | null; typical_epi: string | null; description: string | null; }

export const RiskInventory = ({ pgrDocumentId, companyId, documentType }: { pgrDocumentId: string; companyId: string; documentType?: 'pgr' | 'pgtr' }) => {
  const term = usePgrTerminology(documentType);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [ghes, setGhes] = useState<GHE[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pgtrAgents, setPgtrAgents] = useState<PgtrAgent[]>([]);
  const [aepFatorToAep, setAepFatorToAep] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Risk | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importOptions, setImportOptions] = useState<{ type: 'hseit' | 'copsoq'; id: string; title: string }[]>([]);
  const [epiList, setEpiList] = useState<{ name: string; ca: string }[]>([]);
  const [epiDraft, setEpiDraft] = useState<{ name: string; ca: string }>({ name: '', ca: '' });

  const parseEpiPair = (names: string | null | undefined, cas: string | null | undefined) => {
    const n = (names || '').split(',').map(s => s.trim()).filter(Boolean);
    const c = (cas || '').split(',').map(s => s.trim());
    return n.map((name, i) => ({ name, ca: (c[i] || '').trim() }));
  };
  const addEpi = () => {
    const name = epiDraft.name.trim();
    if (!name) return;
    setEpiList(prev => [...prev, { name, ca: epiDraft.ca.trim() }]);
    setEpiDraft({ name: '', ca: '' });
  };
  const removeEpi = (idx: number) => setEpiList(prev => prev.filter((_, i) => i !== idx));

  const load = async () => {
    setLoading(true);
    const promises: any[] = [
      supabase.from('pgr_risks').select('*').eq('pgr_document_id', pgrDocumentId).order('created_at'),
      supabase.from('pgr_ghe').select('id, name').eq('pgr_document_id', pgrDocumentId).order('name'),
      supabase.from('esocial_agents_catalog').select('code, category, name').order('code'),
    ];
    if (term.isRural) {
      promises.push(supabase.from('pgtr_agents_catalog' as any).select('*').order('category, agent_name'));
    }
    const results = await Promise.all(promises);
    const riskList = (results[0].data as any[]) || [];
    setRisks(riskList);
    setGhes((results[1].data as any) || []);
    setAgents((results[2].data as any) || []);
    if (term.isRural) setPgtrAgents((results[3].data as any) || []);

    // Load AEP fator → aep_id mapping for badge links
    const aepFatorIds = riskList.filter(r => r.source_module === 'aep' && r.source_module_id).map(r => r.source_module_id);
    if (aepFatorIds.length) {
      const { data: fats } = await supabase.from('aep_fatores_avaliados' as any).select('id, aep_id').in('id', aepFatorIds);
      const map: Record<string, string> = {};
      (fats as any[] || []).forEach(f => { map[f.id] = f.aep_id; });
      setAepFatorToAep(map);
    } else {
      setAepFatorToAep({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [pgrDocumentId, term.isRural]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setEpiList([]); setEpiDraft({ name: '', ca: '' }); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      ghe_id: r.ghe_id || '',
      category: r.category,
      agent_name: r.agent_name,
      esocial_agent_code: r.esocial_agent_code || '',
      source: r.source || '',
      exposure_description: r.exposure_description || '',
      matrix_size: (r.matrix_size || 5) as MatrixSize,
      severity: r.severity,
      probability: r.probability,
      existing_epc: r.existing_epc || '',
      existing_epi: r.existing_epi || '',
      epi_ca: r.epi_ca || '',
      measurement_value: r.measurement_value ?? '',
      measurement_unit: r.measurement_unit || '',
      exposure_limit: r.exposure_limit ?? '',
      pesticide_product: r.pesticide_product || '',
      pesticide_active_ingredient: r.pesticide_active_ingredient || '',
      pesticide_toxicity_class: r.pesticide_toxicity_class || '',
      pesticide_required_epi: r.pesticide_required_epi || '',
      pesticide_reentry_period: r.pesticide_reentry_period || '',
    });
    setEpiList(parseEpiPair(r.existing_epi, r.epi_ca));
    setEpiDraft({ name: '', ca: '' });
    setOpen(true);
  };

  const setMatrix = (size: MatrixSize) => {
    setForm(f => ({
      ...f,
      matrix_size: size,
      severity: Math.min(f.severity, size),
      probability: Math.min(f.probability, size),
    }));
  };

  const save = async () => {
    if (!form.agent_name.trim()) { toast.error("Informe o agente/risco"); return; }
    setSaving(true);
    try {
      const finalList = [...epiList];
      if (epiDraft.name.trim()) finalList.push({ name: epiDraft.name.trim(), ca: epiDraft.ca.trim() });
      const existing_epi = finalList.map(e => e.name).join(', ');
      const epi_ca = finalList.map(e => e.ca).join(', ');
      const payload: any = { ...form, existing_epi, epi_ca, pgr_document_id: pgrDocumentId };
      if (!payload.ghe_id) payload.ghe_id = null;
      payload.measurement_value = payload.measurement_value === '' || payload.measurement_value == null ? null : Number(payload.measurement_value);
      payload.exposure_limit = payload.exposure_limit === '' || payload.exposure_limit == null ? null : Number(payload.exposure_limit);
      if (!payload.measurement_unit) payload.measurement_unit = null;
      if (editing) {
        const { error } = await supabase.from('pgr_risks').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pgr_risks').insert(payload);
        if (error) throw error;
      }
      toast.success("Risco salvo");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este risco?")) return;
    const { error } = await supabase.from('pgr_risks').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const importPsychosocial = async () => {
    setImporting(true);
    try {
      const { data: hseit } = await supabase
        .from('hseit_assessments')
        .select('id, title')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!hseit) { toast.info("Nenhuma avaliação HSE-IT encontrada"); return; }

      const sourceId = (hseit as any).id;
      const { data: existing } = await supabase
        .from('pgr_risks')
        .select('id')
        .eq('pgr_document_id', pgrDocumentId)
        .eq('source_module', 'hseit')
        .eq('source_module_id', sourceId);
      if (existing && existing.length > 0) {
        toast.info("Riscos psicossociais já importados desta avaliação");
        return;
      }

      const dimensions = [
        'Demandas', 'Controle', 'Apoio da chefia', 'Apoio dos colegas',
        'Relacionamentos', 'Função', 'Mudanças'
      ];
      const inserts = dimensions.map(d => ({
        pgr_document_id: pgrDocumentId,
        category: 'psicossocial',
        agent_name: `Fator psicossocial — ${d}`,
        source: `HSE-IT — ${(hseit as any).title}`,
        matrix_size: 5,
        severity: 3,
        probability: 3,
        source_module: 'hseit',
        source_module_id: sourceId,
      }));
      const { error } = await supabase.from('pgr_risks').insert(inserts as any);
      if (error) throw error;
      toast.success(`${dimensions.length} riscos psicossociais importados — revise severidade/probabilidade`);
      load();
    } catch (e: any) {
      toast.error("Erro ao importar: " + e.message);
    } finally { setImporting(false); }
  };

  const filteredAgents = agents.filter(a => a.category === form.category);

  // Matrizes a exibir: as efetivamente usadas; default 5x5 se nenhum risco
  const usedSizes = Array.from(new Set(risks.map(r => (r.matrix_size || 5) as MatrixSize))).sort() as MatrixSize[];
  const matricesToRender: MatrixSize[] = usedSizes.length ? usedSizes : [5];

  const renderMatrix = (size: MatrixSize) => (
    <div key={size} className="p-4 border rounded-lg bg-card/50">
      <h4 className="text-sm font-semibold mb-2">Matriz {size}×{size} (Severidade × Probabilidade)</h4>
      <div
        className="grid gap-1 text-xs"
        style={{ gridTemplateColumns: `auto repeat(${size}, minmax(0, 1fr))`, maxWidth: size * 70 + 40 }}
      >
        <div></div>
        {range(size).map(p => <div key={p} className="text-center font-medium">P{p}</div>)}
        {range(size).slice().reverse().map(s => (
          <>
            <div key={`s${s}`} className="font-medium flex items-center pr-1">S{s}</div>
            {range(size).map(p => {
              const v = s * p;
              const level = classifyRisk(size, s, p);
              const count = risks.filter(r => (r.matrix_size || 5) === size && r.severity === s && r.probability === p).length;
              return (
                <div key={`${size}-${s}-${p}`} className={`aspect-square flex items-center justify-center rounded ${LEVEL_STYLES[level]} text-center`}>
                  <div>
                    <div className="font-bold">{v}</div>
                    {count > 0 && <div className="text-[10px]">({count})</div>}
                  </div>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2"><FlaskConical className="h-5 w-5" /> Inventário de Riscos</h3>
            <p className="text-sm text-muted-foreground">Identifique e classifique cada risco por categoria. Cada risco pode usar uma matriz 3×3, 4×4 ou 5×5.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={importPsychosocial} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Importar HSE-IT
            </Button>
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Risco</Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          {matricesToRender.map(renderMatrix)}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : risks.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Nenhum risco cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Agente / Risco</TableHead>
                <TableHead>GHE</TableHead>
                <TableHead className="text-center">Matriz</TableHead>
                <TableHead className="text-center">S</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map(r => {
                const ms = (r.matrix_size || 5) as MatrixSize;
                return (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{CATEGORY_LABELS[r.category]}</Badge></TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{r.agent_name}</span>
                        {r.source_module === 'aep' && r.source_module_id && (
                          <AEPBadge aepId={aepFatorToAep[r.source_module_id]} companyId={companyId} />
                        )}
                      </div>
                      {r.esocial_agent_code && <span className="block text-xs text-muted-foreground">e-Social: {r.esocial_agent_code}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{ghes.find(g => g.id === r.ghe_id)?.name || '-'}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{ms}×{ms}</Badge></TableCell>
                    <TableCell className="text-center">{r.severity}</TableCell>
                    <TableCell className="text-center">{r.probability}</TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_STYLES[r.risk_level]}`}>{LEVEL_LABELS[r.risk_level]}</span></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Risco</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={form.category} onChange={e => setForm({ ...form, category: e.target.value, esocial_agent_code: '' })}>
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>GHE</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={form.ghe_id} onChange={e => setForm({ ...form, ghe_id: e.target.value })}>
                    <option value="">— Nenhum —</option>
                    {ghes.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              {form.category !== 'psicossocial' && filteredAgents.length > 0 && (
                <div className="space-y-2">
                  <Label>Agente do e-Social (Tabela 23) — opcional</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={form.esocial_agent_code}
                    onChange={e => {
                      const code = e.target.value;
                      const sel = filteredAgents.find(a => a.code === code);
                      setForm({ ...form, esocial_agent_code: code, agent_name: sel?.name || form.agent_name });
                    }}
                  >
                    <option value="">— Selecionar —</option>
                    {filteredAgents.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                  </select>
                </div>
              )}

              {term.isRural && pgtrAgents.filter(a => a.category === form.category).length > 0 && (
                <div className="space-y-2 p-3 rounded-md border border-primary/30 bg-primary/5">
                  <Label className="flex items-center gap-2"><Wheat className="h-4 w-4" /> Catálogo NR-31 — preencher a partir de agente rural típico</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value=""
                    onChange={e => {
                      const sel = pgtrAgents.find(a => a.id === e.target.value);
                      if (!sel) return;
                      const sev = Math.min(sel.typical_severity || form.severity, form.matrix_size);
                      const prob = Math.min(sel.typical_probability || form.probability, form.matrix_size);
                      setForm(f => ({
                        ...f,
                        agent_name: sel.agent_name,
                        exposure_description: sel.description || f.exposure_description,
                        existing_epi: sel.typical_epi || f.existing_epi,
                        severity: sev,
                        probability: prob,
                      }));
                    }}
                  >
                    <option value="">— Selecionar agente rural típico —</option>
                    {pgtrAgents.filter(a => a.category === form.category).map(a => (
                      <option key={a.id} value={a.id}>{a.agent_name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Selecionar preenche automaticamente nome, descrição, EPI e severidade/probabilidade típicos.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nome do agente / risco *</Label>
                <Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fonte geradora</Label>
                <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Ex: Compressor da linha 2" />
              </div>
              <div className="space-y-2">
                <Label>Descrição da exposição</Label>
                <Textarea rows={2} value={form.exposure_description} onChange={e => setForm({ ...form, exposure_description: e.target.value })} placeholder="Tempo, frequência, intensidade..." />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Medição</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.measurement_value as any}
                    onChange={e => setForm({ ...form, measurement_value: e.target.value })}
                    placeholder="Ex: 85"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input
                    value={form.measurement_unit}
                    onChange={e => setForm({ ...form, measurement_unit: e.target.value })}
                    placeholder="Ex: dB(A), ppm, mg/m³"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite de tolerância</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.exposure_limit as any}
                    onChange={e => setForm({ ...form, exposure_limit: e.target.value })}
                    placeholder="Ex: 85 (NR-15/ACGIH)"
                  />
                </div>
              </div>


              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Matriz de risco</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={form.matrix_size}
                    onChange={e => setMatrix(parseInt(e.target.value) as MatrixSize)}
                  >
                    <option value={3}>3×3</option>
                    <option value={4}>4×4</option>
                    <option value={5}>5×5</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Severidade (1-{form.matrix_size})</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={form.severity} onChange={e => setForm({ ...form, severity: parseInt(e.target.value) })}>
                    {range(form.matrix_size).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Probabilidade (1-{form.matrix_size})</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={form.probability} onChange={e => setForm({ ...form, probability: parseInt(e.target.value) })}>
                    {range(form.matrix_size).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Nível previsto: <span className={`px-2 py-0.5 rounded font-medium ${LEVEL_STYLES[classifyRisk(form.matrix_size, form.severity, form.probability)]}`}>
                  {LEVEL_LABELS[classifyRisk(form.matrix_size, form.severity, form.probability)]}
                </span>
              </div>

              {term.isRural && form.category === 'quimico' && (
                <div className="space-y-3 p-3 rounded-md border border-primary/30 bg-primary/5">
                  <Label className="flex items-center gap-2 font-semibold"><Wheat className="h-4 w-4" /> Dados do Agrotóxico (NR-31.8)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nome comercial do produto</Label>
                      <Input value={form.pesticide_product} onChange={e => setForm({ ...form, pesticide_product: e.target.value })} placeholder="Ex: Roundup, Gramoxone" />
                    </div>
                    <div className="space-y-2">
                      <Label>Princípio ativo</Label>
                      <Input value={form.pesticide_active_ingredient} onChange={e => setForm({ ...form, pesticide_active_ingredient: e.target.value })} placeholder="Ex: Glifosato, Paraquat" />
                    </div>
                    <div className="space-y-2">
                      <Label>Classe toxicológica</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3"
                        value={form.pesticide_toxicity_class}
                        onChange={e => setForm({ ...form, pesticide_toxicity_class: e.target.value })}
                      >
                        <option value="">— Selecionar —</option>
                        <option value="I">Classe I — Extremamente tóxico</option>
                        <option value="II">Classe II — Altamente tóxico</option>
                        <option value="III">Classe III — Medianamente tóxico</option>
                        <option value="IV">Classe IV — Pouco tóxico</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Período de reentrada</Label>
                      <Input value={form.pesticide_reentry_period} onChange={e => setForm({ ...form, pesticide_reentry_period: e.target.value })} placeholder="Ex: 24h, 48h, 7 dias" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>EPI obrigatório para aplicação</Label>
                    <Textarea rows={2} value={form.pesticide_required_epi} onChange={e => setForm({ ...form, pesticide_required_epi: e.target.value })} placeholder="Macacão impermeável, luvas nitrílica, respirador, óculos, botas..." />
                  </div>
                </div>
              )}

              <div className="space-y-2"><Label>EPC existentes</Label><Textarea rows={2} value={form.existing_epc} onChange={e => setForm({ ...form, existing_epc: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>EPIs</Label>
                {epiList.length > 0 && (
                  <div className="space-y-1">
                    {epiList.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-2 py-1">
                        <span className="flex-1"><span className="font-medium">{e.name}</span>{e.ca ? <span className="text-muted-foreground"> — CA {e.ca}</span> : null}</span>
                        <button type="button" onClick={() => removeEpi(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-[1fr_140px_auto] gap-2">
                  <Input
                    value={epiDraft.name}
                    onChange={e => setEpiDraft(d => ({ ...d, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEpi(); } }}
                    placeholder="Nome do EPI (ex.: Luva nitrílica)"
                  />
                  <Input
                    value={epiDraft.ca}
                    onChange={e => setEpiDraft(d => ({ ...d, ca: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEpi(); } }}
                    placeholder="CA"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addEpi}>Adicionar</Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Adicione quantos EPIs forem necessários. O CA é opcional por item.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
