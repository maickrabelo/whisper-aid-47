import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { aepCategoriaToPgr, AEP_STATUS_LABELS, AEP_STATUS_STYLES } from "@/lib/aepRiskLevel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  pgrDocumentId: string | null;
  onDone?: () => void;
}

interface AEPRow {
  id: string;
  setor_nome: string | null;
  funcao_nome: string | null;
  version: number;
  status: string;
  ghe_id: string | null;
  fatorCount: number;
  linkedCount: number;
  chosen: boolean;
  promoteToCompleted: boolean;
}

export function BulkSendToPGRDialog({ open, onOpenChange, companyId, pgrDocumentId, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<AEPRow[]>([]);
  const [resolvedPgrId, setResolvedPgrId] = useState<string | null>(pgrDocumentId);
  const [noPgrFound, setNoPgrFound] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setNoPgrFound(false);
      setProgress(0);

      let effectivePgrId = pgrDocumentId;
      if (!effectivePgrId && companyId) {
        const { data: latestPgr } = await supabase
          .from('pgr_documents')
          .select('id')
          .eq('company_id', companyId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        effectivePgrId = (latestPgr as any)?.id || null;
      }
      setResolvedPgrId(effectivePgrId);
      if (!effectivePgrId) {
        setNoPgrFound(true);
        setLoading(false);
        return;
      }

      const { data: aeps } = await supabase
        .from('aep_avaliacoes' as any)
        .select('id, setor_nome, funcao_nome, version, status, ghe_id')
        .eq('company_id', companyId)
        .order('setor_nome');

      const aepList = (aeps as any[]) || [];
      const ids = aepList.map(a => a.id);
      let fatCountByAep = new Map<string, number>();
      let linkedByAep = new Map<string, number>();
      if (ids.length) {
        const { data: fats } = await supabase.from('aep_fatores_avaliados' as any).select('id, aep_id').in('aep_id', ids);
        const fatList = (fats as any[]) || [];
        const fatToAep = new Map<string, string>();
        fatList.forEach(f => {
          fatToAep.set(f.id, f.aep_id);
          fatCountByAep.set(f.aep_id, (fatCountByAep.get(f.aep_id) || 0) + 1);
        });
        const fatIds = fatList.map(f => f.id);
        if (fatIds.length) {
          const { data: vinc } = await supabase.from('aep_pgr_vinculo' as any).select('aep_fator_id').in('aep_fator_id', fatIds);
          ((vinc as any[]) || []).forEach(v => {
            const aepId = fatToAep.get(v.aep_fator_id);
            if (aepId) linkedByAep.set(aepId, (linkedByAep.get(aepId) || 0) + 1);
          });
        }
      }

      setRows(aepList.map(a => {
        const isReady = a.status === 'completed' || a.status === 'revised';
        const fatorCount = fatCountByAep.get(a.id) || 0;
        return {
          id: a.id,
          setor_nome: a.setor_nome,
          funcao_nome: a.funcao_nome,
          version: a.version,
          status: a.status,
          ghe_id: a.ghe_id,
          fatorCount,
          linkedCount: linkedByAep.get(a.id) || 0,
          chosen: isReady && fatorCount > 0,
          promoteToCompleted: false,
        };
      }));
      setLoading(false);
    })();
  }, [open, companyId, pgrDocumentId]);

  const readyRows = rows.filter(r => r.status === 'completed' || r.status === 'revised');
  const pendingRows = rows.filter(r => r.status !== 'completed' && r.status !== 'revised');
  const selectedCount = rows.filter(r => r.chosen).length;
  const totalFactorsToProcess = rows
    .filter(r => r.chosen)
    .reduce((sum, r) => sum + Math.max(r.fatorCount - r.linkedCount, 0), 0);

  const submit = async () => {
    if (!resolvedPgrId) return;
    const toProcess = rows.filter(r => r.chosen);
    if (toProcess.length === 0) return;
    setProcessing(true);
    setProgress(0);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      let aepsProcessed = 0;
      let risksCreated = 0;
      let linksCreated = 0;

      for (let i = 0; i < toProcess.length; i++) {
        const r = toProcess[i];

        // Promote to completed if needed
        if (r.status !== 'completed' && r.status !== 'revised') {
          if (!r.promoteToCompleted) {
            // skipped: user didn't authorize promotion
            setProgress(Math.round(((i + 1) / toProcess.length) * 100));
            continue;
          }
          await supabase.from('aep_avaliacoes' as any).update({
            status: 'completed',
            signed_at: new Date().toISOString(),
            pgr_document_id: resolvedPgrId,
          } as any).eq('id', r.id);
        } else {
          // ensure pgr_document_id is set on the AEP
          await supabase.from('aep_avaliacoes' as any).update({ pgr_document_id: resolvedPgrId } as any).eq('id', r.id);
        }

        // Load fatores + existing vinculos + existing risks
        const [fatoresRes, vincRes, risksRes] = await Promise.all([
          supabase.from('aep_fatores_avaliados' as any).select('*').eq('aep_id', r.id),
          supabase.from('aep_pgr_vinculo' as any).select('aep_fator_id'),
          supabase.from('pgr_risks').select('id, agent_name, ghe_id, category').eq('pgr_document_id', resolvedPgrId),
        ]);
        const fatores = (fatoresRes.data as any[]) || [];
        const linkedFatorIds = new Set(((vincRes.data as any[]) || []).map(v => v.aep_fator_id));
        const existingRisks = (risksRes.data as any[]) || [];

        for (const f of fatores) {
          if (linkedFatorIds.has(f.id)) continue;
          const targetCat = aepCategoriaToPgr(f.categoria);
          const similar = existingRisks.find(rr =>
            rr.category === targetCat &&
            (!r.ghe_id || rr.ghe_id === r.ghe_id) &&
            rr.agent_name.toLowerCase().includes((f.fator_nome || '').toLowerCase().slice(0, 20))
          );
          let riskId = similar?.id || null;
          if (!riskId) {
            const { data: newRisk, error } = await supabase.from('pgr_risks').insert({
              pgr_document_id: resolvedPgrId,
              ghe_id: r.ghe_id,
              category: targetCat,
              agent_name: f.fator_nome,
              exposure_description: f.fonte_causa || null,
              source: f.grupos_expostos || null,
              matrix_size: f.matrix_size || 5,
              severity: f.severity,
              probability: f.probability,
              source_module: 'aep',
              source_module_id: f.id,
            } as any).select('id').single();
            if (error) throw error;
            riskId = (newRisk as any).id;
            risksCreated++;
          }
          await supabase.from('aep_pgr_vinculo' as any).insert({
            aep_fator_id: f.id,
            pgr_risk_id: riskId,
            linked_by: userId,
          } as any);
          linksCreated++;
        }
        aepsProcessed++;
        setProgress(Math.round(((i + 1) / toProcess.length) * 100));
      }

      toast.success(`${aepsProcessed} AEP(s) enviadas • ${risksCreated} riscos criados • ${linksCreated} vínculos`);
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error('Erro no envio em lote: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (noPgrFound) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>PGR não encontrado</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 p-4 rounded bg-amber-50 border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm">
              Esta empresa ainda não tem um documento PGR. Crie um PGR antes de enviar as AEPs ao inventário de riscos.
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !processing && onOpenChange(v)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar todas as AEPs ao PGR</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {readyRows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-semibold">Prontas para envio ({readyRows.length})</h3>
                </div>
                <div className="space-y-2">
                  {readyRows.map(r => (
                    <Card key={r.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={r.chosen}
                          disabled={r.fatorCount === 0}
                          onCheckedChange={c => setRows(rs => rs.map(x => x.id === r.id ? { ...x, chosen: !!c } : x))}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{r.setor_nome || '—'}</span>
                            {r.funcao_nome && <span className="text-xs text-muted-foreground">· {r.funcao_nome}</span>}
                            <Badge variant="outline" className="text-xs">v{r.version}</Badge>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${AEP_STATUS_STYLES[r.status]}`}>
                              {AEP_STATUS_LABELS[r.status]}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.fatorCount} fatores • {r.linkedCount} já vinculados • {Math.max(r.fatorCount - r.linkedCount, 0)} pendentes
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pendingRows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 mt-4">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold">AEPs não concluídas ({pendingRows.length})</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Marque a caixa "Concluir e enviar" para promover a AEP para Concluída e enviar seus fatores nesta operação.
                </p>
                <div className="space-y-2">
                  {pendingRows.map(r => (
                    <Card key={r.id} className={`p-3 ${r.promoteToCompleted ? '' : 'opacity-70'}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={r.chosen && r.promoteToCompleted}
                          disabled={r.fatorCount === 0}
                          onCheckedChange={c => setRows(rs => rs.map(x => x.id === r.id ? { ...x, chosen: !!c, promoteToCompleted: !!c } : x))}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{r.setor_nome || '—'}</span>
                            {r.funcao_nome && <span className="text-xs text-muted-foreground">· {r.funcao_nome}</span>}
                            <Badge variant="outline" className="text-xs">v{r.version}</Badge>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${AEP_STATUS_STYLES[r.status]}`}>
                              {AEP_STATUS_LABELS[r.status]}
                            </span>
                            <Badge variant="secondary" className="text-xs">Concluir e enviar</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.fatorCount} fatores {r.fatorCount === 0 && '(sem fatores — não pode ser enviada)'}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {rows.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma AEP cadastrada para esta empresa.
              </div>
            )}

            <div className="border-t pt-3 text-sm">
              <strong>{selectedCount}</strong> AEP(s) selecionada(s) • <strong>{totalFactorsToProcess}</strong> fator(es) gerarão riscos/vínculos no PGR
            </div>

            {processing && (
              <div className="space-y-1">
                <Progress value={progress} />
                <div className="text-xs text-muted-foreground text-center">Enviando… {progress}%</div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>Cancelar</Button>
          <Button onClick={submit} disabled={processing || selectedCount === 0 || loading}>
            {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Confirmar envio em lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
