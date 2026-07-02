import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  aepId?: string | null;
  companyId?: string | null;
  size?: 'sm' | 'md';
}

export function AEPBadge({ aepId, companyId, size = 'sm' }: Props) {
  const navigate = useNavigate();
  const clickable = !!(aepId && companyId);
  return (
    <Badge
      variant="outline"
      className={`gap-1 border-purple-400 bg-purple-50 text-purple-700 ${clickable ? 'cursor-pointer hover:bg-purple-100' : ''} ${size === 'sm' ? 'text-[10px]' : ''}`}
      onClick={(e) => {
        if (!clickable) return;
        e.stopPropagation();
        navigate(`/aep/${companyId}/${aepId}`);
      }}
    >
      <ClipboardList className="h-3 w-3" />
      Origem: AEP
    </Badge>
  );
}
