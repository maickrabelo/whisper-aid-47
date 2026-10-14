import { useNavigate } from 'react-router-dom';
import { Loader2, Stethoscope, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePcmsoCompanies } from '@/hooks/usePcmsoAccess';

const PCMSOHub = () => {
  const navigate = useNavigate();
  const { companies, loading } = usePcmsoCompanies();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Stethoscope className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">PCMSO <Badge variant="secondary">BETA</Badge></h1>
            <p className="text-sm text-muted-foreground">Programa de Controle Médico de Saúde Ocupacional (NR-7)</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : companies.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma empresa liberada para o PCMSO na sua conta.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {companies.map((c) => (
              <Card key={c.company_id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-primary" /> {c.company_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {c.can_prepare && <Badge variant="outline">Preparação</Badge>}
                    {c.clinical_role && <Badge>Médico {c.clinical_role}</Badge>}
                    {!c.can_prepare && !c.clinical_role && <Badge variant="outline">Consulta</Badge>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/pcmso/empresa/${c.company_id}`)}>
                    Abrir <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PCMSOHub;
