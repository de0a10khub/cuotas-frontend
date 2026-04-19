'use client';

import { useEffect, useState } from 'react';
import type { FailedPayment } from '@/lib/clientes-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatEuros } from '@/lib/format';
import { toast } from 'sonner';
import { RotateCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { RecoveryDrawerApi } from './types';

interface Props {
  api: RecoveryDrawerApi;
  subscriptionId: string;
  customerId: string;
  platform: string;
  showChargeAction?: boolean;
  onRetryResult?: (success: boolean) => void;
}

// Lista de facturas fallidas + retry manual por factura.
// Compartido /clientes y /mora vía prop `api`.
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

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.failedPayments(subscriptionId);
      setItems(d.results);
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
        platform,
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

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <p>Sin pagos fallidos</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="truncate font-mono text-xs text-slate-500">{p.id}</span>
              <Badge variant="outline" className="text-xs">
                Intento {p.attempt_count}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className="font-semibold">{formatEuros(p.amount, { decimals: 2 })}</span>
              <span className="text-red-600 dark:text-red-400">{p.last_error}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Falló {new Date(p.failed_at).toLocaleString('es-ES')}
            </p>
          </div>
          {showChargeAction && (
            <Button
              size="sm"
              variant="outline"
              disabled={retryingId === p.id}
              onClick={() => retry(p)}
            >
              <RotateCw className={retryingId === p.id ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Reintentar
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
