import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, Plus, X, CreditCard, QrCode, FileText, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fbqTrack } from '@/lib/metaPixel';
import { oaiqTrack, linkAdAttributionToEmail } from '@/lib/openaiPixel';


const SMS_LOGO_URL = '/__l5e/assets-v1/86052a62-59f9-47bf-af09-bc2d67c91278/sr-sms-logo.png';

type Cycle = 'monthly' | 'quarterly' | 'annual';
type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

interface Plan {
  id: string;
  slug: string;
  name: string;
  category: 'company' | 'manager';
  max_cnpjs: number | null;
  max_employees: number | null;
  max_companies: number | null;
  price_monthly_cents: number | null;
  price_quarterly_cents: number | null;
  price_annual_cents: number | null;
  is_custom_quote: boolean;
  features: string[];
}

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCNPJ = (v: string) =>
  v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);

const formatPhone = (v: string) =>
  v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);

const Checkout = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planSlug = params.get('plano');
  const initialCycle = (params.get('ciclo') as Cycle) || 'annual';

  const [plan, setPlan] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<Cycle>(initialCycle);
  const [billingType, setBillingType] = useState<BillingType>('CREDIT_CARD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cnpjs, setCnpjs] = useState<string[]>(['']);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpfCnpj: '',
    companyName: '',
  });

  useEffect(() => {
    (async () => {
      if (!planSlug) {
        navigate('/');
        return;
      }
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', planSlug)
        .maybeSingle();
      if (!data) {
        toast.error('Plano não encontrado');
        navigate('/');
        return;
      }
      const formatted: Plan = {
        ...(data as any),
        features: Array.isArray((data as any).features) ? (data as any).features : [],
      };
      if (formatted.is_custom_quote) {
        const msg = `Olá! Quero contratar o plano ${formatted.name}.`;
        window.location.href = `https://wa.me/5511999406560?text=${encodeURIComponent(msg)}`;
        return;
      }
      setPlan(formatted);
      setLoading(false);
    })();
  }, [planSlug, navigate]);

  const getMonthlyPrice = () => {
    if (!plan) return 0;
    return cycle === 'annual'
      ? plan.price_annual_cents ?? 0
      : cycle === 'quarterly'
        ? plan.price_quarterly_cents ?? 0
        : plan.price_monthly_cents ?? 0;
  };
  const monthsPerCycle = cycle === 'annual' ? 12 : cycle === 'quarterly' ? 3 : 1;
  const getCycleTotal = () => getMonthlyPrice() * monthsPerCycle;

  const isCorporate = plan?.slug === 'corporate';
  const maxCnpjs = plan?.max_cnpjs ?? 1;

  const addCnpj = () => {
    if (cnpjs.length < maxCnpjs) setCnpjs([...cnpjs, '']);
  };
  const removeCnpj = (i: number) => setCnpjs(cnpjs.filter((_, idx) => idx !== i));
  const updateCnpj = (i: number, v: string) =>
    setCnpjs(cnpjs.map((c, idx) => (idx === i ? formatCNPJ(v) : c)));

  const validate = (): boolean => {
    if (!form.name.trim()) return toast.error('Informe seu nome'), false;
    if (!form.email.includes('@')) return toast.error('Email inválido'), false;
    if (form.cpfCnpj.replace(/\D/g, '').length < 11) return toast.error('CPF/CNPJ inválido'), false;
    if (plan?.category === 'company' && !form.companyName.trim())
      return toast.error('Informe o nome da empresa'), false;
    if (isCorporate) {
      const validCnpjs = cnpjs.filter((c) => c.replace(/\D/g, '').length >= 14);
      if (validCnpjs.length === 0)
        return toast.error('Informe ao menos 1 CNPJ válido'), false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!plan || !validate()) return;
    setSubmitting(true);
    const monthsPerCycle = cycle === 'annual' ? 12 : cycle === 'quarterly' ? 3 : 1;
    const totalCents = (getMonthlyPrice() || 0) * monthsPerCycle;
    fbqTrack('InitiateCheckout', {
      content_name: plan.name,
      content_category: plan.category,
      currency: 'BRL',
      value: totalCents / 100,
    }, {
      email: form.email,
      phone: form.phone,
      first_name: form.name.split(' ')[0],
      last_name: form.name.split(' ').slice(1).join(' '),
      external_id: form.cpfCnpj,
      country: 'br',
    });
    oaiqTrack('checkout_started', { plan: plan.slug, value: totalCents / 100, currency: 'BRL' });
    await linkAdAttributionToEmail(form.email);

    try {
      const { data, error } = await supabase.functions.invoke('asaas-create-subscription', {
        body: {
          planSlug: plan.slug,
          billingCycle: cycle,
          billingType,
          customer: {
            name: form.name,
            email: form.email,
            cpfCnpj: form.cpfCnpj,
            phone: form.phone,
          },
          companyName: form.companyName || form.name,
          cnpjs: isCorporate ? cnpjs.filter((c) => c.replace(/\D/g, '').length >= 14) : [],
        },
      });
      if (error) throw error;
      if (!data?.subscriptionId) throw new Error('Resposta inválida');

      // Open Asaas invoice in new tab + redirect to success page for polling
      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
      }
      navigate(`/checkout/sucesso?sub=${data.subscriptionId}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao processar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSmsPlan = plan?.slug?.includes('sms') ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <img 
            src={isSmsPlan ? SMS_LOGO_URL : '/lovable-uploads/Logo_SOIA.png'} 
            alt={isSmsPlan ? 'Sr. SMS' : 'SOIA'} 
            className="h-8" 
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Resumo */}
          <Card className="md:col-span-1 h-fit sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <Badge>{plan.category === 'manager' ? 'Gestor' : 'Empresa'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ciclo de pagamento</Label>
                <RadioGroup value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
                  {(['annual', 'quarterly', 'monthly'] as Cycle[]).map((c) => {
                    const price =
                      c === 'annual'
                        ? plan.price_annual_cents
                        : c === 'quarterly'
                          ? plan.price_quarterly_cents
                          : plan.price_monthly_cents;
                    if (!price) return null;
                    const label =
                      c === 'annual' ? 'Anual (12x)' : c === 'quarterly' ? 'Trimestral (3x)' : 'Mensal';
                    return (
                      <label
                        key={c}
                        className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={c} />
                          <span className="text-sm">{label}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">{formatBRL(price)}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="border-t pt-4 space-y-3">
                {monthsPerCycle > 1 && billingType === 'CREDIT_CARD' ? (
                  <div className="rounded-lg bg-primary/10 border-2 border-primary/30 p-4 text-center">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                      No cartão de crédito
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-2xl font-bold text-primary">{monthsPerCycle}x</span>
                      <span className="text-3xl font-extrabold text-primary">
                        {formatBRL(getMonthlyPrice())}
                      </span>
                    </div>
                    <p className="text-xs text-primary/80 mt-1">sem juros</p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Total {monthsPerCycle === 12 ? 'anual' : 'trimestral'}: {formatBRL(getCycleTotal())}
                    </p>
                  </div>
                ) : monthsPerCycle > 1 ? (
                  <div className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Pague no cartão em <strong className="text-primary">{monthsPerCycle}x de {formatBRL(getMonthlyPrice())}</strong> sem juros
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Total {monthsPerCycle === 12 ? 'anual' : 'trimestral'}: {formatBRL(getCycleTotal())}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Mensalidade</span>
                    <span className="text-2xl font-bold text-primary">{formatBRL(getCycleTotal())}</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground text-center">
                  Renovação automática a cada {monthsPerCycle === 1 ? 'mês' : monthsPerCycle === 3 ? '3 meses' : '12 meses'}. Cancele quando quiser.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Seus dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CPF ou CNPJ *</Label>
                  <Input
                    value={form.cpfCnpj}
                    onChange={(e) => setForm({ ...form, cpfCnpj: formatCNPJ(e.target.value) })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  />
                </div>
              </div>

              {plan.category === 'company' && (
                <div className="space-y-2">
                  <Label>{isCorporate ? 'Razão social principal' : 'Nome da empresa'} *</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </div>
              )}

              {isCorporate && (
                <div className="space-y-2">
                  <Label>CNPJs incluídos (até {maxCnpjs})</Label>
                  {cnpjs.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="00.000.000/0000-00"
                        value={c}
                        onChange={(e) => updateCnpj(i, e.target.value)}
                      />
                      {cnpjs.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeCnpj(i)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {cnpjs.length < maxCnpjs && (
                    <Button variant="outline" size="sm" onClick={addCnpj}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar CNPJ
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard, badge: monthsPerCycle > 1 ? `${monthsPerCycle}x sem juros` : null },
                    { v: 'PIX', label: 'PIX', icon: QrCode, badge: null },
                    { v: 'BOLETO', label: 'Boleto', icon: FileText, badge: null },
                  ].map(({ v, label, icon: Icon, badge }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBillingType(v as BillingType)}
                      className={`relative flex flex-col items-center gap-1 p-3 border-2 rounded-lg transition-all ${
                        billingType === v
                          ? 'border-primary bg-primary/10 text-primary shadow-md scale-[1.02]'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {badge && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground whitespace-nowrap">
                          {badge}
                        </Badge>
                      )}
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : billingType === 'CREDIT_CARD' && monthsPerCycle > 1 ? (
                  <>Pagar {monthsPerCycle}x de {formatBRL(getMonthlyPrice())}</>
                ) : (
                  <>Pagar {formatBRL(getCycleTotal())}</>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Após confirmar o pagamento, suas credenciais serão enviadas por email.
              </p>
            </CardContent>
          </Card>
        </div>

        {isSmsPlan && (
          <footer className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>sr.smsapp@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+55 27 99844-3852</span>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              &copy; {new Date().getFullYear()} Sr. SMS. Todos os direitos reservados.
            </p>
          </footer>
        )}
      </div>
    </div>
  );
};

export default Checkout;
