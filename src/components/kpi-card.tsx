import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Tone = 'default' | 'success' | 'warning' | 'danger';

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Semántica del número: positivo=verde, negativo=rojo. Si se pasa, sobreescribe `tone` del valor. */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

const iconToneStyles: Record<Tone, string> = {
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const valueColorBySentiment = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-foreground',
} as const;

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  sentiment = 'neutral',
}: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={cn('mt-2 text-3xl font-bold tracking-tight', valueColorBySentiment[sentiment])}>
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconToneStyles[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
