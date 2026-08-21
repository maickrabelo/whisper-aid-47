import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSearch, ShieldCheck } from 'lucide-react';
import { useRealAuth } from '@/contexts/RealAuthContext';
import BetaBadge from '@/components/feature-flags/BetaBadge';
import BetaFeedbackButton from '@/components/feature-flags/BetaFeedbackButton';
import usePageSEO from '@/hooks/usePageSEO';

/**
 * Fase 1 — Fundação de Acesso.
 * Página inicial do módulo LTCAT (beta privado). O conteúdo funcional
 * (documentos, exposições, avaliações, PDF, S-2240) chega nas fases seguintes.
 */
const LTCATHub = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useRealAuth();

  usePageSEO({
    title: 'LTCAT — Beta Privado | SR SMS',
    description: 'Módulo LTCAT previdenciário em beta privado restrito.',
  });

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">LTCAT</h1>
              <BetaBadge label="BETA PRIVADO" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Laudo Técnico das Condições Ambientais do Trabalho — finalidade previdenciária
              (Decreto 3.048/99, Anexo IV) e preparação do estado do evento S-2240.
            </p>
          </div>
          <BetaFeedbackButton />
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Acesso beta confirmado</h2>
                <p className="text-sm text-muted-foreground">
                  Este módulo está restrito por controle de acesso no backend e no banco de dados.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground flex gap-3">
              <FileSearch className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">Funcionalidade em validação beta.</p>
                <p>
                  A fundação de acesso está concluída. Catálogo de agentes, motor jurídico versionado,
                  exposições ocupacionais, avaliações, matriz de coerência, pré-validador S-2240 e
                  emissão de PDF serão liberados nas próximas fases, após aprovação do Manifesto de
                  Regras Jurídicas.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Documentos gerados durante o beta serão identificados como
              <strong> “BETA — DOCUMENTO PARA VALIDAÇÃO INTERNA”</strong>.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default LTCATHub;
