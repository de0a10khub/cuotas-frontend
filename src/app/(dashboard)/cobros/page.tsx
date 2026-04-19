'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

import { cobrosApi } from '@/lib/cobros-api';
import type {
  CobrosKpis,
  CobrosPeriod,
  CobrosPlatform,
  CycleDays,
  DailyCycleRow,
  GlobalRange,
  SubscriptionMonthRow,
} from '@/lib/cobros-types';
import { formatEuros } from '@/lib/format';
import { cn } from '@/lib/utils';

import { Section } from '@/components/cobros/section';
import { GlobalKpiCard, type KpiSubIndicator } from '@/components/cobros/global-kpi-card';
import { CycleDaysSelector } from '@/components/cobros/cycle-days-selector';
import { DailyCyclesTable } from '@/components/cobros/daily-cycles-table';
import { StatusStackedChart } from '@/components/cobros/status-stacked-chart';
import { SubscriptionMonthChart } from '@/components/cobros/subscription-month-chart';
import { CobrosFilterBar, type CobrosFilters } from '@/components/cobros/filter-bar';
import { ExportCiclosButton } from '@/components/cobros/export-button';
import { resolveRange } from '@/components/cobros/date-ranges';
import { formatEurExact } from '@/components/cobros/format-utils';

function ratioTone(pct: number): string {
  if (pct >= 20) return 'text-red-600 dark:text-red-400';
  if (pct >= 10) return 'text-orange-600 dark:text-orange-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function buildKpis(k: CobrosKpis, scope: 'global' | 'range'): {
  facturado: React.ReactNode;
  cashCollected: React.ReactNode;
  pendientes: React.ReactNode;
  ratio: React.ReactNode;
} {
  const expositionRatio = (k.pending_eur / (k.cash_collected_eur + k.pending_eur + 0.01)) * 100;
  const cleanRatio = (k.pending_eur / (k.paid_invoices_eur + k.pending_eur + 0.01)) * 100;
  const directRatio =
    k.cash_collected_eur > 0 ? (k.direct_payments_eur / k.cash_collected_eur) * 100 : 0;

  const cashSubs: KpiSubIndicator[] = [
    {
      label: 'Cuotas (Facturas)',
      value: `${k.paid_invoices_count} (${formatEurExact(k.paid_invoices_eur)})`,
    },
    {
      label: 'Directos (Cierres)',
      value: `${k.direct_payments_count} (${formatEurExact(k.direct_payments_eur)})`,
    },
    {
      label: 'Ratio Directos',
      value: `${directRatio.toFixed(1)}% del total`,
      color: 'text-slate-500',
    },
  ];

  const pendSubs: KpiSubIndicator[] = [
    {
      label: 'Abiertas (≤7d)',
      value: `${k.abiertas_count} (${formatEurExact(k.abiertas_eur)})`,
    },
    {
      label: 'Vencidas (8-30d)',
      value: `${k.vencidas_count} (${formatEurExact(k.vencidas_eur)})`,
      color: 'text-orange-500 font-medium',
    },
    {
      label: 'Crónicas (31-61d)',
      value: `${k.cronicas_count} (${formatEurExact(k.cronicas_eur)})`,
      color: 'text-red-500 font-medium',
    },
    {
      label: 'Incobrable (+61d)',
      value: `${k.incobrable_count} (${formatEurExact(k.incobrable_eur)})`,
      color: 'text-slate-900 font-bold dark:text-slate-100',
    },
  ];

  return {
    facturado: (
      <GlobalKpiCard
        title="Facturado"
        icon="💶"
        mainValue={formatEurExact(k.contract_value_eur)}
        mainLabel={`${k.contract_value_count} ventas`}
        colorClass="text-blue-600 dark:text-blue-400"
        dotColor="bg-blue-500"
      />
    ),
    cashCollected: (
      <GlobalKpiCard
        title={scope === 'global' ? 'Cash Collected Global' : 'Cash Collected'}
        icon="💰"
        mainValue={formatEurExact(k.cash_collected_eur)}
        mainLabel={`${k.cash_collected_count} cobros totales`}
        colorClass="text-emerald-600 dark:text-emerald-400"
        dotColor="bg-emerald-500"
        subIndicators={cashSubs}
      />
    ),
    pendientes: (
      <GlobalKpiCard
        title={scope === 'global' ? 'Pendientes Global' : 'Pendientes'}
        icon="🧾"
        mainValue={formatEurExact(k.pending_eur)}
        mainLabel={`${k.pending_count} pendientes de cobro`}
        colorClass="text-amber-600 dark:text-amber-400"
        dotColor="bg-amber-500"
        subIndicators={pendSubs}
      />
    ),
    ratio: (
      <GlobalKpiCard
        title="Ratio Pendientes"
        icon="📊"
        mainValue={`${expositionRatio.toFixed(2)}%`}
        mainLabel={
          scope === 'global'
            ? 'Exposición sobre ingresos totales'
            : 'Exposición sobre ingresos del período'
        }
        colorClass={ratioTone(expositionRatio)}
        dotColor={
          expositionRatio >= 20 ? 'bg-red-500' : expositionRatio >= 10 ? 'bg-orange-500' : 'bg-emerald-500'
        }
        subIndicators={[
          {
            label: 'Ratio Solo Cuotas',
            value: `${cleanRatio.toFixed(2)}%`,
            color: ratioTone(cleanRatio),
          },
        ]}
      />
    ),
  };
}

export default function CobrosPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const filters: CobrosFilters = {
    period: (sp.get('period') as CobrosPeriod) || 'mtd',
    platform: (sp.get('platform') as CobrosPlatform) || 'all',
    from: sp.get('from') || undefined,
    to: sp.get('to') || undefined,
  };

  const range = useMemo(
    () => resolveRange(filters.period, { from: filters.from, to: filters.to }),
    [filters.period, filters.from, filters.to],
  );

  const [cycleDays, setCycleDays] = useState<CycleDays>(7);

  const cycleRange = useMemo(() => {
    const to = new Date(range.to);
    const from = new Date(to.getTime() - (cycleDays - 1) * 86400000);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [range.to, cycleDays]);

  const [globalKpis, setGlobalKpis] = useState<CobrosKpis | null>(null);
  const [rangeKpis, setRangeKpis] = useState<CobrosKpis | null>(null);
  const [cycles, setCycles] = useState<DailyCycleRow[]>([]);
  const [subMonths, setSubMonths] = useState<SubscriptionMonthRow[]>([]);
  const [globalRange, setGlobalRange] = useState<GlobalRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pushFilters = useCallback(
    (next: CobrosFilters) => {
      const q = new URLSearchParams();
      q.set('period', next.period);
      if (next.platform !== 'all') q.set('platform', next.platform);
      if (next.period === 'custom') {
        if (next.from) q.set('from', next.from);
        if (next.to) q.set('to', next.to);
      }
      router.push(`/cobros${q.toString() ? `?${q}` : ''}`);
    },
    [router],
  );

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      try {
        const [g, r, c, sm, gr] = await Promise.all([
          cobrosApi.globalKpis(filters.platform),
          cobrosApi.rangeKpis({ ...range, platform: filters.platform }),
          cobrosApi.dailyCycles({ ...cycleRange, platform: filters.platform }),
          cobrosApi.bySubscriptionMonth({ ...cycleRange, platform: filters.platform }),
          cobrosApi.globalRange(),
        ]);
        setGlobalKpis(g);
        setRangeKpis(r);
        setCycles(c.results);
        setSubMonths(sm.results);
        setGlobalRange(gr);
      } catch {
        toast.error('Error cargando cobros');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [filters.platform, range.from, range.to, cycleRange.from, cycleRange.to],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const g = globalKpis ? buildKpis(globalKpis, 'global') : null;
  const rK = rangeKpis ? buildKpis(rangeKpis, 'range') : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cobros</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Análisis de facturación y cobros consolidados de todas las plataformas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchAll(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Actualizar
          </Button>
          <ExportCiclosButton
            from={cycleRange.from}
            to={cycleRange.to}
            platform={filters.platform}
            disabled={cycles.length === 0}
          />
        </div>
      </header>

      <CobrosFilterBar value={filters} onChange={pushFilters} />

      <Section
        title="Indicadores Globales"
        icon="🌍"
        subtitle={
          globalRange?.from && globalRange?.to
            ? `${globalRange.from} a ${globalRange.to}`
            : 'Todos los datos'
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {g ? (
            <>
              {g.facturado}
              {g.cashCollected}
              {g.pendientes}
              {g.ratio}
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
              />
            ))
          )}
        </div>
      </Section>

      <Section
        title="Indicadores del Período"
        icon="📅"
        subtitle={`${range.from} a ${range.to}`}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {rK ? (
            <>
              {rK.facturado}
              {rK.cashCollected}
              {rK.pendientes}
              {rK.ratio}
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
              />
            ))
          )}
        </div>
      </Section>

      <Section
        title="Ciclos Diarios"
        icon="📆"
        subtitle={`${cycleRange.from} a ${cycleRange.to}`}
        actions={<CycleDaysSelector value={cycleDays} onChange={setCycleDays} />}
      >
        <div className="space-y-4">
          <DailyCyclesTable rows={cycles} loading={loading} />
          {cycles.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <StatusStackedChart rows={cycles} />
              <SubscriptionMonthChart rows={subMonths} />
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
