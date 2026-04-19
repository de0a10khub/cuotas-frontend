'use client';

import { cn } from '@/lib/utils';
import type { CycleDays } from '@/lib/cobros-types';

const OPTIONS: CycleDays[] = [7, 14, 21, 28];

interface Props {
  value: CycleDays;
  onChange: (v: CycleDays) => void;
}

export function CycleDaysSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-background p-0.5 dark:border-slate-800">
      {OPTIONS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            value === d
              ? 'bg-primary text-primary-foreground'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          )}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
