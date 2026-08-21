import { Badge } from '@/components/ui/badge';

interface Props {
  label?: string;
  className?: string;
}

/** Selo discreto de beta privado. */
export const BetaBadge = ({ label = 'BETA', className }: Props) => (
  <Badge variant="outline" className={`border-primary/40 text-primary text-[10px] tracking-wide ${className ?? ''}`}>
    {label}
  </Badge>
);

export default BetaBadge;
