import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Lock, Save } from 'lucide-react';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { supabase } from '@/integrations/supabase/client';
import BetaBadge from '@/components/feature-flags/BetaBadge';
import BetaFeedbackButton from '@/components/feature-flags/BetaFeedbackButton';
import usePageSEO from '@/hooks/usePageSEO';
import { toast } from 'sonner';
import LtcatGhesPanel from '@/components/ltcat/LtcatGhesPanel';
import LtcatExposuresPanel from '@/components/ltcat/LtcatExposuresPanel';
import LtcatEpiEpcPanel from '@/components/ltcat/LtcatEpiEpcPanel';
import LtcatEvaluationsPanel from '@/components/ltcat/LtcatEvaluationsPanel';
import LtcatValidationPanel from '@/components/ltcat/LtcatValidationPanel';

export interface LtcatDoc {
  id: string;
  company_id: string;
  title: string;
  status: string;
  version_number: number;
  parent_id: string | null;
  responsible: Record<string, any>;
  org_responsible: Record<string, any>;
  reference_period_start: string | null;
  reference_period_end: string | null;
  emission_date: string | null;
  additional_addresses: string[];
  notes: string | null;
  validated_at: string | null;
  validated_payload: any;
  published_at: string | null;
}

export interface LtcatGhe {
  id: string;
  ltcat_id: string;
  name: string;
  sector: string | null;
  roles_meta: Array<{ role: string; cbo?: string; activities?: string }>;
  activities_description: string | null;
  worker_count: number;
  sort_order: number;
}

export interface LtcatExposure {
  id: string;
  ltcat_id: string;
  ghe_id: string;
  agent_code: string;
  agent_name: string;
  source: string;
  exposure_present?: boolean | null;
  exposure_type: string | null;
  measured_value: number | null;
  unit: string | null;
  notes: string | null;
  engine_rule_key: string | null;
  engine_input: any;
  engine_output: any;
  engine_consulted_at: string | null;
  conclusion_status: string;
  conclusion_text: string | null;
  concluded_at: string | null;
}

export interface LtcatEpiEpc {
  id: string;
  ltcat_id: string;
  ghe_id: string | null;
  exposure_id: string | null;
  type: 'EPI' | 'EPC';
  description: string;
  ca_number: string | null;
  effective: boolean;
  notes: string | null;
}

export interface LtcatEvaluation {
  id: string;
  ltcat_id: string;
  exposure_id: string;
  evaluation_date: string | null;
  methodology_code: string | null;
  instrument_name: string | null;
  instrument_serial: string | null;
  calibration_date: string | null;
  result_value: number | null;
  unit: string | null;
  report_reference: string | null;
  notes: string | null;
}

/**
 * Editor do documento LTCAT (beta). Documentos publicados ficam somente
 * leitura — alterações exigem nova revisão (ltcat_create_revision).
 */
const LTCATDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useRealAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [doc, setDoc] = useState<LtcatDoc | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string; cnpj: string | null; logo_url?: string | null } | null>(null);
  const [ghes, setGhes] = useState<LtcatGhe[]>([]);
  const [exposures, setExposures] = useState<LtcatExposure[]>([]);
  const [epiEpcs, setEpiEpcs] = useState<LtcatEpiEpc[]>([]);
  const [evaluations, setEvaluations] = useState<LtcatEvaluation[]>([]);

  // Formulário de identificação (aba 1)
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  usePageSEO({ title: 'LTCAT — Documento | SR SMS', description: 'Editor do documento LTCAT (beta).' });

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: d, error: e0 }] = await Promise.all([
        supabase.from('ltcat_documents' as any).select('*').eq('id', id).maybeSingle(),
      ]);
      if (e0) throw e0;
      if (!d) { setNotFound(true); setLoading(false); return; }
      const docRow = d as any as LtcatDoc;
      setDoc(docRow);
      setForm({
        title: docRow.title || '',
        reference_period_start: docRow.reference_period_start || '',
        reference_period_end: docRow.reference_period_end || '',
        emission_date: docRow.emission_date || '',
        notes: docRow.notes || '',
        resp_nome: docRow.responsible?.nome || '',
        resp_cpf: docRow.responsible?.cpf || '',
        resp_conselho: docRow.responsible?.conselho || '',
        resp_registro: docRow.responsible?.numero_registro || '',
        resp_habilitacao: docRow.responsible?.habilitacao || '',
        org_nome: docRow.org_responsible?.nome || '',
        org_cargo: docRow.org_responsible?.cargo || '',
        org_cpf: docRow.org_responsible?.cpf || '',
        additional_addresses: (docRow.additional_addresses || []).join('\n'),
      });

      const [c, g, x, p, a] = await Promise.all([
        supabase.from('companies').select('id, name, cnpj, logo_url').eq('id', docRow.company_id).maybeSingle(),
        supabase.from('ltcat_ghes' as any).select('*').eq('ltcat_id', id).order('sort_order').order('created_at'),
        supabase.from('ltcat_exposures' as any).select('*').eq('ltcat_id', id).order('created_at'),
        supabase.from('ltcat_epi_epc' as any).select('*').eq('ltcat_id', id).order('created_at'),
        supabase.from('ltcat_evaluations' as any).select('*').eq('ltcat_id', id).order('evaluation_date'),
      ]);
      if (c.error) throw c.error;
      if (g.error) throw g.error;
      if (x.error) throw x.error;
      if (p.error) throw p.error;
      if (a.error) throw a.error;
      setCompany(c.data as any);
      setGhes((g.data as any[]) || []);
      setExposures((x.data as any[]) || []);
      setEpiEpcs((p.data as any[]) || []);
      setEvaluations((a.data as any[]) || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Falha ao carregar o documento LTCAT.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (user && id) reload(); }, [user, id, reload]);

  const readOnly = doc?.status === 'published';

  const saveIdentification = async () => {
    if (!doc || readOnly) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ltcat_documents' as any)
        .update({
          title: form.title.trim() || 'LTCAT',
          reference_period_start: form.reference_period_start || null,
          reference_period_end: form.reference_period_end || null,
          emission_date: form.emission_date || null,
          notes: form.notes || null,
          responsible: {
            nome: form.resp_nome, cpf: form.resp_cpf, conselho: form.resp_conselho,
            numero_registro: form.resp_registro, habilitacao: form.resp_habilitacao,
          },
          org_responsible: { nome: form.org_nome, cargo: form.org_cargo, cpf: form.org_cpf },
          additional_addresses: form.additional_addresses
            .split('\n').map((s: string) => s.trim()).filter(Boolean),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', doc.id);
      if (error) throw error;
      toast.success('Identificação salva.');
      reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <p className="text-lg font-medium">Documento não encontrado ou sem permissão de acesso.</p>
          <Button className="mt-4" onClick={() => navigate('/ltcat')}>Voltar ao LTCAT</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const setF = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ltcat')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar aos documentos
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{doc.title}</h1>
              <Badge variant="outline">v{doc.version_number}</Badge>
              {readOnly
                ? <Badge className="bg-emerald-600 hover:bg-emerald-600"><Lock className="h-3 w-3 mr-1" /> Publicado</Badge>
                : <Badge variant="secondary">Rascunho</Badge>}
              <BetaBadge label="BETA" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {company?.name}{company?.cnpj ? ` · CNPJ ${company.cnpj}` : ''}
            </p>
          </div>
          <BetaFeedbackButton />
        </div>

        {readOnly && (
          <Alert className="mb-4 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/20">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Documento publicado em {doc.published_at ? new Date(doc.published_at).toLocaleString('pt-BR') : '—'}.
              Está em somente leitura. Para alterar, crie uma nova revisão na aba “Validação”.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="ident">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="ident">Identificação</TabsTrigger>
            <TabsTrigger value="ghes">GHEs ({ghes.length})</TabsTrigger>
            <TabsTrigger value="expos">Exposições ({exposures.length})</TabsTrigger>
            <TabsTrigger value="epiepc">EPI/EPC ({epiEpcs.length})</TabsTrigger>
            <TabsTrigger value="avals">Avaliações ({evaluations.length})</TabsTrigger>
            <TabsTrigger value="valid">Validação & PDF</TabsTrigger>
          </TabsList>

          <TabsContent value="ident" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Dados do documento</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={(e) => setF('title', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Início do período de referência *</Label>
                  <Input type="date" value={form.reference_period_start} onChange={(e) => setF('reference_period_start', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim do período de referência *</Label>
                  <Input type="date" value={form.reference_period_end} onChange={(e) => setF('reference_period_end', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de emissão</Label>
                  <Input type="date" value={form.emission_date} onChange={(e) => setF('emission_date', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Unidades / endereços adicionais (um por linha)</Label>
                  <Textarea rows={3} value={form.additional_addresses} onChange={(e) => setF('additional_addresses', e.target.value)} disabled={readOnly} placeholder="Endereço da unidade 2&#10;Endereço da unidade 3" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Observações gerais</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setF('notes', e.target.value)} disabled={readOnly} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Responsável técnico pelo LTCAT *</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input value={form.resp_nome} onChange={(e) => setF('resp_nome', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF *</Label>
                  <Input value={form.resp_cpf} onChange={(e) => setF('resp_cpf', e.target.value)} disabled={readOnly} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Conselho profissional *</Label>
                  <Input value={form.resp_conselho} onChange={(e) => setF('resp_conselho', e.target.value)} disabled={readOnly} placeholder="CREA / CRM / CRQ ..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Nº de registro *</Label>
                  <Input value={form.resp_registro} onChange={(e) => setF('resp_registro', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Habilitação *</Label>
                  <Input value={form.resp_habilitacao} onChange={(e) => setF('resp_habilitacao', e.target.value)} disabled={readOnly} placeholder="Ex.: Engenheiro de Segurança do Trabalho" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Responsável pela organização (opcional)</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={form.org_nome} onChange={(e) => setF('org_nome', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cargo</Label>
                  <Input value={form.org_cargo} onChange={(e) => setF('org_cargo', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF</Label>
                  <Input value={form.org_cpf} onChange={(e) => setF('org_cpf', e.target.value)} disabled={readOnly} />
                </div>
              </CardContent>
            </Card>

            {!readOnly && (
              <div className="flex justify-end">
                <Button onClick={saveIdentification} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar identificação
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ghes" className="mt-4">
            <LtcatGhesPanel ltcatId={doc.id} companyId={doc.company_id} ghes={ghes} readOnly={readOnly} onChanged={reload} />
          </TabsContent>

          <TabsContent value="expos" className="mt-4">
            <LtcatExposuresPanel ltcatId={doc.id} ghes={ghes} exposures={exposures} readOnly={readOnly} onChanged={reload} />
          </TabsContent>

          <TabsContent value="epiepc" className="mt-4">
            <LtcatEpiEpcPanel ltcatId={doc.id} ghes={ghes} exposures={exposures} items={epiEpcs} readOnly={readOnly} onChanged={reload} />
          </TabsContent>

          <TabsContent value="avals" className="mt-4">
            <LtcatEvaluationsPanel ltcatId={doc.id} exposures={exposures} ghes={ghes} evaluations={evaluations} readOnly={readOnly} onChanged={reload} />
          </TabsContent>

          <TabsContent value="valid" className="mt-4">
            <LtcatValidationPanel
              doc={doc}
              company={company}
              ghes={ghes}
              exposures={exposures}
              epiEpcs={epiEpcs}
              evaluations={evaluations}
              onChanged={reload}
            />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default LTCATDetail;
