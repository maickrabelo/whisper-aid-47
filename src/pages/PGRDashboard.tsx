import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { usePGRModuleAccess } from "@/hooks/usePGRModuleAccess";
import { useAEPBetaAccess } from "@/hooks/useAEPBetaAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, FileText, FlaskConical, Users, ClipboardList, Activity, Download, Plus, Trash2, Pencil, LayoutDashboard, Wheat, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PGROverview } from "@/components/pgr/PGROverview";
import { GHEManager } from "@/components/pgr/GHEManager";
import { RiskInventory } from "@/components/pgr/RiskInventory";
import { ActionPlanEditor } from "@/components/pgr/ActionPlanEditor";
import { ESocialExportDialog } from "@/components/pgr/ESocialExportDialog";
import { PGRMonitoringDashboard } from "@/components/pgr/PGRMonitoringDashboard";
import { CreateDocumentDialog } from "@/components/pgr/CreateDocumentDialog";
import { usePgrTerminology, type PgrDocType } from "@/hooks/usePgrTerminology";

export interface PGRDocument {
  id: string;
  company_id: string;
  title: string;
  version: number;
  status: string;
  validity_start: string | null;
  validity_end: string | null;
  executive_summary: string | null;
  responsible_name: string | null;
  responsible_cpf: string | null;
  responsible_registration: string | null;
  cnae: string | null;
  risk_grade: string | null;
  address: string | null;
  document_type?: 'pgr' | 'pgtr' | null;
  rural_activity?: string | null;
  rural_area_hectares?: number | null;
  work_regime?: string | null;
  has_lodging?: boolean | null;
  lodging_description?: string | null;
  worker_transport?: string | null;
}


const PGRDashboard = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useRealAuth();
  const { hasAccess, isLoading: accessLoading } = usePGRModuleAccess();
  const { allowed: aepAllowed } = useAEPBetaAccess();

  const [pgr, setPgr] = useState<PGRDocument | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [companyCnpj, setCompanyCnpj] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const term = usePgrTerminology(pgr?.document_type);

  useEffect(() => {
    if (authLoading || accessLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!hasAccess) { navigate('/'); return; }
    if (!companyId) { navigate(-1); return; }
    loadPGR();
  }, [user, hasAccess, authLoading, accessLoading, companyId]);

  const loadPGR = async () => {
    setLoading(true);
    try {
      const [{ data: companyData }, { data: pgrData }] = await Promise.all([
        supabase.from('companies').select('name, cnpj').eq('id', companyId!).maybeSingle(),
        supabase.from('pgr_documents')
          .select('*')
          .eq('company_id', companyId!)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (companyData) {
        setCompanyName((companyData as any).name);
        setCompanyCnpj((companyData as any).cnpj || '');
      }
      setPgr((pgrData as any) || null);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar documento');
    } finally {
      setLoading(false);
    }
  };

  const createPGR = async (docType: PgrDocType) => {
    if (!companyId) return;
    try {
      const label = docType === 'pgtr' ? 'PGTR' : 'PGR';
      const { data, error } = await supabase
        .from('pgr_documents')
        .insert({
          company_id: companyId,
          title: `${label} ${new Date().getFullYear()} - ${companyName}`,
          status: 'draft',
          version: 1,
          document_type: docType,
          validity_start: new Date().toISOString().split('T')[0],
          validity_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        } as any)
        .select()
        .single();
      if (error) throw error;
      setPgr(data as any);
      setCreateOpen(false);
      toast.success(`${label} criado com sucesso!`);
    } catch (e: any) {
      toast.error('Erro ao criar documento: ' + e.message);
    }
  };

  if (authLoading || accessLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{term.shortName} — {companyName}</h1>
                {pgr && <Badge variant={term.isRural ? 'default' : 'secondary'}>{term.regulation}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {term.fullName} ({term.regulation}) + Exportação e-Social S-2240
              </p>
            </div>
          </div>
          {pgr && (
            <Button onClick={() => setExportOpen(true)} className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!pgr ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum documento criado para esta empresa</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Escolha entre PGR (NR-01) ou PGTR (NR-31 — trabalhador rural) para começar.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar documento {new Date().getFullYear()}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList className={`grid ${aepAllowed ? 'grid-cols-6' : 'grid-cols-5'} max-w-4xl`}>
              <TabsTrigger value="dashboard" className="gap-1"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
              <TabsTrigger value="overview" className="gap-1"><FileText className="h-4 w-4" /> Visão Geral</TabsTrigger>
              <TabsTrigger value="ghe" className="gap-1"><Users className="h-4 w-4" /> {term.gheLabel}s</TabsTrigger>
              <TabsTrigger value="risks" className="gap-1"><FlaskConical className="h-4 w-4" /> Inventário</TabsTrigger>
              <TabsTrigger value="actions" className="gap-1"><ClipboardList className="h-4 w-4" /> Plano de Ação</TabsTrigger>
              {aepAllowed && <TabsTrigger value="aep" className="gap-1"><ClipboardList className="h-4 w-4" /> AEP</TabsTrigger>}
            </TabsList>
            <TabsContent value="dashboard">
              <PGRMonitoringDashboard pgr={pgr} />
            </TabsContent>
            <TabsContent value="overview">
              <PGROverview pgr={pgr} onUpdated={loadPGR} companyName={companyName} companyCnpj={companyCnpj} />
            </TabsContent>
            <TabsContent value="ghe">
              <GHEManager pgrDocumentId={pgr.id} documentType={pgr.document_type || 'pgr'} />
            </TabsContent>
            <TabsContent value="risks">
              <RiskInventory pgrDocumentId={pgr.id} companyId={pgr.company_id} documentType={pgr.document_type || 'pgr'} />
            </TabsContent>
            <TabsContent value="actions">
              <ActionPlanEditor pgrDocumentId={pgr.id} />
            </TabsContent>
            {aepAllowed && (
            <TabsContent value="aep">
              <Card>
                <CardContent className="py-8 text-center space-y-3">
                  <ClipboardList className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-lg font-semibold">AEP — Avaliação Ergonômica Preliminar (NR-17)</h3>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    A AEP é obrigatória para TODAS as empresas (item 17.3.1). Cobre fatores ergonômicos e psicossociais e alimenta o inventário de riscos do PGR, mantendo rastreabilidade completa.
                  </p>
                  <Button onClick={() => navigate(`/aep/${pgr.company_id}`)} className="gap-2">
                    <ExternalLink className="h-4 w-4" /> Abrir módulo AEP
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      <CreateDocumentDialog open={createOpen} onOpenChange={setCreateOpen} onSelect={createPGR} />


      {pgr && (
        <ESocialExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          pgr={pgr}
          companyName={companyName}
          companyCnpj={companyCnpj}
        />
      )}
    </div>
  );
};

export default PGRDashboard;
