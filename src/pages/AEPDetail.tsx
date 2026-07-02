import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Download, Send, GitBranch, Upload, Trash2, FileText, ClipboardList, Users, Paperclip, History, Link2 } from "lucide-react";
import { toast } from "sonner";
import { SendToInventoryDialog } from "@/components/aep/SendToInventoryDialog";
import { generateAEPReportPDF } from "@/components/aep/AEPReportPDF";
import { classifyRisk, LEVEL_LABELS, LEVEL_STYLES, AEP_STATUS_LABELS, AEP_STATUS_STYLES } from "@/lib/aepRiskLevel";
import { AEP_CATEGORIAS, AEP_CATEGORIA_COLORS } from "@/hooks/useAEPFatoresCatalog";

const AEPDetail = () => {
  const { companyId, aepId } = useParams<{ companyId: string; aepId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useRealAuth();
  const [loading, setLoading] = useState(true);
  const [aep, setAep] = useState<any>(null);
  const [fatores, setFatores] = useState<any[]>([]);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [linkedRisks, setLinkedRisks] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [sstLogoUrl, setSstLogoUrl] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!aepId) return;
    setLoading(true);
    try {
      const [aepRes, fatRes, parRes, evRes] = await Promise.all([
        supabase.from('aep_avaliacoes' as any).select('*').eq('id', aepId).maybeSingle(),
        supabase.from('aep_fatores_avaliados' as any).select('*').eq('aep_id', aepId).order('created_at'),
        supabase.from('aep_participantes' as any).select('*').eq('aep_id', aepId).order('created_at'),
        supabase.from('aep_evidencias' as any).select('*').eq('aep_id', aepId).order('uploaded_at', { ascending: false }),
      ]);
      const aepData = aepRes.data as any;
      setAep(aepData);
      const fats = (fatRes.data as any[]) || [];
      setFatores(fats);
      setParticipantes((parRes.data as any[]) || []);
      setEvidencias((evRes.data as any[]) || []);

      if (aepData?.company_id) {
        const { data: c } = await supabase.from('companies').select('name, cnpj, logo_url').eq('id', aepData.company_id).maybeSingle();
        setCompany(c);

        // SST logo
        const { data: assign } = await supabase.from('company_sst_assignments').select('sst_manager_id').eq('company_id', aepData.company_id).limit(1).maybeSingle();
        if (assign) {
          const { data: sst } = await supabase.from('sst_managers').select('logo_url').eq('id', (assign as any).sst_manager_id).maybeSingle();
          setSstLogoUrl((sst as any)?.logo_url || null);
        }
      }

      // Version chain (find root and load all)
      if (aepData) {
        const chainRoot = aepData.parent_version_id || aepData.id;
        const { data: chain } = await supabase.from('aep_avaliacoes' as any)
          .select('id, version, status, assessment_date, parent_version_id')
          .or(`id.eq.${chainRoot},parent_version_id.eq.${chainRoot},id.eq.${aepData.id}`)
          .order('version');
        setVersions((chain as any[]) || []);
      }

      // Linked risks
      if (fats.length) {
        const fatIds = fats.map(f => f.id);
        const { data: vinc } = await supabase.from('aep_pgr_vinculo' as any)
          .select('aep_fator_id, pgr_risk_id, pgr_risks(id, agent_name, risk_level, category, severity, probability)')
          .in('aep_fator_id', fatIds);
        setLinkedRisks((vinc as any[]) || []);
      }
    } catch (e: any) {
      toast.error('Erro ao carregar AEP: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    load();
  }, [user, authLoading, aepId]);

  const createNewVersion = async () => {
    if (!aep) return;
    try {
      const rootId = aep.parent_version_id || aep.id;
      const maxV = versions.reduce((m, v) => Math.max(m, v.version), aep.version);
      const { data: authData } = await supabase.auth.getUser();
      const { data: newAep, error } = await supabase.from('aep_avaliacoes' as any).insert({
        company_id: aep.company_id,
        pgr_document_id: aep.pgr_document_id,
        ghe_id: aep.ghe_id,
        setor_nome: aep.setor_nome,
        funcao_nome: aep.funcao_nome,
        situacao_trabalho: aep.situacao_trabalho,
        assessment_date: new Date().toISOString().split('T')[0],
        responsible_name: aep.responsible_name,
        responsible_role: aep.responsible_role,
        responsible_registration: aep.responsible_registration,
        methodologies: aep.methodologies,
        methodology_details: aep.methodology_details,
        instrument_name: aep.instrument_name,
        anonymity_ensured: aep.anonymity_ensured,
        status: 'draft',
        version: maxV + 1,
        parent_version_id: rootId,
        created_by: authData.user?.id,
      } as any).select('id').single();
      if (error) throw error;
      const newId = (newAep as any).id;

      // Copy fatores
      if (fatores.length) {
        await supabase.from('aep_fatores_avaliados' as any).insert(fatores.map(f => ({
          aep_id: newId,
          categoria: f.categoria, fator_codigo: f.fator_codigo, fator_nome: f.fator_nome,
          fonte_causa: f.fonte_causa, grupos_expostos: f.grupos_expostos,
          evidencia_texto: f.evidencia_texto, severity: f.severity, probability: f.probability,
          matrix_size: f.matrix_size, observacoes: f.observacoes,
        })) as any);
      }
      if (participantes.length) {
        await supabase.from('aep_participantes' as any).insert(participantes.map(p => ({
          aep_id: newId, nome: p.nome, funcao: p.funcao,
          tipo_participacao: p.tipo_participacao, anonimizado: p.anonimizado,
        })) as any);
      }
      toast.success('Nova versão criada');
      setNewVersionOpen(false);
      navigate(`/aep/${companyId}/${newId}`);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length || !aep) return;
    setUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      for (const file of Array.from(files)) {
        const path = `${aep.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('aep-evidencias').upload(path, file);
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('aep_evidencias' as any).insert({
          aep_id: aep.id, file_path: path, file_name: file.name,
          mime_type: file.type, size_bytes: file.size, uploaded_by: userId,
        } as any);
        if (dbErr) throw dbErr;
      }
      toast.success(`${files.length} arquivo(s) enviado(s)`);
      load();
    } catch (e: any) {
      toast.error('Erro no upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteEvidencia = async (ev: any) => {
    if (!confirm(`Excluir "${ev.file_name}"?`)) return;
    await supabase.storage.from('aep-evidencias').remove([ev.file_path]);
    await supabase.from('aep_evidencias' as any).delete().eq('id', ev.id);
    load();
  };

  const downloadEvidencia = async (ev: any) => {
    const { data } = await supabase.storage.from('aep-evidencias').createSignedUrl(ev.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const exportPDF = async () => {
    if (!aep || !company) return;
    try {
      await generateAEPReportPDF({
        aep, company, sstLogoUrl, fatores, participantes, evidencias,
      });
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + e.message);
    }
  };

  if (authLoading || loading || !aep) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const linkedByFator = new Map<string, any[]>();
  linkedRisks.forEach(l => {
    const arr = linkedByFator.get(l.aep_fator_id) || [];
    arr.push(l);
    linkedByFator.set(l.aep_fator_id, arr);
  });
  const today = new Date().toISOString().split('T')[0];
  const overdue = aep.next_review_date && aep.next_review_date < today;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/aep/${companyId}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">AEP — {aep.setor_nome || 'Setor'}</h1>
                <Badge variant="outline">v{aep.version}</Badge>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${AEP_STATUS_STYLES[aep.status]}`}>
                  {AEP_STATUS_LABELS[aep.status]}
                </span>
                {overdue && <Badge variant="destructive">Revisão vencida</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{company?.name}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setNewVersionOpen(true)} className="gap-1">
              <GitBranch className="h-4 w-4" /> Nova versão
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button size="sm" onClick={() => setSendOpen(true)} className="gap-1">
              <Send className="h-4 w-4" /> Enviar ao inventário
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dados">
          <TabsList className="grid grid-cols-5 max-w-3xl">
            <TabsTrigger value="dados"><FileText className="h-4 w-4 mr-1" />Dados</TabsTrigger>
            <TabsTrigger value="fatores"><ClipboardList className="h-4 w-4 mr-1" />Fatores ({fatores.length})</TabsTrigger>
            <TabsTrigger value="evidencias"><Paperclip className="h-4 w-4 mr-1" />Evidências ({evidencias.length})</TabsTrigger>
            <TabsTrigger value="participantes"><Users className="h-4 w-4 mr-1" />Participantes ({participantes.length})</TabsTrigger>
            <TabsTrigger value="versoes"><History className="h-4 w-4 mr-1" />Versões ({versions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm">
                <Row label="Setor" value={aep.setor_nome} />
                <Row label="Função/cargo" value={aep.funcao_nome} />
                <Row label="Situação avaliada" value={aep.situacao_trabalho} />
                <Row label="Data da avaliação" value={new Date(aep.assessment_date).toLocaleDateString('pt-BR')} />
                {aep.next_review_date && <Row label="Próxima revisão" value={new Date(aep.next_review_date).toLocaleDateString('pt-BR')} />}
                <Row label="Metodologias" value={(aep.methodologies || []).join(', ')} />
                {aep.instrument_name && <Row label="Instrumento" value={aep.instrument_name} />}
                {aep.methodology_details && <Row label="Detalhes" value={aep.methodology_details} />}
                <Row label="Anonimato garantido" value={aep.anonymity_ensured ? 'Sim' : 'Não'} />
                <div className="border-t pt-3">
                  <Row label="Responsável técnico" value={aep.responsible_name} />
                  <Row label="Cargo/formação" value={aep.responsible_role} />
                  {aep.responsible_registration && <Row label="Registro" value={aep.responsible_registration} />}
                  {aep.signed_at && <Row label="Assinado em" value={new Date(aep.signed_at).toLocaleString('pt-BR')} />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fatores" className="mt-4">
            <div className="space-y-3">
              {fatores.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum fator levantado</CardContent></Card>}
              {fatores.map(f => {
                const level = classifyRisk(5, f.severity, f.probability);
                const linked = linkedByFator.get(f.id) || [];
                return (
                  <Card key={f.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{f.fator_nome}</span>
                        <Badge variant="outline" className={AEP_CATEGORIA_COLORS[f.categoria as keyof typeof AEP_CATEGORIA_COLORS]}>
                          {AEP_CATEGORIAS[f.categoria as keyof typeof AEP_CATEGORIAS]}
                        </Badge>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_STYLES[level]}`}>
                          {LEVEL_LABELS[level]}
                        </span>
                        <span className="text-xs text-muted-foreground">S={f.severity} P={f.probability}</span>
                      </div>
                      {f.fonte_causa && <div className="text-xs"><span className="text-muted-foreground">Fonte/causa: </span>{f.fonte_causa}</div>}
                      {f.grupos_expostos && <div className="text-xs"><span className="text-muted-foreground">Grupos expostos: </span>{f.grupos_expostos}</div>}
                      {f.evidencia_texto && <div className="text-xs"><span className="text-muted-foreground">Evidência: </span>{f.evidencia_texto}</div>}
                      {linked.length > 0 && (
                        <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs">
                          <Link2 className="h-3 w-3 text-green-600" />
                          <span className="text-green-700 font-medium">Vinculado a {linked.length} risco(s) do PGR</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="evidencias" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div>
                  <input type="file" id="aep-file-input" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
                  <Button onClick={() => document.getElementById('aep-file-input')?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Enviar arquivo(s)
                  </Button>
                </div>
                {evidencias.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma evidência anexada</div>
                ) : (
                  <div className="space-y-2">
                    {evidencias.map(ev => (
                      <div key={ev.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{ev.file_name}</span>
                          {ev.mime_type && <Badge variant="outline" className="text-[10px]">{ev.mime_type.split('/')[1]}</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => downloadEvidencia(ev)}><Download className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteEvidencia(ev)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participantes" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-2">
                {participantes.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">Nenhum participante registrado</div>
                ) : participantes.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div>
                      <span className="font-medium">{p.anonimizado ? '(Anonimizado)' : (p.nome || '—')}</span>
                      {p.funcao && <span className="text-muted-foreground"> — {p.funcao}</span>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{p.tipo_participacao}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versoes" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-2">
                {versions.map(v => (
                  <div key={v.id} className={`flex items-center justify-between p-2 border rounded text-sm ${v.id === aep.id ? 'bg-primary/5 border-primary' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{v.version}</Badge>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${AEP_STATUS_STYLES[v.status]}`}>
                        {AEP_STATUS_LABELS[v.status]}
                      </span>
                      <span className="text-muted-foreground">{new Date(v.assessment_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {v.id !== aep.id && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/aep/${companyId}/${v.id}`)}>Ver</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {companyId && (
        <SendToInventoryDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          aepId={aep.id}
          pgrDocumentId={aep.pgr_document_id}
          companyId={companyId}
          gheId={aep.ghe_id}
          onDone={load}
        />
      )}

      <Dialog open={newVersionOpen} onOpenChange={setNewVersionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar nova versão</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2">
            <p>Uma nova versão será criada como <strong>rascunho</strong>, copiando fatores e participantes desta AEP. Os vínculos com o PGR ficarão preservados nesta versão original.</p>
            <p className="text-muted-foreground text-xs">Evidências (anexos) NÃO são copiadas — anexe novamente na nova versão se necessário.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVersionOpen(false)}>Cancelar</Button>
            <Button onClick={createNewVersion}>Criar versão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: any }) => (
  <div className="grid grid-cols-[180px_1fr] gap-2">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span>{value || '—'}</span>
  </div>
);

export default AEPDetail;
