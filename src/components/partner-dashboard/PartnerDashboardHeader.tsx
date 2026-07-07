import { PUBLIC_BASE_URL } from "@/lib/publicUrl";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { PartnerInfo } from "@/pages/PartnerDashboard";

interface PartnerDashboardHeaderProps {
  partnerInfo: PartnerInfo;
}

const PartnerDashboardHeader = ({ partnerInfo }: PartnerDashboardHeaderProps) => {
  const [copied, setCopied] = useState(false);

  const referralLink = `${PUBLIC_BASE_URL}/contratar?ref=${partnerInfo.referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Olá, {partnerInfo.nomeFantasia}
            </h1>
            <p className="text-sm text-muted-foreground">
              Código de referência: <strong>{partnerInfo.referralCode}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {referralLink}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyReferralLink}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PartnerDashboardHeader;
