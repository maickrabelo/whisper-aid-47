import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, AlertCircle, Loader2, ExternalLink, Copy, ClipboardList, Brain, Flame, Building2, Users, Rocket, ArrowRight, BarChart3, Shield } from "lucide-react";
import { QRCodeDownloader } from "@/components/QRCodeDownloader";
import { useNavigate } from 'react-router-dom';
import EmbeddedDashboard from '@/components/EmbeddedDashboard';
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { useToast } from "@/hooks/use-toast";
import { SalesTeamTab } from '@/components/admin/SalesTeamTab';
import { Progress } from '@/components/ui/progress';
import { PUBLIC_BASE_URL } from "@/lib/publicUrl";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  reportCount: number;
  newReports: number;
}

const salesTools = [
  {
    icon: Brain,
    title: 'Riscos Psicossociais',
    description: 'HSE-IT e COPSOQ validados internacionalmente',
    highlights: ['HSE-IT', 'COPSOQ II', 'Plano de ação'],
    path: '/psychosocial-dashboard',
  },
  {
    icon: Flame,
    title: 'Avaliação Burnout',
    description: 'Questionários científicos de esgotamento',
    highlights: ['MBI validado', 'Relatório PDF', 'Dashboard'],
    path: '/burnout-dashboard',
  },
  {
    icon: ClipboardList,
    title: 'Pesquisas de Clima',
    description: 'Clima organizacional personalizado',
    highlights: ['NPS', 'Personalizável', 'Relatórios'],
    path: '/climate-dashboard',
  },
];

const SalesDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoStep, setDemoStep] = useState('');
  const navigate = useNavigate();
  const { user, session, role, isLoading: authLoading, profile, refreshRole } = useRealAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!session) { navigate('/auth'); return; }
      if (role && (role as string) !== 'sales' && role !== 'admin') { navigate('/'); return; }
      fetchCompanies();
    }
  }, [user, role, authLoading, navigate]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      if (!profile?.company_id) { setCompanies([]); setIsLoading(false); return; }

      const { data: companyData, error: companyError } = await supabase.from('companies').select('id, name, logo_url, slug, cnpj, email, phone, address').eq('id', profile.company_id).single();
      if (companyError) throw companyError;
      if (!companyData) { setCompanies([]); setIsLoading(false); return; }

      const [totalResult, newResult] = await Promise.all([
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('company_id', companyData.id),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('company_id', companyData.id).eq('status', 'pending'),
      ]);

      setCompanies([{ ...companyData, reportCount: totalResult.count || 0, newReports: newResult.count || 0 }]);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast({ title: "Erro ao carregar empresas", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProvisionDemo = async () => {
    setDemoLoading(true);
    setDemoProgress(5);
    setDemoStep('Iniciando criação da conta demo...');
    try {
      setDemoProgress(10);
      setDemoStep('Criando empresa demo...');
      const progressInterval = setInterval(() => {
        setDemoProgress(prev => {
          if (prev >= 85) { clearInterval(progressInterval); return prev; }
          return prev + (prev < 30 ? 5 : prev < 60 ? 3 : 1);
        });
        setDemoStep(prev => {
          if (prev.includes('Criando empresa')) return 'Gerando avaliações HSE-IT...';
          if (prev.includes('HSE-IT')) return 'Gerando avaliações de Burnout...';
          if (prev.includes('Burnout')) return 'Criando pesquisa de clima...';
          if (prev.includes('clima')) return 'Inserindo denúncias demo...';
          if (prev.includes('denúncias')) return 'Finalizando dados...';
          return prev;
        });
      }, 2000);

      const { data, error } = await supabase.functions.invoke('create-sales-demo', {});
      clearInterval(progressInterval);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDemoProgress(100);
      setDemoStep('Conta demo criada com sucesso!');
      await refreshRole();
      await fetchCompanies();
      toast({ title: 'Conta demo criada!', description: 'Todos os módulos estão prontos para demonstração.' });
    } catch (err: any) {
      toast({ title: 'Erro ao criar conta demo', description: err.message, variant: 'destructive' });
      setDemoProgress(0);
      setDemoStep('');
    } finally {
      setDemoLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company => company.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const hasDemoCompany = profile?.company_id && companies.length > 0;

  const copyToClipboard = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Link copiado!", description: "O link foi copiado para a área de transferência." });
    } catch {
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar o link.", variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const totalReports = companies.reduce((sum, c) => sum + c.reportCount, 0);
  const pendingReports = companies.reduce((sum, c) => sum + c.newReports, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-background">
        {/* Hero Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary py-12 md:py-16">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="audit-container relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-4">
                  <Shield className="h-4 w-4" />
                  <span>Painel Comercial</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Painel Comercial</h1>
                <p className="text-white/70 mt-1">Gerencie seus leads e acesse a conta demo</p>
              </div>
              {selectedCompany && (
                <Button variant="secondary" onClick={() => setSelectedCompany(null)} className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  Voltar para lista de empresas
                </Button>
              )}
            </div>

            {hasDemoCompany && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {[
                  { value: companies.length.toString(), label: 'Empresas', icon: Building2 },
                  { value: totalReports.toString(), label: 'Total Denúncias', icon: BarChart3 },
                  { value: pendingReports.toString(), label: 'Pendentes', icon: AlertCircle },
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
            )}
          </div>
        </section>

        <div className="audit-container py-8">
          <Tabs defaultValue="demo" className="space-y-8">
            <TabsList className="bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="demo" className="gap-1.5">
                <Building2 className="h-4 w-4" />Conta Demo
              </TabsTrigger>
              <TabsTrigger value="crm" className="gap-1.5">
                <Users className="h-4 w-4" />CRM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demo">
              {hasDemoCompany ? (
                <>
                  {/* Tools Section */}
                  <div className="mb-10">
                    <h2 className="text-2xl font-bold text-foreground mb-1">Suas Ferramentas</h2>
                    <p className="text-muted-foreground text-sm mb-6">Ferramentas disponíveis para demonstração</p>

                    <div className="grid md:grid-cols-3 gap-6">
                      {salesTools.map((tool, idx) => (
                        <Card
                          key={idx}
                          className="group cursor-pointer border border-border hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 animate-fade-in"
                          style={{ animationDelay: `${idx * 100 + 200}ms` }}
                          onClick={() => navigate(tool.path)}
                        >
                          <CardContent className="p-6">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
                              <tool.icon className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">{tool.title}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {tool.highlights.map((h, hIdx) => (
                                <span key={hIdx} className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">{h}</span>
                              ))}
                            </div>
                            <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                              Acessar <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {selectedCompany ? (
                    <EmbeddedDashboard companyId={selectedCompany} />
                  ) : (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-foreground">Portal de Ouvidoria</h2>
                        <p className="text-muted-foreground text-sm">Clique para acessar o canal de ouvidoria de cada empresa</p>
                      </div>

                      {companies.length > 1 && (
                        <div className="flex justify-end mb-4">
                          <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input placeholder="Buscar empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map((company, idx) => (
                          <Card
                            key={company.id}
                            className="overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer border border-border animate-fade-in"
                            style={{ animationDelay: `${idx * 80}ms` }}
                            onClick={() => setSelectedCompany(company.slug)}
                          >
                            <div className="relative">
                              {company.newReports > 0 && (
                                <div className="absolute top-3 right-3 z-10">
                                  <Badge className="bg-destructive text-destructive-foreground border-none shadow-lg animate-pulse">
                                    {company.newReports} {company.newReports === 1 ? 'nova' : 'novas'}
                                  </Badge>
                                </div>
                              )}
                              <div className="h-28 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 group-hover:from-primary/10 group-hover:to-secondary/10 transition-colors duration-500">
                                {company.logo_url ? (
                                  <img src={company.logo_url} alt={`Logo ${company.name}`} className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <div className="text-3xl font-bold text-primary/30 group-hover:text-primary/50 transition-colors">
                                    {company.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">{company.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="pb-2 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total de denúncias:</span>
                                <span className="font-semibold text-foreground">{company.reportCount}</span>
                              </div>
                              <div className="pt-2 border-t border-border space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">Canal de Denúncias:</p>
                                <div className="flex items-center gap-2">
                                  <a href={`${PUBLIC_BASE_URL}/report/${company.slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-1 flex-1 truncate">
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{PUBLIC_BASE_URL}/report/{company.slug}</span>
                                  </a>
                                  <Button variant="ghost" size="sm" onClick={(e) => copyToClipboard(`${PUBLIC_BASE_URL}/report/${company.slug}`, e)} className="h-6 px-2">
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <QRCodeDownloader url={`${PUBLIC_BASE_URL}/report/${company.slug}`} filename={`qrcode-${company.slug}.png`} size="sm" className="w-full" />
                              </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                              {company.newReports > 0 ? (
                                <div className="w-full py-2 text-sm flex items-center justify-center text-destructive bg-destructive/10 rounded-lg font-medium">
                                  <AlertCircle className="h-4 w-4 mr-1.5" /> Nova atividade detectada
                                </div>
                              ) : (
                                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  Ver dashboard
                                </Button>
                              )}
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : demoLoading || demoProgress > 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
                      <Rocket className="h-12 w-12 text-primary animate-bounce" />
                    </div>
                  </div>
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{demoStep}</span>
                      <span className="font-semibold">{demoProgress}%</span>
                    </div>
                    <Progress value={demoProgress} className="h-3" />
                    <p className="text-xs text-muted-foreground text-center">
                      Criando empresa, avaliações HSE-IT, Burnout, Pesquisa de Clima e denúncias demo...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="inline-flex p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl mb-6">
                    <Rocket className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Configurar Conta Demo</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    Crie uma empresa demo completa com dados de exemplo em todos os módulos.
                  </p>
                  <Button onClick={handleProvisionDemo} size="lg" className="gap-2 px-8">
                    <Rocket className="h-4 w-4" />Criar Conta Demo
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="crm">
              <SalesTeamTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SalesDashboard;
