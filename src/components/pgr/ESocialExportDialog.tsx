import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileText, FileCode, Loader2, AlertCircle } from "lucide-react";
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

  const generatePDF = async () => {
    setGenerating('pdf');
    try {
      const [{ data: ghes }, { data: risks }, { data: actions }, { data: companyRow }, { data: assignment }] = await Promise.all([
        supabase.from('pgr_ghe').select('*').eq('pgr_document_id', pgr.id),
        supabase.from('pgr_risks').select('*').eq('pgr_document_id', pgr.id),
        supabase.from('pgr_action_items').select('*').eq('pgr_document_id', pgr.id),
        supabase.from('companies').select('logo_url').eq('id', pgr.company_id).maybeSingle(),
        supabase.from('company_sst_assignments').select('sst_manager_id').eq('company_id', pgr.company_id).maybeSingle(),
      ]);

      let sstLogoUrl: string | null = null;
      if (assignment?.sst_manager_id) {
        const { data: mgr } = await supabase
          .from('sst_managers')
          .select('logo_url')
          .eq('id', assignment.sst_manager_id)
          .maybeSingle();
        sstLogoUrl = (mgr as any)?.logo_url || null;
      }

      await downloadPGRReport({
        pgr,
        company: { name: companyName, cnpj: companyCnpj, logo_url: (companyRow as any)?.logo_url || null },
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
      <DialogContent>
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

        <div className="space-y-3 mt-2">
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
