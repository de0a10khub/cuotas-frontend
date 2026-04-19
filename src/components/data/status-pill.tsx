import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StatusStyle {
  className: string;
  label: string;
}

interface Props {
  value: string | null | undefined;
  styles: Record<string, StatusStyle>;
  fallback?: StatusStyle;
  className?: string;
}

// Badge coloreado según mapa. Útil para recovery_status, category, subscription_status.
export function StatusPill({ value, styles, fallback, className }: Props) {
  const key = value ?? '';
  const style = styles[key] ?? fallback;
  if (!style) {
    return (
      <Badge variant="outline" className={cn('font-medium', className)}>
        {value || '—'}
      </Badge>
    );
  }
  return (
    <Badge className={cn('font-medium', style.className, className)}>
      {style.label}
    </Badge>
  );
}
