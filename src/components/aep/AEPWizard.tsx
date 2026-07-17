import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Loader2, Trash2, Plus, ChevronLeft, ChevronRight, Check, Download } from "lucide-react";
import { toast } from "sonner";
import {
  useAEPFatoresCatalog,
  AEP_CATEGORIAS,
  AEP_CATEGORIA_COLORS,
  type AEPFatorCatalogo,
} from "@/hooks/useAEPFatoresCatalog";
import { classifyRisk, LEVEL_LABELS, LEVEL_STYLES } from "@/lib/aepRiskLevel";
import { ImportAssessmentDialog, type ImportedFator } from "@/components/aep/ImportAssessmentDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  pgrDocumentId?: string | null;
  onCreated?: (aepId: string) => void;
}

const METODOLOGIAS = [
  { v: 'observacao', l: 'Observação da atividade' },
  { v: 'entrevista', l: 'Entrevista individual' },
  { v: 'grupo_focal', l: 'Grupo focal' },
  { v: 'questionario', l: 'Questionário validado' },
  { v: 'outro', l: 'Outro' },
];

interface FatorForm {
  tempId: string;
  escopo_ref: string | null;
  categoria: AEPFatorCatalogo['categoria'];
  fator_codigo: string | null;
  fator_nome: string;
  fonte_causa: string;
  grupos_expostos: string;
  evidencia_texto: string;
  severity: number;
  probability: number;
  observacoes: string;
  source_assessment_type?: 'hseit' | 'copsoq' | null;
  source_assessment_id?: string | null;
}

interface ParticipanteForm {
  tempId: string;
  escopo_ref: string | null;
  nome: string;
  funcao: string;
  tipo_participacao: string;
  anonimizado: boolean;
}

interface EscopoItem {
  tempId: string;
  setor: string;
  funcao: string;
  cbo: string;
  worker_count: number;
  ghe_id?: string;
  situacao_trabalho: string;
}

const GERAL_KEY = '__geral__';

const escopoLabel = (it: EscopoItem) => `${it.setor || '—'} / ${it.funcao || '—'}`;

export function AEPWizard({ open, onOpenChange, companyId, pgrDocumentId, onCreated }: Props) {
  const { data: catalog } = useAEPFatoresCatalog();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [ghes, setGhes] = useState<{ id: string; name: string }[]>([]);

  // Step 1
  const [escopo, setEscopo] = useState<EscopoItem[]>([]);
  const [escopoDraft, setEscopoDraft] = useState<EscopoItem>({ tempId: '', setor: '', funcao: '', cbo: '', worker_count: 1, ghe_id: '', situacao_trabalho: '' });
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nextReviewDate, setNextReviewDate] = useState<string>('');

  // Step 2
  const [methodologies, setMethodologies] = useState<string[]>([]);
  const [methodologyDetails, setMethodologyDetails] = useState('');
  const [instrumentName, setInstrumentName] = useState('');
  const [anonymityEnsured, setAnonymityEnsured] = useState(false);

  // Step 3
  const [fatores, setFatores] = useState<FatorForm[]>([]);
  const [fatorCategoria, setFatorCategoria] = useState<AEPFatorCatalogo['categoria']>('ergonomico_fisico');
  const [fatorSelecionado, setFatorSelecionado] = useState('');
  const [importDialog, setImportDialog] = useState<null | 'hseit' | 'copsoq'>(null);
  const [currentBlocoFat, setCurrentBlocoFat] = useState<string>(GERAL_KEY);

  // Step 4
  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([]);
  const [novoParticipante, setNovoParticipante] = useState<ParticipanteForm>({
    tempId: '', escopo_ref: null, nome: '', funcao: '', tipo_participacao: 'entrevista', anonimizado: false,
  });
  const [currentBlocoPart, setCurrentBlocoPart] = useState<string>(GERAL_KEY);

  // Step 5
  const [respName, setRespName] = useState('');
  const [respRole, setRespRole] = useState('');
  const [respRegistration, setRespRegistration] = useState('');
  const [signConfirm, setSignConfirm] = useState(false);

  useEffect(() => {
    if (!open || !pgrDocumentId) return;
    supabase.from('pgr_ghe').select('id, name').eq('pgr_document_id', pgrDocumentId).order('name')
      .then(({ data }) => setGhes((data as any) || []));
  }, [open, pgrDocumentId]);

  // Ao entrar no passo 3/4, se houver 1 único bloco, seleciona automaticamente
  useEffect(() => {
    if (escopo.length === 1) {
      setCurrentBlocoFat(escopo[0].tempId);
      setCurrentBlocoPart(escopo[0].tempId);
    }
  }, [escopo.length]);

  const reset = () => {
    setStep(1);
    setEscopo([]); setEscopoDraft({ tempId: '', setor: '', funcao: '', cbo: '', worker_count: 1, ghe_id: '', situacao_trabalho: '' });
    setAssessmentDate(new Date().toISOString().split('T')[0]); setNextReviewDate('');
    setMethodologies([]); setMethodologyDetails(''); setInstrumentName(''); setAnonymityEnsured(false);
    setFatores([]); setFatorSelecionado(''); setCurrentBlocoFat(GERAL_KEY);
    setParticipantes([]); setCurrentBlocoPart(GERAL_KEY);
    setRespName(''); setRespRole(''); setRespRegistration(''); setSignConfirm(false);
  };

  const addEscopoItem = () => {
    if (!escopoDraft.setor.trim() || !escopoDraft.funcao.trim()) {
      toast.error('Informe setor e função'); return;
    }
    setEscopo(prev => [...prev, { ...escopoDraft, tempId: crypto.randomUUID(), worker_count: escopoDraft.worker_count || 1 }]);
    // Mantém setor e GHE preenchidos para facilitar o lançamento de várias funções no mesmo setor
    setEscopoDraft({
      tempId: '',
      setor: escopoDraft.setor,
      funcao: '',
      cbo: '',
      worker_count: 1,
      ghe_id: escopoDraft.ghe_id,
      situacao_trabalho: '',
    });
  };
  const clearEscopoDraft = () => setEscopoDraft({ tempId: '', setor: '', funcao: '', cbo: '', worker_count: 1, ghe_id: '', situacao_trabalho: '' });
  const removeEscopoItem = (id: string) => {
    setEscopo(prev => prev.filter(i => i.tempId !== id));
    // Fatores/participantes vinculados voltam para "geral"
    setFatores(prev => prev.map(f => f.escopo_ref === id ? { ...f, escopo_ref: null } : f));
    setParticipantes(prev => prev.map(p => p.escopo_ref === id ? { ...p, escopo_ref: null } : p));
    if (currentBlocoFat === id) setCurrentBlocoFat(GERAL_KEY);
    if (currentBlocoPart === id) setCurrentBlocoPart(GERAL_KEY);
  };
  const updateEscopoItem = (id: string, patch: Partial<EscopoItem>) => {
    setEscopo(prev => prev.map(i => i.tempId === id ? { ...i, ...patch } : i));
  };

  const blocoRefFromCurrent = (cur: string): string | null => cur === GERAL_KEY ? null : cur;

  const addFator = (custom?: Partial<FatorForm>) => {
    const fromCatalog = fatorSelecionado && !custom ? catalog.find(c => c.id === fatorSelecionado) : null;
    const f: FatorForm = {
      tempId: crypto.randomUUID(),
      escopo_ref: blocoRefFromCurrent(currentBlocoFat),
      categoria: fromCatalog?.categoria || fatorCategoria,
      fator_codigo: fromCatalog?.codigo || null,
      fator_nome: fromCatalog?.nome || custom?.fator_nome || '',
      fonte_causa: '',
      grupos_expostos: '',
      evidencia_texto: '',
      severity: fromCatalog?.severidade_tipica || 3,
      probability: fromCatalog?.probabilidade_tipica || 3,
      observacoes: '',
      ...custom,
    };
    if (!f.fator_nome.trim()) { toast.error('Informe o nome do fator'); return; }
    setFatores(prev => [...prev, f]);
    setFatorSelecionado('');
  };

  const updateFator = (id: string, patch: Partial<FatorForm>) => {
    setFatores(prev => prev.map(f => f.tempId === id ? { ...f, ...patch } : f));
  };
  const removeFator = (id: string) => setFatores(prev => prev.filter(f => f.tempId !== id));

  const addParticipante = () => {
    if (!novoParticipante.nome.trim() && !novoParticipante.anonimizado) {
      toast.error('Informe o nome ou marque como anonimizado');
      return;
    }
    setParticipantes(prev => [...prev, {
      ...novoParticipante,
      tempId: crypto.randomUUID(),
      escopo_ref: blocoRefFromCurrent(currentBlocoPart),
    }]);
    setNovoParticipante({ tempId: '', escopo_ref: null, nome: '', funcao: '', tipo_participacao: 'entrevista', anonimizado: false });
  };
  const removeParticipante = (id: string) => setParticipantes(prev => prev.filter(p => p.tempId !== id));
  const updateParticipante = (id: string, patch: Partial<ParticipanteForm>) => {
    setParticipantes(prev => prev.map(p => p.tempId === id ? { ...p, ...patch } : p));
  };

  const canNext = () => {
    if (step === 1) {
      return escopo.length > 0 && escopo.every(e => (e.situacao_trabalho || '').trim().length > 0);
    }
    if (step === 2) return methodologies.length > 0;
    if (step === 3) return fatores.length > 0;
    if (step === 4) return participantes.length > 0;
    if (step === 5) return respName.trim() && respRole.trim() && signConfirm;
    return true;
  };

  const escopoSummarySetor = escopo.map(e => e.setor).filter((v, i, a) => a.indexOf(v) === i).join(' / ');
  const escopoSummaryFuncao = escopo.map(e => e.cbo ? `${e.funcao} (CBO ${e.cbo})` : e.funcao).join(', ');
  const primaryGheId = escopo.find(e => e.ghe_id)?.ghe_id || null;

  // Concatenação de situações para o campo legado situacao_trabalho
  const situacaoConcat = useMemo(() => {
    if (escopo.length === 1) return escopo[0].situacao_trabalho;
    return escopo.map((e, i) => `[${i + 1}. ${escopoLabel(e)}]\n${e.situacao_trabalho}`).join('\n\n');
  }, [escopo]);

  const fatoresPorBloco = useMemo(() => {
    const groups: Record<string, FatorForm[]> = { [GERAL_KEY]: [] };
    escopo.forEach(e => { groups[e.tempId] = []; });
    fatores.forEach(f => {
      const key = f.escopo_ref && groups[f.escopo_ref] ? f.escopo_ref : GERAL_KEY;
      groups[key].push(f);
    });
    return groups;
  }, [fatores, escopo]);

  const participantesPorBloco = useMemo(() => {
    const groups: Record<string, ParticipanteForm[]> = { [GERAL_KEY]: [] };
    escopo.forEach(e => { groups[e.tempId] = []; });
    participantes.forEach(p => {
      const key = p.escopo_ref && groups[p.escopo_ref] ? p.escopo_ref : GERAL_KEY;
      groups[key].push(p);
    });
    return groups;
  }, [participantes, escopo]);

  const submit = async () => {
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      const signatureHash = btoa(unescape(encodeURIComponent(`${respName}|${respRole}|${respRegistration}|${new Date().toISOString()}|${fatores.length}`))).slice(0, 32);

      const escopoJson = escopo.map(e => ({
        tempId: e.tempId,
        setor: e.setor,
        funcao: e.funcao,
        cbo: e.cbo || null,
        worker_count: e.worker_count,
        ghe_id: e.ghe_id || null,
        situacao_trabalho: e.situacao_trabalho,
      }));

      const { data: aep, error: err1 } = await supabase
        .from('aep_avaliacoes' as any)
        .insert({
          company_id: companyId,
          pgr_document_id: pgrDocumentId || null,
          ghe_id: primaryGheId,
          setor_nome: escopoSummarySetor,
          funcao_nome: escopoSummaryFuncao,
          escopo_json: escopoJson,
          situacao_trabalho: situacaoConcat,
          assessment_date: assessmentDate,
          next_review_date: nextReviewDate || null,
          responsible_name: respName,
          responsible_role: respRole,
          responsible_registration: respRegistration,
          methodologies,
          methodology_details: methodologyDetails,
          instrument_name: instrumentName,
          anonymity_ensured: anonymityEnsured,
          status: 'completed',
          version: 1,
          signed_at: new Date().toISOString(),
          signature_hash: signatureHash,
          created_by: userId,
        } as any)
        .select('id')
        .single();
      if (err1) throw err1;
      const aepId = (aep as any).id as string;

      if (fatores.length) {
        const { error: err2 } = await supabase.from('aep_fatores_avaliados' as any).insert(
          fatores.map(f => ({
            aep_id: aepId,
            escopo_ref: f.escopo_ref,
            categoria: f.categoria,
            fator_codigo: f.fator_codigo,
            fator_nome: f.fator_nome,
            fonte_causa: f.fonte_causa,
            grupos_expostos: f.grupos_expostos,
            evidencia_texto: f.evidencia_texto,
            severity: f.severity,
            probability: f.probability,
            matrix_size: 5,
            observacoes: f.observacoes,
            source_assessment_type: f.source_assessment_type || null,
            source_assessment_id: f.source_assessment_id || null,
          })) as any
        );
        if (err2) throw err2;
      }
      if (participantes.length) {
        const { error: err3 } = await supabase.from('aep_participantes' as any).insert(
          participantes.map(p => ({
            aep_id: aepId,
            escopo_ref: p.escopo_ref,
            nome: p.anonimizado ? null : p.nome,
            funcao: p.funcao,
            tipo_participacao: p.tipo_participacao,
            anonimizado: p.anonimizado,
          })) as any
        );
        if (err3) throw err3;
      }

      toast.success('AEP criada com sucesso!');
      reset();
      onOpenChange(false);
      onCreated?.(aepId);
    } catch (e: any) {
      toast.error('Erro ao salvar AEP: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const catalogFiltered = catalog.filter(c => c.categoria === fatorCategoria);

  const blocoTitle = (key: string, idx?: number) => {
    if (key === GERAL_KEY) return 'Geral (todos os GHEs)';
    const i = escopo.findIndex(e => e.tempId === key);
    const it = escopo[i];
    if (!it) return 'Geral';
    return `${idx ?? i + 1}. ${escopoLabel(it)}${it.cbo ? ` · CBO ${it.cbo}` : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova AEP — Avaliação Ergonômica Preliminar (NR-17)</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Passo {step} de 5</span>
            <span>{[
              'Identificação', 'Metodologia', 'Fatores', 'Participantes', 'Revisão & assinatura'
            ][step - 1]}</span>
          </div>
          <Progress value={(step / 5) * 100} />
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <Card className="p-3 bg-primary/5 border-primary/20 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Escopo da AEP *</Label>
                <p className="text-xs text-muted-foreground">
                  Cadastre cada GHE / função avaliada. <strong>Cada bloco tem sua própria descrição da situação de trabalho</strong> — depois, no passo 3, você poderá lançar fatores separadamente por bloco.
                </p>
              </div>
              <div className="grid grid-cols-[1fr_1fr_110px_90px_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Setor</Label>
                  <Input value={escopoDraft.setor} onChange={e => setEscopoDraft({ ...escopoDraft, setor: e.target.value })} placeholder="Ex: Produção" />
                </div>
                <div>
                  <Label className="text-xs">Função / cargo</Label>
                  <Input value={escopoDraft.funcao} onChange={e => setEscopoDraft({ ...escopoDraft, funcao: e.target.value })} placeholder="Ex: Operador" />
                </div>
                <div>
                  <Label className="text-xs">CBO</Label>
                  <Input value={escopoDraft.cbo} onChange={e => setEscopoDraft({ ...escopoDraft, cbo: e.target.value })} placeholder="Opcional" />
                </div>
                <div>
                  <Label className="text-xs">Nº trab.</Label>
                  <Input type="number" min={1} value={escopoDraft.worker_count}
                    onChange={e => setEscopoDraft({ ...escopoDraft, worker_count: parseInt(e.target.value) || 1 })} />
                </div>
                <Button size="sm" onClick={addEscopoItem} className="mb-[1px]">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {ghes.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">GHE do PGR (opcional)</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={escopoDraft.ghe_id || ''} onChange={e => setEscopoDraft({ ...escopoDraft, ghe_id: e.target.value })}>
                    <option value="">— Nenhum —</option>
                    {ghes.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
              {escopo.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2">Nenhum item de escopo adicionado ainda.</div>
              ) : (
                <div className="space-y-2">
                  {escopo.map((it, idx) => (
                    <div key={it.tempId} className="p-3 rounded bg-background border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">Bloco {idx + 1}</Badge>
                          <span className="font-medium text-sm">{it.setor}</span>
                          <span className="text-muted-foreground text-sm"> — {it.funcao}</span>
                          {it.cbo && <Badge variant="outline" className="text-[10px]">CBO {it.cbo}</Badge>}
                          <Badge variant="secondary" className="text-[10px]">{it.worker_count} trab.</Badge>
                          {it.ghe_id && <Badge variant="outline" className="text-[10px]">GHE vinculado</Badge>}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeEscopoItem(it.tempId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Situação de trabalho avaliada neste bloco *</Label>
                        <Textarea
                          rows={3}
                          value={it.situacao_trabalho}
                          onChange={e => updateEscopoItem(it.tempId, { situacao_trabalho: e.target.value })}
                          placeholder="Descreva a atividade avaliada deste GHE: tarefas, ferramentas, posto, jornada, ritmo..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data da avaliação *</Label>
                <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Próxima revisão prevista</Label>
                <Input type="date" value={nextReviewDate} onChange={e => setNextReviewDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Metodologia(s) utilizada(s) *</Label>
              <div className="grid grid-cols-2 gap-2">
                {METODOLOGIAS.map(m => (
                  <label key={m.v} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={methodologies.includes(m.v)}
                      onCheckedChange={(c) => setMethodologies(prev => c ? [...prev, m.v] : prev.filter(x => x !== m.v))}
                    />
                    <span className="text-sm">{m.l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Detalhes da aplicação</Label>
              <Textarea rows={3} value={methodologyDetails} onChange={e => setMethodologyDetails(e.target.value)}
                placeholder="Como foi realizada: nº de sessões, duração, locais observados..." />
            </div>
            {methodologies.includes('questionario') && (
              <div className="space-y-2">
                <Label>Nome / referência do instrumento</Label>
                <Input value={instrumentName} onChange={e => setInstrumentName(e.target.value)}
                  placeholder="Ex: COPSOQ III versão brasileira, HSE-IT, JCQ..." />
              </div>
            )}
            <label className="flex items-start gap-2 p-3 rounded border bg-muted/30 cursor-pointer">
              <Checkbox checked={anonymityEnsured} onCheckedChange={(c) => setAnonymityEnsured(!!c)} />
              <div className="text-sm">
                <div className="font-medium">Foi garantido o anonimato dos participantes</div>
                <div className="text-xs text-muted-foreground">Obrigatório quando houver aplicação de questionário validado.</div>
              </div>
            </label>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="p-3 bg-primary/5 border-primary/20 space-y-2">
              <Label className="text-xs">Adicionar fatores para o bloco (GHE):</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={currentBlocoFat}
                onChange={e => setCurrentBlocoFat(e.target.value)}
              >
                {escopo.map((e, i) => (
                  <option key={e.tempId} value={e.tempId}>{i + 1}. {escopoLabel(e)}{e.cbo ? ` · CBO ${e.cbo}` : ''}</option>
                ))}
                <option value={GERAL_KEY}>Geral (aplicável a todos os GHEs)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Cada fator adicionado abaixo é gravado neste bloco. Alterne o bloco para lançar fatores específicos de outro GHE.
              </p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setImportDialog('hseit')}>
                  <Download className="h-4 w-4 mr-1" /> Importar do HSE-IT
                </Button>
                <Button size="sm" variant="outline" onClick={() => setImportDialog('copsoq')}>
                  <Download className="h-4 w-4 mr-1" /> Importar do COPSOQ II
                </Button>
              </div>
            </Card>

            <Card className="p-3 bg-muted/30">
              <Label className="text-xs">Adicionar fator a partir da biblioteca NR-17 / Psicossocial</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <select className="col-span-1 h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={fatorCategoria} onChange={e => { setFatorCategoria(e.target.value as any); setFatorSelecionado(''); }}>
                  {Object.entries(AEP_CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <select className="col-span-2 h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={fatorSelecionado} onChange={e => setFatorSelecionado(e.target.value)}>
                  <option value="">— Selecionar fator —</option>
                  {catalogFiltered.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => addFator()} disabled={!fatorSelecionado}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar da biblioteca
                </Button>
                <Button size="sm" variant="outline" onClick={() => addFator({ fator_nome: 'Novo fator customizado' })}>
                  <Plus className="h-4 w-4 mr-1" /> Fator customizado
                </Button>
              </div>
            </Card>

            {/* Lista agrupada por bloco */}
            <div className="space-y-4">
              {fatores.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">Nenhum fator adicionado ainda.</div>
              )}
              {[...escopo.map(e => e.tempId), GERAL_KEY].map(key => {
                const list = fatoresPorBloco[key] || [];
                if (list.length === 0) return null;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px bg-border flex-1" />
                      <Badge variant="outline" className="text-[11px]">{blocoTitle(key)}</Badge>
                      <span className="text-[11px] text-muted-foreground">{list.length} fator(es)</span>
                      <div className="h-px bg-border flex-1" />
                    </div>
                    {list.map(f => {
                      const level = classifyRisk(5, f.severity, f.probability);
                      return (
                        <Card key={f.tempId} className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={AEP_CATEGORIA_COLORS[f.categoria]}>
                                  {AEP_CATEGORIAS[f.categoria]}
                                </Badge>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_STYLES[level]}`}>
                                  {LEVEL_LABELS[level]}
                                </span>
                                {f.source_assessment_type && (
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                                    Importado do {f.source_assessment_type === 'hseit' ? 'HSE-IT' : 'COPSOQ II'}
                                  </Badge>
                                )}
                                <select
                                  className="ml-auto h-7 rounded-md border border-input bg-background px-2 text-[11px]"
                                  value={f.escopo_ref || GERAL_KEY}
                                  onChange={e => updateFator(f.tempId, { escopo_ref: e.target.value === GERAL_KEY ? null : e.target.value })}
                                  title="Bloco (GHE) deste fator"
                                >
                                  {escopo.map((e, i) => (
                                    <option key={e.tempId} value={e.tempId}>Bloco {i + 1} — {escopoLabel(e)}</option>
                                  ))}
                                  <option value={GERAL_KEY}>Geral</option>
                                </select>
                              </div>
                              <Input value={f.fator_nome} onChange={e => updateFator(f.tempId, { fator_nome: e.target.value })}
                                className="font-medium" />
                              <div className="grid grid-cols-2 gap-2">
                                <Textarea rows={2} placeholder="Fonte / causa identificada"
                                  value={f.fonte_causa} onChange={e => updateFator(f.tempId, { fonte_causa: e.target.value })} />
                                <Textarea rows={2} placeholder="Grupos expostos"
                                  value={f.grupos_expostos} onChange={e => updateFator(f.tempId, { grupos_expostos: e.target.value })} />
                              </div>
                              <Textarea rows={2} placeholder="Evidência coletada (observações do avaliador, trechos de entrevista, resultado de questionário...)"
                                value={f.evidencia_texto} onChange={e => updateFator(f.tempId, { evidencia_texto: e.target.value })} />
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Severidade (1-5)</Label>
                                  <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={f.severity} onChange={e => updateFator(f.tempId, { severity: parseInt(e.target.value) })}>
                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Probabilidade (1-5)</Label>
                                  <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={f.probability} onChange={e => updateFator(f.tempId, { probability: parseInt(e.target.value) })}>
                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => removeFator(f.tempId)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground p-3 rounded bg-muted/50 border">
              A NR-17 exige participação dos trabalhadores. Registre quem foi ouvido/consultado. Use anonimato quando aplicável.
            </div>

            <Card className="p-3 bg-primary/5 border-primary/20 space-y-2">
              <Label className="text-xs">Adicionar participante para o bloco (GHE):</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={currentBlocoPart}
                onChange={e => setCurrentBlocoPart(e.target.value)}
              >
                {escopo.map((e, i) => (
                  <option key={e.tempId} value={e.tempId}>{i + 1}. {escopoLabel(e)}{e.cbo ? ` · CBO ${e.cbo}` : ''}</option>
                ))}
                <option value={GERAL_KEY}>Geral (participou de mais de um GHE)</option>
              </select>
            </Card>

            <Card className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nome" value={novoParticipante.nome}
                  onChange={e => setNovoParticipante(p => ({ ...p, nome: e.target.value }))}
                  disabled={novoParticipante.anonimizado} />
                <Input placeholder="Função" value={novoParticipante.funcao}
                  onChange={e => setNovoParticipante(p => ({ ...p, funcao: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <select className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={novoParticipante.tipo_participacao}
                  onChange={e => setNovoParticipante(p => ({ ...p, tipo_participacao: e.target.value }))}>
                  <option value="entrevista">Entrevista</option>
                  <option value="grupo_focal">Grupo focal</option>
                  <option value="questionario">Questionário</option>
                  <option value="observacao">Observação</option>
                  <option value="outro">Outro</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={novoParticipante.anonimizado}
                    onCheckedChange={c => setNovoParticipante(p => ({ ...p, anonimizado: !!c, nome: c ? '' : p.nome }))} />
                  Anonimizado
                </label>
              </div>
              <Button size="sm" onClick={addParticipante}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar participante
              </Button>
            </Card>

            <div className="space-y-3">
              {participantes.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhum participante registrado.</div>
              )}
              {[...escopo.map(e => e.tempId), GERAL_KEY].map(key => {
                const list = participantesPorBloco[key] || [];
                if (list.length === 0) return null;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px bg-border flex-1" />
                      <Badge variant="outline" className="text-[11px]">{blocoTitle(key)}</Badge>
                      <span className="text-[11px] text-muted-foreground">{list.length}</span>
                      <div className="h-px bg-border flex-1" />
                    </div>
                    {list.map(p => (
                      <div key={p.tempId} className="flex items-center justify-between p-2 border rounded gap-2">
                        <div className="text-sm flex-1">
                          <span className="font-medium">{p.anonimizado ? '(Anonimizado)' : p.nome}</span>
                          {p.funcao && <span className="text-muted-foreground"> — {p.funcao}</span>}
                          <Badge variant="outline" className="ml-2 text-[10px]">{p.tipo_participacao}</Badge>
                        </div>
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-[11px]"
                          value={p.escopo_ref || GERAL_KEY}
                          onChange={e => updateParticipante(p.tempId, { escopo_ref: e.target.value === GERAL_KEY ? null : e.target.value })}
                        >
                          {escopo.map((e, i) => (
                            <option key={e.tempId} value={e.tempId}>Bloco {i + 1}</option>
                          ))}
                          <option value={GERAL_KEY}>Geral</option>
                        </select>
                        <Button size="icon" variant="ghost" onClick={() => removeParticipante(p.tempId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground p-3 rounded bg-muted/50 border">
              Confirme os dados do responsável técnico. A AEP será registrada como concluída e assinada.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome do responsável técnico *</Label>
                <Input value={respName} onChange={e => setRespName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cargo / formação *</Label>
                <Input value={respRole} onChange={e => setRespRole(e.target.value)} placeholder="Ex: Ergonomista, Engenheiro de Segurança, Psicólogo do Trabalho" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Registro profissional (CREA / CRP / outro)</Label>
              <Input value={respRegistration} onChange={e => setRespRegistration(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 p-3 rounded border bg-primary/5">
              <Checkbox checked={signConfirm} onCheckedChange={c => setSignConfirm(!!c)} />
              <div className="text-sm">
                <div className="font-medium">Declaro que os dados acima são verdadeiros e assumo a responsabilidade técnica desta AEP</div>
                <div className="text-xs text-muted-foreground">A assinatura será registrada com hash + data/hora do envio.</div>
              </div>
            </label>

            <Card className="p-3 space-y-2 text-sm">
              <div className="font-semibold">Resumo por bloco (GHE)</div>
              {escopo.map((e, i) => {
                const fs = fatoresPorBloco[e.tempId]?.length || 0;
                const ps = participantesPorBloco[e.tempId]?.length || 0;
                return (
                  <div key={e.tempId} className="border rounded p-2 space-y-1">
                    <div className="font-medium">{i + 1}. {escopoLabel(e)} <span className="text-xs text-muted-foreground">· {e.worker_count} trab.</span></div>
                    <div className="text-xs text-muted-foreground">Fatores: {fs} · Participantes: {ps}</div>
                    {e.situacao_trabalho && (
                      <div className="text-xs line-clamp-2 text-muted-foreground">"{e.situacao_trabalho}"</div>
                    )}
                  </div>
                );
              })}
              {(fatoresPorBloco[GERAL_KEY]?.length || participantesPorBloco[GERAL_KEY]?.length) ? (
                <div className="border rounded p-2 bg-muted/30">
                  <div className="font-medium text-xs">Geral (todos os GHEs)</div>
                  <div className="text-xs text-muted-foreground">
                    Fatores: {fatoresPorBloco[GERAL_KEY]?.length || 0} · Participantes: {participantesPorBloco[GERAL_KEY]?.length || 0}
                  </div>
                </div>
              ) : null}
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Total: {fatores.length} fator(es) · {participantes.length} participante(s) · {methodologies.length} metodologia(s)
              </div>
            </Card>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1 || saving}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canNext() || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Concluir e assinar
            </Button>
          )}
        </div>
      </DialogContent>

      {importDialog && (
        <ImportAssessmentDialog
          open={!!importDialog}
          onOpenChange={(v) => { if (!v) setImportDialog(null); }}
          type={importDialog}
          companyId={companyId}
          onImport={(imported: ImportedFator[]) => {
            const ref = blocoRefFromCurrent(currentBlocoFat);
            setFatores(prev => [
              ...prev,
              ...imported.map(i => ({
                tempId: crypto.randomUUID(),
                escopo_ref: ref,
                categoria: 'psicossocial' as const,
                fator_codigo: null,
                fator_nome: i.fator_nome,
                fonte_causa: i.fonte_causa,
                grupos_expostos: '',
                evidencia_texto: i.evidencia_texto,
                severity: i.severity,
                probability: i.probability,
                observacoes: '',
                source_assessment_type: i.source_assessment_type,
                source_assessment_id: i.source_assessment_id,
              })),
            ]);
          }}
        />
      )}
    </Dialog>
  );
}
