import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Building, UserCheck, Edit, Trash, ArrowLeft, Key, Copy, Upload, ClipboardList, BarChart3, Users, Globe, Activity, Download, Sparkles } from "lucide-react";
import { downloadJsonAsExcel } from '@/lib/excelExport';
import { PendingPartnersManager } from '@/components/admin/PendingPartnersManager';
import { PendingAffiliatesManager } from '@/components/admin/PendingAffiliatesManager';
import { ActivePartnersManager } from '@/components/admin/ActivePartnersManager';
import { ActiveAffiliatesManager } from '@/components/admin/ActiveAffiliatesManager';
import { AdminPortalManager } from '@/components/admin/AdminPortalManager';
import { AccessLogsTab } from '@/components/admin/AccessLogsTab';
import StatisticsTab from '@/components/admin/StatisticsTab';
import FormLeadsTab from '@/components/admin/FormLeadsTab';
import TrialAccountsTab from '@/components/admin/TrialAccountsTab';
import { SalesTeamTab } from '@/components/admin/SalesTeamTab';
import { WebhooksTab } from '@/components/admin/WebhooksTab';
import { AssignManualPlanDialog } from '@/components/admin/AssignManualPlanDialog';
import { ImportUserDataDialog } from '@/components/admin/ImportUserDataDialog';
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSafeErrorMessage } from "@/lib/errorUtils";

type Company = {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  slug: string | null;
  created_at: string;
  notification_email_1: string | null;
  notification_email_2: string | null;
  notification_email_3: string | null;
};

type SSTManager = {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  slug: string | null;
  created_at: string;
};

type Assignment = {
  id: string;
  company_id: string;
  sst_manager_id: string;
  assigned_at: string;
};

const MasterDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sstManagers, setSSTManagers] = useState<SSTManager[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [sstSearchTerm, setSSTSearchTerm] = useState('');
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddSSTOpen, setIsAddSSTOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [isEditSSTOpen, setIsEditSSTOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingSST, setEditingSST] = useState<SSTManager | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSST, setSelectedSST] = useState<SSTManager | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratePasswordOpen, setIsGeneratePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ entity: '', type: '', email: '', name: '', id: '' });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [sstLogoFile, setSstLogoFile] = useState<File | null>(null);
  const [sstLogoPreview, setSstLogoPreview] = useState<string | null>(null);
  const [isCreatingTestUsers, setIsCreatingTestUsers] = useState(false);
  const [testUsersResult, setTestUsersResult] = useState<any>(null);
  const [assignPlanSST, setAssignPlanSST] = useState<SSTManager | null>(null);
  const [manualPlans, setManualPlans] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  const { toast } = useToast();
  const { session, role, isLoading: authLoading } = useRealAuth();
  
  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      return;
    }

    if (role && role !== 'admin') {
      if (role === 'company') navigate('/dashboard');
      else if (role === 'sst') navigate('/sst-dashboard');
      else if (role === 'pending') navigate('/pending-approval');
      else if (role === 'partner') navigate('/parceiro/dashboard');
      else if (role === 'affiliate') navigate('/afiliado/dashboard');
      else if ((role as string) === 'sales') navigate('/sales-dashboard');
      else navigate('/');
    }
  }, [authLoading, session, role, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (session && role === 'admin') {
      loadData();
      supabase
        .from('subscription_plans')
        .select('id, name, slug')
        .eq('visibility', 'manual_only')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .then(({ data }) => setManualPlans((data ?? []) as any));
    }
  }, [authLoading, session, role]);


  const loadData = async () => {
    setLoading(true);
    try {
      const [companiesRes, sstRes, assignmentsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('sst_managers').select('*').order('created_at', { ascending: false }),
        supabase.from('company_sst_assignments').select('*')
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (sstRes.error) throw sstRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setCompanies(companiesRes.data || []);
      setSSTManagers(sstRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
    (company.email && company.email.toLowerCase().includes(companySearchTerm.toLowerCase()))
  );
  
  const filteredSSTManagers = sstManagers.filter(manager => 
    manager.name.toLowerCase().includes(sstSearchTerm.toLowerCase()) ||
    (manager.email && manager.email.toLowerCase().includes(sstSearchTerm.toLowerCase()))
  );

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSSTLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSstLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSstLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  };

  const handleAddCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      let logoUrl = null;
      
      // Upload logo if provided
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const companyName = formData.get('companyName') as string;
      
      // Generate slug from company name
      const slug = companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Remove duplicate hyphens

      const { error } = await supabase.from('companies').insert({
        name: companyName,
        email: formData.get('companyEmail') as string,
        cnpj: formData.get('companyCNPJ') as string,
        phone: formData.get('companyPhone') as string,
        address: formData.get('companyAddress') as string,
        logo_url: logoUrl,
        slug: slug,
      });

      if (error) throw error;

      toast({
        title: "Empresa adicionada",
        description: "A empresa foi adicionada com sucesso."
      });
      setIsAddCompanyOpen(false);
      setLogoFile(null);
      setLogoPreview(null);
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao adicionar empresa",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleAddSST = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      let logoUrl: string | null = null;
      if (sstLogoFile) {
        logoUrl = await uploadLogo(sstLogoFile);
      }

      const trialDaysRaw = formData.get('sstTrialDays');
      const trialDays = trialDaysRaw ? parseInt(String(trialDaysRaw), 10) : 0;
      const planId = (formData.get('sstPlanId') as string) || null;

      const { data, error } = await supabase.functions.invoke('create-sst-manual-account', {
        body: {
          sst_name: formData.get('sstName'),
          email: formData.get('sstEmail'),
          responsible_name: formData.get('sstResponsible'),
          cnpj: formData.get('sstCNPJ'),
          phone: formData.get('sstPhone'),
          address: formData.get('sstAddress'),
          logo_url: logoUrl,
          plan_id: planId || undefined,
          trial_days: trialDays,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: "Gestora SST cadastrada",
        description: `Conta criada com sucesso. Senha inicial: ${(data as any)?.initial_password ?? 'CNPJ (somente números)'}`,
      });
      setIsAddSSTOpen(false);
      setSstLogoFile(null);
      setSstLogoPreview(null);
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao adicionar gestora SST",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    }
  };


  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      
      toast({
        title: "Empresa excluída",
        description: "A empresa foi excluída com sucesso."
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao excluir empresa",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleDeleteSST = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta gestora SST?')) return;
    
    try {
      const { error } = await supabase.from('sst_managers').delete().eq('id', id);
      if (error) throw error;
      
      toast({
        title: "Gestora SST excluída",
        description: "A gestora SST foi excluída com sucesso."
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao excluir gestora SST",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleAssignSST = async (companyId: string, sstManagerId: string) => {
    try {
      const { error } = await supabase.from('company_sst_assignments').upsert({
        company_id: companyId,
        sst_manager_id: sstManagerId
      });

      if (error) throw error;

      toast({
        title: "Atribuição realizada",
        description: "A gestora SST foi atribuída à empresa com sucesso."
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao atribuir gestora SST",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const getAssignedSST = (companyId: string) => {
    const assignment = assignments.find(a => a.company_id === companyId);
    if (!assignment) return null;
    return sstManagers.find(sst => sst.id === assignment.sst_manager_id);
  };

  const getAssignedCompanies = (sstId: string) => {
    const assignedCompanyIds = assignments
      .filter(a => a.sst_manager_id === sstId)
      .map(a => a.company_id);
    return companies.filter(c => assignedCompanyIds.includes(c.id));
  };

  const exportCompaniesToExcel = async () => {
    const data = filteredCompanies.map(company => {
      const assignedSST = getAssignedSST(company.id);
      return {
        'Empresa': company.name,
        'Email': company.email || '-',
        'CNPJ': company.cnpj || '-',
        'Telefone': company.phone || '-',
        'Endereço': company.address || '-',
        'Slug (URL)': company.slug || '-',
        'Gestora SST': assignedSST?.name || 'Não atribuída',
        'Cadastrado em': new Date(company.created_at).toLocaleDateString('pt-BR'),
      };
    });
    await downloadJsonAsExcel(data, 'Empresas', `empresas-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Excel exportado', description: `${data.length} empresas exportadas com sucesso.` });
  };

  const exportSSTToExcel = async () => {
    const data = filteredSSTManagers.map(manager => {
      const assignedCompanies = getAssignedCompanies(manager.id);
      return {
        'Gestora SST': manager.name,
        'Email': manager.email || '-',
        'CNPJ': manager.cnpj || '-',
        'Telefone': manager.phone || '-',
        'Endereço': manager.address || '-',
        'Slug': manager.slug || '-',
        'Empresas Geridas': assignedCompanies.length,
        'Empresas': assignedCompanies.map(c => c.name).join(', ') || '-',
        'Cadastrado em': new Date(manager.created_at).toLocaleDateString('pt-BR'),
      };
    });
    await downloadJsonAsExcel(data, 'Gestoras SST', `gestoras-sst-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Excel exportado', description: `${data.length} gestoras SST exportadas com sucesso.` });
  };

  const handleOpenGeneratePassword = (entity: Company | SSTManager, type: 'company' | 'sst') => {
    setPasswordData({
      entity: entity.name,
      type,
      email: entity.email || '',
      name: entity.name,
      id: entity.id
    });
    setGeneratedPassword('');
    setIsGeneratePasswordOpen(true);
  };

  const handleGeneratePassword = async (password: string) => {
    if (!password || password.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user-with-password', {
        body: {
          email: passwordData.email,
          password: password,
          full_name: passwordData.name,
          role: passwordData.type,
          company_id: passwordData.type === 'company' ? passwordData.id : null,
          sst_manager_id: passwordData.type === 'sst' ? passwordData.id : null,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setGeneratedPassword(password);
      toast({
        title: "Usuário criado",
        description: `Usuário criado com sucesso. Login: ${passwordData.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error?.message || getSafeErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenEditCompany = (company: Company) => {
    setEditingCompany(company);
    setLogoPreview(company.logo_url);
    setIsEditCompanyOpen(true);
  };

  const handleOpenEditSST = (sst: SSTManager) => {
    setEditingSST(sst);
    setSstLogoPreview(sst.logo_url);
    setIsEditSSTOpen(true);
  };

  const handleEditSST = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSST) return;

    const formData = new FormData(e.currentTarget);
    
    try {
      let logoUrl = editingSST.logo_url;
      
      if (sstLogoFile) {
        logoUrl = await uploadLogo(sstLogoFile);
      }

      const name = String(formData.get('sstName') ?? '').trim();
      const email = String(formData.get('sstEmail') ?? '').trim();
      // Compat: um dos modais estava usando `sstCnpj` em vez de `sstCNPJ`
      const cnpj = String((formData.get('sstCNPJ') ?? formData.get('sstCnpj') ?? '')).trim();
      const phone = String(formData.get('sstPhone') ?? '').trim();
      const address = String(formData.get('sstAddress') ?? '').trim();

      if (!name) {
        throw new Error('Informe o nome da gestora SST.');
      }

      const updateData = {
        name,
        email: email || null,
        cnpj: cnpj || null,
        phone: phone || null,
        address: address || null,
        logo_url: logoUrl,
        slug: String(formData.get('sstSlug') ?? '').trim() || null,
      };

      const { data, error } = await supabase
        .from('sst_managers')
        .update(updateData)
        .eq('id', editingSST.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Nenhuma linha foi atualizada. Verifique suas permissões.');
      }

      toast({
        title: "Gestora SST atualizada",
        description: "As informações da gestora SST foram atualizadas com sucesso."
      });
      setIsEditSSTOpen(false);
      setEditingSST(null);
      setSstLogoFile(null);
      setSstLogoPreview(null);
      
      // Update selectedSST if it's the one being edited
      if (selectedSST && selectedSST.id === editingSST.id) {
        setSelectedSST(data[0]);
      }
      
      loadData();
    } catch (error) {
      console.error('Error updating SST:', error);
      toast({
        title: "Erro ao atualizar gestora SST",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleEditCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCompany) return;

    const formData = new FormData(e.currentTarget);
    
    try {
      let logoUrl = editingCompany.logo_url;
      
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const notificationEmail1 = (formData.get('notificationEmail1') as string)?.trim();
      const notificationEmail2 = (formData.get('notificationEmail2') as string)?.trim();
      const notificationEmail3 = (formData.get('notificationEmail3') as string)?.trim();
      const slug = (formData.get('companySlug') as string)?.trim();

      const updateData = {
        name: formData.get('companyName') as string,
        email: formData.get('companyEmail') as string,
        cnpj: formData.get('companyCNPJ') as string,
        phone: formData.get('companyPhone') as string,
        address: formData.get('companyAddress') as string,
        slug: slug || null,
        notification_email_1: notificationEmail1 || null,
        notification_email_2: notificationEmail2 || null,
        notification_email_3: notificationEmail3 || null,
        logo_url: logoUrl,
      };

      console.log('Updating company with data:', updateData);

      const { data, error, count } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', editingCompany.id)
        .select();

      console.log('Update result:', { data, error, count });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Nenhuma linha foi atualizada. Verifique suas permissões.');
      }

      toast({
        title: "Empresa atualizada",
        description: "As informações da empresa foram atualizadas com sucesso."
      });
      setIsEditCompanyOpen(false);
      setEditingCompany(null);
      setLogoFile(null);
      setLogoPreview(null);
      loadData();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Erro ao atualizar empresa",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleCreateTestUsers = async () => {
    setIsCreatingTestUsers(true);
    setTestUsersResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-users');
      
      if (error) throw error;
      
      if (data?.success) {
        setTestUsersResult(data.results);
        toast({
          title: "Usuários de teste criados!",
          description: "Parceiro e afiliado de teste prontos para uso.",
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error creating test users:', error);
      toast({
        title: "Erro ao criar usuários de teste",
        description: getSafeErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setIsCreatingTestUsers(false);
    }
  };

  const [isResettingCompanyPasswords, setIsResettingCompanyPasswords] = React.useState(false);

  const handleResetSingleCompanyPasswords = async () => {
    const ok = window.confirm(
      'Isso vai resetar a senha de TODAS as empresas que possuem apenas 1 CNPJ vinculado ao e-mail (sem multi-empresa). A senha será o CNPJ (apenas dígitos) e o usuário será forçado a trocá-la no próximo login. Deseja continuar?'
    );
    if (!ok) return;
    setIsResettingCompanyPasswords(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-single-company-passwords', { body: {} });
      if (error) throw error;
      toast({
        title: 'Reset concluído',
        description: `Resetadas: ${data?.reset ?? 0} | Multi-empresa puladas: ${data?.skipped_multi_company ?? 0} | Sem role 'company': ${data?.skipped_not_company_role ?? 0} | CNPJ inválido: ${data?.skipped_invalid_cnpj ?? 0} | Erros: ${data?.errors ?? 0}`,
      });
      console.log('reset-single-company-passwords result:', data);
    } catch (e: any) {
      toast({
        title: 'Erro ao resetar senhas',
        description: getSafeErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      setIsResettingCompanyPasswords(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8 flex items-center justify-center">
          <p>Verificando acesso...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            <Card>
              <CardHeader>
                <CardTitle>Acesso restrito</CardTitle>
                <CardDescription>Entre com uma conta de administrador para aprovar parceiros e afiliados.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <Button onClick={() => navigate('/auth')}>Entrar</Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            <Card>
              <CardHeader>
                <CardTitle>Acesso negado</CardTitle>
                <CardDescription>Esta área é exclusiva para administradores.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8 flex items-center justify-center">
          <p>Carregando...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Company Detail View
  if (selectedCompany) {
    const assignedSST = getAssignedSST(selectedCompany.id);
    
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8">
          <div className="audit-container">
            <Button variant="ghost" onClick={() => setSelectedCompany(null)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <Card>
              <CardHeader>
                <CardTitle>{selectedCompany.name}</CardTitle>
                <CardDescription>Detalhes da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCompany.logo_url && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={selectedCompany.logo_url} 
                      alt={`Logo ${selectedCompany.name}`}
                      className="h-20 object-contain"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-base">{selectedCompany.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">CNPJ</Label>
                    <p className="text-base">{selectedCompany.cnpj || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                    <p className="text-base">{selectedCompany.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Endereço</Label>
                    <p className="text-base">{selectedCompany.address || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Slug da Empresa</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-base bg-gray-100 px-3 py-1 rounded">
                        {selectedCompany.slug || '-'}
                      </code>
                      {selectedCompany.slug && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `${window.location.origin}/report/${selectedCompany.slug}`;
                            navigator.clipboard.writeText(url);
                            toast({
                              title: "URL copiada",
                              description: "Link para denúncias copiado."
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar URL de Denúncia
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-3 block">Acesso ao Sistema</Label>
                  <Button 
                    variant="outline" 
                    className="w-full mb-4"
                    onClick={() => handleOpenGeneratePassword(selectedCompany, 'company')}
                  >
                    Gerar Senha de Acesso
                  </Button>
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-2 block">Gestora SST</Label>
                  {assignedSST ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{assignedSST.name}</p>
                        <p className="text-sm text-gray-500">{assignedSST.email}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          const assignment = assignments.find(a => a.company_id === selectedCompany.id);
                          if (assignment) {
                            await supabase.from('company_sst_assignments').delete().eq('id', assignment.id);
                            loadData();
                            toast({ title: "Atribuição removida" });
                          }
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <Select onValueChange={(value) => handleAssignSST(selectedCompany.id, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma gestora SST" />
                      </SelectTrigger>
                      <SelectContent>
                        {sstManagers.map(sst => (
                          <SelectItem key={sst.id} value={sst.id}>{sst.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // SST Detail View
  if (selectedSST) {
    const assignedCompanies = getAssignedCompanies(selectedSST.id);
    
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8">
          <div className="audit-container">
            <Button variant="ghost" onClick={() => setSelectedSST(null)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <Card>
              <CardHeader>
                <CardTitle>{selectedSST.name}</CardTitle>
                <CardDescription>Detalhes da gestora SST</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSST.logo_url && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={selectedSST.logo_url} 
                      alt={`Logo ${selectedSST.name}`}
                      className="h-20 object-contain"
                    />
                  </div>
                )}
                
                <div className="mb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenEditSST(selectedSST)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Informações e Logo
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-base">{selectedSST.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">CNPJ</Label>
                    <p className="text-base">{selectedSST.cnpj || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                    <p className="text-base">{selectedSST.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Endereço</Label>
                    <p className="text-base">{selectedSST.address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Data de cadastro</Label>
                    <p className="text-base">{new Date(selectedSST.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Slug (URL White-Label)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-base bg-gray-100 px-3 py-1 rounded">
                        {selectedSST.slug || '-'}
                      </code>
                      {selectedSST.slug && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `${window.location.origin}/sst/${selectedSST.slug}`;
                            navigator.clipboard.writeText(url);
                            toast({
                              title: "URL copiada",
                              description: "Link da página SST copiado."
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar URL
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-3 block">Acesso ao Sistema</Label>
                  <Button 
                    variant="outline" 
                    className="w-full mb-4"
                    onClick={() => handleOpenGeneratePassword(selectedSST, 'sst')}
                  >
                    Gerar Senha de Acesso
                  </Button>
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-2 block">Atribuir Empresa</Label>
                  <Select onValueChange={(value) => handleAssignSST(value, selectedSST.id)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.filter(c => !getAssignedSST(c.id)).map(company => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium mb-3 block">Empresas Atribuídas ({assignedCompanies.length})</Label>
                  <div className="space-y-2">
                    {assignedCompanies.map(company => (
                      <div key={company.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-gray-500">{company.email}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            const assignment = assignments.find(a => a.company_id === company.id);
                            if (assignment) {
                              await supabase.from('company_sst_assignments').delete().eq('id', assignment.id);
                              loadData();
                              toast({ title: "Empresa removida" });
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    {assignedCompanies.length === 0 && (
                      <p className="text-gray-500 text-sm">Nenhuma empresa atribuída</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
        
        {/* Edit SST Dialog - Also in SST Detail View */}
        <Dialog open={isEditSSTOpen} onOpenChange={(open) => {
          setIsEditSSTOpen(open);
          if (!open) {
            setEditingSST(null);
            setSstLogoFile(null);
            setSstLogoPreview(null);
          }
        }}>
          <DialogContent key={editingSST?.id} className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Gestora SST</DialogTitle>
              <DialogDescription>
                Atualize as informações da gestora SST e sua logo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSST}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="editSstLogoDetail">Logo da Gestora SST</Label>
                  <div className="flex flex-col gap-3">
                    <Input 
                      id="editSstLogoDetail" 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleSSTLogoChange}
                      className="cursor-pointer"
                    />
                    {sstLogoPreview && (
                      <div className="flex justify-center p-2 border rounded-lg bg-gray-50">
                        <img 
                          src={sstLogoPreview} 
                          alt="Preview da logo" 
                          className="h-20 object-contain"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Formatos aceitos: JPG, PNG, WEBP, GIF (máx. 5MB)
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editSstNameDetail">Nome da Gestora</Label>
                  <Input 
                    id="editSstNameDetail" 
                    name="sstName" 
                    placeholder="Nome da gestora SST" 
                    defaultValue={editingSST?.name}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editSstEmailDetail">Email</Label>
                  <Input 
                    id="editSstEmailDetail" 
                    name="sstEmail" 
                    type="email" 
                    placeholder="contato@sst.com"
                    defaultValue={editingSST?.email || ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editSstCnpjDetail">CNPJ</Label>
                  <Input 
                    id="editSstCnpjDetail" 
                    name="sstCNPJ" 
                    placeholder="00.000.000/0000-00"
                    defaultValue={editingSST?.cnpj || ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editSstPhoneDetail">Telefone</Label>
                  <Input 
                    id="editSstPhoneDetail" 
                    name="sstPhone" 
                    placeholder="(00) 00000-0000"
                    defaultValue={editingSST?.phone || ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editSstAddressDetail">Endereço</Label>
                  <Input 
                    id="editSstAddressDetail" 
                    name="sstAddress" 
                    placeholder="Rua, número, cidade - Estado"
                    defaultValue={editingSST?.address || ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editSstSlugDetail">Slug (URL White-Label)</Label>
                  <Input 
                    id="editSstSlugDetail" 
                    name="sstSlug" 
                    placeholder="nome-da-gestora"
                    defaultValue={editingSST?.slug || ''}
                  />
                  <p className="text-xs text-gray-500">
                    URL personalizada: /sst/slug-da-gestora
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditSSTOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="audit-container">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-audit-primary">Painel Administrativo</h1>
          </div>

          {/* Quick Actions Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Pesquisa de Clima</CardTitle>
                  </div>
                  <CardDescription>
                    Crie e gerencie pesquisas de clima organizacional
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => navigate('/climate-survey/new')} 
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Pesquisa
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/climate-dashboard')}
                    className="w-full text-sm"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Ver Dashboard
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-500/20 hover:border-orange-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">Usuários de Teste</CardTitle>
                  </div>
                  <CardDescription>
                    Crie usuários para testar dashboards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={handleCreateTestUsers} 
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    disabled={isCreatingTestUsers}
                  >
                    {isCreatingTestUsers ? (
                      <>Criando...</>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Usuários Teste
                      </>
                    )}
                  </Button>
                  {testUsersResult && (
                    <div className="text-xs space-y-1 p-2 bg-muted rounded">
                      <p className="font-medium">Credenciais:</p>
                      <p><strong>Parceiro:</strong> {testUsersResult.partner?.email}</p>
                      <p><strong>Afiliado:</strong> {testUsersResult.affiliate?.email}</p>
                      <p className="text-muted-foreground">Senha: Teste123!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">Importar Dados</CardTitle>
                  </div>
                  <CardDescription>
                    Importe JSON com profile, sst_manager, empresas, avaliações e PGR
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImportUserDataDialog />
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Tabs defaultValue="companies" value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="companies">Empresas</TabsTrigger>
                <TabsTrigger value="sst">Gestoras SST</TabsTrigger>
                <TabsTrigger value="portal">Portal</TabsTrigger>
                <TabsTrigger value="active-partners">Parceiros Ativos</TabsTrigger>
                <TabsTrigger value="active-affiliates">Afiliados Ativos</TabsTrigger>
                <TabsTrigger value="partners">Aprovações Pendentes</TabsTrigger>
                <TabsTrigger value="sales">Time de Vendas</TabsTrigger>
                <TabsTrigger value="logs" className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  Logs
                </TabsTrigger>
                <TabsTrigger value="form-leads">Leads Formulários</TabsTrigger>
                <TabsTrigger value="trials">Contas em Teste</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-4">
                {activeTab === "companies" ? (
                  <>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar empresa..."
                        value={companySearchTerm}
                        onChange={(e) => setCompanySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Dialog open={isAddCompanyOpen} onOpenChange={(open) => {
                      setIsAddCompanyOpen(open);
                      if (!open) {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Empresa
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Nova Empresa</DialogTitle>
                          <DialogDescription>
                            Preencha os dados para cadastrar uma nova empresa no sistema.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCompany}>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="companyLogo">Logo da Empresa</Label>
                              <div className="flex flex-col gap-3">
                                <Input 
                                  id="companyLogo" 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={handleLogoChange}
                                  className="cursor-pointer"
                                />
                                {logoPreview && (
                                  <div className="flex justify-center p-2 border rounded-lg bg-gray-50">
                                    <img 
                                      src={logoPreview} 
                                      alt="Preview da logo" 
                                      className="h-20 object-contain"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-gray-500">
                                  Formatos aceitos: JPG, PNG, WEBP, GIF (máx. 5MB)
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="companyName">Nome da Empresa</Label>
                              <Input id="companyName" name="companyName" placeholder="Nome da empresa" required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="companyEmail">Email</Label>
                              <Input id="companyEmail" name="companyEmail" type="email" placeholder="contato@empresa.com" required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="companyCNPJ">CNPJ</Label>
                              <Input id="companyCNPJ" name="companyCNPJ" placeholder="00.000.000/0000-00" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="companyPhone">Telefone</Label>
                              <Input id="companyPhone" name="companyPhone" placeholder="(00) 0000-0000" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="companyAddress">Endereço</Label>
                              <Input id="companyAddress" name="companyAddress" placeholder="Endereço completo" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit">Adicionar Empresa</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* Edit Company Dialog */}
                    <Dialog open={isEditCompanyOpen} onOpenChange={(open) => {
                      setIsEditCompanyOpen(open);
                      if (!open) {
                        setEditingCompany(null);
                        setLogoFile(null);
                        setLogoPreview(null);
                      }
                    }}>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Empresa</DialogTitle>
                          <DialogDescription>
                            Atualize as informações da empresa, incluindo até 3 emails para notificações de denúncias.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditCompany}>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="editCompanyLogo">Logo da Empresa</Label>
                              <div className="flex flex-col gap-3">
                                <Input 
                                  id="editCompanyLogo" 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={handleLogoChange}
                                  className="cursor-pointer"
                                />
                                {logoPreview && (
                                  <div className="flex justify-center p-2 border rounded-lg bg-gray-50">
                                    <img 
                                      src={logoPreview} 
                                      alt="Preview da logo" 
                                      className="h-20 object-contain"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-gray-500">
                                  Formatos aceitos: JPG, PNG, WEBP, GIF (máx. 5MB)
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editCompanyName">Nome da Empresa</Label>
                              <Input 
                                id="editCompanyName" 
                                name="companyName" 
                                placeholder="Nome da empresa" 
                                defaultValue={editingCompany?.name}
                                required 
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editCompanyEmail">Email Principal</Label>
                              <Input 
                                id="editCompanyEmail" 
                                name="companyEmail" 
                                type="email" 
                                placeholder="contato@empresa.com"
                                defaultValue={editingCompany?.email || ''}
                                required 
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editCompanyCNPJ">CNPJ</Label>
                              <Input 
                                id="editCompanyCNPJ" 
                                name="companyCNPJ" 
                                placeholder="00.000.000/0000-00"
                                defaultValue={editingCompany?.cnpj || ''}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editCompanyPhone">Telefone</Label>
                              <Input 
                                id="editCompanyPhone" 
                                name="companyPhone" 
                                placeholder="(00) 0000-0000"
                                defaultValue={editingCompany?.phone || ''}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editCompanyAddress">Endereço</Label>
                              <Input 
                                id="editCompanyAddress" 
                                name="companyAddress" 
                                placeholder="Endereço completo"
                                defaultValue={editingCompany?.address || ''}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editCompanySlug">Slug (URL)</Label>
                              <Input 
                                id="editCompanySlug" 
                                name="companySlug" 
                                placeholder="nome-da-empresa"
                                defaultValue={editingCompany?.slug || ''}
                              />
                              <p className="text-xs text-gray-500">
                                Identificador único usado na URL da página de denúncias (ex: /report/nome-da-empresa)
                              </p>
                            </div>

                            <div className="border-t pt-4 mt-2">
                              <Label className="text-base font-semibold mb-3 block">
                                Emails para Notificações de Denúncias
                              </Label>
                              <p className="text-sm text-gray-500 mb-3">
                                Configure até 3 emails que receberão notificações quando novas denúncias forem registradas.
                              </p>
                              <div className="grid gap-3">
                                <div className="grid gap-2">
                                  <Label htmlFor="notificationEmail1">Email de Notificação 1</Label>
                                  <Input 
                                    id="notificationEmail1" 
                                    name="notificationEmail1" 
                                    type="email" 
                                    placeholder="email1@empresa.com"
                                    defaultValue={editingCompany?.notification_email_1 || ''}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="notificationEmail2">Email de Notificação 2</Label>
                                  <Input 
                                    id="notificationEmail2" 
                                    name="notificationEmail2" 
                                    type="email" 
                                    placeholder="email2@empresa.com"
                                    defaultValue={editingCompany?.notification_email_2 || ''}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="notificationEmail3">Email de Notificação 3</Label>
                                  <Input 
                                    id="notificationEmail3" 
                                    name="notificationEmail3" 
                                    type="email" 
                                    placeholder="email3@empresa.com"
                                    defaultValue={editingCompany?.notification_email_3 || ''}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditCompanyOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit">Salvar Alterações</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* Edit SST Dialog */}
                    <Dialog open={isEditSSTOpen} onOpenChange={(open) => {
                      setIsEditSSTOpen(open);
                      if (!open) {
                        setEditingSST(null);
                        setSstLogoFile(null);
                        setSstLogoPreview(null);
                      }
                    }}>
                      <DialogContent key={editingSST?.id} className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Gestora SST</DialogTitle>
                          <DialogDescription>
                            Atualize as informações da gestora SST e sua logo.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditSST}>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="editSstLogo">Logo da Gestora SST</Label>
                              <div className="flex flex-col gap-3">
                                <Input 
                                  id="editSstLogo" 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={handleSSTLogoChange}
                                  className="cursor-pointer"
                                />
                                {sstLogoPreview && (
                                  <div className="flex justify-center p-2 border rounded-lg bg-gray-50">
                                    <img 
                                      src={sstLogoPreview} 
                                      alt="Preview da logo" 
                                      className="h-20 object-contain"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-gray-500">
                                  Formatos aceitos: JPG, PNG, WEBP, GIF (máx. 5MB)
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editSstName">Nome da Gestora</Label>
                              <Input 
                                id="editSstName" 
                                name="sstName" 
                                placeholder="Nome da gestora SST" 
                                defaultValue={editingSST?.name}
                                required 
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editSstEmail">Email</Label>
                              <Input 
                                id="editSstEmail" 
                                name="sstEmail" 
                                type="email" 
                                placeholder="contato@sst.com"
                                defaultValue={editingSST?.email || ''}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editSstCNPJ">CNPJ</Label>
                              <Input 
                                id="editSstCNPJ" 
                                name="sstCNPJ" 
                                placeholder="00.000.000/0000-00"
                                defaultValue={editingSST?.cnpj || ''}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editSstPhone">Telefone</Label>
                              <Input 
                                id="editSstPhone" 
                                name="sstPhone" 
                                placeholder="(00) 00000-0000"
                                defaultValue={editingSST?.phone || ''}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editSstAddress">Endereço</Label>
                              <Input 
                                id="editSstAddress" 
                                name="sstAddress" 
                                placeholder="Rua, número, cidade - Estado"
                                defaultValue={editingSST?.address || ''}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="editSstSlug">Slug (URL White-Label)</Label>
                              <Input 
                                id="editSstSlug" 
                                name="sstSlug" 
                                placeholder="nome-da-gestora"
                                defaultValue={editingSST?.slug || ''}
                              />
                              <p className="text-xs text-gray-500">
                                URL personalizada: /sst/slug-da-gestora
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditSSTOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit">Salvar Alterações</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar gestora SST..."
                        value={sstSearchTerm}
                        onChange={(e) => setSSTSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Dialog open={isAddSSTOpen} onOpenChange={setIsAddSSTOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Gestora SST
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Nova Gestora SST</DialogTitle>
                          <DialogDescription>
                            Preencha os dados para cadastrar uma nova empresa gestora de SST.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddSST}>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="sstLogo">Logo da Gestora SST</Label>
                              <div className="flex flex-col gap-3">
                                <Input 
                                  id="sstLogo" 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={handleSSTLogoChange}
                                  className="cursor-pointer"
                                />
                                {sstLogoPreview && (
                                  <div className="flex justify-center p-2 border rounded-lg bg-gray-50">
                                    <img 
                                      src={sstLogoPreview} 
                                      alt="Preview da logo" 
                                      className="h-20 object-contain"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-gray-500">
                                  Formatos aceitos: JPG, PNG, WEBP, GIF (máx. 5MB)
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sstName">Nome da Gestora SST</Label>
                              <Input id="sstName" name="sstName" placeholder="Nome da empresa" required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sstResponsible">Nome do Responsável (login)</Label>
                              <Input id="sstResponsible" name="sstResponsible" placeholder="Nome completo do usuário titular" required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sstEmail">Email (acesso)</Label>
                              <Input id="sstEmail" name="sstEmail" type="email" placeholder="contato@gestora.com" required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sstCNPJ">CNPJ (será a senha inicial)</Label>
                              <Input id="sstCNPJ" name="sstCNPJ" placeholder="00.000.000/0000-00" required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sstPhone">Telefone</Label>
                              <Input id="sstPhone" name="sstPhone" placeholder="(00) 0000-0000" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sstAddress">Endereço</Label>
                              <Input id="sstAddress" name="sstAddress" placeholder="Endereço completo" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-2">
                                <Label htmlFor="sstPlanId">Plano (opcional)</Label>
                                <select
                                  id="sstPlanId"
                                  name="sstPlanId"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  defaultValue=""
                                >
                                  <option value="">Sem plano (definir depois)</option>
                                  {manualPlans.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="sstTrialDays">Dias de teste grátis</Label>
                                <Input id="sstTrialDays" name="sstTrialDays" type="number" min={0} max={365} defaultValue={7} />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Será criada uma conta de acesso para o responsável. A senha inicial é o CNPJ (somente números) e a troca é exigida no primeiro login.
                            </p>

                          </div>
                          <DialogFooter>
                            <Button type="submit">Adicionar Gestora SST</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>
            
            <TabsContent value="companies">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Empresas Cadastradas</CardTitle>
                    <CardDescription>
                      Lista de todas as empresas no sistema
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportCompaniesToExcel()}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">Empresa</th>
                          <th className="px-4 py-3 text-left font-medium">Email</th>
                          <th className="px-4 py-3 text-left font-medium">CNPJ</th>
                          <th className="px-4 py-3 text-left font-medium">Slug (URL)</th>
                          <th className="px-4 py-3 text-left font-medium">Gestora SST</th>
                          <th className="px-4 py-3 text-left font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompanies.map((company) => {
                          const assignedSST = getAssignedSST(company.id);
                          return (
                            <tr key={company.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-md bg-audit-primary/10 flex items-center justify-center mr-3">
                                    <Building className="h-4 w-4 text-audit-primary" />
                                  </div>
                                  {company.name}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-gray-500">{company.email || '-'}</td>
                              <td className="px-4 py-4 text-gray-500">{company.cnpj || '-'}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {company.slug || '-'}
                                  </code>
                                  {company.slug && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const url = `${window.location.origin}/report/${company.slug}`;
                                        navigator.clipboard.writeText(url);
                                        toast({
                                          title: "URL copiada",
                                          description: "Link para denúncias copiado."
                                        });
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-gray-500">
                                {assignedSST ? assignedSST.name : '-'}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOpenEditCompany(company)}
                                    title="Editar empresa"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOpenGeneratePassword(company, 'company')}
                                    title="Gerar senha de acesso"
                                  >
                                    <Key className="h-4 w-4 mr-1" />
                                    Senha
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setSelectedCompany(company)}
                                  >
                                    Ver
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600"
                                    onClick={() => handleDeleteCompany(company.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {filteredCompanies.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Nenhuma empresa encontrada</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sst">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Gestoras SST Cadastradas</CardTitle>
                    <CardDescription>
                      Lista de todas as empresas gestoras de SST no sistema
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportSSTToExcel()}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">Gestora</th>
                          <th className="px-4 py-3 text-left font-medium">Email</th>
                          <th className="px-4 py-3 text-left font-medium">CNPJ</th>
                          <th className="px-4 py-3 text-left font-medium">Slug</th>
                          <th className="px-4 py-3 text-left font-medium">Empresas geridas</th>
                          <th className="px-4 py-3 text-left font-medium">Data de cadastro</th>
                          <th className="px-4 py-3 text-left font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSSTManagers.map((manager) => {
                          const assignedCompanies = getAssignedCompanies(manager.id);
                          return (
                            <tr key={manager.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-md bg-audit-accent/10 flex items-center justify-center mr-3">
                                    <UserCheck className="h-4 w-4 text-audit-accent" />
                                  </div>
                                  {manager.name}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-gray-500">{manager.email || '-'}</td>
                              <td className="px-4 py-4 text-gray-500">{manager.cnpj || '-'}</td>
                              <td className="px-4 py-4">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {manager.slug || '-'}
                                </code>
                              </td>
                              <td className="px-4 py-4">{assignedCompanies.length}</td>
                              <td className="px-4 py-4 text-gray-500">
                                {new Date(manager.created_at).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOpenEditSST(manager)}
                                    title="Editar gestora SST"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOpenGeneratePassword(manager, 'sst')}
                                    title="Gerar senha de acesso"
                                  >
                                    <Key className="h-4 w-4 mr-1" />
                                    Senha
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAssignPlanSST(manager)}
                                    title="Atribuir plano manual"
                                  >
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Plano
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setSelectedSST(manager)}
                                  >
                                    Ver
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600"
                                    onClick={() => handleDeleteSST(manager.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {filteredSSTManagers.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Nenhuma gestora SST encontrada</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Portal Tab */}
            <TabsContent value="portal" className="space-y-6">
              <AdminPortalManager />
            </TabsContent>

            {/* Active Partners Tab */}
            <TabsContent value="active-partners" className="space-y-6">
              <ActivePartnersManager />
            </TabsContent>

            {/* Active Affiliates Tab */}
            <TabsContent value="active-affiliates" className="space-y-6">
              <ActiveAffiliatesManager />
            </TabsContent>

            {/* Pending Approvals Tab */}
            <TabsContent value="partners" className="space-y-6">
              <PendingPartnersManager />
              <PendingAffiliatesManager />
            </TabsContent>

            {/* Sales Team Tab */}
            <TabsContent value="sales" className="space-y-6">
              <SalesTeamTab />
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              <AccessLogsTab />
            </TabsContent>

            <TabsContent value="form-leads" className="space-y-6">
              <FormLeadsTab />
            </TabsContent>

            <TabsContent value="trials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reset em massa — Empresas single-CNPJ</CardTitle>
                  <CardDescription>
                    Reseta a senha de todas as empresas que possuem APENAS 1 CNPJ vinculado ao e-mail
                    (sem multi-empresa). A senha vira o CNPJ (somente dígitos) e o usuário é forçado
                    a trocar no próximo login. Não afeta gestoras SST nem contas multi-empresa.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleResetSingleCompanyPasswords}
                    disabled={isResettingCompanyPasswords}
                  >
                    {isResettingCompanyPasswords ? 'Resetando...' : 'Resetar senhas das empresas single-CNPJ'}
                  </Button>
                </CardContent>
              </Card>
              <TrialAccountsTab />
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <StatisticsTab />
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-6">
              <WebhooksTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Dialog para gerar senha */}
      <Dialog open={isGeneratePasswordOpen} onOpenChange={setIsGeneratePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Senha de Acesso</DialogTitle>
            <DialogDescription>
              Crie uma senha para o usuário acessar o sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Entidade</Label>
              <p className="text-sm font-medium">{passwordData.entity}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Email (Login)</Label>
              <p className="text-sm font-medium">{passwordData.email}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <p className="text-sm font-medium capitalize">{passwordData.type === 'company' ? 'Empresa' : 'Gestora SST'}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="text" 
                placeholder="Digite a senha (mínimo 6 caracteres)"
                defaultValue={generatedPassword}
              />
            </div>

            {generatedPassword && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>✓ Usuário criado com sucesso!</strong><br/>
                  Login: {passwordData.email}<br/>
                  Senha: {generatedPassword}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsGeneratePasswordOpen(false)}
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                const input = document.getElementById('password') as HTMLInputElement;
                handleGeneratePassword(input.value);
              }}
              disabled={isGenerating}
            >
              {isGenerating ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignManualPlanDialog
        open={!!assignPlanSST}
        onOpenChange={(o) => { if (!o) setAssignPlanSST(null); }}
        sstManager={assignPlanSST}
        onAssigned={() => loadData()}
      />
    </div>
  );
};

export default MasterDashboard;