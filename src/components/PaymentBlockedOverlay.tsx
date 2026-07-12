import React, { useEffect, useState } from 'react';
import { ShieldOff, LogOut, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealAuth } from '@/contexts/RealAuthContext';

const HOTMART_ACCOUNT_URL = 'https://consumer.hotmart.com';

const PaymentBlockedOverlay: React.FC = () => {
  const { signOut, refreshTrialStatus } = useRealAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { refreshTrialStatus(); }, 15000);
    return () => clearInterval(interval);
  }, [refreshTrialStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshTrialStatus(); } finally { setRefreshing(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-border shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldOff className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Acesso bloqueado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Para reativar sua conta regularize seu pagamento na Hotmart.
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => window.open(HOTMART_ACCOUNT_URL, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Regularizar na Hotmart
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Já paguei, atualizar status
          </Button>
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mx-auto"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentBlockedOverlay;
