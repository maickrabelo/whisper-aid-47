import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileText, Loader2, AlertCircle, PenLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PGRDocument } from "@/pages/PGRDashboard";
import { downloadPGRReport } from "@/components/pgr/PGRReportPDF";
import { S2240ExportPanel } from "./S2240ExportPanel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pgr: PGRDocument;
  companyName: string;
  companyCnpj: string;
}

const freshLogoUrl = (url?: string | null) => {
  if (!url) return null;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}fresh=${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// PDF agora é gerado pelo módulo dedicado em PGRReportPDF.ts

export const ESocialExportDialog = ({ open, onOpenChange, pgr, companyName, companyCnpj }: Props) => {
  const [generating, setGenerating] = useState<'pdf' | 'xml' | null>(null);

  const fetchCurrentSstLogoUrl = async () => {
    // Logo da gestora SST = estritamente sst_managers.logo_url.
    // Prioridade 1: gestora atribuída à empresa do PGR (fonte da verdade).
    // Prioridade 2 (fallback): gestora do usuário logado, apenas se não houver atribuição.
    const { data: assignments } = await supabase
      .from('company_sst_assignments')
      .select('sst_manager_id')
      .eq('company_id', pgr.company_id);

    let managerId: string | null =
      (assignments || []).find((a: any) => a?.sst_manager_id)?.sst_manager_id || null;

    if (!managerId) {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (userId) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('sst_manager_id')
          .eq('id', userId)
          .maybeSingle();
        managerId = (profileRow as any)?.sst_manager_id || null;

        if (!managerId) {
          const { data: linked } = await supabase
            .from('user_sst_managers')
            .select('sst_manager_id')
            .eq('user_id', userId)
            .limit(1);
          managerId = (linked || [])[0]?.sst_manager_id || null;
        }
      }
    }

    if (!managerId) return null;

    const { data: manager } = await supabase
      .from('sst_managers')
      .select('logo_url')
      .eq('id', managerId)
      .maybeSingle();

    return freshLogoUrl((manager as any)?.logo_url || null);
  };


  const [sig, setSig] = useState({
    responsible_name: '',
    responsible_cpf: '',
    responsible_registration: '',
    org_responsible_name: '',
    org_responsible_role: '',
    org_responsible_cpf: '',
  });

  useEffect(() => {
    if (!open) return;
    setSig({
      responsible_name: pgr.responsible_name || '',
      responsible_cpf: pgr.responsible_cpf || '',
      responsible_registration: pgr.responsible_registration || '',
      org_responsible_name: pgr.org_responsible_name || '',
      org_responsible_role: pgr.org_responsible_role || '',
      org_responsible_cpf: pgr.org_responsible_cpf || '',
    });
  }, [open, pgr]);

  const persistSignatures = async () => {
    const payload = {
      responsible_name: sig.responsible_name.trim() || null,
      responsible_cpf: sig.responsible_cpf.trim() || null,
      responsible_registration: sig.responsible_registration.trim() || null,
      org_responsible_name: sig.org_responsible_name.trim() || null,
      org_responsible_role: sig.org_responsible_role.trim() || null,
      org_responsible_cpf: sig.org_responsible_cpf.trim() || null,
    };
    await supabase.from('pgr_documents').update(payload as any).eq('id', pgr.id);
    return payload;
  };

  const generatePDF = async () => {
    setGenerating('pdf');
    try {
      const signatures = await persistSignatures();
      const [{ data: ghes }, { data: risks }, { data: actions }, { data: companyRow }, sstLogoUrl] = await Promise.all([
        supabase.from('pgr_ghe').select('*').eq('pgr_document_id', pgr.id).order('name', { ascending: true }).limit(1000),
        supabase.from('pgr_risks').select('*').eq('pgr_document_id', pgr.id).limit(2000),
        supabase.from('pgr_action_items').select('*').eq('pgr_document_id', pgr.id).limit(1000),
        supabase.from('companies').select('logo_url').eq('id', pgr.company_id).maybeSingle(),
        fetchCurrentSstLogoUrl(),
      ]);

      await downloadPGRReport({
        pgr: { ...pgr, ...signatures },
        company: { name: companyName, cnpj: companyCnpj, logo_url: freshLogoUrl((companyRow as any)?.logo_url || null) },
        sstLogoUrl,
        ghes: (ghes as any) || [],
        risks: (risks as any) || [],
        actions: (actions as any) || [],
      });
      toast.success("Relatório PGR (PDF) gerado com sucesso");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally { setGenerating(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar PGR</DialogTitle>
          <DialogDescription>Gere o relatório PGR NR-1 em PDF ou os XMLs do evento S-2240 do e-Social.</DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sem transmissão automática</AlertTitle>
          <AlertDescription className="text-xs">
            Os XMLs sem assinatura são preparados para um sistema transmissor externo compatível. Esse sistema deve validar, assinar e enviar os eventos; o portal web do eSocial não importa estes arquivos.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="export" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-1 text-xs"><Download className="h-3 w-3" /> Exportar</TabsTrigger>
            <TabsTrigger value="signatures" className="gap-1 text-xs"><PenLine className="h-3 w-3" /> Assinaturas</TabsTrigger>
          </TabsList>

          <TabsContent value="signatures" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Responsável Técnico (assinatura)</p>
              <p className="text-xs text-muted-foreground">Informe manualmente o nome do técnico que assinará o documento — não é usado o nome da gestora.</p>
              <div className="space-y-2">
                <Label className="text-xs">Nome</Label>
                <Input value={sig.responsible_name} onChange={e => setSig({ ...sig, responsible_name: e.target.value })} placeholder="Nome completo do técnico" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">CPF</Label>
                  <Input value={sig.responsible_cpf} onChange={e => setSig({ ...sig, responsible_cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Registro MTE / CREA</Label>
                  <Input value={sig.responsible_registration} onChange={e => setSig({ ...sig, responsible_registration: e.target.value })} placeholder="Nº do registro" />
                </div>
              </div>
            </div>
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold">Responsável pela Empresa (opcional)</p>
              <div className="space-y-2">
                <Label className="text-xs">Nome</Label>
                <Input value={sig.org_responsible_name} onChange={e => setSig({ ...sig, org_responsible_name: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">CPF</Label>
                  <Input value={sig.org_responsible_cpf} onChange={e => setSig({ ...sig, org_responsible_cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cargo</Label>
                  <Input value={sig.org_responsible_role} onChange={e => setSig({ ...sig, org_responsible_role: e.target.value })} placeholder="Ex: Diretor, RH" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Os dados são salvos automaticamente ao gerar o PDF.</p>
          </TabsContent>

        <TabsContent value="export" className="space-y-3 mt-4">
          <Button onClick={generatePDF} disabled={!!generating} variant="outline" className="w-full justify-start gap-3 h-auto py-3">
            {generating === 'pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
            <div className="text-left">
              <div className="font-semibold">Relatório PGR (PDF)</div>
              <div className="text-xs text-muted-foreground">Documento completo NR-1 para apresentação e arquivamento</div>
            </div>
          </Button>
          <S2240ExportPanel documentId={pgr.id} cnpj={companyCnpj} responsibleCpf={sig.responsible_cpf} />
        </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
