'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { board2Api } from '@/lib/board2-api';
import type {
  Board2Aging,
  Board2CashCollected,
  Board2Exposure,
  Board2Source,
  Board2SuccessRate,
} from '@/lib/board2-types';
import type { CobrosPeriod, CobrosPlatform } from '@/lib/cobros-types';
import { resolveRange } from '@/components/cobros/date-ranges';
import { formatEurExact } from '@/components/cobros/format-utils';

type SourceSegmentedProps = {
  value: Board2Source;
  onChange: (v: Board2Source) => void;
};

function SourceSegmented({ value, onChange }: SourceSegmentedProps) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-background p-0.5 dark:border-slate-800">
      {(['invoice', 'purchase'] as Board2Source[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            value === v
              ? 'bg-primary text-primary-foreground'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          )}
        >
          {v === 'invoice' ? '📄 Vista Invoice' : '📦 Vista Purchase'}
        </button>
      ))}
    </div>
  );
}

const PERIOD_OPTIONS: { value: CobrosPeriod; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'last_month', label: 'Último mes' },
  { value: 'mtd', label: 'Este mes' },
  { value: 'qtd', label: 'Este trimestre' },
  { value: 'ytd', label: 'Este año' },
  { value: 'all', label: 'Todo' },
  { value: 'custom', label: 'Personalizado…' },
];

const PLATFORM_OPTIONS: { value: CobrosPlatform; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'whop', label: 'Whop' },
];

export default function Board2Page() {
  const router = useRouter();
  const sp = useSearchParams();

  const period = (sp.get('period') as CobrosPeriod) || 'mtd';
  const platform = (sp.get('platform') as CobrosPlatform) || 'all';
  const source = (sp.get('source') as Board2Source) || 'invoice';
  const customFrom = sp.get('from') || undefined;
  const customTo = sp.get('to') || undefined;

  const range = useMemo(
    () => resolveRange(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo],
  );

  const [cash, setCash] = useState<Board2CashCollected | null>(null);
  const [exposure, setExposure] = useState<Board2Exposure | null>(null);
  const [rate, setRate] = useState<Board2SuccessRate | null>(null);
  const [aging, setAging] = useState<Board2Aging | null>(null);
  const [loading, setLoading] = useState(true);

  const pushParams = (next: Partial<Record<string, string>>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === '' || v === 'all' || v === 'mtd' || v === 'invoice') q.delete(k);
      else q.set(k, v);
    }
    router.push(`/board2${q.toString() ? `?${q}` : ''}`);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...range, platform, source };
      const [c, e, r, a] = await Promise.all([
        board2Api.cashCollected(params),
        board2Api.exposure(params),
        board2Api.successRate(params),
        board2Api.aging(params),
      ]);
      setCash(c);
      setExposure(e);
      setRate(r);
      setAging(a);
    } catch {
      toast.error('Error cargando board2');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, platform, source]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const paidCount = cash
    ? source === 'invoice'
      ? cash.invoice_count || 0
      : cash.purchase_count || 0
    : 0;

  const overdueUnits =
    source === 'invoice' ? exposure?.overdue_count || 0 : exposure?.overdue_purchases || 0;
  const pendingUnits =
    source === 'invoice'
      ? exposure?.open_count || 0
      : (exposure?.active_purchases || 0) + (exposure?.overdue_purchases || 0);
  const activeUnits =
    source === 'invoice'
      ? (exposure?.open_count || 0) - overdueUnits
      : exposure?.active_purchases || 0;
  const totalCalculatedUnits = paidCount + pendingUnits;
  const collectionRatePct =
    totalCalculatedUnits > 0 ? (pendingUnits / totalCalculatedUnits) * 100 : 0;
  const pendingHealthPct = pendingUnits > 0 ? (activeUnits / pendingUnits) * 100 : 0;

  const totalExposure = Number(exposure?.pending_exposure_eur || 0);
  const riskAmount = Number(exposure?.amount_at_risk_eur || 0);
  const activePendingAmount = totalExposure - riskAmount;

  const unitLabel = source === 'invoice' ? 'facturas' : 'purchases';
  const unitLabelShort = source === 'invoice' ? 'facturas' : 'purchases';

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Board2</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Panel ejecutivo exclusivo para Administradores
          </p>
        </div>
        <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
          Vista: {source === 'invoice' ? 'Invoices' : 'Purchases'}
        </Badge>
      </header>

      {/* FilterBar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={(v) => pushParams({ period: v || 'mtd' })}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {period === 'custom' && (
          <>
            <Input
              type="date"
              value={customFrom || ''}
              onChange={(e) => pushParams({ from: e.target.value })}
              className="h-8 w-36"
            />
            <span className="text-xs text-slate-400">→</span>
            <Input
              type="date"
              value={customTo || ''}
              onChange={(e) => pushParams({ to: e.target.value })}
              className="h-8 w-36"
            />
          </>
        )}

        <Select value={platform} onValueChange={(v) => pushParams({ platform: v || 'all' })}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SourceSegmented
          value={source}
          onChange={(v) => pushParams({ source: v })}
        />
      </div>

      {/* 6 KPIs */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          icon="💰"
          title="Cash Collected"
          value={cash ? formatEurExact(cash.total_collected_eur) : '—'}
          subtitle={`${paidCount} ${source === 'invoice' ? 'facturas cobradas' : 'purchases que han pagado'}`}
          border="border-green-200 dark:border-green-900/60"
          loading={loading}
        />
        <Kpi
          icon="🧾"
          title="Pending Exposure"
          value={exposure ? formatEurExact(totalExposure) : '—'}
          subtitle={
            source === 'invoice'
              ? `${exposure?.open_count || 0} facturas abiertas`
              : `${pendingUnits} purchases (Sana + Vencida)`
          }
          loading={loading}
        />
        <Kpi
          icon="📈"
          title="Success Rate"
          value={rate ? `${collectionRatePct.toFixed(2)}%` : '—'}
          subtitle={`${pendingUnits}/${totalCalculatedUnits} pendientes del total`}
          border="border-indigo-200 dark:border-indigo-900/60"
          loading={loading}
        />
        <Kpi
          icon="🛡️"
          title="Pending Rate"
          value={rate ? `${pendingHealthPct.toFixed(2)}%` : '—'}
          subtitle={`${activeUnits}/${pendingUnits} sanas del pendiente`}
          loading={loading}
        />
        <Kpi
          icon="⏳"
          title="Active Pending"
          value={exposure ? formatEurExact(activePendingAmount) : '—'}
          subtitle={`${activeUnits} ${unitLabel} recientes (< 8 días)`}
          border="border-blue-200 dark:border-blue-900/60"
          loading={loading}
        />
        <Kpi
          icon="🚨"
          title="Amount at Risk"
          value={exposure ? formatEurExact(riskAmount) : '—'}
          subtitle={`${overdueUnits} ${unitLabelShort} vencidas (> 8 días)`}
          border="border-red-200 dark:border-red-900/60"
          loading={loading}
        />
      </section>

      {/* Aging 5 buckets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 Cuotas Impagadas por Antigüedad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <AgingCell
              emoji="🟡"
              label="0-7 días"
              count={aging?.cuotas_0_7_dias}
              eur={aging?.importe_0_7_dias_eur}
              tone="bg-amber-50 dark:bg-amber-950/40"
            />
            <AgingCell
              emoji="🟠"
              label="8-15 días"
              count={aging?.cuotas_8_15_dias}
              eur={aging?.importe_8_15_dias_eur}
              tone="bg-orange-50 dark:bg-orange-950/40"
            />
            <AgingCell
              emoji="🔴"
              label="16-30 días"
              count={aging?.cuotas_16_30_dias}
              eur={aging?.importe_16_30_dias_eur}
              tone="bg-red-50 dark:bg-red-950/40"
            />
            <AgingCell
              emoji="⚫"
              label="+30 días"
              count={aging?.cuotas_mas_30_dias}
              eur={aging?.importe_mas_30_dias_eur}
              tone="bg-slate-100 dark:bg-slate-900/60"
            />
            <AgingCell
              emoji="📊"
              label="TOTAL"
              count={aging?.total_cuotas_impagadas}
              eur={aging?.importe_total_impagado_eur}
              tone="bg-blue-50 dark:bg-blue-950/40"
              bold
            />
          </div>
        </CardContent>
      </Card>

      {/* Nota explicativa */}
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ ¿Por qué varían los datos entre vistas?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Al cambiar entre Vista Invoice y Vista Purchase, los números pueden diferir
            significativamente. Esto es correcto y responde a preguntas distintas:
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="mb-1 text-xs font-semibold">📄 Vista Invoice (Contabilidad)</p>
              <p className="text-xs text-muted-foreground">
                Filtra por fecha de emisión de la factura. Responde: <em>&quot;¿Cuánto dinero de las
                facturas emitidas este mes sigue pendiente?&quot;</em>
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="mb-1 text-xs font-semibold">📦 Vista Purchase (Cohortes)</p>
              <p className="text-xs text-muted-foreground">
                Filtra por fecha de alta del cliente. Responde: <em>&quot;¿Cuánto deben HOY los
                clientes captados este mes?&quot;</em> (incluye cuotas futuras ya facturadas).
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            El importe total de deuda es idéntico en ambas vistas si seleccionas &quot;Todo&quot;. Las
            diferencias aparecen al filtrar por periodos específicos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  title,
  value,
  subtitle,
  border,
  loading,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  border?: string;
  loading?: boolean;
}) {
  return (
    <Card className={cn(border)}>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span aria-hidden>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold tabular-nums tracking-tight', loading && 'opacity-60')}>
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function AgingCell({
  emoji,
  label,
  count,
  eur,
  tone,
  bold,
}: {
  emoji: string;
  label: string;
  count?: number;
  eur?: number;
  tone: string;
  bold?: boolean;
}) {
  return (
    <div className={cn('rounded-md p-3 text-center', tone)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span aria-hidden className="mr-1">
          {emoji}
        </span>
        {label}
      </p>
      <p className={cn('mt-0.5 text-2xl tabular-nums', bold ? 'font-extrabold' : 'font-bold')}>
        {count ?? 0}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {eur !== undefined ? formatEurExact(eur) : '—'}
      </p>
    </div>
  );
}
