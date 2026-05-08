'use client';

// Lista de cuotas planeadas (customer_installments) para clientes Whop-ERP (`po_*`).
// Pinta tabla con: nº, importe, fecha de vencimiento, estado, fecha de pago.
// Para Stripe / Whop nativo el endpoint devuelve {applies: false} y mostramos
// un estado "no aplica".

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, AlertTriangle, Clock, Loader2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatEuros } from '@/lib/format';
import { api } from '@/lib/api';

interface InstallmentItem {
  installment_number: number;
  amount_cents: number;
  amount_eur: number;
  due_date: string | null;
  status: string;
  paid_at: string | null;
}

interface InstallmentsResponse {
  results: InstallmentItem[];
  total_amount_cents: number;
  total_paid_cents: number;
  total_pending_cents: number;
  installment_count: number;
  applies: boolean;
}

interface Props {
  subscriptionId: string;
  platform?: string;
}

const STATUS_STYLES: Record<string, { bg: string; fg: string; Icon: typeof CheckCircle2; label: string }> = {
  paid: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    fg: 'text-emerald-700 dark:text-emerald-300',
    Icon: CheckCircle2,
    label: 'Pagada',
  },
  pending: {
    bg: 'bg-slate-50 dark:bg-slate-900',
    fg: 'text-slate-600 dark:text-slate-300',
    Icon: Circle,
    label: 'Pendiente',
  },
  processing: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    fg: 'text-amber-700 dark:text-amber-300',
    Icon: Loader2,
    label: 'En proceso',
  },
  failed: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    fg: 'text-rose-700 dark:text-rose-300',
    Icon: AlertTriangle,
    label: 'Fallido',
  },
  cancelled: {
    bg: 'bg-slate-50 dark:bg-slate-900',
    fg: 'text-slate-400 dark:text-slate-500',
    Icon: Circle,
    label: 'Cancelada',
  },
};

const FALLBACK_STYLE = STATUS_STYLES.pending;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function InstallmentsList({ subscriptionId, platform }: Props) {
  const [data, setData] = useState<InstallmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(false);
    api
      .get<InstallmentsResponse>(
        `/api/v1/installments/${encodeURIComponent(subscriptionId)}/`,
      )
      .then((r: InstallmentsResponse) => {
        if (!cancel) setData(r);
      })
      .catch(() => {
        if (!cancel) setError(true);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [subscriptionId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/60 py-8 text-center text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
        <AlertTriangle className="h-7 w-7" />
        <p className="font-medium">No se pudieron cargar las cuotas</p>
      </div>
    );
  }

  if (!data || !data.applies) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        <Clock className="h-7 w-7 opacity-60" />
        <p className="font-medium">Sin plan de cuotas registrado</p>
        <p className="text-xs">
          Esta vista solo aplica a clientes Whop-ERP{platform ? ` (plataforma actual: ${platform})` : ''}.
        </p>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <Clock className="h-7 w-7 opacity-60" />
        <p className="font-medium">Aún no hay cuotas planeadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resumen arriba */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Pagado
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-emerald-800 dark:text-emerald-200">
            {formatEuros(data.total_paid_cents / 100, { decimals: 2 })}
          </p>
        </div>
        <div className="rounded-md border border-slate-200/70 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Pendiente
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
            {formatEuros(data.total_pending_cents / 100, { decimals: 2 })}
          </p>
        </div>
        <div className="rounded-md border border-blue-200/60 bg-blue-50/50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Total
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-blue-800 dark:text-blue-200">
            {formatEuros(data.total_amount_cents / 100, { decimals: 2 })}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Importe</th>
              <th className="px-3 py-2 text-left font-semibold">Vence</th>
              <th className="px-3 py-2 text-left font-semibold">Estado</th>
              <th className="px-3 py-2 text-left font-semibold">Pagada el</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {data.results.map((it) => {
              const style = STATUS_STYLES[it.status?.toLowerCase()] ?? FALLBACK_STYLE;
              const Icon = style.Icon;
              return (
                <tr key={it.installment_number} className="bg-white dark:bg-background">
                  <td className="px-3 py-2 font-semibold tabular-nums">{it.installment_number}</td>
                  <td className="px-3 py-2 font-semibold tabular-nums">
                    {formatEuros(it.amount_cents / 100, { decimals: 2 })}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                    {formatDate(it.due_date)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        style.bg,
                        style.fg,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {style.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {it.paid_at ? formatDate(it.paid_at) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
