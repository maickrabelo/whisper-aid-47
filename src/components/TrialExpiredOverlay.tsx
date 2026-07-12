import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, LogOut, Check, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSmsPlan } from '@/hooks/useSmsPlan';

const SMS_UPGRADE_URL = 'https://pay.hotmart.com/Y106371701W?off=cxxuc6kw&checkoutMode=6';

type Cycle = 'monthly' | 'quarterly' | 'annual';
type Category = 'company' | 'manager';

interface Plan {
  id: string;
  slug: string;
  name: string;
  category: Category;
  tier: string;
  max_companies: number | null;
  max_cnpjs: number | null;
  max_employees: number | null;
  price_monthly_cents: number | null;
  price_quarterly_cents: number | null;
  price_annual_cents: number | null;
  is_custom_quote: boolean;
  features: string[];
  display_order: number;
}

const cycleLabels: Record<Cycle, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral (3x)',
  annual: 'Anual (12x)',
};

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface TrialExpiredOverlayProps {
  category?: Category;
}

const TrialExpiredOverlay: React.FC<TrialExpiredOverlayProps> = ({ category: categoryProp }) => {
  const navigate = useNavigate();
  const { signOut, role, user, refreshTrialStatus } = useRealAuth();
  const { isSmsPlan, isLoading: smsLoading } = useSmsPlan();
  const category: Category = categoryProp ?? (role === 'sst' ? 'manager' : 'company');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<Cycle>('annual');
  const [trialPlanInfo, setTrialPlanInfo] = useState<{ name: string; redirectUrl: string | null } | null>(null);
  const [checkingTrialPlan, setCheckingTrialPlan] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Poll trial status while overlay is mounted — auto-unblocks after payment webhook lands.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTrialStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshTrialStatus]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTrialStatus();
    } finally {
      setRefreshing(false);
    }
  };


  // Detect if user's current plan is a trial-only plan (e.g. Teste SMS) → show simple popup
  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setCheckingTrialPlan(false);
        return;
      }
      const { data } = await (supabase as any)
        .from('subscriptions')
        .select('subscription_plans!inner(name, trial_days, trial_redirect_url)')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const plan = (data as any)?.subscription_plans;
      if (plan?.trial_days && plan?.trial_redirect_url) {
        setTrialPlanInfo({ name: plan.name, redirectUrl: plan.trial_redirect_url });
      }
      setCheckingTrialPlan(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (trialPlanInfo) return; // Skip loading plan grid if we'll show simple popup
    (async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('display_order' as any);
      const formatted = (data ?? []).map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : [],
      }));
      setPlans(formatted as Plan[]);
      setLoading(false);
    })();
  }, [category, trialPlanInfo]);


  const getPrice = (plan: Plan): number | null => {
    if (plan.is_custom_quote) return null;
    return cycle === 'annual'
      ? plan.price_annual_cents
      : cycle === 'quarterly'
        ? plan.price_quarterly_cents
        : plan.price_monthly_cents;
  };

  const getSavings = (plan: Plan): number | null => {
    if (plan.is_custom_quote || !plan.price_monthly_cents || cycle === 'monthly') return null;
    const target = cycle === 'annual' ? plan.price_annual_cents : plan.price_quarterly_cents;
    if (!target) return null;
    return Math.round(((plan.price_monthly_cents - target) / plan.price_monthly_cents) * 100);
  };

  const handleContract = (plan: Plan) => {
    if (plan.is_custom_quote) {
      const msg = `Olá! Meu período de teste terminou e tenho interesse no plano ${plan.name} da SOIA.`;
      window.open(`https://wa.me/5511999406560?text=${encodeURIComponent(msg)}`, '_blank');
      return;
    }
    navigate(`/contratar?plano=${plan.slug}&ciclo=${cycle}`);
  };

  // Simple popup for trial-only plans (e.g. Teste SMS)
  if (!checkingTrialPlan && trialPlanInfo) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Seu teste de 7 dias terminou
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Continue usando nosso software clicando no botão abaixo.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => window.open(trialPlanInfo.redirectUrl!, '_blank')}
            >
              Quero continuar usando!
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
  }

  // SMS plans redirect to external sales page
  if (!checkingTrialPlan && !smsLoading && isSmsPlan) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Seu período de teste terminou
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Continue usando nosso software clicando no botão abaixo.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => window.open(SMS_UPGRADE_URL, '_blank')}
            >
              Quero continuar usando!
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
  }

  return (

    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
        <div className="w-full max-w-7xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Seu período de teste de 7 dias terminou
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {category === 'manager'
                ? 'Escolha um plano de gestor para continuar atendendo seus clientes na SOIA.'
                : 'Escolha um plano para continuar usando a SOIA e cuidar da saúde mental do seu time.'}
            </p>
          </div>

          {/* Cycle toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-border p-1 bg-card">
              {(['monthly', 'quarterly', 'annual'] as Cycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    cycle === c
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cycleLabels[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Plans grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => {
                const price = getPrice(plan);
                const savings = getSavings(plan);
                return (
                  <Card
                    key={plan.id}
                    className="relative flex flex-col border-border hover:border-primary/50 hover:shadow-xl transition-all"
                  >
                    {savings && savings > 0 && (
                      <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">
                        Economize {savings}%
                      </Badge>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {plan.category === 'manager'
                          ? `Até ${plan.max_companies ?? '∞'} empresas · ${plan.max_employees ? `${plan.max_employees} colab.` : 'colab. ilimitados'}`
                          : plan.max_cnpjs && plan.max_cnpjs > 1
                            ? `Até ${plan.max_cnpjs} CNPJs · ${plan.max_employees ?? '∞'} colab.`
                            : `Até ${plan.max_employees ?? '∞'} colaboradores`}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col text-center">
                      <div className="mb-4 min-h-[80px]">
                        {plan.is_custom_quote ? (
                          <>
                            <span className="text-2xl font-bold text-primary">Sob demanda</span>
                            <p className="text-sm text-muted-foreground mt-2">Personalizado para o seu volume</p>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-bold text-primary">{formatBRL(price ?? 0)}</span>
                            <span className="text-muted-foreground text-sm">/mês</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pagamento {cycleLabels[cycle].toLowerCase()}
                            </p>
                          </>
                        )}
                      </div>
                      <ul className="space-y-2 text-left mb-6 flex-1">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => handleContract(plan)}
                      >
                        {plan.is_custom_quote ? (
                          <><MessageCircle className="w-4 h-4 mr-2" /> Falar com consultor</>
                        ) : 'Contratar agora'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-border">
            <button
              onClick={() => window.open('https://wa.me/5511999406560?text=Olá! Meu trial da SOIA expirou e gostaria de tirar dúvidas sobre os planos.', '_blank')}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com consultor
            </button>
            <button
              onClick={signOut}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialExpiredOverlay;
