import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Block {
  key: string;
  aepId: string;
  aepLabel: string;
  setor: string;
  funcao: string;
  cbo?: string | null;
  worker_count: number;
  situacao_trabalho?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pgrDocumentId: string;
  gheLabel: string;
  existingNames: string[];
  onImported: () => void;
}

export function ImportGHEFromAEPDialog({ open, onOpenChange, pgrDocumentId, gheLabel, existingNames, onImported }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"per_role" | "by_sector">("per_role");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const { data: doc } = await supabase
          .from("pgr_documents")
          .select("company_id")
          .eq("id", pgrDocumentId)
          .maybeSingle();
        const companyId = (doc as any)?.company_id;
        if (!companyId) { setBlocks([]); return; }

        const { data: aeps, error } = await supabase
          .from("aep_avaliacoes" as any)
          .select("id, setor_nome, funcao_nome, escopo_json, situacao_trabalho, assessment_date, status")
          .eq("company_id", companyId)
          .order("assessment_date", { ascending: false });
        if (error) throw error;

        const out: Block[] = [];
        (aeps as any[] || []).forEach((a) => {
          const label = `AEP ${a.setor_nome || ""}${a.funcao_nome ? ` — ${a.funcao_nome}` : ""}`.trim();
          const escopo: any[] = Array.isArray(a.escopo_json) ? a.escopo_json : [];
          if (escopo.length) {
            escopo.forEach((it, i) => {
              out.push({
                key: `${a.id}:${it.tempId || i}`,
                aepId: a.id,
                aepLabel: label,
                setor: it.setor || a.setor_nome || "",
                funcao: it.funcao || a.funcao_nome || "",
                cbo: it.cbo || null,
                worker_count: it.worker_count || 1,
                situacao_trabalho: it.situacao_trabalho || null,
              });
            });
          } else {
            out.push({
              key: `${a.id}:legacy`,
              aepId: a.id,
              aepLabel: label,
              setor: a.setor_nome || "",
              funcao: a.funcao_nome || "",
              worker_count: 1,
              situacao_trabalho: a.situacao_trabalho || null,
            });
          }
        });

        // remove duplicados (mesmo setor + função)
        const seen = new Set<string>();
        const dedup = out.filter((b) => {
          const k = `${b.setor.toLowerCase()}|${b.funcao.toLowerCase()}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        setBlocks(dedup);
        const preset: Record<string, boolean> = {};
        dedup.forEach((b) => {
          const name = `${b.setor} — ${b.funcao}`.trim();
          preset[b.key] = !existingNames.some((n) => n.toLowerCase() === name.toLowerCase());
        });
        setSelected(preset);
      } catch (e: any) {
        toast.error("Erro ao carregar AEPs: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, pgrDocumentId]);

  const chosen = useMemo(() => blocks.filter((b) => selected[b.key]), [blocks, selected]);

  const groups = useMemo(() => {
    if (mode === "per_role") {
      return chosen.map((b) => ({
        name: [b.setor, b.funcao].filter(Boolean).join(" — ") || "GHE importado",
        sector: b.setor,
        items: [b],
      }));
    }
    const map = new Map<string, Block[]>();
    chosen.forEach((b) => {
      const k = b.setor || "Sem setor";
      map.set(k, [...(map.get(k) || []), b]);
    });
    return Array.from(map.entries()).map(([sector, items]) => ({ name: sector, sector, items }));
  }, [chosen, mode]);

  const doImport = async () => {
    if (!groups.length) { toast.error("Selecione ao menos um item"); return; }
    setSaving(true);
    try {
      const rows = groups.map((g) => {
        const roles_meta = g.items.map((b) => ({
          role: b.funcao || "Não informado",
          cbo: b.cbo || undefined,
          activities: (b.situacao_trabalho || "").trim(),
        }));
        const activities_description = roles_meta
          .filter((r) => r.activities)
          .map((r) => {
            const lines = r.activities
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((l) => (l.startsWith("-") || l.startsWith("•") ? l : `- ${l}`))
              .join("\n");
            return `${r.role.toUpperCase()}\n${lines}`;
          })
          .join("\n\n");
        return {
          pgr_document_id: pgrDocumentId,
          name: g.name,
          sector: g.sector || null,
          role: roles_meta.map((r) => r.role).join(", "),
          roles_meta,
          activities_description,
          worker_count: g.items.reduce((s, b) => s + (b.worker_count || 0), 0),
        };
      });

      const { error } = await supabase.from("pgr_ghe").insert(rows as any);
      if (error) throw error;
      toast.success(`${rows.length} ${gheLabel}(s) importado(s) da AEP`);
      onOpenChange(false);
      onImported();
    } catch (e: any) {
      toast.error("Erro ao importar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Importar setores e cargos da AEP
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : blocks.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma AEP com setores/cargos cadastrados foi encontrada para esta empresa.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Como agrupar</Label>
              <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_role">Um {gheLabel} por cargo (setor — cargo)</SelectItem>
                  <SelectItem value="by_sector">Agrupar por setor (vários cargos no mesmo {gheLabel})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded divide-y">
              {blocks.map((b) => {
                const name = [b.setor, b.funcao].filter(Boolean).join(" — ");
                const dup = existingNames.some((n) => n.toLowerCase() === name.toLowerCase());
                return (
                  <label key={b.key} className="flex items-start gap-3 p-3 cursor-pointer">
                    <Checkbox
                      checked={!!selected[b.key]}
                      onCheckedChange={(c) => setSelected((s) => ({ ...s, [b.key]: !!c }))}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{b.setor || "—"}</span>
                        <span className="text-muted-foreground">/ {b.funcao || "—"}</span>
                        {b.cbo && <Badge variant="outline" className="text-[10px]">CBO {b.cbo}</Badge>}
                        <Badge variant="secondary" className="text-[10px]">{b.worker_count} trab.</Badge>
                        {dup && <Badge variant="outline" className="text-[10px]">já existe</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{b.aepLabel}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Serão criados <strong>{groups.length}</strong> {gheLabel}(s). A situação de trabalho descrita na AEP entra
              como descrição das atividades de cada cargo.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={doImport} disabled={saving || loading || !groups.length} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
