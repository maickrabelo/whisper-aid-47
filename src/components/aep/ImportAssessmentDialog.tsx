import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  computeHSEITDimensions,
  hseitRiskToSevProb,
  isHighRisk as isHighRiskHSEIT,
  type HSEITDimensionScore,
} from "@/lib/hseitDimensionScoring";
import {
  computeCOPSOQDimensions,
  copsoqRiskToSevProb,
  isHighRisk as isHighRiskCOPSOQ,
  type COPSOQDimensionScore,
  COPSOQ_RISK_LEVEL_LABELS,
} from "@/lib/copsoqDimensionScoring";
import { RISK_LEVEL_LABELS as HSEIT_RISK_LEVEL_LABELS } from "@/data/hseitQuestions";

export type ImportedFator = {
  categoria: 'psicossocial';
  fator_nome: string;
  fonte_causa: string;
  evidencia_texto: string;
  severity: number;
  probability: number;
  source_assessment_type: 'hseit' | 'copsoq';
  source_assessment_id: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: 'hseit' | 'copsoq';
  companyId: string;
  onImport: (fatores: ImportedFator[]) => void;
}

interface AssessmentOption {
  id: string;
  title: string;
  created_at: string;
  respondents: number;
}

interface Dimension {
  key: string;
  label: string;
  average: number;
  riskLevelKey: string;
  riskLevelLabel: string;
  severity: number;
  probability: number;
  suggested: boolean;
}

export function ImportAssessmentDialog({ open, onOpenChange, type, companyId, onImport }: Props) {
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tableAssessments = type === 'hseit' ? 'hseit_assessments' : 'copsoq_assessments';
  const tableResponses  = type === 'hseit' ? 'hseit_responses'  : 'copsoq_responses';
  const tableAnswers    = type === 'hseit' ? 'hseit_answers'    : 'copsoq_answers';
  const typeLabel = type === 'hseit' ? 'HSE-IT' : 'COPSOQ II';

  useEffect(() => {
    if (!open) return;
    setSelectedAssessment('');
    setDimensions([]);
    setSelected(new Set());
    setLoading(true);
    (async () => {
      try {
        const { data: ass } = await supabase
          .from(tableAssessments as any)
          .select('id, title, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        const list = (ass as any[]) || [];

        // Count completed respondents per assessment
        const enriched: AssessmentOption[] = await Promise.all(list.map(async a => {
          const { count } = await supabase
            .from(tableResponses as any)
            .select('id', { count: 'exact', head: true })
            .eq('assessment_id', a.id)
            .not('completed_at', 'is', null);
          return { id: a.id, title: a.title, created_at: a.created_at, respondents: count || 0 };
        }));
        setAssessments(enriched.filter(a => a.respondents > 0));
      } catch (e: any) {
        toast.error('Erro ao carregar avaliações: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, companyId, type]);

  const loadDimensions = async (assessmentId: string) => {
    setSelectedAssessment(assessmentId);
    setDimensions([]);
    setSelected(new Set());
    setLoading(true);
    try {
      const { data: respData } = await supabase
        .from(tableResponses as any)
        .select('id')
        .eq('assessment_id', assessmentId)
        .not('completed_at', 'is', null);
      const respIds = ((respData as any[]) || []).map(r => r.id);
      if (respIds.length === 0) { setLoading(false); return; }

      const { data: answersData } = await supabase
        .from(tableAnswers as any)
        .select('response_id, question_number, answer_value')
        .in('response_id', respIds);
      const rows = ((answersData as any[]) || []).map(r => ({
        question_number: r.question_number,
        answer_value: r.answer_value,
      }));

      let dims: Dimension[] = [];
      if (type === 'hseit') {
        const scored: HSEITDimensionScore[] = computeHSEITDimensions(rows);
        dims = scored.filter(d => d.average > 0).map(d => {
          const sp = hseitRiskToSevProb(d.riskLevel);
          return {
            key: d.category,
            label: d.label,
            average: d.average,
            riskLevelKey: d.riskLevel,
            riskLevelLabel: HSEIT_RISK_LEVEL_LABELS[d.riskLevel],
            severity: sp.severity,
            probability: sp.probability,
            suggested: isHighRiskHSEIT(d.riskLevel),
          };
        });
      } else {
        const scored: COPSOQDimensionScore[] = computeCOPSOQDimensions(rows);
        dims = scored.map(d => {
          const sp = copsoqRiskToSevProb(d.riskLevel);
          return {
            key: d.category,
            label: d.label,
            average: d.average,
            riskLevelKey: d.riskLevel,
            riskLevelLabel: COPSOQ_RISK_LEVEL_LABELS[d.riskLevel],
            severity: sp.severity,
            probability: sp.probability,
            suggested: isHighRiskCOPSOQ(d.riskLevel),
          };
        });
      }
      // Sort by risk descending (worst first)
      dims.sort((a, b) => a.average - b.average);
      setDimensions(dims);
      setSelected(new Set(dims.filter(d => d.suggested).map(d => d.key)));
    } catch (e: any) {
      toast.error('Erro ao calcular dimensões: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return s;
    });
  };

  const currentAssessment = useMemo(
    () => assessments.find(a => a.id === selectedAssessment),
    [assessments, selectedAssessment]
  );

  const handleImport = () => {
    if (!selectedAssessment || !currentAssessment) return;
    const chosen = dimensions.filter(d => selected.has(d.key));
    if (chosen.length === 0) { toast.error('Selecione ao menos uma dimensão'); return; }
    const date = new Date(currentAssessment.created_at).toLocaleDateString('pt-BR');
    const fatores: ImportedFator[] = chosen.map(d => ({
      categoria: 'psicossocial',
      fator_nome: `${d.label} — ${typeLabel}`,
      fonte_causa: `Importado de avaliação ${typeLabel} de ${date} — ${currentAssessment.respondents} respondentes`,
      evidencia_texto: `Média normalizada: ${d.average.toFixed(2)} (escala 1-5, 5=favorável) — Nível: ${d.riskLevelLabel}`,
      severity: d.severity,
      probability: d.probability,
      source_assessment_type: type,
      source_assessment_id: selectedAssessment,
    }));
    onImport(fatores);
    toast.success(`${fatores.length} fator(es) importado(s) do ${typeLabel}`);
    onOpenChange(false);
  };

  const riskColor = (key: string) => {
    if (key === 'very_high' || key === 'risk') return 'bg-red-100 text-red-700 border-red-200';
    if (key === 'high') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (key === 'moderate' || key === 'intermediate') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (key === 'low') return 'bg-lime-100 text-lime-700 border-lime-200';
    if (key === 'very_low' || key === 'favorable') return 'bg-green-100 text-green-700 border-green-200';
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar dimensões do {typeLabel} como fatores AEP</DialogTitle>
        </DialogHeader>

        {loading && !dimensions.length && (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        )}

        {!loading && !selectedAssessment && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Selecione uma avaliação {typeLabel} finalizada para trazer as dimensões em risco como fatores da AEP.
            </p>
            {assessments.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6 border rounded">
                Nenhuma avaliação {typeLabel} com respostas concluídas encontrada para esta empresa.
              </div>
            )}
            {assessments.map(a => (
              <Card key={a.id} className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                onClick={() => loadDimensions(a.id)}>
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString('pt-BR')} · {a.respondents} respondentes
                  </div>
                </div>
                <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />Selecionar</Button>
              </Card>
            ))}
          </div>
        )}

        {selectedAssessment && !loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{currentAssessment?.title}</div>
                <div className="text-xs text-muted-foreground">
                  Dimensões em risco alto/muito alto já vêm marcadas. Ajuste conforme necessário.
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedAssessment('')}>Trocar avaliação</Button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {dimensions.map(d => (
                <label key={d.key} className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={selected.has(d.key)} onCheckedChange={() => toggle(d.key)} />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{d.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Média {d.average.toFixed(2)} · Severidade {d.severity} · Probabilidade {d.probability}
                      </div>
                    </div>
                    <Badge variant="outline" className={riskColor(d.riskLevelKey)}>{d.riskLevelLabel}</Badge>
                  </div>
                </label>
              ))}
              {dimensions.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">Sem dimensões computáveis.</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleImport} disabled={selected.size === 0}>
                <Download className="h-4 w-4 mr-1" /> Importar {selected.size} fator(es)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
