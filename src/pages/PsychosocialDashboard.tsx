import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealAuth } from '@/contexts/RealAuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Brain, FileText, Loader2, Shield } from 'lucide-react';
import HSEITDashboardContent from '@/components/psychosocial/HSEITDashboardContent';
import COPSOQDashboardContent from '@/components/psychosocial/COPSOQDashboardContent';
import SoniaChat from '@/components/SoniaChat';
import { SoniaChatProvider, SoniaChatLayout } from '@/contexts/SoniaChatContext';

export default function PsychosocialDashboard() {
  const navigate = useNavigate();
  const { user, role, profile, isLoading: authLoading } = useRealAuth();
  const [activeTab, setActiveTab] = useState('hseit');

  useEffect(() => {
    if (!authLoading) {
      if (!user) { navigate('/auth'); return; }
      const r = role as string | null;
      if (!r || !['admin', 'sst', 'sales', 'company'].includes(r)) { navigate('/'); return; }
    }
  }, [user, role, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const r = role as string;
  const backPath = r === 'sales' ? '/sales-dashboard' : r === 'company' ? '/dashboard' : '/sst-dashboard';

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
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear_gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="container mx-auto px-4 relative z-10">
            <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="mb-4 gap-2 text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
            </Button>

            <div className="animate-fade-in">
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                <Brain className="h-8 w-8" />
                Avaliação de Riscos Psicossociais
              </h1>
              <p className="text-white/70 mt-2 max-w-2xl">
                Primeira IA de gestão de riscos psicossociais — ferramentas validadas internacionalmente
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <TabsTrigger value="hseit" className="gap-2">
                <Brain className="h-4 w-4" />
                HSE-IT
              </TabsTrigger>
              <TabsTrigger value="copsoq" className="gap-2">
                <FileText className="h-4 w-4" />
                COPSOQ II
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hseit">
              <HSEITDashboardContent />
            </TabsContent>

            <TabsContent value="copsoq">
              <COPSOQDashboardContent />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
    </SoniaChatLayout>
    <SoniaChat contextType="psychosocial" />
    </SoniaChatProvider>
  );
}
