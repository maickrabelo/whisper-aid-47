import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ClipboardList, Calendar, Download, Loader2, Eye, Building2, Plus, Trash2, PenLine, Save } from "lucide-react";
import { toast } from "sonner";
import { generateCOPSOQReport, COPSOQ_RECOMMENDATIONS } from "./COPSOQReportPDF";
import {
  ALL_CATEGORIES,
  COPSOQ_CATEGORY_LABELS,
  COPSOQCategory,
  getRiskLevel,
  RISK_LEVEL_LABELS,
} from "@/data/copsoqQuestions";
import { PsychosocialReportDraftConfig, saveReportDraft } from "@/lib/psychosocialReportDrafts";
import { ReportSignatureFields, SignatureFieldsValue } from "./ReportSignatureFields";

interface Answer { questionNumber: number; value: number; }
interface Response {
  id: string;
  department: string | null;
  departments: string[];
  completedAt: string | null;
  answers: Answer[];
}

export interface COPSOQActionItem {
  id: string;
  category: COPSOQCategory;
  priority: 'immediate' | 'short_term' | 'medium_term';
  description: string;
  recommendation: string;
}

export interface COPSOQScheduleItem {
  id: string;
  action: string;
  deadline: string;
  responsible: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface COPSOQReportEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: { id: string; title: string; description: string | null; createdAt: string };
  companyName: string;
  companyId?: string | null;
  responses: Response[];
  departments: string[];
  selectedDepartment: string;
  categoryAverages: Record<string, number>;
  sstLogoUrl?: string | null;
  sstName?: string | null;
  companyLogoUrl?: string | null;
  initialConfig?: PsychosocialReportDraftConfig | null;
  onSaved?: (config: PsychosocialReportDraftConfig) => void;
}

const PRIORITY_LABELS: Record<COPSOQActionItem['priority'], string> = {
  immediate: 'Imediato (até 30 dias)',
  short_term: 'Curto prazo (1-3 meses)',
  medium_term: 'Médio prazo (3-6 meses)',
};

const STATUS_LABELS: Record<COPSOQScheduleItem['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};

export function COPSOQReportEditor({
  open,
  onOpenChange,
  assessment,
  companyName,
  companyId,
  responses,
  departments,
  selectedDepartment,
  categoryAverages,
  sstLogoUrl,
  sstName,
  companyLogoUrl,
  initialConfig,
  onSaved,
}: COPSOQReportEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const defaultsAppliedRef = useRef(false);
  const loadedConfigRef = useRef(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [actionItems, setActionItems] = useState<COPSOQActionItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<COPSOQScheduleItem[]>([]);
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCnae, setCompanyCnae] = useState("");
  const [companyRiskGrade, setCompanyRiskGrade] = useState("");
  const [sstCpf, setSstCpf] = useState("");
  const [sstRegistration, setSstRegistration] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [orgResponsibleName, setOrgResponsibleName] = useState("");
  const [orgResponsibleCpf, setOrgResponsibleCpf] = useState("");
  const [orgResponsibleRole, setOrgResponsibleRole] = useState("");

  const signatureValue: SignatureFieldsValue = {
    technicianName,
    technicianCpf: sstCpf,
    technicianRegistration: sstRegistration,
    orgResponsibleName,
    orgResponsibleCpf,
    orgResponsibleRole,
  };
  const patchSignature = (patch: Partial<SignatureFieldsValue>) => {
    if (patch.technicianName !== undefined) setTechnicianName(patch.technicianName);
    if (patch.technicianCpf !== undefined) setSstCpf(patch.technicianCpf);
    if (patch.technicianRegistration !== undefined) setSstRegistration(patch.technicianRegistration);
    if (patch.orgResponsibleName !== undefined) setOrgResponsibleName(patch.orgResponsibleName);
    if (patch.orgResponsibleCpf !== undefined) setOrgResponsibleCpf(patch.orgResponsibleCpf);
    if (patch.orgResponsibleRole !== undefined) setOrgResponsibleRole(patch.orgResponsibleRole);
  };

  const dimensions = ALL_CATEGORIES
    .filter(cat => typeof categoryAverages[cat] === 'number' && categoryAverages[cat] > 0)
    .map(cat => ({ category: cat, average: categoryAverages[cat], level: getRiskLevel(categoryAverages[cat]) }));

  // Carrega a última versão salva (apenas uma vez por abertura)
  useEffect(() => {
    if (!open) {
      loadedConfigRef.current = false;
      defaultsAppliedRef.current = false;
      return;
    }
    if (loadedConfigRef.current || !initialConfig) return;
    loadedConfigRef.current = true;
    setExecutiveSummary(initialConfig.executiveSummary || "");
    setActionItems((initialConfig.actionItems as COPSOQActionItem[]) || []);
    setScheduleItems((initialConfig.scheduleItems as COPSOQScheduleItem[]) || []);
    setCompanyCnpj(initialConfig.companyCnpj || "");
    setCompanyAddress(initialConfig.companyAddress || "");
    setCompanyCnae(initialConfig.companyCnae || "");
    setCompanyRiskGrade(initialConfig.companyRiskGrade || "");
    setSstCpf(initialConfig.sstCpf || "");
    setSstRegistration(initialConfig.sstRegistration || "");
    setTechnicianName(initialConfig.technicianName || "");
    setOrgResponsibleName(initialConfig.orgResponsibleName || "");
    setOrgResponsibleCpf(initialConfig.orgResponsibleCpf || "");
    setOrgResponsibleRole(initialConfig.orgResponsibleRole || "");
  }, [open, initialConfig]);

  // Pré-preenche com padrões quando não há versão salva
  useEffect(() => {
    if (!open || initialConfig || dimensions.length === 0) return;
    if (defaultsAppliedRef.current) return;
    defaultsAppliedRef.current = true;

    const critical = dimensions.filter(d => d.level === 'risk');
    const intermediate = dimensions.filter(d => d.level === 'intermediate');

    setExecutiveSummary(
      `Este relatório apresenta os resultados da avaliação de riscos psicossociais COPSOQ II realizada na ${companyName}.\n\n` +
      `A avaliação contou com ${responses.length} respostas válidas distribuídas em ${departments.length || 1} setor(es).\n\n` +
      (critical.length > 0
        ? `Foram identificadas ${critical.length} dimensão(ões) em nível de risco que requerem atenção imediata: ${critical.map(d => COPSOQ_CATEGORY_LABELS[d.category]).join(', ')}.`
        : 'Não foram identificadas dimensões em nível de risco no consolidado.') +
      (intermediate.length > 0
        ? `\n\n${intermediate.length} dimensão(ões) estão em nível intermediário e merecem monitoramento: ${intermediate.map(d => COPSOQ_CATEGORY_LABELS[d.category]).join(', ')}.`
        : '')
    );

    setActionItems([
      ...critical.map(d => ({
        id: crypto.randomUUID(),
        category: d.category,
        priority: 'immediate' as const,
        description: `Dimensão "${COPSOQ_CATEGORY_LABELS[d.category]}" apresenta indicadores de risco (média: ${d.average.toFixed(2)}).`,
        recommendation: COPSOQ_RECOMMENDATIONS[d.category].risk,
      })),
      ...intermediate.map(d => ({
        id: crypto.randomUUID(),
        category: d.category,
        priority: 'short_term' as const,
        description: `Dimensão "${COPSOQ_CATEGORY_LABELS[d.category]}" apresenta indicadores intermediários (média: ${d.average.toFixed(2)}).`,
        recommendation: COPSOQ_RECOMMENDATIONS[d.category].intermediate,
      })),
    ]);

    setScheduleItems([
      { id: crypto.randomUUID(), action: 'Apresentação dos resultados para a direção', deadline: 'Próxima semana', responsible: 'RH / SST', status: 'pending' },
      { id: crypto.randomUUID(), action: 'Reunião com gestores para discussão do plano de ação', deadline: '15 dias', responsible: 'RH / Gestores', status: 'pending' },
      ...(critical.length > 0
        ? [{ id: crypto.randomUUID(), action: 'Implementação de ações para dimensões em risco', deadline: '30 dias', responsible: 'Gestores / RH', status: 'pending' as const }]
        : []),
      { id: crypto.randomUUID(), action: 'Reavaliação após implementação das ações', deadline: '6 meses', responsible: 'SST', status: 'pending' },
    ]);
  }, [open, initialConfig, categoryAverages, responses.length, departments.length, companyName]);

  const updateAction = (id: string, field: keyof COPSOQActionItem, value: string) => {
    setActionItems(items => items.map(i => (i.id === id ? { ...i, [field]: value } as COPSOQActionItem : i)));
  };
  const updateSchedule = (id: string, field: keyof COPSOQScheduleItem, value: string) => {
    setScheduleItems(items => items.map(i => (i.id === id ? { ...i, [field]: value } as COPSOQScheduleItem : i)));
  };

  const buildConfig = (): PsychosocialReportDraftConfig => ({
    executiveSummary,
    actionItems,
    scheduleItems,
    companyCnpj,
    companyAddress,
    companyCnae,
    companyRiskGrade,
    sstCpf,
    sstRegistration,
    technicianName,
    orgResponsibleName,
    orgResponsibleCpf,
    orgResponsibleRole,
  });

  const saveVersionOnly = async () => {
    setIsSaving(true);
    try {
      const savedConfig = await saveReportDraft('copsoq', assessment.id, companyId, buildConfig());
      onSaved?.(savedConfig);
      toast.success('Versão salva! Você pode continuar depois em "Editar última versão".');
    } catch (error) {
      console.error('Error saving COPSOQ draft:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar a versão');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const config: PsychosocialReportDraftConfig = buildConfig();


      // Persist first and require database confirmation before creating the file.
      // This prevents a successful download from masking a failed draft save.
      const savedConfig = await saveReportDraft('copsoq', assessment.id, companyId, config);
      onSaved?.(savedConfig);

      await generateCOPSOQReport({
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          createdAt: assessment.createdAt,
        },
        companyName,
        responses,
        selectedDepartment,
        departments,
        sstLogoUrl,
        sstName,
        companyLogoUrl,
        executiveSummary,
        actionItems,
        scheduleItems,
        companyInfo: {
          cnpj: companyCnpj || undefined,
          address: companyAddress || undefined,
          cnae: companyCnae || undefined,
          riskGrade: companyRiskGrade || undefined,
        },
        responsibleInfo: {
          name: technicianName.trim() || sstName || undefined,
          cpf: sstCpf || undefined,
          registration: sstRegistration || undefined,
        },
        orgResponsible: {
          name: orgResponsibleName.trim() || undefined,
          cpf: orgResponsibleCpf.trim() || undefined,
          role: orgResponsibleRole.trim() || undefined,
        },
      });

      toast.success('Relatório gerado e última versão salva com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating COPSOQ PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar ou gerar o relatório PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preparar Relatório COPSOQ II
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            Salve o progresso a qualquer momento e continue depois em "Editar última versão".
          </p>
          <Button onClick={saveVersionOnly} disabled={isSaving || isGenerating} className="shrink-0">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar versão
              </>
            )}
          </Button>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="preview" className="flex items-center gap-1 text-xs"><Eye className="h-3 w-3" /> Preview</TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-1 text-xs"><Building2 className="h-3 w-3" /> Empresa</TabsTrigger>
            <TabsTrigger value="signatures" className="flex items-center gap-1 text-xs"><PenLine className="h-3 w-3" /> Assinaturas</TabsTrigger>
            <TabsTrigger value="action-plan" className="flex items-center gap-1 text-xs"><ClipboardList className="h-3 w-3" /> Plano de Ação</TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 text-xs"><Calendar className="h-3 w-3" /> Cronograma</TabsTrigger>
            <TabsTrigger value="finalize" className="flex items-center gap-1 text-xs"><Download className="h-3 w-3" /> Finalizar</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="preview" className="mt-0">
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Resumo Executivo</CardTitle></CardHeader>
                  <CardContent>
                    <Textarea value={executiveSummary} onChange={(e) => setExecutiveSummary(e.target.value)} rows={8} placeholder="Digite o resumo executivo do relatório..." />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Visão Geral das Dimensões</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {dimensions.map(d => (
                        <div
                          key={d.category}
                          className={`p-3 rounded-lg border-l-4 ${
                            d.level === 'risk' ? 'border-l-red-500 bg-red-50' :
                            d.level === 'intermediate' ? 'border-l-orange-500 bg-orange-50' :
                            'border-l-green-500 bg-green-50'
                          }`}
                        >
                          <div className="font-medium">{COPSOQ_CATEGORY_LABELS[d.category]}</div>
                          <div className="text-sm text-muted-foreground">
                            Média: {d.average.toFixed(2)} - {RISK_LEVEL_LABELS[d.level]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="company" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-lg">Dados da Empresa e Responsável</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CNPJ</label>
                      <Input value={companyCnpj} onChange={(e) => setCompanyCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CNAE</label>
                      <Input value={companyCnae} onChange={(e) => setCompanyCnae(e.target.value)} placeholder="00.00-0" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grau de risco</label>
                      <Input value={companyRiskGrade} onChange={(e) => setCompanyRiskGrade(e.target.value)} placeholder="1 a 4" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Endereço</label>
                      <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Rua, número, cidade/UF" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CPF do responsável técnico</label>
                      <Input value={sstCpf} onChange={(e) => setSstCpf(e.target.value)} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Registro profissional</label>
                      <Input value={sstRegistration} onChange={(e) => setSstRegistration(e.target.value)} placeholder="CREA / MTE / CRP" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signatures" className="mt-0">
              <ReportSignatureFields value={signatureValue} onChange={patchSignature} technicianPlaceholder={sstName || undefined} />
            </TabsContent>

            <TabsContent value="action-plan" className="mt-0">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Plano de Ação ({actionItems.length})</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActionItems(items => [...items, {
                      id: crypto.randomUUID(),
                      category: ALL_CATEGORIES[0],
                      priority: 'short_term',
                      description: '',
                      recommendation: '',
                    }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar ação
                  </Button>
                </div>

                {actionItems.map((item, index) => (
                  <Card key={item.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setActionItems(items => items.filter(i => i.id !== item.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Dimensão</label>
                          <Select value={item.category} onValueChange={(v) => updateAction(item.id, 'category', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ALL_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{COPSOQ_CATEGORY_LABELS[cat]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Prazo</label>
                          <Select value={item.priority} onValueChange={(v) => updateAction(item.id, 'priority', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Situação identificada</label>
                        <Textarea value={item.description} rows={2} onChange={(e) => updateAction(item.id, 'description', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Ação recomendada</label>
                        <Textarea value={item.recommendation} rows={2} onChange={(e) => updateAction(item.id, 'recommendation', e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="mt-0">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Cronograma ({scheduleItems.length})</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScheduleItems(items => [...items, { id: crypto.randomUUID(), action: '', deadline: '', responsible: '', status: 'pending' }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar item
                  </Button>
                </div>

                {scheduleItems.map(item => (
                  <Card key={item.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium">Ação</label>
                          <Input value={item.action} onChange={(e) => updateSchedule(item.id, 'action', e.target.value)} />
                        </div>
                        <Button size="icon" variant="ghost" className="text-destructive mt-5" onClick={() => setScheduleItems(items => items.filter(i => i.id !== item.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Prazo</label>
                          <Input value={item.deadline} onChange={(e) => updateSchedule(item.id, 'deadline', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Responsável</label>
                          <Input value={item.responsible} onChange={(e) => updateSchedule(item.id, 'responsible', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Status</label>
                          <Select value={item.status} onValueChange={(v) => updateSchedule(item.id, 'status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="finalize" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-lg">Finalizar Relatório</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Empresa:</strong> {companyName}</p>
                    <p><strong>Avaliação:</strong> {assessment.title}</p>
                    <p><strong>Respostas consideradas:</strong> {responses.length}</p>
                    <p><strong>Setor:</strong> {selectedDepartment === 'all' ? 'Todos os setores' : selectedDepartment}</p>
                    <p><strong>Ações no plano:</strong> {actionItems.length} · <strong>Itens no cronograma:</strong> {scheduleItems.length}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ao gerar o PDF, esta configuração é salva como última versão e poderá ser reaberta em "Editar última versão".
                  </p>
                  <Button onClick={generatePDF} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Gerar Relatório PDF
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
