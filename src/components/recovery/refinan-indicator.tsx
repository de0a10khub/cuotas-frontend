'use client';

import { RefreshCw, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isRefinanced: boolean;
  status: string | null;
  originalSubscriptionId: string | null;
  className?: string;
}

// Badge refinanciado con variante éxito/normal y tooltip contextual.
// Réplica literal del `RefinanIndicator` de la web vieja.
const SUCCESS_STATES = new Set(['FULL-PAY', 'PAGO COMPLETADO']);

export function RefinanIndicator({
  isRefinanced,
  status,
  originalSubscriptionId,
  className,
}: Props) {
  if (!isRefinanced && !status) return null;

  const isSuccess = status != null && SUCCESS_STATES.has(status);
  const label = (status || 'REFINANCIADO').toUpperCase();
  const Icon = isSuccess ? Trophy : RefreshCw;

  const tooltipTitle = isSuccess ? 'Pago Finalizado / Amortizado' : 'Cliente Refinanciado';
  const tooltipBody = isSuccess
    ? 'Este cliente ha completado satisfactoriamente el pago total de su deuda o ha realizado una amortización completa del contrato.'
    : 'Este cliente ha consolidado sus deudas o ha renegociado sus cuotas mediante un proceso de refinanciación activo.';

  return (
    <span
      className={cn('group/refin relative inline-flex cursor-help', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
          isSuccess
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
        )}
      >
        <Icon
          className={cn(
            'h-3 w-3',
            !isSuccess && 'animate-spin',
          )}
          style={!isSuccess ? { animationDuration: '8s' } : undefined}
        />
        {label}
      </span>

      {/* Tooltip CSS-only con group hover */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-slate-200 bg-popover p-3 text-left text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover/refin:opacity-100 dark:border-slate-800"
      >
        <p className="font-semibold text-foreground">{tooltipTitle}</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{tooltipBody}</p>
        {originalSubscriptionId && (
          <div className="mt-2 rounded bg-slate-100 p-1.5 dark:bg-slate-800">
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
              Suscripción original
            </p>
            <code className="break-all text-[10px] text-foreground">
              {originalSubscriptionId}
            </code>
          </div>
        )}
      </span>
    </span>
  );
}
