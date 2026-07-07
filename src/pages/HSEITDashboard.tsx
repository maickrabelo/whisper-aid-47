import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, ClipboardList, BarChart3, Building2, Users, AlertTriangle, Eye, Copy, ExternalLink, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OnboardingTour, { TourStep } from '@/components/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import PrintQuestionnaireButton from '@/components/PrintQuestionnaireButton';

const hseitSteps: TourStep[] = [
  {
    targetId: 'hseit-new-btn',
    title: '➕ Nova Avaliação',
    description: 'Clique aqui para criar uma nova avaliação HSE-IT para uma das suas empresas.',
    position: 'bottom',
  },
  {
    targetId: 'hseit-filters',
    title: '🔍 Filtros',
    description: 'Use os filtros para buscar avaliações por nome ou filtrar por empresa.',
    position: 'bottom',
  },
  {
    targetId: 'hseit-table',
    title: '📊 Tabela de Avaliações',
    description: 'Aqui você vê todas as avaliações criadas, com links para compartilhar, ver resultados e editar.',
    position: 'top',
  },
];

interface HSEITAssessment {
  id: string;
  title: string;
  description: string | null;
  company_id: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  companies: {
    name: string;
    slug: string;
  };
  response_count?: number;
}

interface Company {
  id: string;
  name: string;
}

export default function HSEITDashboard() {
  const navigate = useNavigate();
  const { user, role, profile, isLoading: authLoading } = useRealAuth();
  const { shouldShowTour, completeTour } = useOnboarding('hseit-dashboard');
  
  const [assessments, setAssessments] = useState<HSEITAssessment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (!['admin', 'sst', 'company'].includes(role || '')) {
        navigate('/dashboard');
        return;
      }
      fetchData();
    }
  }, [user, role, authLoading, profile]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get assigned company IDs for SST users
      let assignedCompanyIds: string[] = [];
      let companyAccessIds: string[] = [];
      
      if (role === 'admin') {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');
        setCompanies(companiesData || []);
      } else if (role === 'sst' && profile?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('sst_manager_id')
          .eq('id', profile.id)
          .single();
        
        if (profileData?.sst_manager_id) {
          const { data: assignments } = await supabase
            .from('company_sst_assignments')
            .select('company:companies!inner(id, name)')
            .eq('sst_manager_id', profileData.sst_manager_id)
            .order('name', { foreignTable: 'companies', ascending: true });
          
          const companiesData = (assignments || [])
            .map((a: any) => a.company)
            .filter(Boolean);
          assignedCompanyIds = companiesData.map((c: any) => c.id);
          setCompanies(companiesData);
        }
      } else if (role === 'company' && profile?.company_id) {

        companyAccessIds = [profile.company_id];
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', profile.company_id);
        setCompanies(companiesData || []);
      }

      // Fetch assessments
      let assessmentsData: HSEITAssessment[] = [];
      
      if (role === 'admin') {
        const { data, error } = await supabase
          .from('hseit_assessments')
          .select('*, companies(name, slug)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        assessmentsData = (data || []) as unknown as HSEITAssessment[];
      } else if (role === 'sst' && assignedCompanyIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('sst_manager_id')
          .eq('id', profile!.id)
          .single();
        const { data, error } = await supabase
          .from('hseit_assessments')
          .select('*, companies!inner(name, slug, company_sst_assignments!inner(sst_manager_id))')
          .eq('companies.company_sst_assignments.sst_manager_id', profileData?.sst_manager_id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        assessmentsData = (data || []) as unknown as HSEITAssessment[];

      } else if (role === 'company' && companyAccessIds.length > 0) {
        const { data, error } = await supabase
          .from('hseit_assessments')
          .select('*, companies(name, slug)')
          .in('company_id', companyAccessIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        assessmentsData = (data || []) as unknown as HSEITAssessment[];
      }

      // Fetch response counts
      const assessmentIds = assessmentsData.map(a => a.id);
      if (assessmentIds.length > 0) {
        const { data: responseCounts } = await supabase
          .from('hseit_responses')
          .select('assessment_id')
          .in('assessment_id', assessmentIds)
          .not('completed_at', 'is', null);
        
        const counts: Record<string, number> = {};
        responseCounts?.forEach(r => {
          counts[r.assessment_id] = (counts[r.assessment_id] || 0) + 1;
        });
        
        assessmentsData = assessmentsData.map(a => ({
          ...a,
          response_count: counts[a.id] || 0
        }));
      }

      setAssessments(assessmentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as avaliações HSE-IT.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.'
    });
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Excluir a avaliação "${title}"? Todas as respostas serão removidas. Esta ação é irreversível.`)) return;
    try {
      const { error } = await supabase.from('hseit_assessments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Avaliação excluída', description: 'A avaliação foi removida com sucesso.' });
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      toast({ title: 'Erro ao excluir', description: error.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === 'all' || assessment.company_id === selectedCompany;
    return matchesSearch && matchesCompany;
  });

  const activeCount = assessments.filter(a => a.is_active).length;
  const totalResponses = assessments.reduce((sum, a) => sum + (a.response_count || 0), 0);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="outline" size="sm" onClick={() => navigate(role === 'company' ? '/dashboard' : '/sst-dashboard')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              Avaliação HSE-IT
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestão de Riscos Psicossociais - Health and Safety Executive Indicator Tool
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <PrintQuestionnaireButton variant="hseit" />
            <Button id="hseit-new-btn" onClick={() => navigate('/hseit/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Avaliações</p>
                  <p className="text-2xl font-bold">{assessments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empresas</p>
                  <p className="text-2xl font-bold">{companies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Respostas</p>
                  <p className="text-2xl font-bold">{totalResponses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card id="hseit-filters" className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {companies.length > 0 && (
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todas empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas empresas</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assessments Table */}
        <Card id="hseit-table">
          <CardHeader>
            <CardTitle>Avaliações HSE-IT</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAssessments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  Nenhuma avaliação encontrada
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie uma nova avaliação HSE-IT para começar.
                </p>
                <Button onClick={() => navigate('/hseit/new')} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Avaliação
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Respostas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => {
                    const formUrl = `${PUBLIC_BASE_URL}/hseit/${assessment.companies?.slug}/${assessment.id}`;
                    
                    return (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">
                          {assessment.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {assessment.companies?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assessment.start_date && assessment.end_date ? (
                            <span className="text-sm">
                              {format(new Date(assessment.start_date), 'dd/MM/yy', { locale: ptBR })} - {format(new Date(assessment.end_date), 'dd/MM/yy', { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem período</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {assessment.response_count || 0} respostas
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assessment.is_active ? 'default' : 'outline'}>
                            {assessment.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(formUrl)}
                              title="Copiar link do formulário"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(formUrl, '_blank')}
                              title="Abrir formulário"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/hseit/results/${assessment.id}`)}
                              title="Ver resultados"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/hseit/${assessment.id}`)}
                              title="Editar avaliação"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(assessment.id, assessment.title)}
                              title="Excluir avaliação"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      
      <Footer />

      {shouldShowTour && (
        <OnboardingTour
          steps={hseitSteps}
          onComplete={() => completeTour()}
        />
      )}
    </div>
  );
}
