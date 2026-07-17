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
import { Plus, Trash2, Pencil, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { usePgrTerminology } from "@/hooks/usePgrTerminology";

interface RoleMeta { role: string; cbo?: string; activities?: string }
interface GHE {
  id: string;
  name: string;
  sector: string | null;
  role: string | null;
  roles_meta?: RoleMeta[] | null;
  activities_description: string | null;
  worker_count: number;
  work_schedule: string | null;
}

export const GHEManager = ({ pgrDocumentId, documentType }: { pgrDocumentId: string; documentType?: 'pgr' | 'pgtr' }) => {
  const term = usePgrTerminology(documentType);
  const [ghes, setGhes] = useState<GHE[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GHE | null>(null);
  const [form, setForm] = useState({ name: "", sector: "", roles_meta: [] as RoleMeta[], activities_description: "", worker_count: 0, work_schedule: "" });
  const [saving, setSaving] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const [cboInput, setCboInput] = useState("");

  const rolesArr = form.roles_meta;
  const addRole = () => {
    const v = roleInput.trim();
    if (!v) return;
    if (rolesArr.some(r => r.role.toLowerCase() === v.toLowerCase())) { setRoleInput(""); setCboInput(""); return; }
    setForm({ ...form, roles_meta: [...rolesArr, { role: v, cbo: cboInput.trim() || undefined, activities: "" }] });
    setRoleInput(""); setCboInput("");
  };
  const removeRole = (r: string) => {
    setForm({ ...form, roles_meta: rolesArr.filter(x => x.role !== r) });
  };
  const updateRoleActivities = (roleName: string, activities: string) => {
    setForm({ ...form, roles_meta: rolesArr.map(r => r.role === roleName ? { ...r, activities } : r) });
  };
  const parseRolesMeta = (g: GHE): RoleMeta[] => {
    if (Array.isArray(g.roles_meta) && g.roles_meta.length) return g.roles_meta;
    return (g.role || "").split(",").map(r => r.trim()).filter(Boolean).map(r => ({ role: r }));
  };

  const buildActivitiesDescription = (roles: RoleMeta[], fallback: string): string => {
    const hasPerRole = roles.some(r => (r.activities || "").trim().length > 0);
    if (!hasPerRole) return fallback;
    const blocks = roles
      .filter(r => (r.activities || "").trim().length > 0)
      .map(r => {
        const lines = (r.activities || "")
          .split("\n")
          .map(l => l.trim())
          .filter(Boolean)
          .map(l => l.startsWith("-") || l.startsWith("•") ? l : `- ${l}`)
          .join("\n");
        return `${r.role.toUpperCase()}\n${lines}`;
      });
    const extra = fallback.trim();
    return extra ? `${blocks.join("\n\n")}\n\n${extra}` : blocks.join("\n\n");
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pgr_ghe")
      .select("*")
      .eq("pgr_document_id", pgrDocumentId)
      .order("name");
    if (error) toast.error("Erro ao carregar GHEs");
    setGhes((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [pgrDocumentId]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", sector: "", roles_meta: [], activities_description: "", worker_count: 0, work_schedule: "" });
    setRoleInput(""); setCboInput("");
    setOpen(true);
  };
  const openEdit = (g: GHE) => {
    setEditing(g);
    setForm({
      name: g.name,
      sector: g.sector || "",
      roles_meta: parseRolesMeta(g),
      activities_description: g.activities_description || "",
      worker_count: g.worker_count || 0,
      work_schedule: g.work_schedule || "",
    });
    setRoleInput(""); setCboInput("");
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const activitiesDesc = buildActivitiesDescription(form.roles_meta, form.activities_description);
      const payload: any = {
        name: form.name,
        sector: form.sector,
        role: form.roles_meta.map(r => r.role).join(", "),
        roles_meta: form.roles_meta,
        activities_description: activitiesDesc,
        worker_count: form.worker_count,
        work_schedule: form.work_schedule,
      };
      if (editing) {
        const { error } = await supabase.from("pgr_ghe").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pgr_ghe").insert({ ...payload, pgr_document_id: pgrDocumentId });
        if (error) throw error;
      }
      toast.success("GHE salvo");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este GHE? Riscos vinculados perderão o vínculo.")) return;
    const { error } = await supabase.from("pgr_ghe").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("GHE excluído");
    load();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> {term.gheLabelLong}{term.isRural ? 's Rurais' : 's'} ({term.gheLabel})</h3>
            <p className="text-sm text-muted-foreground">
              {term.isRural
                ? 'Agrupe trabalhadores rurais que compartilham as mesmas condições de exposição (cultura, atividade, propriedade).'
                : 'Agrupe trabalhadores que compartilham as mesmas condições de exposição.'}
            </p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo {term.gheLabel}</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : ghes.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Nenhum GHE cadastrado ainda.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Cargo(s)</TableHead>
                <TableHead className="text-right">Trabalhadores</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ghes.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.sector || '-'}</TableCell>
                  <TableCell>
                    {parseRolesMeta(g).length === 0 ? '-' : (
                      <div className="flex flex-wrap gap-1">
                        {parseRolesMeta(g).map(r => (
                          <Badge key={r.role} variant="secondary" className="text-xs font-normal">
                            {r.role}{r.cbo ? ` · CBO ${r.cbo}` : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{g.worker_count}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} {term.gheLabel}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome do {term.gheLabel} *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={term.isRural ? "Ex: Aplicadores de defensivos — talhão A" : "Ex: Operadores de máquina linha 1"} /></div>
              <div className="space-y-2">
                <Label>{term.isRural ? 'Talhão / Área' : 'Setor'}</Label>
                <Input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{term.isRural ? 'Função(ões) rural(is)' : 'Cargo(s)'} + CBO</Label>
                <div className="grid grid-cols-[1fr_140px_auto] gap-2">
                  <Input
                    value={roleInput}
                    onChange={e => setRoleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
                    placeholder={term.isRural ? 'Ex: Tratorista' : 'Ex: Encanador'}
                  />
                  <Input
                    value={cboInput}
                    onChange={e => setCboInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
                    placeholder="CBO (opc.)"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addRole}>Adicionar</Button>
                </div>
                {rolesArr.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {rolesArr.map(r => (
                      <div key={r.role} className="border rounded-md p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">
                            {r.role}
                            {r.cbo && <span className="text-xs text-muted-foreground font-normal"> · CBO {r.cbo}</span>}
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeRole(r.role)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <Textarea
                          rows={3}
                          value={r.activities || ""}
                          onChange={e => updateRoleActivities(r.role, e.target.value)}
                          placeholder={`Descreva as atividades de ${r.role} (uma por linha)`}
                          className="text-sm bg-background"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Adicione vários cargos, cada um com seu CBO e descrição de atividades individual.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Nº trabalhadores</Label><Input type="number" min={0} value={form.worker_count} onChange={e => setForm({ ...form, worker_count: parseInt(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Jornada</Label><Input value={form.work_schedule} onChange={e => setForm({ ...form, work_schedule: e.target.value })} placeholder="Ex: 8h/dia 5x2" /></div>
              </div>
              <div className="space-y-2">
                <Label>Observações gerais (opcional)</Label>
                <Textarea rows={2} value={form.activities_description} onChange={e => setForm({ ...form, activities_description: e.target.value })} placeholder="Observações que se aplicam a todas as funções deste GHE" />
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
