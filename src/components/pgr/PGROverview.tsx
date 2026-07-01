import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Wheat } from "lucide-react";
import { toast } from "sonner";
import { usePgrTerminology } from "@/hooks/usePgrTerminology";
import type { PGRDocument } from "@/pages/PGRDashboard";

interface Props {
  pgr: PGRDocument;
  companyName: string;
  companyCnpj: string;
  onUpdated: () => void;
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Vigente", variant: "default" },
  expired: { label: "Expirado", variant: "secondary" },
  archived: { label: "Arquivado", variant: "secondary" },
};

export const PGROverview = ({ pgr, companyName, companyCnpj, onUpdated }: Props) => {
  const term = usePgrTerminology(pgr.document_type);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: pgr.title,
    status: pgr.status,
    validity_start: pgr.validity_start || "",
    validity_end: pgr.validity_end || "",
    executive_summary: pgr.executive_summary || "",
    responsible_name: pgr.responsible_name || "",
    responsible_cpf: pgr.responsible_cpf || "",
    responsible_registration: pgr.responsible_registration || "",
    cnae: pgr.cnae || "",
    risk_grade: pgr.risk_grade || "",
    address: pgr.address || "",
    rural_activity: pgr.rural_activity || "",
    rural_area_hectares: pgr.rural_area_hectares ?? "",
    work_regime: pgr.work_regime || "",
    has_lodging: pgr.has_lodging ?? false,
    lodging_description: pgr.lodging_description || "",
    worker_transport: pgr.worker_transport || "",
  });

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pgr_documents")
        .update(form as any)
        .eq("id", pgr.id);
      if (error) throw error;
      toast.success("PGR atualizado");
      onUpdated();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const st = statusLabel[pgr.status] || statusLabel.draft;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Identificação</CardTitle>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Rascunho</option>
              <option value="active">Vigente</option>
              <option value="expired">Expirado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={companyName} disabled />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={companyCnpj} disabled />
          </div>
          <div className="space-y-2">
            <Label>CNAE</Label>
            <Input value={form.cnae} onChange={e => setForm({ ...form, cnae: e.target.value })} placeholder="Ex: 8630-5/03" />
          </div>
          <div className="space-y-2">
            <Label>Grau de Risco (NR-4)</Label>
            <Input value={form.risk_grade} onChange={e => setForm({ ...form, risk_grade: e.target.value })} placeholder="Ex: 2" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço completo</Label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade - UF" />
          </div>
          <div className="space-y-2">
            <Label>Vigência início</Label>
            <Input type="date" value={form.validity_start} onChange={e => setForm({ ...form, validity_start: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Vigência fim</Label>
            <Input type="date" value={form.validity_end} onChange={e => setForm({ ...form, validity_end: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Responsável Técnico SST</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.responsible_name} onChange={e => setForm({ ...form, responsible_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={form.responsible_cpf} onChange={e => setForm({ ...form, responsible_cpf: e.target.value })} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label>Registro CREA / MTE / CRP</Label>
            <Input value={form.responsible_registration} onChange={e => setForm({ ...form, responsible_registration: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo Executivo</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={6}
            value={form.executive_summary}
            onChange={e => setForm({ ...form, executive_summary: e.target.value })}
            placeholder="Apresentação geral do PGR, escopo, metodologia..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
};
