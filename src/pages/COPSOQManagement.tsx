import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, ArrowLeft, FileText, Building2, Copy, Sparkles, Users2, Info, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { DepartmentManager, SurveyDepartment, DepartmentManagerHandle, UnallocatedEmployeesDialog } from '@/components/climate-survey/DepartmentManager';
import { QRCodePreview } from '@/components/climate-survey/QRCodePreview';
import { useCompanyEmployeeCount } from '@/hooks/useCompanyEmployeeCount';

interface Company { id: string; name: string; slug: string; }

export default function COPSOQManagement() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, role, profile, isLoading: authLoading } = useRealAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [departments, setDepartments] = useState<SurveyDepartment[]>([]);
  const [collectionMode, setCollectionMode] = useState<string>('form');
  const [multiSectorEnabled, setMultiSectorEnabled] = useState(false);
  const [showUnallocatedDialog, setShowUnallocatedDialog] = useState(false);
  const [pendingRemaining, setPendingRemaining] = useState(0);
  const deptManagerRef = useRef<DepartmentManagerHandle>(null);
  const { employeeCount: companyEmployeeCount } = useCompanyEmployeeCount(selectedCompany || null);
  const isEditing = !!id;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
      else if (!['admin', 'sst', 'company'].includes(role || '')) navigate('/dashboard');
    }
  }, [user, role, authLoading]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (authLoading) return;
    if (!user) return;
    if (!['admin', 'sst', 'company'].includes(role || '')) return;
    if ((role === 'sst' || role === 'company') && !profile?.id) return;
    hasFetchedRef.current = true;
    fetchData();
  }, [authLoading, user, role, id, profile?.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let companiesData: Company[] = [];
      if (role === 'admin') {
        const { data } = await supabase.from('companies').select('id, name, slug').order('name');
        companiesData = data || [];
      } else if (role === 'sst' && profile?.id) {
        const { data: pd } = await supabase.from('profiles').select('sst_manager_id').eq('id', profile.id).single();
        if (pd?.sst_manager_id) {
          const { data: rows } = await supabase
            .from('company_sst_assignments')
            .select('company:companies!inner(id, name, slug)')
            .eq('sst_manager_id', pd.sst_manager_id);
          companiesData = ((rows ?? []) as any[])
            .map(r => r.company)
            .filter(Boolean)
            .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        }
      } else if (role === 'company' && profile?.company_id) {
        const { data } = await supabase.from('companies').select('id, name, slug').eq('id', profile.company_id);
        companiesData = data || [];
      }
      setCompanies(companiesData);

      if (id) {
        const { data: assessment, error } = await supabase.from('copsoq_assessments' as any).select('*').eq('id', id).single();
        if (error) throw error;
        const a = assessment as any;
        setSelectedCompany(a.company_id);
        setTitle(a.title);
        setDescription(a.description || '');
        setStartDate(a.start_date ? a.start_date.split('T')[0] : '');
        setEndDate(a.end_date ? a.end_date.split('T')[0] : '');
        setIsActive(a.is_active);
        setCollectionMode(a.collection_mode || 'form');
        setMultiSectorEnabled(!!a.multi_sector_enabled);
        const { data: depts } = await supabase.from('copsoq_departments' as any).select('*').eq('assessment_id', id).order('order_index');
        setDepartments((depts as any[]) || []);
      } else if (companiesData.length === 1) {
        setSelectedCompany(companiesData[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCompany || !title) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione uma empresa e informe o título.', variant: 'destructive' });
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
    await persistAssessment();
  };

  const persistAssessment = async () => {
    try {
      setIsSaving(true);
      const data: any = { company_id: selectedCompany, title, description: description || null, start_date: startDate || null, end_date: endDate || null, is_active: isActive, created_by: user?.id, collection_mode: collectionMode, multi_sector_enabled: multiSectorEnabled };
      let assessmentId = id;

      if (isEditing) {
        const { error } = await supabase.from('copsoq_assessments' as any).update(data).eq('id', id);
        if (error) throw error;
      } else {
        const { data: result, error } = await supabase.from('copsoq_assessments' as any).insert(data).select('id').single();
        if (error) throw error;
        assessmentId = (result as any).id;
      }

      if (assessmentId) {
        const { error: deleteDepartmentsError } = await supabase.from('copsoq_departments' as any).delete().eq('assessment_id', assessmentId);
        if (deleteDepartmentsError) throw deleteDepartmentsError;
        const activeDepts = departments.filter((d: any) => !d.isDeleted);
        if (activeDepts.length > 0) {
          const deptData = activeDepts.map((d, i) => ({ assessment_id: assessmentId, name: d.name, employee_count: d.employee_count, order_index: i }));
          const { error } = await supabase.from('copsoq_departments' as any).insert(deptData);
          if (error) throw error;
        }
      }

      toast({ title: isEditing ? 'Avaliação atualizada' : 'Avaliação criada', description: 'A avaliação COPSOQ II foi salva com sucesso.' });
      navigate('/psychosocial-dashboard');
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getFormUrl = () => {
    const company = companies.find(c => c.id === selectedCompany);
    if (!company || !id) return '';
    return `${PUBLIC_BASE_URL}/copsoq/${company.slug}/${id}`;
  };

  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/psychosocial-dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              {isEditing ? 'Editar Avaliação COPSOQ II' : 'Nova Avaliação COPSOQ II'}
            </h1>
            <p className="text-muted-foreground mt-1">Configure os detalhes da avaliação de riscos psicossociais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Informações Gerais</CardTitle><CardDescription>Defina os dados básicos da avaliação</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Empresa *</Label>
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
                    <Select value={selectedCompany} onValueChange={setSelectedCompany} disabled={isEditing}>
                      <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                      <SelectContent>{companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).map(c => <SelectItem key={c.id} value={c.id}><div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{c.name}</div></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Avaliação COPSOQ II 2024" /></div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo..." rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Data de Início</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Data de Término</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div><Label>Avaliação Ativa</Label><p className="text-sm text-muted-foreground">Permite que funcionários respondam</p></div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                {/* Multi-sector mode */}
                <div className="space-y-3 pt-2 px-4 pb-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="copsoqMultiSector"
                      checked={multiSectorEnabled}
                      onCheckedChange={(c) => setMultiSectorEnabled(!!c)}
                      className="mt-1"
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="copsoqMultiSector" className="flex items-center gap-2 cursor-pointer">
                        <Users2 className="h-4 w-4 text-blue-600" />
                        Avaliação multisetorial
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Permitir que colaboradores que atuam em mais de um setor marquem todos os setores em que trabalham.
                      </p>
                    </div>
                  </div>
                  {multiSectorEnabled && (
                    <div className="flex gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-sm text-foreground/90">
                      <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p>
                        Nesta modalidade, a resposta do colaborador será contabilizada em <strong>cada setor</strong> selecionado — tanto na pontuação quanto no total de colaboradores do setor, para que o percentual de participação fique correto em cada um.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Setores / Departamentos</CardTitle><CardDescription>Configure os setores para segmentação</CardDescription></CardHeader>
              <CardContent><DepartmentManager ref={deptManagerRef} departments={departments} onChange={setDepartments} companyEmployeeCount={companyEmployeeCount} /></CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleSave} className="w-full gap-2" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar Avaliação</Button>
                <Button variant="outline" onClick={() => navigate('/psychosocial-dashboard')} className="w-full">Cancelar</Button>
              </CardContent>
            </Card>
            {isEditing && selectedCompany && getFormUrl() && (
              <Card>
                <CardHeader><CardTitle>Link do Formulário COPSOQ</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <QRCodePreview url={getFormUrl()} size={150} />
                  <Button variant="outline" className="w-full gap-2" onClick={() => { navigator.clipboard.writeText(getFormUrl()); toast({ title: 'Link copiado!' }); }}><Copy className="h-4 w-4" />Copiar Link</Button>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>Sobre o COPSOQ II</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>O COPSOQ II (Copenhagen Psychosocial Questionnaire) é um instrumento validado internacionalmente para avaliação de fatores psicossociais no trabalho.</p>
                <p>A versão curta contém 41 questões que avaliam 23 dimensões organizadas em 6 grupos:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Exigências do Trabalho</li>
                  <li>Organização e Conteúdo</li>
                  <li>Relações e Liderança</li>
                  <li>Interface Trabalho-Indivíduo</li>
                  <li>Saúde e Bem-estar</li>
                  <li>Valores no Local de Trabalho</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <UnallocatedEmployeesDialog
        open={showUnallocatedDialog}
        onOpenChange={setShowUnallocatedDialog}
        remaining={pendingRemaining}
        onConfirm={() => { setShowUnallocatedDialog(false); persistAssessment(); }}
      />
      <Footer />
    </div>
  );
}
