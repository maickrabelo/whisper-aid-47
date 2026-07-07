import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Check, Loader2, ExternalLink, Copy, FileImage, FileVideo, FileAudio, File, Download, GraduationCap, Brain, Flame, ClipboardList, Activity, ClipboardCheck } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/contexts/RealAuthContext";
import { supabase } from "@/integrations/supabase/client";
import AIAnalysisCard from '@/components/AIAnalysisCard';
import HSEITParticipationCard from '@/components/HSEITParticipationCard';
import SoniaChat from '@/components/SoniaChat';
import { SoniaChatProvider, SoniaChatLayout } from '@/contexts/SoniaChatContext';
import TrackReportModal from '@/components/TrackReportModal';
import DownloadReportButton from '@/components/DownloadReportButton';
import { QRCodeDownloader } from "@/components/QRCodeDownloader";
import TrialBanner from '@/components/TrialBanner';
import TrialExpiredOverlay from '@/components/TrialExpiredOverlay';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useCompanyHasSST } from '@/hooks/useCompanyHasSST';
import OnboardingTour, { TourStep } from '@/components/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAEPBetaAccess } from '@/hooks/useAEPBetaAccess';

const COLORS = ['#0F3460', '#1A97B9', '#1E6F5C', '#D32626', '#E97E00', '#777777'];

const Dashboard = ({ embeddedCompanyId, hideNavigation }: { embeddedCompanyId?: string; hideNavigation?: boolean } = {}) => {
  const { id: urlCompanyParam } = useParams();
  const { profile, role, isTrialExpired, trialEndsAt } = useRealAuth();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [trainingsCount, setTrainingsCount] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { features } = useCompanyFeatures(companyId);
  const { hasSST } = useCompanyHasSST(companyId);
  const { shouldShowTour, completeTour } = useOnboarding('company-dashboard');
  const { allowed: aepAllowed } = useAEPBetaAccess();

  const companyTourSteps: TourStep[] = [
    { targetId: 'company-tour-anchor', title: 'Bem-vinda à SOIA! 🎉', description: 'Você tem 7 dias para testar a plataforma. Vamos te mostrar as principais ferramentas.', position: 'bottom' },
    { targetId: 'company-tool-ouvidoria', title: 'Canal de Ouvidoria', description: 'Receba denúncias anônimas dos seus colaboradores com total sigilo. Compartilhe o link ou QR code.', position: 'bottom' },
    { targetId: 'company-tool-psicossocial', title: 'Riscos Psicossociais (NR-01)', description: 'Aplique avaliações HSE-IT e COPSOQ II para identificar e tratar riscos psicossociais conforme a NR-01.', position: 'bottom' },
    { targetId: 'company-tool-burnout', title: 'Avaliação de Burnout', description: 'Mensure o nível de esgotamento da sua equipe com instrumentos científicos validados.', position: 'bottom' },
    { targetId: 'company-tool-clima', title: 'Pesquisa de Clima', description: 'Avalie o clima organizacional e descubra oportunidades de melhoria.', position: 'top' },
    { targetId: 'company-tool-treinamentos', title: 'Treinamentos', description: 'Acesse módulos educativos para capacitar sua equipe.', position: 'top' },
  ];

  // SST managers visiting /dashboard directly should be sent to their SST dashboard
  useEffect(() => {
    if (!hideNavigation && !embeddedCompanyId && !urlCompanyParam && role === 'sst') {
      navigate('/sst-dashboard', { replace: true });
    } else if (!hideNavigation && !embeddedCompanyId && !urlCompanyParam && role === 'admin') {
      navigate('/master-dashboard', { replace: true });
    }
  }, [role, embeddedCompanyId, urlCompanyParam, hideNavigation, navigate]);

  useEffect(() => {
    const initCompanyId = async () => {
      const fetchCompanyId = async (identifier: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(identifier);
        
        try {
          let query = supabase.from('companies').select('id, slug');
          
          if (isUuid) {
            query = query.eq('id', identifier);
          } else {
            query = query.eq('slug', identifier);
          }
          
          const { data: company, error } = await query.maybeSingle();
          
          if (error) throw error;
          return company ? { id: company.id, slug: company.slug } : null;
        } catch (error) {
          console.error('Error fetching company:', error);
          return null;
        }
      };

      let found = false;

      if (embeddedCompanyId) {
        const result = await fetchCompanyId(embeddedCompanyId);
        if (result) {
          setCompanyId(result.id);
          setCompanySlug(result.slug);
          found = true;
        }
      } else if (urlCompanyParam) {
        const result = await fetchCompanyId(urlCompanyParam);
        if (result) {
          setCompanyId(result.id);
          setCompanySlug(result.slug);
          found = true;
        }
      } else if (profile?.company_id) {
        const result = await fetchCompanyId(profile.company_id);
        if (result) {
          setCompanyId(result.id);
          setCompanySlug(result.slug);
          found = true;
        }
      }

      // If no company found, stop loading
      if (!found) {
        setIsLoading(false);
      }
    };

    initCompanyId();
  }, [embeddedCompanyId, urlCompanyParam, profile?.company_id]);

  useEffect(() => {
    if (companyId) {
      loadDashboardData();
      // count available trainings for this company
      (async () => {
        const { data: access } = await supabase
          .from('sst_training_company_access')
          .select('module_id')
          .eq('company_id', companyId);
        setTrainingsCount(access?.length ?? 0);
      })();
    }
  }, [companyId]);

  const loadDashboardData = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      // Fetch all reports for the company
      const { data: reportsData, error } = await supabase
        .from('reports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(reportsData || []);

      // Calculate stats
      const total = reportsData?.length || 0;
      const pending = reportsData?.filter(r => r.status === 'pending').length || 0;
      const inProgress = reportsData?.filter(r => r.status === 'in_progress').length || 0;
      const resolved = reportsData?.filter(r => r.status === 'resolved').length || 0;

      setStats({ total, pending, inProgress, resolved });

      // Calculate monthly data (last 12 months)
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthCounts: { [key: string]: number } = {};
      
      reportsData?.forEach(report => {
        const date = new Date(report.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });

      const currentDate = new Date();
      const monthly = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (11 - i), 1);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        return {
          name: monthNames[date.getMonth()],
          denuncias: monthCounts[monthKey] || 0
        };
      });

      setMonthlyData(monthly);

      // Calculate department data
      const deptCounts: { [key: string]: number } = {};
      reportsData?.forEach(report => {
        const dept = report.department || 'Outros';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const deptData = Object.entries(deptCounts).map(([name, value]) => ({ name, value }));
      setDepartmentData(deptData);

      // Calculate status data
      const statusCounts = {
        'Pendentes': pending,
        'Em análise': inProgress,
        'Resolvidas': resolved,
      };

      const statusArr = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      setStatusData(statusArr);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReportDetails = async (report: any) => {
    // Fetch report updates
    const { data: updates } = await supabase
      .from('report_updates')
      .select('*')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true });

    // Fetch report attachments
    const { data: attachments } = await supabase
      .from('report_attachments')
      .select('*')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true });

    setSelectedReport({
      ...report,
      updates: updates || [],
      attachments: attachments || []
    });
    setSelectedStatus(report.status);
    setIsDialogOpen(true);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (type.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('report-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Erro ao baixar arquivo",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedReport) return;

    // Validar se há mudança de status ou texto
    const hasStatusChange = selectedStatus !== selectedReport.status;
    const hasNotes = responseText.trim().length > 0;

    if (!hasStatusChange && !hasNotes) {
      toast({
        variant: "destructive",
        title: "Nenhuma alteração",
        description: "Altere o status ou adicione uma nota para salvar.",
      });
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Updating report:', {
        report_id: selectedReport.id,
        old_status: selectedReport.status,
        new_status: selectedStatus,
        user_id: user.id,
        company_id: companyId,
        has_notes: hasNotes
      });

      // Insert new update only if there's a status change or notes
      if (hasStatusChange || hasNotes) {
        const updateData: any = {
          report_id: selectedReport.id,
          user_id: user.id,
          old_status: selectedReport.status,
          new_status: selectedStatus,
        };

        // Only add notes if they exist
        if (hasNotes) {
          updateData.notes = responseText;
        } else {
          updateData.notes = `Status alterado de ${selectedReport.status} para ${selectedStatus}`;
        }

        const { error: updateError } = await supabase
          .from('report_updates')
          .insert(updateData);

        if (updateError) {
          console.error('Error inserting update:', updateError);
          throw updateError;
        }
      }

      // Update report status if changed
      if (hasStatusChange) {
        console.log('Updating report status to:', selectedStatus);
        const { error: statusError } = await supabase
          .from('reports')
          .update({ status: selectedStatus })
          .eq('id', selectedReport.id);

        if (statusError) {
          console.error('Error updating status:', statusError);
          throw statusError;
        }
      }

      toast({
        title: "Atualização salva",
        description: "A denúncia foi atualizada com sucesso.",
      });

      setResponseText("");
      setIsDialogOpen(false);
      loadDashboardData(); // Reload data
    } catch (error: any) {
      console.error('Error in handleSubmitResponse:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar a denúncia."
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendente',
      'in_progress': 'Em análise',
      'resolved': 'Resolvida',
      'archived': 'Arquivada'
    };

    const displayStatus = statusMap[status] || status;

    switch (status) {
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">{displayStatus}</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{displayStatus}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{displayStatus}</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{displayStatus}</Badge>;
      default:
        return <Badge variant="outline">{displayStatus}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap: { [key: string]: string } = {
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa'
    };

    const displayUrgency = urgencyMap[urgency] || urgency;

    switch (urgency) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 border-red-300">{displayUrgency}</Badge>;
      case 'medium':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">{displayUrgency}</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800 border-green-300">{displayUrgency}</Badge>;
      default:
        return <Badge variant="outline">{displayUrgency}</Badge>;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return hideNavigation ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-audit-primary" />
      </div>
    ) : (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-audit-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!companyId) {
    return hideNavigation ? (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p>Nenhuma empresa vinculada a esta conta.</p>
      </div>
    ) : (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-gray-50 py-8 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Nenhuma empresa vinculada a esta conta.</p>
            <p className="text-sm text-muted-foreground">Para acessar o dashboard demo, vincule uma empresa ao seu perfil.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const dashboardContent = (
    <>
      {isTrialExpired && <TrialExpiredOverlay category="company" />}
      {!isTrialExpired && trialEndsAt && <TrialBanner trialEndsAt={trialEndsAt} />}
      {!isTrialExpired && <ProfileCompletionBanner companyId={companyId} />}
      <div className="flex justify-between items-start mb-8 gap-6">
        <div className="flex-1">
          <h1 id="company-tour-anchor" className="text-3xl font-bold text-audit-primary mb-2">Dashboard</h1>
          
          {features.ouvidoria && companySlug && (
            <div id="company-tool-ouvidoria" className="mt-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="border-l-4 border-primary bg-primary/5 p-3 rounded-r-md">
                <p className="text-sm font-semibold text-primary mb-1">📢 Compartilhe com seus colaboradores</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Divulgue o <strong>link</strong> e o <strong>QR Code</strong> abaixo para todos os colaboradores da sua empresa.
                  Por meio deles, qualquer colaborador poderá acessar o <strong>canal de ouvidoria anônimo</strong> e registrar
                  reclamações, denúncias ou sugestões com total sigilo. Todas as manifestações recebidas aparecerão
                  automaticamente no <strong>dashboard abaixo</strong> para sua análise e tratamento.
                </p>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Canal de Denúncias:</p>
              <div className="flex items-center gap-2">
                <a 
                  href={`${PUBLIC_BASE_URL}/report/${companySlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 flex-1 truncate"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{window.location.origin}/report/{companySlug}</span>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${PUBLIC_BASE_URL}/report/${companySlug}`)}
                  className="h-8 px-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <QRCodeDownloader
                url={`${PUBLIC_BASE_URL}/report/${companySlug}`}
                filename={`qrcode-${companySlug}.png`}
                size="sm"
              />
            </div>
          )}
        </div>
        {features.ouvidoria && (
          <div className="flex gap-4">
            <DownloadReportButton />
            <TrackReportModal />
          </div>
        )}
      </div>

      {/* Suas Ferramentas — only when company has no SST manager assigned */}
      {hasSST === false && (features.psicossocial || features.burnout || features.clima) && (
        <div className="mb-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-3">Suas Ferramentas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.psicossocial && (
              <Card
                id="company-tool-psicossocial"
                className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                onClick={() => navigate('/psychosocial-dashboard')}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Riscos Psicossociais</h3>
                    <p className="text-sm text-muted-foreground">HSE-IT e COPSOQ II</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {features.burnout && (
              <Card
                id="company-tool-burnout"
                className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                onClick={() => navigate('/burnout-dashboard')}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Flame className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Avaliação de Burnout</h3>
                    <p className="text-sm text-muted-foreground">Risco de esgotamento</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {features.clima && (
              <Card
                id="company-tool-clima"
                className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                onClick={() => navigate('/climate-dashboard')}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Pesquisa de Clima</h3>
                    <p className="text-sm text-muted-foreground">Clima organizacional</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card
              id="company-tool-pulse"
              className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
              onClick={() => navigate('/pulse-survey')}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Pulse Survey</h3>
                  <p className="text-sm text-muted-foreground">Avaliações periódicas curtas</p>
                </div>
              </CardContent>
            </Card>
            {aepAllowed && companyId && (
              <Card
                id="company-tool-aep"
                className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                onClick={() => navigate(`/aep/${companyId}`)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">AEP — Avaliação Ergonômica</h3>
                    <p className="text-sm text-muted-foreground">NR-17 · Alimenta o PGR</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {features.ouvidoria_smart && (
              <Card
                id="company-tool-ouvidoria-smart"
                className="cursor-pointer hover:shadow-lg hover:border-amber-500/60 transition-all border-amber-500/30"
                onClick={() => navigate('/ouvidoria-beta/painel')}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">Ouvidoria Smart</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Canal anônimo da sua empresa</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Ouvidoria Smart — sempre visível quando habilitada, independente de ter gestora SST */}
      {features.ouvidoria_smart && hasSST === true && (
        <div className="mb-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-3">Canal de Denúncias</h2>
          <Card
            id="company-tool-ouvidoria-smart"
            className="cursor-pointer hover:shadow-lg hover:border-amber-500/60 transition-all border-amber-500/30 max-w-md"
            onClick={() => navigate('/ouvidoria-beta/painel')}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Ouvidoria Smart</h3>
                <p className="text-sm text-muted-foreground">Canal anônimo da sua empresa</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Treinamentos card */}
      {features.treinamentos && (
        <Card
          id="company-tool-treinamentos"
          className={`mb-6 transition-all ${trainingsCount > 0 ? 'cursor-pointer hover:shadow-lg hover:border-primary/40' : 'opacity-60'}`}
          onClick={() => trainingsCount > 0 && navigate('/empresa/treinamentos')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Treinamentos</h3>
              <p className="text-sm text-muted-foreground">
                {trainingsCount > 0
                  ? `${trainingsCount} ${trainingsCount === 1 ? 'módulo disponível' : 'módulos disponíveis'} pela sua gestora SST`
                  : 'Aguardando conteúdo da sua gestora SST'}
              </p>
            </div>
            {trainingsCount > 0 && (
              <Button variant="outline" size="sm">Acessar</Button>
            )}
          </CardContent>
        </Card>
      )}
          
      {features.ouvidoria && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Total de Denúncias", value: stats.total.toString(), color: "bg-audit-primary" },
            { title: "Denúncias Pendentes", value: stats.pending.toString(), color: "bg-audit-secondary" },
            { title: "Em Análise", value: stats.inProgress.toString(), color: "bg-audit-accent" },
            { title: "Resolvidas", value: stats.resolved.toString(), color: "bg-green-600" },
          ].map((stat, idx) => (
            <Card key={idx} className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div className="text-3xl font-bold">{stat.value}</div>
                </div>
                <div className={`h-1 w-full mt-4 ${stat.color} rounded-full`}></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {features.psicossocial && <HSEITParticipationCard companyId={companyId} />}
      
      {features.ouvidoria && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList className="grid grid-cols-3 mb-4 w-full max-w-md">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="departments">Departamentos</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Denúncias por Mês</CardTitle>
                  <CardDescription>Distribuição de denúncias ao longo do último ano</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="denuncias" stroke="#0F3460" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="departments" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Denúncias por Departamento</CardTitle>
                  <CardDescription>Distribuição do total de denúncias por área</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={departmentData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Denúncias">
                          {departmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="status" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Status das Denúncias</CardTitle>
                  <CardDescription>Distribuição do status atual das denúncias</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <AIAnalysisCard />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Denúncias Recentes</CardTitle>
          <CardDescription>
            Últimas denúncias registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Título</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Urgência</th>
                  <th className="px-4 py-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma denúncia registrada ainda
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-4 text-audit-primary font-medium">{report.tracking_code}</td>
                      <td className="px-4 py-4">{report.title}</td>
                      <td className="px-4 py-4">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                          {report.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(report.status)}</td>
                      <td className="px-4 py-4">{new Date(report.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-4">{getUrgencyBadge(report.urgency)}</td>
                      <td className="px-4 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReportDetails(report)}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedReport && (
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                <span>{selectedReport.title}</span>
                {getStatusBadge(selectedReport.status)}
              </DialogTitle>
              <DialogDescription className="flex justify-between text-sm">
                <span>{selectedReport.tracking_code} • Departamento: {selectedReport.department || 'N/A'}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(selectedReport.created_at).toLocaleDateString('pt-BR')}
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 my-4 overflow-y-auto flex-1 pr-2">
              <div>
                <h3 className="font-medium mb-2">Resumo da Denúncia (IA)</h3>
                <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-200">
                  {selectedReport.ai_summary || selectedReport.description}
                </p>
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const transcriptDialog = document.getElementById('transcript-dialog') as HTMLDialogElement;
                    if (transcriptDialog) transcriptDialog.showModal();
                  }}
                  className="w-full"
                >
                  Ver Transcrição Completa
                </Button>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Informações Adicionais</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-600">Categoria:</span>
                    <p className="font-medium mt-1">{selectedReport.category}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-600">Urgência:</span>
                    <p className="font-medium mt-1 flex items-center gap-2">
                      {getUrgencyBadge(selectedReport.urgency)}
                    </p>
                  </div>
                  {selectedReport.reporter_name && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-600">Denunciante:</span>
                      <p className="font-medium mt-1">{selectedReport.reporter_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Anexos ({selectedReport.attachments.length})</h3>
                  <div className="space-y-2">
                    {selectedReport.attachments.map((attachment: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(attachment.file_type)}
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.file_type.split('/')[0]} • {(attachment.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-medium mb-3">Histórico de Atualizações</h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  {selectedReport.updates?.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma atualização ainda</p>
                  ) : (
                    selectedReport.updates?.map((update: any, idx: number) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-5 h-5 bg-audit-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-gray-700">{update.notes}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {update.old_status !== update.new_status && `Status alterado: ${update.old_status} → ${update.new_status}`}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(update.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Alterar Status</h3>
                <Select 
                  value={selectedStatus} 
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em análise</SelectItem>
                    <SelectItem value="resolved">Resolvida</SelectItem>
                    <SelectItem value="archived">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Adicionar Atualização (Opcional)</h3>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Adicione uma atualização ou comentário (opcional)..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Você pode salvar apenas alterando o status, sem adicionar uma nota.
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitResponse}
                disabled={selectedStatus === selectedReport.status && !responseText.trim()}
              >
                <Check className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Transcript Dialog */}
      <dialog 
        id="transcript-dialog"
        className="p-0 rounded-lg shadow-xl backdrop:bg-black/50 max-w-3xl w-full"
      >
        <div className="bg-white rounded-lg">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Transcrição Completa da Conversa</h3>
            <p className="text-sm text-gray-500 mt-1">Registro completo da interação com a ouvidoria</p>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {selectedReport?.description}
            </pre>
          </div>
          <div className="p-6 border-t flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                const transcriptDialog = document.getElementById('transcript-dialog') as HTMLDialogElement;
                if (transcriptDialog) transcriptDialog.close();
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );

  if (hideNavigation) {
    return (
      <div className="bg-gray-50 py-8">
        <div className="audit-container">
          {dashboardContent}
        </div>
      </div>
    );
  }

  return (
    <SoniaChatProvider>
    <SoniaChatLayout>
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="audit-container">
          {dashboardContent}
        </div>
      </main>
      <Footer />
      {shouldShowTour && hasSST === false && (
        <OnboardingTour steps={companyTourSteps} onComplete={() => completeTour()} />
      )}
    </div>
    </SoniaChatLayout>
    <SoniaChat companyId={companyId} contextType="dashboard" />
    </SoniaChatProvider>
  );
};

export default Dashboard;
