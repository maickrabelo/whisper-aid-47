import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { supabase } from '@/integrations/supabase/client';
import { usePcmsoCan } from '@/hooks/usePcmsoAccess';

interface PcmsoProgramGuardProps {
  children: React.ReactNode;
}

interface ProgramScope {
  company_id: string;
}

const PcmsoProgramGuard = ({ children }: PcmsoProgramGuardProps) => {
  const { programId } = useParams<{ programId: string }>();
  const [program, setProgram] = useState<ProgramScope | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const permission = usePcmsoCan(program?.company_id, 'program.view');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!programId) {
        setFailed(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('pcmso_programs')
        .select('company_id')
        .eq('id', programId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data?.company_id) {
        setProgram(null);
        setFailed(true);
      } else {
        setProgram(data as ProgramScope);
        setFailed(false);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [programId]);

  if (loading || (program && permission.loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Validando autorização" />
      </div>
    );
  }

  if (failed || !program || !permission.allowed) return <NotFound />;

  return <>{children}</>;
};

export default PcmsoProgramGuard;
