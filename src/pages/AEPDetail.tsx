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
import { ArrowLeft, Loader2, Download, Send, GitBranch, Upload, Trash2, FileText, ClipboardList, Users, Paperclip, History, Link2, CheckCircle2, Pencil, Plus, Lock, Split } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { SendToInventoryDialog } from "@/components/aep/SendToInventoryDialog";
import { SplitAEPByGHEDialog } from "@/components/aep/SplitAEPByGHEDialog";
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

  // Edição — Dados
  const [editDadosOpen, setEditDadosOpen] = useState(false);
  const [dadosForm, setDadosForm] = useState<any>({});

  // Edição — Fator
  const [editFatorOpen, setEditFatorOpen] = useState(false);
  const [fatorEditing, setFatorEditing] = useState<any>(null);
  const [fatorForm, setFatorForm] = useState<any>({});

  // Edição — Participante
  const [editPartOpen, setEditPartOpen] = useState(false);
  const [partEditing, setPartEditing] = useState<any>(null);
  const [partForm, setPartForm] = useState<any>({ nome: '', funcao: '', tipo_participacao: 'entrevista', anonimizado: false });

  // Excluir AEP
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const deleteAep = async () => {
    if (!aep) return;
    setDeleting(true);
    try {
      // Coleta ids relacionados
      const [{ data: fats }, { data: evs }] = await Promise.all([
        supabase.from('aep_fatores_avaliados' as any).select('id').eq('aep_id', aep.id),
        supabase.from('aep_evidencias' as any).select('id, file_path').eq('aep_id', aep.id),
      ]);
      const fatIds = ((fats as any[]) || []).map(f => f.id);

      // Remove vínculos com PGR (risco no inventário permanece)
      if (fatIds.length) {
        await supabase.from('aep_pgr_vinculo' as any).delete().in('aep_fator_id', fatIds);
      }
      // Remove arquivos do storage
      const paths = ((evs as any[]) || []).map(e => e.file_path).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from('aep-evidencias').remove(paths);
      }
      // Remove filhos (caso não tenha ON DELETE CASCADE)
      await Promise.all([
        supabase.from('aep_evidencias' as any).delete().eq('aep_id', aep.id),
        supabase.from('aep_participantes' as any).delete().eq('aep_id', aep.id),
        supabase.from('aep_fatores_avaliados' as any).delete().eq('aep_id', aep.id),
      ]);
      // Remove a AEP
      const { error } = await supabase.from('aep_avaliacoes' as any).delete().eq('id', aep.id);
      if (error) throw error;
      toast.success('AEP excluída');
      navigate(`/aep/${companyId}`);
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

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
      const evs = (evRes.data as any[]) || [];
      // Generate signed URLs (1h) so we can preview images inline and embed in PDFs
      const withUrls = await Promise.all(evs.map(async (e) => {
        const { data } = await supabase.storage.from('aep-evidencias').createSignedUrl(e.file_path, 3600);
        return { ...e, signed_url: data?.signedUrl || null };
      }));
      setEvidencias(withUrls);

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

  // ─── Edição ────────────────────────────────────────────────
  const isEditable = aep && ['draft', 'in_progress', 'in_review'].includes(aep.status);

  const openEditDados = () => {
    if (!aep) return;
    setDadosForm({
      setor_nome: aep.setor_nome || '',
      funcao_nome: aep.funcao_nome || '',
      situacao_trabalho: aep.situacao_trabalho || '',
      assessment_date: aep.assessment_date || '',
      next_review_date: aep.next_review_date || '',
      methodologies: (aep.methodologies || []).join(', '),
      instrument_name: aep.instrument_name || '',
      methodology_details: aep.methodology_details || '',
      anonymity_ensured: !!aep.anonymity_ensured,
      responsible_name: aep.responsible_name || '',
      responsible_role: aep.responsible_role || '',
      responsible_registration: aep.responsible_registration || '',
    });
    setEditDadosOpen(true);
  };
  const saveDados = async () => {
    try {
      const patch: any = {
        setor_nome: dadosForm.setor_nome || null,
        funcao_nome: dadosForm.funcao_nome || null,
        situacao_trabalho: dadosForm.situacao_trabalho || null,
        assessment_date: dadosForm.assessment_date || null,
        next_review_date: dadosForm.next_review_date || null,
        methodologies: (dadosForm.methodologies || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        instrument_name: dadosForm.instrument_name || null,
        methodology_details: dadosForm.methodology_details || null,
        anonymity_ensured: !!dadosForm.anonymity_ensured,
        responsible_name: dadosForm.responsible_name || null,
        responsible_role: dadosForm.responsible_role || null,
        responsible_registration: dadosForm.responsible_registration || null,
      };
      const { error } = await supabase.from('aep_avaliacoes' as any).update(patch).eq('id', aep.id);
      if (error) throw error;
      toast.success('Dados atualizados');
      setEditDadosOpen(false);
      load();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };

  const openEditFator = (f: any) => {
    setFatorEditing(f);
    setFatorForm({
      categoria: f.categoria,
      fator_nome: f.fator_nome || '',
      fonte_causa: f.fonte_causa || '',
      grupos_expostos: f.grupos_expostos || '',
      evidencia_texto: f.evidencia_texto || '',
      severity: f.severity || 3,
      probability: f.probability || 3,
      observacoes: f.observacoes || '',
    });
    setEditFatorOpen(true);
  };
  const saveFator = async () => {
    if (!fatorEditing) return;
    try {
      const patch: any = {
        categoria: fatorForm.categoria,
        fator_nome: fatorForm.fator_nome || null,
        fonte_causa: fatorForm.fonte_causa || null,
        grupos_expostos: fatorForm.grupos_expostos || null,
        evidencia_texto: fatorForm.evidencia_texto || null,
        severity: Number(fatorForm.severity) || 1,
        probability: Number(fatorForm.probability) || 1,
        observacoes: fatorForm.observacoes || null,
      };
      const { error } = await supabase.from('aep_fatores_avaliados' as any).update(patch).eq('id', fatorEditing.id);
      if (error) throw error;
      toast.success('Fator atualizado');
      setEditFatorOpen(false);
      load();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };
  const deleteFator = async (f: any) => {
    const linked = linkedByFator.get(f.id) || [];
    const warn = linked.length > 0
      ? `Este fator está vinculado a ${linked.length} risco(s) do PGR. O vínculo será removido (os riscos no inventário do PGR permanecem). Excluir?`
      : `Excluir o fator "${f.fator_nome}"?`;
    if (!confirm(warn)) return;
    try {
      await supabase.from('aep_pgr_vinculo' as any).delete().eq('aep_fator_id', f.id);
      const { error } = await supabase.from('aep_fatores_avaliados' as any).delete().eq('id', f.id);
      if (error) throw error;
      toast.success('Fator excluído');
      load();
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    }
  };

  const openNewPart = () => {
    setPartEditing(null);
    setPartForm({ nome: '', funcao: '', tipo_participacao: 'entrevista', anonimizado: false });
    setEditPartOpen(true);
  };
  const openEditPart = (p: any) => {
    setPartEditing(p);
    setPartForm({
      nome: p.nome || '',
      funcao: p.funcao || '',
      tipo_participacao: p.tipo_participacao || 'entrevista',
      anonimizado: !!p.anonimizado,
    });
    setEditPartOpen(true);
  };
  const savePart = async () => {
    try {
      const payload: any = {
        nome: partForm.nome || null,
        funcao: partForm.funcao || null,
        tipo_participacao: partForm.tipo_participacao,
        anonimizado: !!partForm.anonimizado,
      };
      if (partEditing) {
        const { error } = await supabase.from('aep_participantes' as any).update(payload).eq('id', partEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('aep_participantes' as any).insert({ ...payload, aep_id: aep.id } as any);
        if (error) throw error;
      }
      toast.success('Participante salvo');
      setEditPartOpen(false);
      load();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };
  const deletePart = async (p: any) => {
    if (!confirm('Excluir este participante?')) return;
    const { error } = await supabase.from('aep_participantes' as any).delete().eq('id', p.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Participante excluído');
    load();
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
          <div className="flex gap-2 flex-wrap items-center">
            {(() => {
              const STATUS_FLOW: Record<string, { next: string; label: string }> = {
                draft: { next: 'in_progress', label: 'Em andamento' },
                in_progress: { next: 'in_review', label: 'Em revisão' },
                in_review: { next: 'completed', label: 'Concluída' },
                completed: { next: 'revised', label: 'Revisada' },
              };
              const flow = STATUS_FLOW[aep.status];
              if (!flow) return null;
              return (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const patch: any = { status: flow.next };
                      if ((flow.next === 'completed' || flow.next === 'revised') && !aep.signed_at) {
                        patch.signed_at = new Date().toISOString();
                      }
                      const { error } = await supabase.from('aep_avaliacoes' as any).update(patch).eq('id', aep.id);
                      if (error) throw error;
                      toast.success(`Status alterado para "${flow.label}"`);
                      load();
                    } catch (e: any) {
                      toast.error('Erro ao alterar status: ' + e.message);
                    }
                  }}
                  className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" /> Avançar para: {flow.label}
                </Button>
              );
            })()}
            <Select
              value={aep.status}
              onValueChange={async (newStatus) => {
                try {
                  const patch: any = { status: newStatus };
                  if ((newStatus === 'completed' || newStatus === 'revised') && !aep.signed_at) {
                    patch.signed_at = new Date().toISOString();
                  }
                  const { error } = await supabase.from('aep_avaliacoes' as any).update(patch).eq('id', aep.id);
                  if (error) throw error;
                  toast.success(`Status alterado para "${AEP_STATUS_LABELS[newStatus]}"`);
                  load();
                } catch (e: any) {
                  toast.error('Erro ao alterar status: ' + e.message);
                }
              }}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="in_review">Em revisão</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="revised">Revisada</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setNewVersionOpen(true)} className="gap-1">
              <GitBranch className="h-4 w-4" /> Nova versão
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendOpen(true)}
              disabled={aep.status !== 'completed' && aep.status !== 'revised'}
              title={aep.status !== 'completed' && aep.status !== 'revised' ? 'Aprove a AEP (Concluída ou Revisada) antes de enviar ao PGR' : ''}
              className="gap-1"
            >
              <Send className="h-4 w-4" /> Enviar ao inventário
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setConfirmText(''); setDeleteOpen(true); }}
              className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Excluir AEP
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
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Informações da AEP</span>
                  {isEditable ? (
                    <Button size="sm" variant="outline" onClick={openEditDados} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Crie uma nova versão para alterar</span>
                  )}
                </div>
                {Array.isArray(aep.escopo_json) && aep.escopo_json.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">Escopo da AEP ({aep.escopo_json.length} item{aep.escopo_json.length > 1 ? 's' : ''})</div>
                    <div className="flex flex-wrap gap-1">
                      {aep.escopo_json.map((it: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          {it.setor} — {it.funcao}{it.cbo ? ` · CBO ${it.cbo}` : ''} · {it.worker_count || 1} trab.
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground pt-1">
                      Total coberto: <strong>{aep.escopo_json.reduce((s: number, i: any) => s + (i.worker_count || 0), 0)}</strong> trabalhador(es)
                    </div>
                  </div>
                ) : (
                  <>
                    <Row label="Setor" value={aep.setor_nome} />
                    <Row label="Função/cargo" value={aep.funcao_nome} />
                  </>
                )}
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
              {!isEditable && fatores.length > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Lock className="h-3 w-3" /> Crie uma nova versão para alterar os fatores
                </div>
              )}
              {fatores.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum fator levantado</CardContent></Card>}
              {fatores.map(f => {
                const level = classifyRisk(5, f.severity, f.probability);
                const linked = linkedByFator.get(f.id) || [];
                return (
                  <Card key={f.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          <span className="font-semibold">{f.fator_nome}</span>
                          <Badge variant="outline" className={AEP_CATEGORIA_COLORS[f.categoria as keyof typeof AEP_CATEGORIA_COLORS]}>
                            {AEP_CATEGORIAS[f.categoria as keyof typeof AEP_CATEGORIAS]}
                          </Badge>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_STYLES[level]}`}>
                            {LEVEL_LABELS[level]}
                          </span>
                          <span className="text-xs text-muted-foreground">S={f.severity} P={f.probability}</span>
                        </div>
                        {isEditable && (
                          <div className="flex gap-0.5 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditFator(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteFator(f)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        )}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {evidencias.map(ev => {
                      const isImage = ev.mime_type?.startsWith('image/');
                      return (
                        <div key={ev.id} className="border rounded overflow-hidden bg-muted/30 flex flex-col">
                          {isImage && ev.signed_url ? (
                            <a href={ev.signed_url} target="_blank" rel="noreferrer" className="block bg-black/5">
                              <img src={ev.signed_url} alt={ev.file_name} className="w-full h-40 object-cover" />
                            </a>
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center bg-muted">
                              <Paperclip className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium truncate" title={ev.file_name}>{ev.file_name}</div>
                              {ev.mime_type && <div className="text-[10px] text-muted-foreground">{ev.mime_type}</div>}
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => downloadEvidencia(ev)}><Download className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteEvidencia(ev)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participantes" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Participantes ouvidos</span>
                  {isEditable ? (
                    <Button size="sm" variant="outline" onClick={openNewPart} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Crie uma nova versão para alterar</span>
                  )}
                </div>
                {participantes.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">Nenhum participante registrado</div>
                ) : participantes.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.anonimizado ? '(Anonimizado)' : (p.nome || '—')}</span>
                      {p.funcao && <span className="text-muted-foreground"> — {p.funcao}</span>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{p.tipo_participacao}</Badge>
                    {isEditable && (
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditPart(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deletePart(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    )}
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

      {/* Editar dados da AEP */}
      <Dialog open={editDadosOpen} onOpenChange={setEditDadosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar dados da AEP</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Setor</Label><Input value={dadosForm.setor_nome || ''} onChange={e => setDadosForm({ ...dadosForm, setor_nome: e.target.value })} /></div>
              <div className="space-y-1"><Label>Função/cargo</Label><Input value={dadosForm.funcao_nome || ''} onChange={e => setDadosForm({ ...dadosForm, funcao_nome: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Situação avaliada</Label><Textarea rows={2} value={dadosForm.situacao_trabalho || ''} onChange={e => setDadosForm({ ...dadosForm, situacao_trabalho: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Data da avaliação</Label><Input type="date" value={dadosForm.assessment_date || ''} onChange={e => setDadosForm({ ...dadosForm, assessment_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Próxima revisão</Label><Input type="date" value={dadosForm.next_review_date || ''} onChange={e => setDadosForm({ ...dadosForm, next_review_date: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Metodologias (separe por vírgula)</Label><Input value={dadosForm.methodologies || ''} onChange={e => setDadosForm({ ...dadosForm, methodologies: e.target.value })} placeholder="observacao, entrevista, checklist" /></div>
            <div className="space-y-1"><Label>Instrumento</Label><Input value={dadosForm.instrument_name || ''} onChange={e => setDadosForm({ ...dadosForm, instrument_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Detalhes da metodologia</Label><Textarea rows={2} value={dadosForm.methodology_details || ''} onChange={e => setDadosForm({ ...dadosForm, methodology_details: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!dadosForm.anonymity_ensured} onCheckedChange={v => setDadosForm({ ...dadosForm, anonymity_ensured: !!v })} />
              Anonimato garantido
            </label>
            <div className="border-t pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Responsável técnico</Label><Input value={dadosForm.responsible_name || ''} onChange={e => setDadosForm({ ...dadosForm, responsible_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Cargo/formação</Label><Input value={dadosForm.responsible_role || ''} onChange={e => setDadosForm({ ...dadosForm, responsible_role: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Registro (CREA/MTE)</Label><Input value={dadosForm.responsible_registration || ''} onChange={e => setDadosForm({ ...dadosForm, responsible_registration: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDadosOpen(false)}>Cancelar</Button>
            <Button onClick={saveDados}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar fator */}
      <Dialog open={editFatorOpen} onOpenChange={setEditFatorOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar fator</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={fatorForm.categoria} onValueChange={v => setFatorForm({ ...fatorForm, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AEP_CATEGORIAS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Nome do fator</Label><Input value={fatorForm.fator_nome || ''} onChange={e => setFatorForm({ ...fatorForm, fator_nome: e.target.value })} /></div>
            <div className="space-y-1"><Label>Fonte/causa</Label><Textarea rows={2} value={fatorForm.fonte_causa || ''} onChange={e => setFatorForm({ ...fatorForm, fonte_causa: e.target.value })} /></div>
            <div className="space-y-1"><Label>Grupos expostos</Label><Input value={fatorForm.grupos_expostos || ''} onChange={e => setFatorForm({ ...fatorForm, grupos_expostos: e.target.value })} /></div>
            <div className="space-y-1"><Label>Evidência (texto)</Label><Textarea rows={2} value={fatorForm.evidencia_texto || ''} onChange={e => setFatorForm({ ...fatorForm, evidencia_texto: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Severidade (1-5)</Label>
                <Select value={String(fatorForm.severity || 3)} onValueChange={v => setFatorForm({ ...fatorForm, severity: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Probabilidade (1-5)</Label>
                <Select value={String(fatorForm.probability || 3)} onValueChange={v => setFatorForm({ ...fatorForm, probability: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} value={fatorForm.observacoes || ''} onChange={e => setFatorForm({ ...fatorForm, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFatorOpen(false)}>Cancelar</Button>
            <Button onClick={saveFator}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar/Adicionar participante */}
      <Dialog open={editPartOpen} onOpenChange={setEditPartOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{partEditing ? 'Editar' : 'Adicionar'} participante</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1"><Label>Nome</Label><Input value={partForm.nome} onChange={e => setPartForm({ ...partForm, nome: e.target.value })} disabled={partForm.anonimizado} placeholder={partForm.anonimizado ? '(anônimo)' : ''} /></div>
            <div className="space-y-1"><Label>Função</Label><Input value={partForm.funcao} onChange={e => setPartForm({ ...partForm, funcao: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Tipo de participação</Label>
              <Select value={partForm.tipo_participacao} onValueChange={v => setPartForm({ ...partForm, tipo_participacao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrevista">Entrevista</SelectItem>
                  <SelectItem value="observacao">Observação</SelectItem>
                  <SelectItem value="questionario">Questionário</SelectItem>
                  <SelectItem value="grupo_focal">Grupo focal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={!!partForm.anonimizado} onCheckedChange={v => setPartForm({ ...partForm, anonimizado: !!v })} />
              Anonimizado
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPartOpen(false)}>Cancelar</Button>
            <Button onClick={savePart}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação para excluir AEP */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setConfirmText(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Excluir AEP permanentemente?</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Esta ação é <strong>irreversível</strong>. Serão apagados:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>A AEP <strong>v{aep.version}</strong> — {aep.setor_nome || 'setor não informado'}</li>
              <li>Todos os fatores levantados ({fatores.length})</li>
              <li>Todos os participantes registrados ({participantes.length})</li>
              <li>Todas as evidências anexadas ({evidencias.length}) e seus arquivos</li>
              <li>Os vínculos com o inventário do PGR</li>
            </ul>
            <p className="text-xs text-muted-foreground">Os riscos já enviados ao inventário do PGR <strong>permanecem lá</strong> — apenas os vínculos serão removidos.</p>
            <div className="pt-2 space-y-1">
              <Label className="text-xs">Digite <strong>EXCLUIR</strong> para confirmar:</Label>
              <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="EXCLUIR" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={deleteAep}
              disabled={deleting || confirmText.trim().toUpperCase() !== 'EXCLUIR'}
              className="gap-1"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir definitivamente
            </Button>
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
