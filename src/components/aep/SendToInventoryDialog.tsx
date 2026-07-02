import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Link2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { aepCategoriaToPgr, classifyRisk, LEVEL_LABELS, LEVEL_STYLES } from "@/lib/aepRiskLevel";
import { AEP_CATEGORIAS, AEP_CATEGORIA_COLORS } from "@/hooks/useAEPFatoresCatalog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  aepId: string;
  pgrDocumentId: string | null;
  companyId: string;
  gheId: string | null;
  onDone?: () => void;
}

interface FatorRow {
  id: string;
  categoria: string;
  fator_nome: string;
  fonte_causa: string | null;
  grupos_expostos: string | null;
  severity: number;
  probability: number;
  matrix_size: number;
  alreadyLinked: boolean;
  suggestedRiskId: string | null;
  suggestedRiskName: string | null;
  chosen: boolean;
  linkMode: 'new' | 'existing';
}

export function SendToInventoryDialog({ open, onOpenChange, aepId, pgrDocumentId, companyId, gheId, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<FatorRow[]>([]);
  const [resolvedPgrId, setResolvedPgrId] = useState<string | null>(pgrDocumentId);
  const [noPgrFound, setNoPgrFound] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setNoPgrFound(false);
      // Resolve PGR: use provided, else find latest for company, and link back to AEP
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
        if (effectivePgrId) {
          await supabase.from('aep_avaliacoes' as any).update({ pgr_document_id: effectivePgrId } as any).eq('id', aepId);
        }
      }
      setResolvedPgrId(effectivePgrId);
      if (!effectivePgrId) {
        setNoPgrFound(true);
        setLoading(false);
        return;
      }
      const [fatoresRes, existingRisksRes, vinculosRes] = await Promise.all([
        supabase.from('aep_fatores_avaliados' as any).select('*').eq('aep_id', aepId).order('created_at'),
        supabase.from('pgr_risks').select('id, agent_name, ghe_id, category').eq('pgr_document_id', effectivePgrId),
        supabase.from('aep_pgr_vinculo' as any).select('aep_fator_id, pgr_risk_id'),
      ]);
      const fatores = (fatoresRes.data as any[]) || [];
      const existingRisks = (existingRisksRes.data as any[]) || [];
      const vinculos = (vinculosRes.data as any[]) || [];
      const linkedFatorIds = new Set(vinculos.map(v => v.aep_fator_id));

      const rowsData: FatorRow[] = fatores.map(f => {
        const alreadyLinked = linkedFatorIds.has(f.id);
        const targetCat = aepCategoriaToPgr(f.categoria);
        const similar = existingRisks.find(r =>
          r.category === targetCat &&
          (!gheId || r.ghe_id === gheId) &&
          r.agent_name.toLowerCase().includes(f.fator_nome.toLowerCase().slice(0, 20))
        );
        return {
          id: f.id,
          categoria: f.categoria,
          fator_nome: f.fator_nome,
          fonte_causa: f.fonte_causa,
          grupos_expostos: f.grupos_expostos,
          severity: f.severity,
          probability: f.probability,
          matrix_size: f.matrix_size || 5,
          alreadyLinked,
          suggestedRiskId: similar?.id || null,
          suggestedRiskName: similar?.agent_name || null,
          chosen: !alreadyLinked,
          linkMode: similar ? 'existing' : 'new',
        };
      });
      setRows(rowsData);
      setLoading(false);
    })();
  }, [open, aepId, pgrDocumentId, companyId, gheId]);

  const submit = async () => {
    if (!resolvedPgrId) return;
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      let created = 0, linked = 0;
      for (const r of rows) {
        if (!r.chosen || r.alreadyLinked) continue;
        let riskId = r.suggestedRiskId;
        if (r.linkMode === 'new' || !riskId) {
          const { data: newRisk, error } = await supabase.from('pgr_risks').insert({
            pgr_document_id: resolvedPgrId,
            ghe_id: gheId,
            category: aepCategoriaToPgr(r.categoria),
            agent_name: r.fator_nome,
            exposure_description: r.fonte_causa || null,
            source: r.grupos_expostos || null,
            matrix_size: r.matrix_size,
            severity: r.severity,
            probability: r.probability,
            source_module: 'aep',
            source_module_id: r.id,
          } as any).select('id').single();
          if (error) throw error;
          riskId = (newRisk as any).id;
          created++;
        } else {
          linked++;
        }
        await supabase.from('aep_pgr_vinculo' as any).insert({
          aep_fator_id: r.id,
          pgr_risk_id: riskId,
          linked_by: userId,
        } as any);
      }
      toast.success(`${created} riscos criados, ${linked} vínculos adicionados`);
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (noPgrFound) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>PGR não vinculado</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 p-4 rounded bg-amber-50 border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm">
              Esta AEP não está vinculada a um documento PGR. Crie ou vincule um PGR para esta empresa antes de enviar os fatores ao inventário de riscos.
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const toggleAll = (v: boolean) => setRows(rs => rs.map(r => ({ ...r, chosen: v && !r.alreadyLinked })));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar fatores ao inventário de riscos do PGR</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>Selecionar todos</Button>
              <Button size="sm" variant="outline" onClick={() => toggleAll(false)}>Nenhum</Button>
              <span className="ml-auto">Preview: cada item vira uma linha no inventário com badge "Origem: AEP"</span>
            </div>
            <div className="space-y-2">
              {rows.map(r => {
                const level = classifyRisk(r.matrix_size as any, r.severity, r.probability);
                return (
                  <Card key={r.id} className={`p-3 ${r.alreadyLinked ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={r.chosen && !r.alreadyLinked}
                        disabled={r.alreadyLinked}
                        onCheckedChange={c => setRows(rs => rs.map(x => x.id === r.id ? { ...x, chosen: !!c } : x))}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.fator_nome}</span>
                          <Badge variant="outline" className={AEP_CATEGORIA_COLORS[r.categoria as keyof typeof AEP_CATEGORIA_COLORS]}>
                            {AEP_CATEGORIAS[r.categoria as keyof typeof AEP_CATEGORIAS]}
                          </Badge>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_STYLES[level]}`}>
                            {LEVEL_LABELS[level]}
                          </span>
                          <span className="text-xs text-muted-foreground">S={r.severity} P={r.probability}</span>
                          {r.alreadyLinked && <Badge variant="secondary" className="text-xs">Já vinculado</Badge>}
                        </div>
                        {r.fonte_causa && <div className="text-xs text-muted-foreground">Fonte: {r.fonte_causa}</div>}
                        {r.suggestedRiskId && !r.alreadyLinked && (
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <Link2 className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">Risco similar já existe:</span>
                            <span className="font-medium">{r.suggestedRiskName}</span>
                            <div className="ml-auto flex gap-1">
                              <button
                                onClick={() => setRows(rs => rs.map(x => x.id === r.id ? { ...x, linkMode: 'existing' } : x))}
                                className={`px-2 py-0.5 rounded border ${r.linkMode === 'existing' ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}
                              >Vincular</button>
                              <button
                                onClick={() => setRows(rs => rs.map(x => x.id === r.id ? { ...x, linkMode: 'new' } : x))}
                                className={`px-2 py-0.5 rounded border ${r.linkMode === 'new' ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}
                              >Criar novo</button>
                            </div>
                          </div>
                        )}
                        {!r.suggestedRiskId && !r.alreadyLinked && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1"><Plus className="h-3 w-3" /> Será criado como novo risco</div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || rows.every(r => !r.chosen || r.alreadyLinked)}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
