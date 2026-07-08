import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { useCompanyHasSST } from '@/hooks/useCompanyHasSST';
import Navbar from '@/components/Navbar';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  TrendingUp,
  Wallet,
  Receipt,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SMS_UPGRADE_URL = 'https://prgnovoplano.manus.space/';

const formatBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

const formatBRLValue = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  RECEIVED: { label: 'Pago', variant: 'default' },
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  PENDING: { label: 'Pendente', variant: 'secondary' },
  OVERDUE: { label: 'Vencido', variant: 'destructive' },
  REFUNDED: { label: 'Reembolsado', variant: 'outline' },
  RECEIVED_IN_CASH: { label: 'Pago', variant: 'default' },
};

const BILLING_LABEL: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão',
  UNDEFINED: '—',
};

const CYCLE_LABEL: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  annual: 'Anual',
};

export default function Financeiro() {
  const navigate = useNavigate();
  const { user, role, profile, isLoading: authLoading } = useRealAuth();
  const { hasSST: companyHasSST, loading: sstLoading } = useCompanyHasSST((profile as any)?.company_id ?? null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    // Bloqueia cliente final gerido por gestora SST — quem paga é a gestora
    if (!authLoading && !sstLoading && user && role === 'company' && companyHasSST) {
      toast.error('O painel financeiro é gerenciado pela sua consultoria SST.');
      navigate('/dashboard');
    }
  }, [authLoading, sstLoading, user, role, companyHasSST, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: res, error } = await supabase.functions.invoke('asaas-list-payments');
        if (error) throw error;
        if (res?.error) throw new Error(res.error);
        setData(res);
      } catch (e: any) {
        console.error(e);
        toast.error('Erro ao carregar dados financeiros: ' + (e.message || ''));
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  const sub = data?.subscription;
  const plan = sub?.subscription_plans;
  const payments: any[] = data?.payments || [];
  const lastPaid = data?.lastPaid;
  const daysUntilNext: number | null = data?.daysUntilNext;
  const isSmsPlan = !!plan?.slug?.toLowerCase().includes('sms');

  const handleUpgradeClick = () => {
    if (isSmsPlan) {
      setSmsDialogOpen(true);
    } else {
      navigate('/contratar');
    }
  };

  // Tempo de assinatura vigente
  const subStart = sub?.current_period_start || sub?.created_at;
  const monthsActive = subStart
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(subStart).getTime()) / (1000 * 60 * 60 * 24 * 30))
      )
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            Financeiro
          </h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe sua assinatura, pagamentos e faça upgrade do seu plano.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid md:grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !sub ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma assinatura encontrada</h3>
              <p className="text-muted-foreground mb-6">
                Você ainda não possui uma assinatura ativa. Escolha um plano para começar.
              </p>
              <Button onClick={() => navigate('/contratar')}>
                Ver planos disponíveis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Plano Ativo */}
            <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Plano Ativo
                    </CardDescription>
                    <CardTitle className="text-2xl mt-1">
                      {plan?.name || '—'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cobrança {CYCLE_LABEL[sub.billing_cycle] || sub.billing_cycle} ·{' '}
                      <span className="font-semibold text-foreground">
                        {formatBRL(sub.amount_cents)}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status === 'active' ? 'Ativa' : sub.status}
                    </Badge>
                    <Button onClick={handleUpgradeClick} className="gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Fazer upgrade
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Métricas */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
                    <Clock className="h-3.5 w-3.5" />
                    Tempo de assinatura
                  </div>
                  <div className="text-2xl font-bold">
                    {monthsActive !== null ? `${monthsActive} ${monthsActive === 1 ? 'mês' : 'meses'}` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desde {formatDate(subStart)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Último pagamento
                  </div>
                  <div className="text-2xl font-bold">
                    {lastPaid ? formatDate(lastPaid.paymentDate || lastPaid.clientPaymentDate) : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lastPaid ? formatBRLValue(lastPaid.value) : 'Sem registros'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Próximo pagamento
                  </div>
                  <div className="text-2xl font-bold">
                    {daysUntilNext !== null && daysUntilNext >= 0
                      ? `${daysUntilNext} ${daysUntilNext === 1 ? 'dia' : 'dias'}`
                      : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sub.next_charge_date ? formatDate(sub.next_charge_date) : 'Aguardando'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Valor da próxima
                  </div>
                  <div className="text-2xl font-bold">
                    {formatBRL(sub.amount_cents)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {CYCLE_LABEL[sub.billing_cycle] || sub.billing_cycle}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Extrato de Cobranças */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Extrato de Cobranças
                </CardTitle>
                <CardDescription>
                  Histórico completo de pagamentos da sua assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma cobrança registrada ainda.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Forma</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p) => {
                          const st = STATUS_LABEL[p.status] || { label: p.status, variant: 'outline' as const };
                          return (
                            <TableRow key={p.id}>
                              <TableCell>{formatDate(p.dueDate)}</TableCell>
                              <TableCell>{formatDate(p.paymentDate || p.clientPaymentDate)}</TableCell>
                              <TableCell className="font-medium">{formatBRLValue(p.value)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {BILLING_LABEL[p.billingType] || p.billingType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={st.variant}>{st.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {p.invoiceUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="gap-1"
                                  >
                                    <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                      Fatura <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <AlertDialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade do plano Sr. SMS</AlertDialogTitle>
            <AlertDialogDescription>
              Para fazer upgrade do seu plano Sr. SMS, você será direcionado para a
              nossa página de vendas. Lá um consultor irá ajudá-lo a escolher a melhor
              opção para o seu negócio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(SMS_UPGRADE_URL, '_blank', 'noopener,noreferrer');
                setSmsDialogOpen(false);
              }}
            >
              Continuar para vendas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
