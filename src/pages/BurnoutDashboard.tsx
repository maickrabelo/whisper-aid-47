import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ExternalLink, Copy, BarChart3, Flame, Building2, Users, FileText, Edit, ArrowLeft, Shield, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OnboardingTour, { TourStep } from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import SoniaChat from "@/components/SoniaChat";
import { SoniaChatProvider, SoniaChatLayout } from '@/contexts/SoniaChatContext';
import PrintQuestionnaireButton from "@/components/PrintQuestionnaireButton";
import { Loader2 } from "lucide-react";

const burnoutSteps: TourStep[] = [
  { targetId: 'burnout-new-btn', title: '➕ Nova Avaliação', description: 'Crie uma nova avaliação de Burnout para monitorar o risco de esgotamento dos colaboradores.', position: 'bottom' },
  { targetId: 'burnout-filters', title: '🔍 Filtros', description: 'Filtre as avaliações por título ou empresa.', position: 'bottom' },
  { targetId: 'burnout-table', title: '📊 Tabela de Avaliações', description: 'Gerencie suas avaliações, copie links para compartilhar e acompanhe os resultados.', position: 'top' },
];

interface BurnoutAssessment {
  id: string;
  title: string;
  description: string | null;
  company_id: string;
  company_name: string;
  company_slug: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  response_count: number;
}

interface Company { id: string; name: string; slug: string | null; }

export default function BurnoutDashboard() {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useRealAuth();
  const { toast } = useToast();
  const { shouldShowTour, completeTour } = useOnboarding('burnout-dashboard');

  const [assessments, setAssessments] = useState<BurnoutAssessment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  useEffect(() => {
    if (!authLoading) {
      if (!user) { navigate('/auth'); return; }
      if (role !== 'admin' && role !== 'sst' && role !== 'company') { navigate('/dashboard'); return; }
      fetchData();
    }
  }, [user, role, authLoading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let companiesQuery = supabase.from('companies').select('id, name, slug');
      if (role === 'sst') {
        const { data: profile } = await supabase.from('profiles').select('sst_manager_id').eq('id', user?.id).single();
        if (profile?.sst_manager_id) {
          const { data: assignments } = await supabase.from('company_sst_assignments').select('company_id').eq('sst_manager_id', profile.sst_manager_id);
          const companyIds = assignments?.map(a => a.company_id) || [];
          companiesQuery = companiesQuery.in('id', companyIds);
        }
      } else if (role === 'company') {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        if (profile?.company_id) {
          companiesQuery = companiesQuery.eq('id', profile.company_id);
        } else {
          companiesQuery = companiesQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
      const { data: companiesData } = await companiesQuery;
      setCompanies(companiesData || []);

      let assessmentsQuery = supabase.from('burnout_assessments').select(`id, title, description, company_id, start_date, end_date, is_active, created_at, companies (name, slug)`).order('created_at', { ascending: false });
      if ((role === 'sst' || role === 'company') && companiesData) {
        assessmentsQuery = assessmentsQuery.in('company_id', companiesData.map(c => c.id));
      }
      const { data: assessmentsData, error } = await assessmentsQuery;
      if (error) throw error;

      const assessmentsWithCounts = await Promise.all(
        (assessmentsData || []).map(async (assessment) => {
          const { count } = await supabase.from('burnout_responses').select('*', { count: 'exact', head: true }).eq('assessment_id', assessment.id).not('completed_at', 'is', null);
          const company = assessment.companies as { name: string; slug: string | null } | null;
          return { id: assessment.id, title: assessment.title, description: assessment.description, company_id: assessment.company_id, company_name: company?.name || 'Empresa', company_slug: company?.slug, start_date: assessment.start_date, end_date: assessment.end_date, is_active: assessment.is_active, created_at: assessment.created_at, response_count: count || 0 };
        })
      );
      setAssessments(assessmentsWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar as avaliações de Burnout.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Link copiado!", description: "O link foi copiado para a área de transferência." });
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Excluir a avaliação "${title}"? Todas as respostas serão removidas. Esta ação é irreversível.`)) return;
    try {
      const { error } = await supabase.from('burnout_assessments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Avaliação excluída', description: 'A avaliação foi removida com sucesso.' });
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      console.error('Error deleting Burnout assessment:', error);
      toast({ title: 'Erro ao excluir', description: error.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const filteredAssessments = assessments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === "all" || a.company_id === selectedCompany;
    return matchesSearch && matchesCompany;
  });

  const activeCount = assessments.filter(a => a.is_active).length;
  const totalResponses = assessments.reduce((sum, a) => sum + a.response_count, 0);

  const r = role as string;
  const backPath = r === 'sales' ? '/sales-dashboard' : r === 'company' ? '/dashboard' : '/sst-dashboard';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <SoniaChatProvider>
    <SoniaChatLayout>
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary py-10 md:py-14">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="container mx-auto px-4 relative z-10">
            <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="mb-4 gap-2 text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-4">
                  <Flame className="h-4 w-4" />
                  <span>Avaliação de Burnout</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Avaliação de Burnout</h1>
                <p className="text-white/70 mt-1">Gerencie as avaliações de risco de Síndrome de Burnout</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrintQuestionnaireButton variant="burnout" buttonClassName="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm" />
                <Button id="burnout-new-btn" onClick={() => navigate('/burnout/new')} className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  <Plus className="h-4 w-4" /> Nova Avaliação
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {[
                { value: assessments.length, label: 'Total Avaliações', icon: FileText },
                { value: activeCount, label: 'Ativas', icon: Flame },
                { value: companies.length, label: 'Empresas', icon: Building2 },
                { value: totalResponses, label: 'Respostas', icon: Users },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <stat.icon className="h-5 w-5 text-white/80" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/60">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          {/* Filters */}
          <Card id="burnout-filters" className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por título ou empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Filtrar por empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card id="burnout-table" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-0">
              {filteredAssessments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex p-5 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl mb-4">
                    <Flame className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma avaliação encontrada</h3>
                  <p className="text-muted-foreground mb-4">Crie sua primeira avaliação de Burnout para começar.</p>
                  <Button onClick={() => navigate('/burnout/new')} className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Avaliação
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-center">Respostas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssessments.map(a => {
                      const formUrl = a.company_slug ? `${PUBLIC_BASE_URL}/burnout/${a.company_slug}/${a.id}` : null;
                      return (
                        <TableRow key={a.id} className="group">
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {a.company_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            {a.start_date && a.end_date ? (
                              <span className="text-sm">{format(new Date(a.start_date), "dd/MM/yy", { locale: ptBR })} - {format(new Date(a.end_date), "dd/MM/yy", { locale: ptBR })}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Não definido</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{a.response_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.is_active ? "default" : "outline"}>{a.is_active ? "Ativo" : "Inativo"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {formUrl && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(formUrl)} title="Copiar link"><Copy className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => window.open(formUrl, '_blank')} title="Abrir formulário"><ExternalLink className="h-4 w-4" /></Button>
                                </>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/burnout/results/${a.id}`)} title="Ver resultados"><BarChart3 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/burnout/${a.id}`)} title="Editar"><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id, a.title)} title="Excluir" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
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
        </div>
      </main>
      <Footer />
      {shouldShowTour && <OnboardingTour steps={burnoutSteps} onComplete={() => completeTour()} />}
    </div>
    </SoniaChatLayout>
    <SoniaChat contextType="burnout" />
    </SoniaChatProvider>
  );
}
