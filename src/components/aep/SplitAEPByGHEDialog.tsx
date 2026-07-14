import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  aep: any;
  fatores: any[];
  participantes: any[];
  companyId: string;
}

export function SplitAEPByGHEDialog({ open, onOpenChange, aep, fatores, participantes, companyId }: Props) {
  const [splitting, setSplitting] = useState(false);
  const navigate = useNavigate();

  const escopo: any[] = Array.isArray(aep?.escopo_json) ? aep.escopo_json : [];
  const canSplit = escopo.length > 1;

  const doSplit = async () => {
    if (!canSplit) return;
    setSplitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      const createdIds: string[] = [];

      for (let i = 0; i < escopo.length; i++) {
        const item = escopo[i];
        const tempId: string | undefined = item.tempId;
        const situacao: string = item.situacao_trabalho || aep.situacao_trabalho || '';

        const { data: newAep, error } = await supabase.from('aep_avaliacoes' as any).insert({
          company_id: aep.company_id,
          pgr_document_id: aep.pgr_document_id,
          ghe_id: item.ghe_id || null,
          setor_nome: item.setor || aep.setor_nome,
          funcao_nome: item.cbo ? `${item.funcao} (CBO ${item.cbo})` : (item.funcao || aep.funcao_nome),
          escopo_json: [{ ...item, tempId: tempId || crypto.randomUUID() }],
          situacao_trabalho: situacao,
          assessment_date: aep.assessment_date,
          next_review_date: aep.next_review_date,
          responsible_name: aep.responsible_name,
          responsible_role: aep.responsible_role,
          responsible_registration: aep.responsible_registration,
          methodologies: aep.methodologies,
          methodology_details: aep.methodology_details,
          instrument_name: aep.instrument_name,
          anonymity_ensured: aep.anonymity_ensured,
          status: 'draft',
          version: 1,
          parent_version_id: aep.id,
          created_by: userId,
        } as any).select('id').single();
        if (error) throw error;
        const newId = (newAep as any).id as string;
        createdIds.push(newId);

        // Fatores: os com escopo_ref = tempId (ou, se AEP antiga sem escopo_ref, todos vão para todos os blocos)
        const fatoresBloco = fatores.filter(f => {
          if (!f.escopo_ref) return true; // "geral" / legado — replica em cada bloco
          return f.escopo_ref === tempId;
        });
        if (fatoresBloco.length) {
          await supabase.from('aep_fatores_avaliados' as any).insert(fatoresBloco.map(f => ({
            aep_id: newId,
            escopo_ref: null,
            categoria: f.categoria,
            fator_codigo: f.fator_codigo,
            fator_nome: f.fator_nome,
            fonte_causa: f.fonte_causa,
            grupos_expostos: f.grupos_expostos,
            evidencia_texto: f.evidencia_texto,
            severity: f.severity,
            probability: f.probability,
            matrix_size: f.matrix_size || 5,
            observacoes: f.observacoes,
            source_assessment_type: f.source_assessment_type,
            source_assessment_id: f.source_assessment_id,
          })) as any);
        }

        const partsBloco = participantes.filter(p => {
          if (!p.escopo_ref) return true;
          return p.escopo_ref === tempId;
        });
        if (partsBloco.length) {
          await supabase.from('aep_participantes' as any).insert(partsBloco.map(p => ({
            aep_id: newId,
            escopo_ref: null,
            nome: p.nome,
            funcao: p.funcao,
            tipo_participacao: p.tipo_participacao,
            anonimizado: p.anonimizado,
          })) as any);
        }
      }

      // Marca AEP original como revisada com nota
      const originalNote = `${aep.methodology_details || ''}\n\n[Dividida em ${createdIds.length} AEPs em ${new Date().toLocaleString('pt-BR')}]`.trim();
      await supabase.from('aep_avaliacoes' as any).update({
        status: 'revised',
        methodology_details: originalNote,
      }).eq('id', aep.id);

      toast.success(`${createdIds.length} AEPs criadas a partir do escopo original`);
      onOpenChange(false);
      navigate(`/aep/${companyId}`);
    } catch (e: any) {
      toast.error('Erro ao dividir: ' + e.message);
    } finally {
      setSplitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!splitting) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" /> Dividir AEP em uma por GHE
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Esta ação cria <strong>{escopo.length} novas AEPs</strong> (uma por bloco do escopo), cada uma como <strong>rascunho</strong>,
            copiando metodologia, responsável, fatores e participantes correspondentes ao bloco.
          </p>
          <p className="text-muted-foreground text-xs">
            Fatores/participantes marcados como <strong>"Geral"</strong> ou sem bloco definido serão replicados em cada nova AEP.
            A AEP original será marcada como <strong>Revisada</strong>, preservando os vínculos existentes com o PGR e as evidências.
          </p>
          <div className="border rounded p-3 space-y-1 bg-muted/30">
            <div className="text-xs font-semibold mb-1">Novas AEPs que serão criadas:</div>
            {escopo.map((it: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[10px]">v1 · rascunho</Badge>
                <span className="font-medium">{it.setor || '—'} — {it.funcao || '—'}</span>
                {it.cbo && <span className="text-muted-foreground">· CBO {it.cbo}</span>}
                <span className="text-muted-foreground">· {it.worker_count || 1} trab.</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={splitting}>Cancelar</Button>
          <Button onClick={doSplit} disabled={splitting || !canSplit} className="gap-1">
            {splitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
            Dividir em {escopo.length} AEPs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
