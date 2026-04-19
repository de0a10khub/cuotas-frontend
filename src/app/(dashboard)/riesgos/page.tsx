'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  dashboardsApi,
  type ChurnRiskItem,
  type RiesgosAging,
  type RiesgosExposure,
  type StatusDistributionItem,
} from '@/lib/dashboards-api';

function fmtEur(n: number): string {
  return (
    Number(n || 0).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  );
}

export default function RiesgosPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const platform = sp.get('platform') || 'all';

  const pushParams = useCallback(
    (next: Record<string, string>) => {
      const q = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next)) {
        if (!v || v === 'all') q.delete(k);
        else q.set(k, v);
      }
      router.push(`/riesgos${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp],
  );

  const [exposure, setExposure] = useState<RiesgosExposure | null>(null);
  const [aging, setAging] = useState<RiesgosAging | null>(null);
  const [statusDist, setStatusDist] = useState<StatusDistributionItem[]>([]);
  const [churn, setChurn] = useState<ChurnRiskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardsApi.riesgos.exposure({ platform }),
      dashboardsApi.riesgos.aging({ platform }),
      dashboardsApi.riesgos.statusDistribution({ platform }),
      dashboardsApi.riesgos.churnRisk(),
    ])
      .then(([e, a, s, c]) => {
        setExposure(e);
        setAging(a);
        setStatusDist(s.results);
        setChurn(c.results);
      })
      .catch(() => toast.error('Error cargando riesgos'))
      .finally(() => setLoading(false));
  }, [platform]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Riesgos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análisis de mora y exposición financiera
          </p>
        </div>
        <div className="flex items-center gap-2">
          {platform === 'stripe' && (
            <Badge className="bg-indigo-500 text-white">💳 Stripe</Badge>
          )}
          {platform === 'whop' && <Badge className="bg-cyan-500 text-white">🎮 Whop</Badge>}
          <Select value={platform} onValueChange={(v) => pushParams({ platform: v || 'all' })}>
            <SelectTrigger className="h-8 w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="whop">Whop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* 5 KPIs */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Exposición Pendiente"
          value={exposure ? fmtEur(exposure.pending_exposure_eur) : '—'}
          loading={loading}
        />
        <Kpi
          label="Importe en Riesgo"
          value={exposure ? fmtEur(exposure.amount_at_risk_eur) : '—'}
          valueClass="text-red-600"
          border="border-red-100"
          loading={loading}
        />
        <Kpi
          label="Riesgo por Disputas"
          value={exposure ? fmtEur(exposure.dispute_risk_eur) : '—'}
          valueClass="text-orange-600"
          border="border-orange-100"
          loading={loading}
        />
        <Kpi
          label="Reembolsado"
          value={exposure ? fmtEur(exposure.refunded_this_period_eur) : '—'}
          valueClass="text-blue-600"
          border="border-blue-100"
          loading={loading}
        />
        <Kpi
          label="Nº Impagados"
          value={exposure ? String(exposure.overdue_count) : '—'}
          loading={loading}
        />
      </section>

      {/* Aging + Status Distribution */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antigüedad de la Deuda (Basado en Invoices)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tramo</TableHead>
                  <TableHead className="text-right">Cuotas</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-20 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && aging && (
                  <>
                    <TableRow>
                      <TableCell>Abiertas (0-7 días)</TableCell>
                      <TableCell className="text-right font-mono">{aging.cuotas_abiertas}</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtEur(aging.importe_abiertas_eur)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Vencidas (8-30 días)</TableCell>
                      <TableCell className="text-right font-mono">{aging.cuotas_vencidas}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {fmtEur(aging.importe_vencidas_eur)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Crónicas (31-61 días)</TableCell>
                      <TableCell className="text-right font-mono">{aging.cuotas_cronicas}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {fmtEur(aging.importe_cronicas_eur)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Incobrables (+61 días)</TableCell>
                      <TableCell className="text-right font-mono">
                        {aging.cuotas_incobrables}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {fmtEur(aging.importe_incobrables_eur)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {aging.total_cuotas_impagadas}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-red-600 underline">
                        {fmtEur(aging.importe_total_impagado_eur)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por Estado (Invoices)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Importe Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-16 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && statusDist.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Sin datos.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  statusDist.map((s) => (
                    <TableRow key={s.status}>
                      <TableCell className="capitalize">{s.status}</TableCell>
                      <TableCell className="text-right font-mono">{s.cantidad}</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtEur(s.importe_total_eur)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Predictor Churn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔮 Probabilidad de Abandono (Predictor de Churn)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Analiza el riesgo de cancelación basado en historial de impagos y disputas.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            {!loading &&
              churn.map((c) => <ChurnCard key={c.risk_level} item={c} />)}
          </div>
        </CardContent>
      </Card>

      {/* Guía */}
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ ¿Qué es el Churn?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            El &quot;Churn&quot; o abandono es el momento en que un cliente deja de pagar o cancela su
            suscripción. Este predictor analiza señales de advertencia proactivamente para que
            puedas actuar antes de que la cancelación sea definitiva.
          </p>
          <div>
            <p className="font-semibold text-foreground">Rango Temporal</p>
            <p>
              El análisis evalúa el historial completo de las suscripciones vigentes. Se excluyen
              automáticamente las membresías ya canceladas o completadas para centrar el análisis
              en el riesgo de pérdida futura.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Lógica de Cálculo y Clasificación</p>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
              <ChurnGuideCard
                color="red"
                emoji="🔴"
                label="Riesgo Alto"
                text="Suscripciones con 2 o más cuotas vencidas (>7 días de retraso) O con una disputa/incidencia activa abierta en el banco."
              />
              <ChurnGuideCard
                color="yellow"
                emoji="🟡"
                label="Riesgo Medio"
                text="Suscripciones con exactamente 1 cuota vencida (>7 días de retraso). Es el momento ideal para realizar gestiones de cobro manuales."
              />
              <ChurnGuideCard
                color="green"
                emoji="🟢"
                label="Saludable"
                text="Suscripciones activas sin cuotas vencidas. Han pagado todas sus obligaciones a tiempo o están dentro del periodo de gracia operativo (0-7 días)."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  valueClass,
  border,
  loading,
}: {
  label: string;
  value: string;
  valueClass?: string;
  border?: string;
  loading?: boolean;
}) {
  return (
    <Card className={border}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-full" />
        ) : (
          <p className={cn('mt-1 text-2xl font-bold tabular-nums tracking-tight', valueClass)}>
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChurnCard({ item }: { item: ChurnRiskItem }) {
  const isHigh = item.risk_level.toLowerCase().startsWith('riesgo alto');
  const isMid = item.risk_level.toLowerCase().startsWith('riesgo medio');
  const isHealthy = item.risk_level.toLowerCase().startsWith('saludable');
  return (
    <Card
      className={cn(
        isHigh && 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20',
        isMid && 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20',
        isHealthy &&
          'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20',
      )}
    >
      <CardContent className="p-4">
        <p className="font-bold">{item.risk_level}</p>
        <p className="mt-2 text-3xl font-black tabular-nums">{item.subscription_count}</p>
        <p className="text-xs text-muted-foreground">Suscripciones</p>
        <p className="mt-1 text-sm font-mono">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.total_amount_eur)}</p>
        <div className="mt-2">
          {isHigh && <Badge variant="destructive">Acción Inmediata</Badge>}
          {isMid && <Badge variant="secondary">Seguimiento</Badge>}
          {isHealthy && <Badge variant="outline" className="text-green-600">Bajo Riesgo</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChurnGuideCard({
  color,
  emoji,
  label,
  text,
}: {
  color: 'red' | 'yellow' | 'green';
  emoji: string;
  label: string;
  text: string;
}) {
  const tone = {
    red: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20',
    yellow: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20',
    green: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20',
  }[color];
  return (
    <div className={cn('rounded-md border p-2', tone)}>
      <p className="text-xs font-semibold">
        {emoji} {label}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{text}</p>
    </div>
  );
}
