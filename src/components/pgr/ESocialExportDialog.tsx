import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileText, FileCode, Loader2, AlertCircle, PenLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PGRDocument } from "@/pages/PGRDashboard";
import { downloadPGRReport } from "@/components/pgr/PGRReportPDF";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pgr: PGRDocument;
  companyName: string;
  companyCnpj: string;
}

const sanitizeXml = (v: any) => String(v ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c]!));
const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');
const freshLogoUrl = (url?: string | null) => {
  if (!url) return null;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}fresh=${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// PDF agora é gerado pelo módulo dedicado em PGRReportPDF.ts

const buildS2240Xml = (pgr: PGRDocument, companyCnpj: string, worker: any, ghe: any, risks: any[]) => {
  const cnpj = onlyDigits(companyCnpj);
  const cpf = onlyDigits(worker.cpf);
  const respCpf = onlyDigits(pgr.responsible_cpf || '');
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const id = `ID${'1'.padStart(1, '0')}${cnpj.padEnd(14, '0').slice(0,14)}${ts}000001`;
  const today = new Date().toISOString().split('T')[0];
  const agNocs = risks.filter(r => r.esocial_agent_code).map(r => `
        <agNoc>
          <codAgNoc>${sanitizeXml(r.esocial_agent_code)}</codAgNoc>
          <dscAgNoc>${sanitizeXml(r.agent_name)}</dscAgNoc>
          <tpAval>${r.measurement_value ? '2' : '1'}</tpAval>
          ${r.measurement_value ? `<intConc>${r.measurement_value}</intConc>` : ''}
          ${r.measurement_unit ? `<unMed>${sanitizeXml(r.measurement_unit)}</unMed>` : ''}
          <utilizEPC>${r.existing_epc ? '2' : '1'}</utilizEPC>
          <utilizEPI>${r.existing_epi ? '2' : '1'}</utilizEPI>
          ${r.epi_ca ? `
          <epi>
            <docAval>${sanitizeXml(r.epi_ca)}</docAval>
          </epi>` : ''}
        </agNoc>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00">
  <evtExpRisco Id="${id}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>SOIA-1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpj.slice(0, 8)}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab>${cpf}</cpfTrab>
      ${worker.registration_number ? `<matricula>${sanitizeXml(worker.registration_number)}</matricula>` : ''}
    </ideVinculo>
    <infoExpRisco>
      <dtIniCondicao>${pgr.validity_start || today}</dtIniCondicao>
      <infoAmb>
        <localAmb>1</localAmb>
        <dscSetor>${sanitizeXml(ghe?.sector || ghe?.name || 'N/A')}</dscSetor>
      </infoAmb>
      <infoAtiv>
        <dscAtivDes>${sanitizeXml(ghe?.activities_description || ghe?.role || 'N/A')}</dscAtivDes>
      </infoAtiv>${agNocs}
      <respReg>
        <cpfResp>${respCpf}</cpfResp>
        <ideOC>${pgr.responsible_registration?.toUpperCase().includes('CREA') ? '1' : pgr.responsible_registration?.toUpperCase().includes('CRM') ? '2' : '3'}</ideOC>
        <dscOC>${sanitizeXml(pgr.responsible_registration || 'N/A')}</dscOC>
        <nrOC>${sanitizeXml(pgr.responsible_registration || 'N/A')}</nrOC>
      </respReg>
    </infoExpRisco>
  </evtExpRisco>
</eSocial>`;
};

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

  const generateXML = async () => {
    setGenerating('xml');
    try {
      if (!pgr.responsible_cpf || !pgr.responsible_registration) {
        toast.error("Preencha CPF e registro do responsável técnico na aba Visão Geral");
        return;
      }
      if (!onlyDigits(companyCnpj) || onlyDigits(companyCnpj).length !== 14) {
        toast.error("CNPJ da empresa inválido");
        return;
      }
      const { data: ghes } = await supabase
        .from('pgr_ghe')
        .select('id, name, sector, role, activities_description, pgr_ghe_workers(*)')
        .eq('pgr_document_id', pgr.id);
      const { data: risks } = await supabase
        .from('pgr_risks')
        .select('*')
        .eq('pgr_document_id', pgr.id)
        .not('esocial_agent_code', 'is', null);

      if (!ghes || ghes.length === 0) { toast.error("Cadastre ao menos um GHE"); return; }
      if (!risks || risks.length === 0) { toast.error("Cadastre riscos com código e-Social (Tabela 23)"); return; }

      const files: { name: string; xml: string }[] = [];
      for (const g of ghes as any[]) {
        const gheRisks = (risks as any[]).filter(r => r.ghe_id === g.id);
        if (gheRisks.length === 0) continue;
        const workers = g.pgr_ghe_workers || [];
        if (workers.length === 0) {
          // gera 1 XML stub sem CPF para placeholder
          const xml = buildS2240Xml(pgr, companyCnpj, { cpf: '00000000000', registration_number: 'PENDENTE' }, g, gheRisks);
          files.push({ name: `S-2240_${g.name.replace(/\W+/g, '_')}_SEM_TRABALHADOR.xml`, xml });
        } else {
          for (const w of workers) {
            const xml = buildS2240Xml(pgr, companyCnpj, w, g, gheRisks);
            files.push({ name: `S-2240_${onlyDigits(w.cpf)}_${g.name.replace(/\W+/g, '_')}.xml`, xml });
          }
        }
      }

      if (files.length === 0) { toast.error("Nenhum XML gerado — verifique GHEs/riscos com código e-Social"); return; }

      if (files.length === 1) {
        const blob = new Blob([files[0].xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = files[0].name; a.click();
        URL.revokeObjectURL(url);
      } else {
        // Concat em um único arquivo de lote simples
        const combined = files.map(f => `<!-- ${f.name} -->\n${f.xml}`).join('\n\n');
        const blob = new Blob([combined], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `S-2240_lote_${new Date().toISOString().split('T')[0]}.xml`; a.click();
        URL.revokeObjectURL(url);
      }

      // Auditoria
      await supabase.from('pgr_esocial_exports').insert({
        pgr_document_id: pgr.id,
        event_type: 'S-2240',
        reference_period: new Date().toISOString().slice(0, 7),
        file_path: 'download-direto',
        worker_count: files.length,
      } as any);

      toast.success(`${files.length} XML(s) gerado(s) — entregue ao contador para upload no portal e-Social.`);
      onOpenChange(false);
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
            Os XMLs são gerados localmente para upload manual pelo seu contador no portal e-Social. A SOIA não envia eventos diretamente nesta fase beta.
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
          <Button onClick={generateXML} disabled={!!generating} variant="outline" className="w-full justify-start gap-3 h-auto py-3">
            {generating === 'xml' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileCode className="h-5 w-5" />}
            <div className="text-left">
              <div className="font-semibold">e-Social S-2240 (XML)</div>
              <div className="text-xs text-muted-foreground">Evento de Condições Ambientais do Trabalho — 1 arquivo por trabalhador/GHE</div>
            </div>
          </Button>
        </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
