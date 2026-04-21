'use client';

import { useEffect, useState } from 'react';
import type { FailedPayment } from '@/lib/clientes-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatEuros } from '@/lib/format';
import { toast } from 'sonner';
import {
  RotateCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  ExternalLink,
  Receipt,
  Clock,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecoveryDrawerApi } from './types';

interface Props {
  api: RecoveryDrawerApi;
  subscriptionId: string;
  customerId: string;
  platform: string;
  showChargeAction?: boolean;
  onRetryResult?: (success: boolean) => void;
}

type StatusTone = 'paid' | 'open' | 'draft' | 'failed';

function classifyStatus(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'succeeded' || s === 'completed') return 'paid';
  if (s === 'draft' || s === 'void' || s === 'canceled' || s === 'cancelled') return 'draft';
  if (s === 'open' || s === 'pending' || s === 'scheduled') return 'open';
  return 'failed';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sameDay(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return a.slice(0, 10) === b.slice(0, 10);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
}

const PLATFORM_STYLE = {
  stripe: {
    label: 'Stripe',
    icon: '💳',
    bar: 'border-l-violet-500',
    pill: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-800/50',
  },
  whop: {
    label: 'Whop',
    icon: '⚡',
    bar: 'border-l-orange-500',
    pill: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800/50',
  },
  'whop-erp': {
    label: 'Whop-ERP',
    icon: '📦',
    bar: 'border-l-sky-500',
    pill: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800/50',
  },
} as const;

function platformStyle(p: string) {
  return (
    PLATFORM_STYLE[p as keyof typeof PLATFORM_STYLE] ?? {
      label: p,
      icon: '❓',
      bar: 'border-l-slate-400',
      pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    }
  );
}

// Lista de pagos unificada (Stripe + Whop + Whop-ERP). Renderiza cada item
// como un recibo con plataforma, status y fechas (previsto vs cobrado cuando difieren).
export function FailedPaymentsList({
  api,
  subscriptionId,
  customerId,
  platform,
  showChargeAction = true,
  onRetryResult,
}: Props) {
  const [items, setItems] = useState<FailedPayment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await api.failedPayments(subscriptionId);
      setItems(Array.isArray(d?.results) ? d.results : []);
    } catch (err) {
      console.error('[FailedPaymentsList] load error', err);
      const msg = err instanceof Error ? err.message : 'Error cargando pagos';
      setLoadError(msg);
      setItems([]);
      toast.error(`No se pudieron cargar los pagos: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  const retry = async (item: FailedPayment) => {
    setRetryingId(item.id);
    try {
      const r = await api.retryPayment({
        subscription_id: subscriptionId,
        customer_id: customerId,
        item_id: item.id,
        platform: item.platform || platform,
      });
      if (r.success) toast.success('Cobro reintentado con éxito');
      else toast.error('El reintento falló');
      onRetryResult?.(r.success);
      await load();
    } catch {
      toast.error('Error al reintentar');
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) return <Skeleton className="h-24 w-full" />;

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-8 w-8" />
        <p>No se pudieron cargar los pagos.</p>
        <p className="font-mono text-[10px] text-rose-500">{loadError}</p>
        <Button size="sm" variant="outline" onClick={load}>
          <RotateCw className="h-3.5 w-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
        <CheckCircle2 className="h-8 w-8 text-slate-400" />
        <p>No se encontraron recibos.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((p) => {
        const tone = classifyStatus(p.status);
        const scheduled = p.due_date || p.created_at;
        const paidAt = p.paid_at || null;
        const showBothDates =
          !!scheduled && !!paidAt && !sameDay(scheduled, paidAt) && tone === 'paid';
        const lateDays =
          showBothDates && scheduled && paidAt ? daysBetween(scheduled, paidAt) : 0;
        const ps = platformStyle(p.platform);

        return (
          <li
            key={`${p.platform}-${p.id}`}
            className={cn(
              'overflow-hidden rounded-lg border-l-4 border-r border-t border-b bg-white/60 shadow-sm transition-colors dark:bg-slate-900/40',
              ps.bar,
              tone === 'paid' &&
                'border-y-emerald-200/70 border-r-emerald-200/70 dark:border-y-emerald-900/40 dark:border-r-emerald-900/40',
              tone === 'open' &&
                'border-y-rose-300 border-r-rose-300 dark:border-y-rose-900/50 dark:border-r-rose-900/50',
              tone === 'failed' &&
                'border-y-rose-400 border-r-rose-400 dark:border-y-rose-800 dark:border-r-rose-800',
              tone === 'draft' &&
                'border-y-slate-200 border-r-slate-200 dark:border-y-slate-800 dark:border-r-slate-800',
            )}
          >
            {/* HEADER: plataforma + status + importe */}
            <div className="flex items-start justify-between gap-3 px-3.5 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    ps.pill,
                  )}
                >
                  <span aria-hidden>{ps.icon}</span>
                  {ps.label}
                </span>
                <StatusBadge status={p.status} tone={tone} />
                {p.dispute_status && (
                  <Badge
                    variant="outline"
                    className="border-amber-400 bg-amber-50 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    Disputa: {p.dispute_status}
                  </Badge>
                )}
                {typeof p.installment_number === 'number' && (
                  <Badge variant="outline" className="text-[10px]">
                    Cuota #{p.installment_number}
                  </Badge>
                )}
                {p.attempt_count > 1 && tone !== 'paid' && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.attempt_count} intentos
                  </Badge>
                )}
              </div>
              <div
                className={cn(
                  'shrink-0 text-right text-lg font-bold tabular-nums leading-none',
                  tone === 'paid' && 'text-emerald-700 dark:text-emerald-300',
                  tone !== 'paid' && 'text-slate-900 dark:text-slate-100',
                )}
              >
                {formatEuros(p.amount, { decimals: 2 })}
              </div>
            </div>

            {/* FECHAS */}
            <div className="mt-2 px-3.5">
              {showBothDates ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-400">Prevista</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(scheduled)}
                    </span>
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-300" />
                  <span className="inline-flex items-center gap-1">
                    <span className="text-slate-400">Cobrada</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(paidAt)}
                    </span>
                  </span>
                  {lateDays > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50">
                      <Clock className="h-2.5 w-2.5" />+{lateDays}d tarde
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3 w-3 text-slate-400" />
                  {formatDate(scheduled || paidAt)}
                </div>
              )}
            </div>

            {/* FOOTER: id + actions */}
            <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-3.5 py-2 dark:border-slate-800/50 dark:bg-slate-950/40">
              <p className="truncate font-mono text-[10px] text-slate-400" title={p.id}>
                {p.id}
              </p>
              <div className="flex items-center gap-1.5">
                {p.platform === 'stripe' && tone === 'paid' && p.invoice_pdf && (
                  <a
                    href={p.invoice_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Recibo
                  </a>
                )}
                {p.platform === 'stripe' && tone !== 'paid' && p.hosted_invoice_url && (
                  <a
                    href={p.hosted_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver factura
                  </a>
                )}
                {p.platform === 'whop-erp' && tone !== 'paid' && p.checkout_session_id && (
                  <a
                    href={`https://checkout.cuotas.com/s/${p.checkout_session_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Link de pago
                  </a>
                )}
                {showChargeAction && tone !== 'paid' && tone !== 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryingId === p.id}
                    onClick={() => retry(p)}
                  >
                    <RotateCw
                      className={retryingId === p.id ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'}
                    />
                    Reintentar
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusBadge({ status, tone }: { status: string; tone: StatusTone }) {
  const label =
    status.toLowerCase() === 'paid' || status.toLowerCase() === 'succeeded' || status.toLowerCase() === 'completed'
      ? 'Pagado'
      : status.toLowerCase() === 'open' || status.toLowerCase() === 'pending'
      ? 'Pendiente'
      : status.toLowerCase() === 'failed'
      ? 'Fallido'
      : status.toLowerCase() === 'refunded'
      ? 'Reembolsado'
      : status;
  const classes =
    tone === 'paid'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50'
      : tone === 'open'
      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800/50'
      : tone === 'failed'
      ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300 dark:bg-rose-900/50 dark:text-rose-100 dark:ring-rose-700'
      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
  const Icon = tone === 'paid' ? CheckCircle2 : AlertCircle;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        classes,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
