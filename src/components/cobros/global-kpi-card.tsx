import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface KpiSubIndicator {
  label: string;
  value: string;
  color?: string;
}

interface Props {
  title: string;
  icon: string;
  mainValue: string;
  mainLabel?: string;
  colorClass?: string;
  dotColor?: string;
  subIndicators?: KpiSubIndicator[];
}

export function GlobalKpiCard({
  title,
  icon,
  mainValue,
  mainLabel,
  colorClass = 'text-foreground',
  dotColor,
  subIndicators,
}: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span aria-hidden>{icon}</span>
            <span>{title}</span>
          </div>
          {dotColor && <span className={cn('h-2 w-2 rounded-full', dotColor)} />}
        </div>
        <p className={cn('text-2xl font-bold tabular-nums tracking-tight', colorClass)}>
          {mainValue}
        </p>
        {mainLabel && <p className="mt-0.5 text-xs text-slate-500">{mainLabel}</p>}
        {subIndicators && subIndicators.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-xs dark:border-slate-800">
            {subIndicators.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">{s.label}</span>
                <span className={cn('tabular-nums', s.color || 'text-foreground')}>
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
