import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NRFinesCalculator = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sst-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Calculadora de Multas NRs</h1>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <iframe
          src="https://nrmultas-rdd99rsf.manus.space"
          title="Calculadora de Multas NRs"
          className="w-full h-[calc(100vh-73px)] border-0"
          allow="clipboard-write"
        />
      </main>
    </div>
  );
};

export default NRFinesCalculator;
