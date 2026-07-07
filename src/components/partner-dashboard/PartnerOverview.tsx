import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, DollarSign, TrendingUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PartnerInfo } from "@/pages/PartnerDashboard";
import { PUBLIC_BASE_URL } from "@/lib/publicUrl";

interface PartnerOverviewProps {
  partnerInfo: PartnerInfo;
}

interface Stats {
  totalProspects: number;
  activeProspects: number;
  convertedCompanies: number;
  totalCommissions: number;
}

const PartnerOverview = ({ partnerInfo }: PartnerOverviewProps) => {
  const [stats, setStats] = useState<Stats>({
    totalProspects: 0,
    activeProspects: 0,
    convertedCompanies: 0,
    totalCommissions: 0,
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralLink = `${PUBLIC_BASE_URL}/contratar?ref=${partnerInfo.referralCode}`;

  useEffect(() => {
    fetchStats();
  }, [partnerInfo.id]);

  const fetchStats = async () => {
    try {
      // Fetch prospects count
      const { count: prospectsCount } = await supabase
        .from("partner_prospects")
        .select("*", { count: "exact", head: true })
        .eq("partner_id", partnerInfo.id);

      // Fetch active prospects (not converted)
      const { count: activeCount } = await supabase
        .from("partner_prospects")
        .select("*", { count: "exact", head: true })
        .eq("partner_id", partnerInfo.id)
        .neq("status", "converted");

      // Fetch converted companies
      const { count: convertedCount } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_partner_id", partnerInfo.id);

      setStats({
        totalProspects: prospectsCount || 0,
        activeProspects: activeCount || 0,
        convertedCompanies: convertedCount || 0,
        totalCommissions: 0, // TODO: Calculate from subscriptions
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const statsCards = [
    {
      title: "Total de Prospectos",
      value: stats.totalProspects,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Prospectos Ativos",
      value: stats.activeProspects,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Empresas Convertidas",
      value: stats.convertedCompanies,
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total em Comissões",
      value: `R$ ${stats.totalCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Visão Geral</h2>
        <p className="text-muted-foreground">
          Acompanhe seu desempenho como parceiro licenciado
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seu Link de Indicação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Compartilhe este link com empresas interessadas. Quando elas assinarem
            o SOIA, você receberá sua comissão automaticamente.
          </p>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="flex-1 text-sm truncate">{referralLink}</span>
            <Button onClick={copyReferralLink} variant="outline" size="sm">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerOverview;
