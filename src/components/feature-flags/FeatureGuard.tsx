import React from 'react';
import { Loader2 } from 'lucide-react';
import NotFound from '@/pages/NotFound';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface Props {
  featureKey: string;
  companyId?: string | null;
  children: React.ReactNode;
}

/**
 * Guarda de rota por feature flag.
 * Decide ANTES de renderizar o conteúdo protegido — nada do módulo é montado
 * (e nenhuma consulta é feita) sem autorização confirmada pelo backend.
 * Sem acesso → 404 padrão do projeto.
 */
export const FeatureGuard: React.FC<Props> = ({ featureKey, companyId, children }) => {
  const { allowed, loading } = useFeatureAccess(featureKey, companyId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) return <NotFound />;

  return <>{children}</>;
};

export default FeatureGuard;
