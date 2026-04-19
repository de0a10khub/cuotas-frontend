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
    <div className="mx-auto max-w-[1400px] space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Operaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">✅ Status</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Operando Normal
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Cohort default rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📈 Default Rate por Cohorte</CardTitle>
          <p className="text-xs text-muted-foreground">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔁 Refinanciación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔂 Duplicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
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
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">
          {emoji} {title}
        </p>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-20" />
        ) : (
          <>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
            {sublabel && <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
