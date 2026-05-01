'use client';

// Página principal post-login. Antes vivía en /cobros; ahora ES la home (/)
// porque para el rol Admin esta vista de cobros es la primera referencia
// del día. Cuando se metan otros roles (operario, closer), se ramifica
// aquí leyendo profile.role y se renderiza el dashboard que toque.
//   if (profile?.roles?.includes('OPERARIO')) return <OperarioHome />;
//   ... etc.

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
} from '@/lib/cobros-types';
import { cn } from '@/lib/utils';

import { Section } from '@/components/cobros/section';
import { GlobalKpiCard, type KpiSubIndicator } from '@/components/cobros/global-kpi-card';
import { CycleDaysSelector } from '@/components/cobros/cycle-days-selector';
import { DailyCyclesTable } from '@/components/cobros/daily-cycles-table';
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

export default function HomePage() {
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
      router.push(`/${q.toString() ? `?${q}` : ''}`);
    },
    [router],
  );

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      try {
        const [g, r, c, gr] = await Promise.all([
          cobrosApi.globalKpis(filters.platform),
          cobrosApi.rangeKpis({ ...range, platform: filters.platform }),
          cobrosApi.dailyCycles({ ...cycleRange, platform: filters.platform }),
          cobrosApi.globalRange(),
        ]);
        setGlobalKpis(g);
        setRangeKpis(r);
        setCycles(c.results);
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
    <div className="relative mx-auto max-w-[1400px] space-y-8 p-4">
      {/* Orbs de glow ambient */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none fixed left-1/3 top-2/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-200 via-blue-100 to-cyan-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Cobros
          </h1>
          <p className="mt-1 text-sm text-blue-300/60">
            Análisis de facturación y cobros consolidados de todas las plataformas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchAll(true)}
            disabled={isRefreshing}
            className="border-blue-500/30 bg-blue-950/40 text-blue-200 hover:bg-blue-900/40 hover:text-cyan-200"
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

      {/* GLOBAL — total histórico de toda Conciliación. Sección destacada */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-cyan-950/40 p-5 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/30 to-blue-500/30 text-base ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                🌍
              </span>
              <div>
                <h2 className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                  Total Histórico
                </h2>
                <span className="inline-block rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 ring-1 ring-cyan-400/30">
                  Toda la Conciliación
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/60">Rango</div>
            <div className="text-sm font-medium text-cyan-200">
              {globalRange?.from && globalRange?.to
                ? `${globalRange.from} → ${globalRange.to}`
                : 'Todos los datos'}
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                className="h-48 animate-pulse rounded-xl border border-blue-500/15 bg-gradient-to-br from-[#0a1628] to-[#0d1f3a]"
              />
            ))
          )}
        </div>
      </section>

      {/* PERIODO — KPIs filtrados por fecha (más sutil que el global) */}
      <Section
        title="Filtro por Período"
        icon="📅"
        subtitle={`${range.from} → ${range.to}`}
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
                className="h-48 animate-pulse rounded-xl border border-blue-500/15 bg-gradient-to-br from-[#0a1628] to-[#0d1f3a]"
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
        <DailyCyclesTable rows={cycles} loading={loading} />
      </Section>
    </div>
  );
}
