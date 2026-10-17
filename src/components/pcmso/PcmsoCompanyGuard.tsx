import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { usePcmsoCan } from '@/hooks/usePcmsoAccess';

interface PcmsoCompanyGuardProps {
  children: React.ReactNode;
}

/**
 * Protege uma empresa específica usando a autorização central do backend.
 * A tela protegida só é montada após pcmso_can confirmar a flag, o vínculo
 * com a empresa e a ação program.view.
 */
const PcmsoCompanyGuard = ({ children }: PcmsoCompanyGuardProps) => {
  const { companyId } = useParams<{ companyId: string }>();
  const { allowed, loading } = usePcmsoCan(companyId, 'program.view');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando autorização" />
      </div>
    );
  }

  if (!allowed) return <NotFound />;

  return <>{children}</>;
};

export default PcmsoCompanyGuard;
