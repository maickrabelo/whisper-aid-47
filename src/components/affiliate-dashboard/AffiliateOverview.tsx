import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, DollarSign, Link, Copy, Check, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AffiliateOverviewProps {
  affiliateId: string;
  referralCode: string;
}

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalCommissions: number;
  totalLeads: number;
}

export const AffiliateOverview = ({ affiliateId, referralCode }: AffiliateOverviewProps) => {
  const [stats, setStats] = useState<Stats>({ totalCompanies: 0, activeCompanies: 0, totalCommissions: 0, totalLeads: 0 });
  const [copied, setCopied] = useState(false);

  const referralLink = `${PUBLIC_BASE_URL}/i/${referralCode}`;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [companiesResult, leadsResult] = await Promise.all([
          supabase
            .from('companies')
            .select('id, subscription_status')
            .eq('referred_by_affiliate_id', affiliateId),
          supabase
            .from('affiliate_leads')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_id', affiliateId),
        ]);

        const companies = companiesResult.data || [];
        const totalCompanies = companies.length;
        const activeCompanies = companies.filter(c => c.subscription_status === 'active').length;

        let totalCommissions = 0;
        const activeCompanyIds = companies.filter(c => c.subscription_status === 'active').map(c => c.id);

        const activeSubIds = companies
          .filter((c: any) => c.subscription_status === 'active' && c.parent_subscription_id)
          .map((c: any) => c.parent_subscription_id);

        if (activeSubIds.length > 0) {
          const { data: subscriptions } = await (supabase as any)
            .from('subscriptions')
            .select('amount_cents')
            .in('id', activeSubIds)
            .eq('status', 'active');

          subscriptions?.forEach((sub: any) => {
            totalCommissions += (sub.amount_cents * 0.05) / 100;
          });
        }

        setStats({
          totalCompanies,
          activeCompanies,
          totalCommissions,
          totalLeads: leadsResult.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [affiliateId]);

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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Indicadas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">{stats.activeCompanies} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Mensais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCommissions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">5% sobre assinaturas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Capturados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">via link de indicação</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seu Link de Indicação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <code className="flex-1 bg-muted px-4 py-2 rounded text-sm truncate">
              {referralLink}
            </code>
            <Button onClick={copyToClipboard} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copiar
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Compartilhe este link para indicar empresas e ganhar 5% de comissão sobre cada assinatura ativa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
