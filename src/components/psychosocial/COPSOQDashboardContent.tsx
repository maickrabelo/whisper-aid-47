import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, FileText, BarChart3, Building2, Users, Eye, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodFilter, PeriodOption, getDateFromPeriod } from './PeriodFilter';
import PrintQuestionnaireButton from '@/components/PrintQuestionnaireButton';
import { PUBLIC_BASE_URL } from "@/lib/publicUrl";

interface COPSOQAssessment {
  id: string;
  title: string;
  description: string | null;
  company_id: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  companies: { name: string; slug: string };
  response_count?: number;
}

interface Company { id: string; name: string; }

export default function COPSOQDashboardContent() {
  const navigate = useNavigate();
  const { user, role, profile, isLoading: authLoading } = useRealAuth();
  const [assessments, setAssessments] = useState<COPSOQAssessment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('all');

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [user, role, authLoading, profile]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let assignedCompanyIds: string[] = [];
      const currentRole = role as string;

      if (currentRole === 'admin') {
        const { data } = await supabase.from('companies').select('id, name').order('name');
        setCompanies(data || []);
      } else if (currentRole === 'company' && profile?.id) {
        const { data: userCompanies } = await supabase
          .from('user_companies').select('company_id').eq('user_id', profile.id);
        assignedCompanyIds = userCompanies?.map(uc => uc.company_id) || [];
        if (assignedCompanyIds.length === 0 && profile.company_id) {
          assignedCompanyIds = [profile.company_id];
        }
        if (assignedCompanyIds.length > 0) {
          const { data } = await supabase.from('companies').select('id, name').in('id', assignedCompanyIds).order('name');
          setCompanies(data || []);
        }
      } else if ((currentRole === 'sst' || currentRole === 'sales') && profile?.id) {
        if (currentRole === 'sales' && profile?.company_id) {
          assignedCompanyIds = [profile.company_id];
          const { data } = await supabase.from('companies').select('id, name').eq('id', profile.company_id);
          setCompanies(data || []);
        } else {
          const { data: profileData } = await supabase.from('profiles').select('sst_manager_id').eq('id', profile!.id).single();
          if (profileData?.sst_manager_id) {
            const { data: assignments } = await supabase.from('company_sst_assignments').select('company_id').eq('sst_manager_id', profileData.sst_manager_id);
            assignedCompanyIds = assignments?.map(a => a.company_id) || [];
            if (assignedCompanyIds.length > 0) {
              const { data } = await supabase.from('companies').select('id, name').in('id', assignedCompanyIds).order('name');
              setCompanies(data || []);
            }
          }
        }
      }

      let assessmentsData: COPSOQAssessment[] = [];
      if (currentRole === 'admin') {
        const { data, error } = await supabase.from('copsoq_assessments' as any).select('*, companies(name, slug)').order('created_at', { ascending: false });
        if (error) throw error;
        assessmentsData = (data || []) as unknown as COPSOQAssessment[];
      } else if (assignedCompanyIds.length > 0) {
        const { data, error } = await supabase.from('copsoq_assessments' as any).select('*, companies(name, slug)').in('company_id', assignedCompanyIds).order('created_at', { ascending: false });
        if (error) throw error;
        assessmentsData = (data || []) as unknown as COPSOQAssessment[];
      }

      const assessmentIds = assessmentsData.map(a => a.id);
      if (assessmentIds.length > 0) {
        const { data: responseCounts } = await supabase.from('copsoq_responses' as any).select('assessment_id').in('assessment_id', assessmentIds).not('completed_at', 'is', null);
        const counts: Record<string, number> = {};
        (responseCounts as any[])?.forEach((r: any) => { counts[r.assessment_id] = (counts[r.assessment_id] || 0) + 1; });
        assessmentsData = assessmentsData.map(a => ({ ...a, response_count: counts[a.id] || 0 }));
      }

      setAssessments(assessmentsData);
    } catch (error) {
      console.error('Error fetching COPSOQ data:', error);
      toast({ title: 'Erro ao carregar dados', description: 'Não foi possível carregar as avaliações COPSOQ.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Link copiado!', description: 'O link foi copiado para a área de transferência.' });
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Excluir a avaliação "${title}"? Todas as respostas serão removidas. Esta ação é irreversível.`)) return;
    try {
      await supabase.from('copsoq_responses' as any).delete().eq('assessment_id', id);
      const { error } = await supabase.from('copsoq_assessments' as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Avaliação excluída', description: 'A avaliação foi removida com sucesso.' });
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      console.error('Error deleting COPSOQ assessment:', error);
      toast({ title: 'Erro ao excluir', description: error.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const filteredAssessments = assessments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === 'all' || a.company_id === selectedCompany;
    const periodDate = getDateFromPeriod(selectedPeriod);
    const matchesPeriod = !periodDate || new Date(a.created_at) >= periodDate;
    return matchesSearch && matchesCompany && matchesPeriod;
  });

  const activeCount = assessments.filter(a => a.is_active).length;
  const totalResponses = assessments.reduce((sum, a) => sum + (a.response_count || 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Avaliações COPSOQ II</h2>
          <p className="text-muted-foreground text-sm">Copenhagen Psychosocial Questionnaire — Versão Curta</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintQuestionnaireButton variant="copsoq" />
          <Button onClick={() => navigate('/copsoq/new')} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Avaliação
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {[
          { value: assessments.length, label: 'Total Avaliações', icon: FileText, gradient: 'from-primary/10 to-secondary/10', iconColor: 'text-primary' },
          { value: activeCount, label: 'Ativas', icon: BarChart3, gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-600' },
          { value: companies.length, label: 'Empresas', icon: Building2, gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-blue-600' },
          { value: totalResponses, label: 'Respostas', icon: Users, gradient: 'from-purple-500/10 to-violet-500/10', iconColor: 'text-purple-600' },
        ].map((stat, idx) => (
          <Card key={idx} className="border border-border hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por título ou empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <PeriodFilter value={selectedPeriod} onChange={setSelectedPeriod} />
            {companies.length > 0 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas empresas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas empresas</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <CardHeader><CardTitle>Avaliações COPSOQ II</CardTitle></CardHeader>
        <CardContent>
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex p-5 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl mb-4">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma avaliação encontrada</h3>
              <p className="text-muted-foreground mb-4">Crie uma nova avaliação COPSOQ II para começar.</p>
              <Button onClick={() => navigate('/copsoq/new')} className="gap-2"><Plus className="h-4 w-4" /> Nova Avaliação</Button>
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
                {filteredAssessments.map(a => {
                  const formUrl = `${PUBLIC_BASE_URL}/copsoq/${a.companies?.slug}/${a.id}`;
                  return (
                    <TableRow key={a.id} className="group">
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{a.companies?.name}</div></TableCell>
                      <TableCell>
                        {(() => {
                          const s = a.start_date ? new Date(a.start_date) : null;
                          const e = a.end_date ? new Date(a.end_date) : null;
                          const sOk = s && !isNaN(s.getTime());
                          const eOk = e && !isNaN(e.getTime());
                          if (sOk && eOk) {
                            return <span className="text-sm">{format(s!, 'dd/MM/yy', { locale: ptBR })} - {format(e!, 'dd/MM/yy', { locale: ptBR })}</span>;
                          }
                          return <span className="text-muted-foreground text-sm">Sem período</span>;
                        })()}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{a.response_count || 0} respostas</Badge></TableCell>
                      <TableCell><Badge variant={a.is_active ? 'default' : 'outline'}>{a.is_active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(formUrl)} title="Copiar link"><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => window.open(formUrl, '_blank')} title="Abrir formulário"><ExternalLink className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/copsoq/results/${a.id}`)} title="Ver resultados"><BarChart3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/copsoq/${a.id}`)} title="Editar"><Eye className="h-4 w-4" /></Button>
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
  );
}
