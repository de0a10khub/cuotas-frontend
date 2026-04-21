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

function platformLabel(p: string): string {
  if (p === 'stripe') return 'Stripe';
  if (p === 'whop') return 'Whop';
  if (p === 'whop-erp') return 'Whop-ERP';
  return p;
}

// Lista de pagos unificada (Stripe + Whop + Whop-ERP). Renderiza cada item
// como un "recibo" con estilo según status. Compartido /clientes y /mora.
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
    <ul className="space-y-2">
      {items.map((p) => {
        const tone = classifyStatus(p.status);
        const scheduled = p.due_date || p.created_at;
        const paidAt = p.paid_at || null;
        const showBothDates =
          !!scheduled &&
          !!paidAt &&
          !sameDay(scheduled, paidAt) &&
          tone === 'paid';
        const lateDays =
          showBothDates && scheduled && paidAt ? daysBetween(scheduled, paidAt) : 0;
        return (
          <li
            key={`${p.platform}-${p.id}`}
            className={cn(
              'rounded-md border p-3 transition-colors',
              tone === 'paid' &&
                'border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
              tone === 'open' &&
                'border-rose-300 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30',
              tone === 'failed' &&
                'border-rose-400 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40',
              tone === 'draft' &&
                'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-medium',
                      p.platform === 'stripe' &&
                        'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
                      p.platform === 'whop' &&
                        'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
                      p.platform === 'whop-erp' &&
                        'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
                    )}
                  >
                    {platformLabel(p.platform)}
                  </Badge>

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

                <div className="mt-1.5 flex items-baseline gap-3">
                  <span
                    className={cn(
                      'text-base font-semibold tabular-nums',
                      tone === 'paid' && 'text-emerald-700 dark:text-emerald-200',
                      tone !== 'paid' && 'text-slate-900 dark:text-slate-100',
                    )}
                  >
                    {formatEuros(p.amount, { decimals: 2 })}
                  </span>
                  {showBothDates ? (
                    <span className="text-xs text-slate-500">
                      <span className="text-slate-400">Prevista</span>{' '}
                      {formatDate(scheduled)}
                      <span className="mx-1 text-slate-300">·</span>
                      <span className="text-slate-400">Cobrada</span>{' '}
                      <span className="text-slate-700 dark:text-slate-200">
                        {formatDate(paidAt)}
                      </span>
                      {lateDays > 0 && (
                        <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                          ({lateDays}d tarde)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {formatDate(scheduled || paidAt)}
                    </span>
                  )}
                </div>

                <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{p.id}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {/* Recibo (PDF) para facturas Stripe pagadas */}
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

                {/* Hosted invoice URL para facturas Stripe abiertas */}
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

                {/* Link de pago para Whop-ERP no pagadas */}
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
  const label = status.toLowerCase();
  const classes =
    tone === 'paid'
      ? 'border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
      : tone === 'open'
      ? 'border-rose-400 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
      : tone === 'failed'
      ? 'border-rose-500 bg-rose-200/70 text-rose-900 dark:border-rose-700 dark:bg-rose-900/60 dark:text-rose-100'
      : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  const Icon = tone === 'paid' ? CheckCircle2 : AlertCircle;
  return (
    <Badge variant="outline" className={cn('gap-1 text-[10px] font-semibold uppercase', classes)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
