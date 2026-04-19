// Sección del dashboard /cobros.
// Web vieja la llamaba "CollapsibleGroup" pero no colapsaba nunca.
// Aquí lo renombramos a `Section` y mantenemos la semántica real.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  icon?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, icon, subtitle, actions, children, className }: Props) {
  return (
    <section className={cn('space-y-3', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            {icon && <span aria-hidden>{icon}</span>}
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}
