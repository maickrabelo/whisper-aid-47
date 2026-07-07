import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, Save, ArrowLeft, Copy, Search } from "lucide-react";
import { gptwQuestions, openQuestions, npsQuestion } from "@/data/gptwQuestions";
import { soiaQuestions, soiaOpenQuestions } from "@/data/soiaQuestions";
import { QRCodeDownloader } from "@/components/QRCodeDownloader";
import { QRCodePreview } from "@/components/climate-survey/QRCodePreview";
import { QuestionManager, SurveyQuestion } from "@/components/climate-survey/QuestionManager";
import { DepartmentManager, SurveyDepartment, DepartmentManagerHandle, UnallocatedEmployeesDialog } from "@/components/climate-survey/DepartmentManager";
import { useCompanyEmployeeCount } from "@/hooks/useCompanyEmployeeCount";
import { PUBLIC_BASE_URL } from "@/lib/publicUrl";

interface Company {
  id: string;
  name: string;
  slug: string;
}

type SurveyModel = 'gptw' | 'soia';

export default function ClimateSurveyManagement() {
  const { id } = useParams();
  const isEditing = id && id !== 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, profile, isLoading: authLoading } = useRealAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [departments, setDepartments] = useState<SurveyDepartment[]>([]);
  const [surveyModel, setSurveyModel] = useState<SurveyModel>('gptw');
  
  const [formData, setFormData] = useState({
    title: 'Pesquisa de Clima Organizacional',
    description: 'Sua opinião é muito importante para nós. Responda com sinceridade.',
    company_id: '',
    is_active: true
  });
  const [showUnallocatedDialog, setShowUnallocatedDialog] = useState(false);
  const [pendingRemaining, setPendingRemaining] = useState(0);
  const deptManagerRef = useRef<DepartmentManagerHandle>(null);
  const { employeeCount: companyEmployeeCount } = useCompanyEmployeeCount(formData.company_id || null);

  // Initialize questions from GPTW template
  const initializeGPTWQuestions = (): SurveyQuestion[] => {
    const templateQuestions: SurveyQuestion[] = [
      ...gptwQuestions.map((q, index) => ({
        tempId: `template-${q.id}`,
        question_text: q.text,
        question_type: q.type as 'likert' | 'scale_0_10' | 'open_text',
        category: q.category,
        order_index: index,
        is_required: true
      })),
      {
        tempId: `template-nps`,
        question_text: npsQuestion.text,
        question_type: 'scale_0_10' as const,
        category: 'nps',
        order_index: gptwQuestions.length,
        is_required: true
      },
      ...openQuestions.map((q, index) => ({
        tempId: `template-${q.id}`,
        question_text: q.text,
        question_type: 'open_text' as const,
        category: 'open',
        order_index: gptwQuestions.length + 1 + index,
        is_required: false
      }))
    ];
    return templateQuestions;
  };

  // Initialize questions from SOIA template
  const initializeSOIAQuestions = (): SurveyQuestion[] => {
    const templateQuestions: SurveyQuestion[] = [
      // First open question (about the work environment)
      {
        tempId: `template-${soiaOpenQuestions[0].id}`,
        question_text: soiaOpenQuestions[0].text,
        question_type: 'open_text' as const,
        category: 'open',
        order_index: 0,
        is_required: false
      },
      // Likert questions
      ...soiaQuestions.map((q, index) => ({
        tempId: `template-${q.id}`,
        question_text: q.text,
        question_type: 'likert' as const,
        category: q.category,
        order_index: index + 1,
        is_required: true
      })),
      // Remaining open questions
      ...soiaOpenQuestions.slice(1).map((q, index) => ({
        tempId: `template-${q.id}`,
        question_text: q.text,
        question_type: 'open_text' as const,
        category: 'open',
        order_index: soiaQuestions.length + 1 + index,
        is_required: false
      }))
    ];
    return templateQuestions;
  };

  // Initialize questions based on model
  const initializeQuestionsFromModel = (model: SurveyModel): SurveyQuestion[] => {
    return model === 'gptw' ? initializeGPTWQuestions() : initializeSOIAQuestions();
  };

  // Handle model change
  const handleModelChange = (model: SurveyModel) => {
    setSurveyModel(model);
    setQuestions(initializeQuestionsFromModel(model));
  };

  useEffect(() => {
    if (!authLoading) {
      if (!['admin', 'sst', 'company'].includes(role || '')) {
        toast({ title: "Acesso negado", variant: "destructive" });
        navigate('/climate-dashboard');
        return;
      }
      fetchData();
    }
  }, [authLoading, role]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch companies based on role
      let companiesData: Company[] = [];
      
      if (role === 'admin') {
        // Admin sees all companies
        const { data, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, slug')
          .order('name');
        if (companiesError) throw companiesError;
        companiesData = data || [];
      } else if (role === 'sst') {
        // SST sees only assigned companies
        const { data: profileData } = await supabase
          .from('profiles')
          .select('sst_manager_id')
          .eq('id', profile?.id)
          .single();
        
        if (profileData?.sst_manager_id) {
          const { data: rows, error: companiesError } = await supabase
            .from('company_sst_assignments')
            .select('company:companies!inner(id, name, slug)')
            .eq('sst_manager_id', profileData.sst_manager_id);
          if (companiesError) throw companiesError;
          companiesData = ((rows ?? []) as any[])
            .map(r => r.company)
            .filter(Boolean)
            .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        }
      } else if (role === 'company' && profile?.company_id) {
        const { data, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, slug')
          .eq('id', profile.company_id);
        if (companiesError) throw companiesError;
        companiesData = data || [];
      }
      
      setCompanies(companiesData);

      // If editing, fetch survey data and questions
      if (isEditing) {
        const { data: surveyData, error: surveyError } = await supabase
          .from('climate_surveys')
          .select('*')
          .eq('id', id)
          .single();

        if (surveyError) throw surveyError;
        if (surveyData) {
          setFormData({
            title: surveyData.title,
            description: surveyData.description || '',
            company_id: surveyData.company_id,
            is_active: surveyData.is_active
          });
        }

        // Fetch questions for this survey
        const { data: questionsData, error: questionsError } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', id)
          .order('order_index');

        if (questionsError) throw questionsError;
        
        if (questionsData && questionsData.length > 0) {
          setQuestions(questionsData.map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type as 'likert' | 'scale_0_10' | 'open_text',
            category: q.category || 'custom',
            order_index: q.order_index,
            is_required: q.is_required
          })));
        }

        // Fetch departments for this survey
        const { data: departmentsData, error: departmentsError } = await supabase
          .from('survey_departments')
          .select('*')
          .eq('survey_id', id)
          .order('order_index');

        if (departmentsError) throw departmentsError;
        
        if (departmentsData && departmentsData.length > 0) {
          setDepartments(departmentsData.map(d => ({
            id: d.id,
            name: d.name,
            employee_count: d.employee_count,
            order_index: d.order_index
          })));
        }
      } else {
        // Initialize with template questions for new survey
        setQuestions(initializeQuestionsFromModel(surveyModel));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.company_id) {
      toast({ title: "Selecione uma empresa", variant: "destructive" });
      return;
    }

    const activeQuestions = questions.filter(q => !q.isDeleted);
    if (activeQuestions.length === 0) {
      toast({ title: "Adicione pelo menos uma pergunta", variant: "destructive" });
      return;
    }

    const activeDepartments = departments.filter(d => !d.isDeleted);
    if (activeDepartments.length === 0) {
      toast({ title: "Adicione pelo menos um setor", variant: "destructive" });
      return;
    }

    const validation = deptManagerRef.current?.validateAllocation();
    if (validation && validation.ok === false) {
      if (validation.reason === 'overflow') {
        toast({ title: 'Excesso de colaboradores', description: 'A soma dos setores excede o total da empresa.', variant: 'destructive' });
        return;
      }
      if (validation.reason === 'unallocated') {
        setPendingRemaining(validation.remaining);
        setShowUnallocatedDialog(true);
        return;
      }
    }

    await persistSurvey();
  };

  const persistSurvey = async () => {
    const activeQuestions = questions.filter(q => !q.isDeleted);
    const activeDepartments = departments.filter(d => !d.isDeleted);
    setIsSaving(true);
    try {
      if (isEditing) {
        // Update survey info
        const { error } = await supabase
          .from('climate_surveys')
          .update({
            title: formData.title,
            description: formData.description,
            is_active: formData.is_active
          })
          .eq('id', id);

        if (error) throw error;

        // Handle questions: delete marked, update existing, insert new
        const questionsToDelete = questions.filter(q => q.isDeleted && q.id);
        const questionsToUpdate = questions.filter(q => !q.isDeleted && q.id);
        const questionsToInsert = questions.filter(q => !q.isDeleted && !q.id);

        // Delete removed questions
        if (questionsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('survey_questions')
            .delete()
            .in('id', questionsToDelete.map(q => q.id!));
          
          if (deleteError) throw deleteError;
        }

        // Update existing questions
        for (const q of questionsToUpdate) {
          const { error: updateError } = await supabase
            .from('survey_questions')
            .update({
              question_text: q.question_text,
              question_type: q.question_type,
              category: q.category,
              order_index: q.order_index,
              is_required: q.is_required
            })
            .eq('id', q.id);
          
          if (updateError) throw updateError;
        }

        // Insert new questions
        if (questionsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('survey_questions')
            .insert(questionsToInsert.map(q => ({
              survey_id: id,
              question_text: q.question_text,
              question_type: q.question_type,
              category: q.category,
              order_index: q.order_index,
              is_required: q.is_required
            })));
          
          if (insertError) throw insertError;
        }

        // Handle departments: delete marked, update existing, insert new
        const deptsToDelete = departments.filter(d => d.isDeleted && d.id);
        const deptsToUpdate = departments.filter(d => !d.isDeleted && d.id);
        const deptsToInsert = departments.filter(d => !d.isDeleted && !d.id);

        if (deptsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('survey_departments')
            .delete()
            .in('id', deptsToDelete.map(d => d.id!));
          
          if (deleteError) throw deleteError;
        }

        for (const d of deptsToUpdate) {
          const { error: updateError } = await supabase
            .from('survey_departments')
            .update({
              name: d.name,
              employee_count: d.employee_count,
              order_index: d.order_index
            })
            .eq('id', d.id);
          
          if (updateError) throw updateError;
        }

        if (deptsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('survey_departments')
            .insert(deptsToInsert.map((d, index) => ({
              survey_id: id,
              name: d.name,
              employee_count: d.employee_count,
              order_index: d.order_index || index
            })));
          
          if (insertError) throw insertError;
        }

        toast({ title: "Pesquisa atualizada com sucesso!" });
      } else {
        // Create survey
        const { data: surveyData, error: surveyError } = await supabase
          .from('climate_surveys')
          .insert({
            title: formData.title,
            description: formData.description,
            company_id: formData.company_id,
            is_active: formData.is_active
          })
          .select()
          .single();

        if (surveyError) throw surveyError;

        // Insert all active questions
        const questionsToInsert = activeQuestions.map((q, index) => ({
          survey_id: surveyData.id,
          question_text: q.question_text,
          question_type: q.question_type,
          category: q.category,
          order_index: index,
          is_required: q.is_required
        }));

        const { error: questionsError } = await supabase
          .from('survey_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;

        // Insert all departments
        if (activeDepartments.length > 0) {
          const { error: deptsError } = await supabase
            .from('survey_departments')
            .insert(activeDepartments.map((d, index) => ({
              survey_id: surveyData.id,
              name: d.name,
              employee_count: d.employee_count,
              order_index: index
            })));

          if (deptsError) throw deptsError;
        }

        toast({ title: "Pesquisa criada com sucesso!" });
        navigate('/climate-dashboard');
      }
    } catch (error) {
      console.error('Error saving survey:', error);
      toast({ title: "Erro ao salvar pesquisa", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getSurveyUrl = () => {
    const company = companies.find(c => c.id === formData.company_id);
    if (!company) return '';
    return `${PUBLIC_BASE_URL}/pesquisa/${company.slug}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Link copiado!" });
  };

  const activeQuestions = questions.filter(q => !q.isDeleted);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/climate-dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isEditing ? 'Editar Pesquisa' : 'Nova Pesquisa de Clima'}</CardTitle>
            <CardDescription>
              {isEditing 
                ? 'Atualize as informações e perguntas da pesquisa'
                : surveyModel === 'gptw' 
                  ? 'Configure uma nova pesquisa personalizável baseada no modelo GPTW (55 perguntas)'
                  : 'Configure uma nova pesquisa baseada no modelo SOIA (17 perguntas)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresa..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select 
                  value={formData.company_id} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, company_id: val }))}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies
                      .filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                      .map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Survey Model Selection */}
            {!isEditing && (
              <div className="space-y-2">
                <Label>Modelo de Pesquisa *</Label>
                <Select 
                  value={surveyModel} 
                  onValueChange={(val) => handleModelChange(val as SurveyModel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gptw">Modelo GPTW (Great Place to Work)</SelectItem>
                    <SelectItem value="soia">Modelo SOIA</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {surveyModel === 'gptw' 
                    ? '55 perguntas Likert + 1 NPS + 2 abertas — baseadas na metodologia Great Place to Work'
                    : '12 perguntas Likert + 5 abertas — focadas em ambiente, liderança e bem-estar'}
                </p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título da Pesquisa *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Pesquisa de Clima 2024"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Instruções e informações para os participantes"
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Pesquisa Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir que funcionários respondam a pesquisa
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            {/* Survey URL */}
            {formData.company_id && (
              <div className="space-y-4 pt-4 border-t">
                <Label>Link da Pesquisa</Label>
                <div className="flex gap-2">
                  <Input
                    value={getSurveyUrl()}
                    readOnly
                    className="bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getSurveyUrl())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compartilhe este link com os funcionários para responderem a pesquisa
                </p>

                {/* QR Code Section */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <QRCodePreview url={getSurveyUrl()} size={120} />
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="font-medium mb-1">QR Code da Pesquisa</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Imprima e distribua o QR Code para facilitar o acesso à pesquisa
                    </p>
                    <QRCodeDownloader
                      url={getSurveyUrl()}
                      filename={`qrcode-pesquisa-clima-${companies.find(c => c.id === formData.company_id)?.slug || 'empresa'}.png`}
                      variant="default"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Manager */}
        <div className="mb-6">
          <DepartmentManager
            ref={deptManagerRef}
            departments={departments}
            onChange={setDepartments}
            companyEmployeeCount={companyEmployeeCount}
          />
        </div>

        {/* Question Manager */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <QuestionManager
              questions={questions}
              onChange={setQuestions}
            />
          </CardContent>
        </Card>

        {/* Summary and Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>{activeQuestions.length}</strong> perguntas no total</p>
                <p><strong>{activeQuestions.filter(q => q.is_required).length}</strong> obrigatórias</p>
              </div>
              <Button onClick={handleSave} disabled={isSaving} size="lg">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Salvar Alterações' : 'Criar Pesquisa'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <UnallocatedEmployeesDialog
        open={showUnallocatedDialog}
        onOpenChange={setShowUnallocatedDialog}
        remaining={pendingRemaining}
        onConfirm={() => { setShowUnallocatedDialog(false); persistSurvey(); }}
      />
      <Footer />
    </div>
  );
}
