import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ClipboardList, Calendar, Download, Loader2, Eye, Building2, PenLine } from "lucide-react";
import { HSEITActionPlanEditor, ActionItem } from "./HSEITActionPlanEditor";
import { HSEITScheduleEditor, ScheduleItem } from "./HSEITScheduleEditor";
import { generatePGRReport } from "./HSEITPGRReportPDF";
import { 
  HSEITCategory, 
  HSEIT_CATEGORY_LABELS, 
  HSEIT_CATEGORY_COLORS,
  getHealthImpact, 
  HEALTH_IMPACT_LABELS,
  HEALTH_IMPACT_COLORS,
  calculateCategoryAverage
} from "@/data/hseitQuestions";
import { toast } from "sonner";
import { PsychosocialReportDraftConfig, saveReportDraft } from "@/lib/psychosocialReportDrafts";
import { ReportSignatureFields, SignatureFieldsValue } from "@/components/psychosocial/ReportSignatureFields";

interface CategoryAverage {
  category: HSEITCategory;
  average: number;
  label: string;
}

interface Answer {
  questionNumber: number;
  value: number;
}

interface Response {
  id: string;
  department: string | null;
  completedAt: string | null;
  answers: Answer[];
}

interface HSEITReportEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: {
    id: string;
    title: string;
    description: string | null;
    companyName: string;
    createdAt: string;
  };
  responses: Response[];
  categoryAverages: CategoryAverage[];
  departments: string[];
  questionAverages: { questionNumber: number; text: string; category: string; average: number }[];
  sstLogoUrl?: string | null;
  sstName?: string | null;
  companyLogoUrl?: string | null;
  companyId?: string | null;
  initialConfig?: PsychosocialReportDraftConfig | null;
  onSaved?: (config: PsychosocialReportDraftConfig) => void;
}

// Default recommendations based on health impact
const DEFAULT_RECOMMENDATIONS: Record<HSEITCategory, Record<string, string>> = {
  demands: {
    risk: 'Revisar carga de trabalho e prazos. Implementar pausas regulares. Avaliar redistribuição de tarefas.',
    intermediate: 'Monitorar níveis de demanda. Manter comunicação aberta sobre prioridades.',
    favorable: 'Manter práticas atuais de gestão de demandas.'
  },
  control: {
    risk: 'Aumentar autonomia dos colaboradores. Implementar flexibilidade de horários. Criar canais de participação nas decisões.',
    intermediate: 'Avaliar oportunidades de maior participação. Considerar delegação de responsabilidades.',
    favorable: 'Manter níveis atuais de autonomia e controle.'
  },
  managerSupport: {
    risk: 'Capacitar gestores em liderança. Implementar reuniões regulares de feedback. Criar programa de mentoria.',
    intermediate: 'Fortalecer comunicação entre gestores e equipes. Avaliar necessidades de suporte.',
    favorable: 'Manter práticas de suporte gerencial.'
  },
  peerSupport: {
    risk: 'Promover atividades de integração. Criar espaços de colaboração. Implementar trabalho em equipe.',
    intermediate: 'Avaliar dinâmica entre colegas. Identificar oportunidades de melhoria.',
    favorable: 'Manter ambiente de colaboração entre pares.'
  },
  relationships: {
    risk: 'Implementar política anti-assédio. Criar canal de denúncias. Promover treinamentos de convivência.',
    intermediate: 'Monitorar clima organizacional. Atuar preventivamente em conflitos.',
    favorable: 'Manter ambiente de respeito e colaboração.'
  },
  role: {
    risk: 'Clarificar descrições de cargo. Alinhar expectativas. Comunicar objetivos organizacionais.',
    intermediate: 'Revisar clareza de papéis periodicamente. Garantir alinhamento de expectativas.',
    favorable: 'Manter clareza nos papéis e responsabilidades.'
  },
  change: {
    risk: 'Melhorar comunicação sobre mudanças. Envolver colaboradores no processo. Planejar transições adequadamente.',
    intermediate: 'Avaliar impacto de mudanças. Garantir suporte durante transições.',
    favorable: 'Manter práticas de gestão de mudanças.'
  }
};

export function HSEITReportEditor({
  open,
  onOpenChange,
  assessment,
  responses,
  categoryAverages,
  departments,
  questionAverages,
  sstLogoUrl,
  sstName,
  companyLogoUrl,
  companyId,
  initialConfig,
  onSaved
}: HSEITReportEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("preview");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
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

  // Load saved configuration (última versão) when provided
  useEffect(() => {
    if (open && initialConfig) {
      setExecutiveSummary(initialConfig.executiveSummary || "");
      setActionItems((initialConfig.actionItems as ActionItem[]) || []);
      setScheduleItems((initialConfig.scheduleItems as ScheduleItem[]) || []);
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
    }
  }, [open, initialConfig]);

  // Initialize default values based on assessment data
  useEffect(() => {
    if (open && !initialConfig && categoryAverages.length > 0) {
      // Generate executive summary
      const criticalCategories = categoryAverages.filter(c => getHealthImpact(c.average) === 'risk');
      const intermediateCategories = categoryAverages.filter(c => getHealthImpact(c.average) === 'intermediate');
      
      const summary = `Este relatório apresenta os resultados da avaliação de riscos psicossociais HSE-IT realizada na ${assessment.companyName}. 

A avaliação contou com ${responses.length} respostas de colaboradores distribuídos em ${departments.length} setores.

${criticalCategories.length > 0 ? `Foram identificadas ${criticalCategories.length} categorias em nível crítico que requerem atenção imediata: ${criticalCategories.map(c => HSEIT_CATEGORY_LABELS[c.category]).join(', ')}.` : 'Não foram identificadas categorias em nível crítico.'}

${intermediateCategories.length > 0 ? `${intermediateCategories.length} categorias estão em nível intermediário e merecem monitoramento: ${intermediateCategories.map(c => HSEIT_CATEGORY_LABELS[c.category]).join(', ')}.` : ''}`;

      setExecutiveSummary(summary);

      // Generate default action items for critical and intermediate categories
      const defaultActions: ActionItem[] = [];
      
      criticalCategories.forEach((cat, index) => {
        defaultActions.push({
          id: crypto.randomUUID(),
          category: cat.category,
          priority: 'immediate',
          description: `Categoria "${HSEIT_CATEGORY_LABELS[cat.category]}" apresenta indicadores de risco (média: ${cat.average.toFixed(1)}).`,
          recommendation: DEFAULT_RECOMMENDATIONS[cat.category].risk
        });
      });

      intermediateCategories.forEach((cat, index) => {
        defaultActions.push({
          id: crypto.randomUUID(),
          category: cat.category,
          priority: 'short_term',
          description: `Categoria "${HSEIT_CATEGORY_LABELS[cat.category]}" apresenta indicadores intermediários (média: ${cat.average.toFixed(1)}).`,
          recommendation: DEFAULT_RECOMMENDATIONS[cat.category].intermediate
        });
      });

      setActionItems(defaultActions);

      // Generate default schedule items
      const defaultSchedule: ScheduleItem[] = [
        {
          id: crypto.randomUUID(),
          action: 'Apresentação dos resultados para a direção',
          deadline: 'Próxima semana',
          responsible: 'RH / SST',
          status: 'pending'
        },
        {
          id: crypto.randomUUID(),
          action: 'Reunião com gestores para discussão do plano de ação',
          deadline: '15 dias',
          responsible: 'RH / Gestores',
          status: 'pending'
        }
      ];

      if (criticalCategories.length > 0) {
        defaultSchedule.push({
          id: crypto.randomUUID(),
          action: 'Implementação de ações para categorias críticas',
          deadline: '30 dias',
          responsible: 'Gestores / RH',
          status: 'pending'
        });
      }

      defaultSchedule.push({
        id: crypto.randomUUID(),
        action: 'Reavaliação após implementação das ações',
        deadline: '6 meses',
        responsible: 'SST',
        status: 'pending'
      });

      setScheduleItems(defaultSchedule);
    }
  }, [open, initialConfig, categoryAverages, responses, departments, assessment]);

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
      const savedConfig = await saveReportDraft('hseit', assessment.id, companyId, buildConfig());
      onSaved?.(savedConfig);
      toast.success('Versão salva! Você pode continuar depois em "Editar última versão".');
    } catch (error) {
      console.error('Error saving HSE-IT draft:', error);
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
      const savedConfig = await saveReportDraft('hseit', assessment.id, companyId, config);
      onSaved?.(savedConfig);

      await generatePGRReport({
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          companyName: assessment.companyName,
          createdAt: assessment.createdAt,
        },
        companyInfo: {
          cnpj: companyCnpj || undefined,
          address: companyAddress || undefined,
          cnae: companyCnae || undefined,
          riskGrade: companyRiskGrade || undefined,
          employeeCount: responses.length,
        },
        responses,
        categoryAverages,
        departments,
        questionAverages,
        actionItems,
        scheduleItems,
        executiveSummary,
        sstLogoUrl,
        sstName: technicianName.trim() || sstName,
        companyLogoUrl,
        sstCpf: sstCpf || undefined,
        sstRegistration: sstRegistration || undefined,
        orgResponsible: {
          name: orgResponsibleName.trim() || undefined,
          cpf: orgResponsibleCpf.trim() || undefined,
          role: orgResponsibleRole.trim() || undefined,
        },
        methodology: 'hseit',
      });
      toast.success('Relatório gerado e última versão salva com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
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
            Preparar Relatório PGR — Riscos Psicossociais
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="preview" className="flex items-center gap-1 text-xs">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-1 text-xs">
              <Building2 className="h-3 w-3" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="signatures" className="flex items-center gap-1 text-xs">
              <PenLine className="h-3 w-3" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="action-plan" className="flex items-center gap-1 text-xs">
              <ClipboardList className="h-3 w-3" />
              Plano de Ação
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              Cronograma
            </TabsTrigger>
            <TabsTrigger value="finalize" className="flex items-center gap-1 text-xs">
              <Download className="h-3 w-3" />
              Finalizar
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="preview" className="mt-0 h-full">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo Executivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={executiveSummary}
                      onChange={(e) => setExecutiveSummary(e.target.value)}
                      rows={6}
                      placeholder="Digite o resumo executivo do relatório..."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Visão Geral das Categorias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {categoryAverages.map((cat) => {
                        const impact = getHealthImpact(cat.average);
                        return (
                          <div 
                            key={cat.category}
                            className={`p-3 rounded-lg border-l-4 ${
                              impact === 'risk' ? 'border-l-red-500 bg-red-50' :
                              impact === 'intermediate' ? 'border-l-orange-500 bg-orange-50' :
                              'border-l-green-500 bg-green-50'
                            }`}
                          >
                            <div className="font-medium">{HSEIT_CATEGORY_LABELS[cat.category]}</div>
                            <div className="text-sm text-muted-foreground">
                              Média: {cat.average.toFixed(2)} - {HEALTH_IMPACT_LABELS[impact]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="company" className="mt-0 h-full">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dados da Empresa (PGR)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CNPJ</label>
                        <Input value={companyCnpj} onChange={(e) => setCompanyCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CNAE</label>
                        <Input value={companyCnae} onChange={(e) => setCompanyCnae(e.target.value)} placeholder="Ex: 8630-5/03" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Endereço Completo</label>
                        <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Rua, número, bairro, cidade - UF" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Grau de Risco (NR-4)</label>
                        <Input value={companyRiskGrade} onChange={(e) => setCompanyRiskGrade(e.target.value)} placeholder="Ex: 2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Responsável Técnico SST</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CPF do Responsável</label>
                        <Input value={sstCpf} onChange={(e) => setSstCpf(e.target.value)} placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Registro MTE / CREA / CRP</label>
                        <Input value={sstRegistration} onChange={(e) => setSstRegistration(e.target.value)} placeholder="Nº do registro profissional" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="signatures" className="mt-0 h-full">
              <ReportSignatureFields value={signatureValue} onChange={patchSignature} technicianPlaceholder={sstName || undefined} />
            </TabsContent>

            <TabsContent value="action-plan" className="mt-0 h-full">
              <HSEITActionPlanEditor 
                actionItems={actionItems}
                onUpdate={setActionItems}
              />
            </TabsContent>

            <TabsContent value="schedule" className="mt-0 h-full">
              <HSEITScheduleEditor
                scheduleItems={scheduleItems}
                onUpdate={setScheduleItems}
              />
            </TabsContent>

            <TabsContent value="finalize" className="mt-0 h-full">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Relatório</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                        <p className="font-medium">{assessment.companyName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Avaliação</label>
                        <p className="font-medium">{assessment.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total de Respostas</label>
                        <p className="font-medium">{responses.length}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Setores</label>
                        <p className="font-medium">{departments.length}</p>
                      </div>
                    </div>

                    {(technicianName.trim() || sstName) && (
                      <div className="pt-4 border-t">
                        <label className="text-sm font-medium text-muted-foreground">Responsável SST</label>
                        <div className="flex items-center gap-3 mt-2">
                          {sstLogoUrl && (
                            <img 
                              src={sstLogoUrl} 
                              alt={technicianName.trim() || sstName} 
                              className="h-10 w-auto object-contain"
                            />
                          )}
                          <p className="font-medium">{technicianName.trim() || sstName}</p>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo do Conteúdo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>Ações no Plano</span>
                      <span className="font-medium">{actionItems.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Itens no Cronograma</span>
                      <span className="font-medium">{scheduleItems.length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Categorias Críticas</span>
                      <span className="font-medium text-red-600">
                        {categoryAverages.filter(c => getHealthImpact(c.average) === 'risk').length}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  onClick={generatePDF} 
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Gerar Relatório PGR (PDF)
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
