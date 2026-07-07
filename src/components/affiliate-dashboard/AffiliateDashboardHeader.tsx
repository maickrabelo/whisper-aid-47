import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AffiliateDashboardHeaderProps {
  affiliate: {
    nome_completo: string;
    referral_code: string;
  };
}

export const AffiliateDashboardHeader = ({ affiliate }: AffiliateDashboardHeaderProps) => {
  const [copied, setCopied] = useState(false);

  const referralLink = `${PUBLIC_BASE_URL}/checkout?ref=${affiliate.referral_code}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
      <div className="flex items-center gap-4">
        <img src="/lovable-uploads/Logo_SOIA.png" alt="SOIA" className="h-10 w-auto" />
        <div className="h-8 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{affiliate.nome_completo}</h1>
          <p className="text-sm text-muted-foreground">
            Código de indicação: <span className="font-mono font-medium text-primary">{affiliate.referral_code}</span>
          </p>
        </div>
      </div>

      <Button variant="outline" onClick={copyToClipboard} className="gap-2">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        Copiar Link de Indicação
      </Button>
    </div>
  );
};
