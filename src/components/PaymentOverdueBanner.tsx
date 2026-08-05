import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { useRealAuth } from '@/contexts/RealAuthContext';

const HOTMART_ACCOUNT_URL = 'https://consumer.hotmart.com';

const PaymentOverdueBanner: React.FC = () => {
  const { paymentStatus, daysOverdue, refreshTrialStatus } = useRealAuth();
  const [refreshing, setRefreshing] = useState(false);

  if (paymentStatus !== 'overdue_warning' && paymentStatus !== 'overdue_critical') return null;

  const isCritical = paymentStatus === 'overdue_critical';
  const daysUntilBlock = Math.max(0, 3 - daysOverdue);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshTrialStatus(); } finally { setRefreshing(false); }
  };

  const bg = isCritical
    ? 'bg-destructive text-destructive-foreground'
    : 'bg-yellow-500 text-yellow-950';

  return (
    <div className={`fixed top-0 left-0 right-0 z-[90] ${bg} shadow-md`}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {isCritical ? (
            <span>
              Regularize o pagamento do seu plano. Seu acesso será congelado em{' '}
              <strong>{daysUntilBlock} {daysUntilBlock === 1 ? 'dia' : 'dias'}</strong>.
            </span>
          ) : (
            <span>Pagamento em atraso, verifique sua conta da Hotmart.</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={HOTMART_ACCOUNT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline hover:no-underline font-medium"
          >
            Ir para Hotmart <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 underline hover:no-underline disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Já paguei
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentOverdueBanner;
