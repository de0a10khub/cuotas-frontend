'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  dashboardsApi,
  type CohortDefaultRow,
  type OperationalKpis,
} from '@/lib/dashboards-api';

function fmtMonth(iso: string): string {
  try {
    const d = new Date(iso);
    const mes = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    const year = String(d.getFullYear()).slice(2);
    return `${mes} ${year}`;
  } catch {
    return iso;
  }
}

export default function OperacionesPage() {
  const [kpis, setKpis] = useState<OperationalKpis | null>(null);
  const [cohorts, setCohorts] = useState<CohortDefaultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardsApi.operaciones.kpis(), dashboardsApi.operaciones.cohorts()])
      .then(([k, c]) => {
        setKpis(k);
        setCohorts(c.results);
      })
      .catch(() => toast.error('Error cargando operaciones'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />
      <header>
        <h1 className="bg-gradient-to-r from-cyan-200 via-blue-100 to-cyan-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          Operaciones
        </h1>
        <p className="mt-1 text-sm text-blue-300/60">
          Refinanciaciones, duplicados y operaciones especiales
        </p>
      </header>

      {/* 4 KPIs */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          emoji="🔁"
          title="Refinanciaciones (30d)"
          value={loading ? '—' : String(kpis?.refinanciaciones_30d ?? 0)}
          sublabel={
            loading
              ? ''
              : `Ratio: ${kpis?.ratio_refinanciacion_pct ?? 0}%`
          }
          loading={loading}
        />
        <KpiCard
          emoji="🔂"
          title="Duplicados (30d)"
          value={loading ? '—' : String(kpis?.duplicados_30d ?? 0)}
          sublabel={
            loading ? '' : `Total histórico: ${kpis?.duplicados_total ?? 0}`
          }
          loading={loading}
        />
        <KpiCard
          emoji="🎁"
          title="Bonuses (30d)"
          value={loading ? '—' : String(kpis?.bonuses_30d ?? 0)}
          loading={loading}
        />
        <Card className="border-emerald-400/30 bg-gradient-to-br from-emerald-950/40 via-blue-950/40 to-cyan-950/30 shadow-[0_0_20px_rgba(52,211,153,0.1)]">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-300/80">✅ Status</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">
              Operando Normal
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Cohort default rate */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-cyan-950/40 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
        <CardHeader>
          <CardTitle className="text-base text-cyan-100">📈 Default Rate por Cohorte</CardTitle>
          <p className="text-xs text-blue-200/60">
            Porcentaje de impagos por mes de alta
          </p>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          )}
          {!loading && cohorts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay datos de cohorte disponibles
            </p>
          )}
          {!loading && cohorts.length > 0 && (
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {cohorts.map((c) => {
                const tone =
                  c.default_rate_pct > 15
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : c.default_rate_pct > 5
                      ? 'bg-yellow-100 dark:bg-yellow-900/20'
                      : 'bg-green-100 dark:bg-green-900/20';
                return (
                  <div
                    key={c.cohorte_mes}
                    className={cn('rounded-md p-3 text-center', tone)}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {fmtMonth(c.cohorte_mes)}
                    </p>
                    <p className="mt-1 text-3xl font-black tabular-nums">
                      {c.default_rate_pct}%
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {c.compras_overdue}/{c.compras_total}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info cards */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-[#0a1628] to-cyan-950/30">
          <CardHeader>
            <CardTitle className="text-sm text-cyan-200">🔁 Refinanciación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-blue-200/70">
            <p>Una refinanciación ocurre cuando un cliente solicita modificar su plan de pagos.</p>
            <div>
              <p className="font-medium text-foreground">El proceso incluye:</p>
              <ul className="ml-4 list-disc space-y-0.5">
                <li>Cancelar la suscripción actual</li>
                <li>Crear una nueva suscripción con nuevos términos</li>
                <li>
                  Marcar el segmento original como{' '}
                  <code className="rounded bg-muted px-1 text-[10px]">paused_by_refinance</code>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-[#0a1628] to-cyan-950/30">
          <CardHeader>
            <CardTitle className="text-sm text-cyan-200">🔂 Duplicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-blue-200/70">
            <p>
              Los duplicados se detectan cuando un cliente tiene múltiples compras del mismo
              producto.
            </p>
            <div>
              <p className="font-medium text-foreground">El proceso de merge:</p>
              <ul className="ml-4 list-disc space-y-0.5">
                <li>Consolidar en una única Purchase</li>
                <li>
                  Marcar segmentos duplicados con{' '}
                  <code className="rounded bg-muted px-1 text-[10px]">paused_by_support</code>
                </li>
                <li>Excluir del balance los duplicados</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  emoji,
  title,
  value,
  sublabel,
  loading,
}: {
  emoji: string;
  title: string;
  value: string;
  sublabel?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-[#0a1628] to-cyan-950/30 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-cyan-300/80">
          {emoji} {title}
        </p>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-20" />
        ) : (
          <>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-cyan-100">{value}</p>
            {sublabel && <p className="mt-0.5 text-xs text-blue-200/60">{sublabel}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
