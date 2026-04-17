'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { api } from '@/lib/api';
import { formatEuros, formatPercent } from '@/lib/format';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AgingBuckets, InvoiceStats } from '@/lib/types';
import { Wallet, TrendingDown, CheckCircle2, Percent } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardKpis {
  cash_by_day: { day: string; total: number }[];
  invoices_by_status: { status: string; count: number }[];
}

const AGING_COLORS = {
  al_dia: '#10b981',
  recuperame: '#f59e0b',
  critico: '#f97316',
  incobrable: '#ef4444',
} as const;

const AGING_LABELS = {
  al_dia: 'Al día (0-7d)',
  recuperame: 'Recupérame (8-30d)',
  critico: 'Crítico (31-60d)',
  incobrable: 'Incobrable (60+d)',
} as const;

export default function DatosPage() {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [aging, setAging] = useState<AgingBuckets | null>(null);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<InvoiceStats>('/api/v1/invoices/stats/'),
      api.get<AgingBuckets>('/api/v1/invoices/aging/'),
      api.get<DashboardKpis>('/api/v1/dashboard-kpis/'),
    ])
      .then(([s, a, k]) => {
        setStats(s);
        setAging(a);
        setKpis(k);
      })
      .catch(() => toast.error('Error cargando datos'))
      .finally(() => setLoading(false));
  }, []);

  const agingData = aging
    ? (Object.keys(AGING_LABELS) as (keyof typeof AGING_LABELS)[]).map((key) => ({
        bucket: AGING_LABELS[key],
        count: aging[key],
        color: AGING_COLORS[key],
      }))
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Datos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          KPIs de facturación y aging detallado
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Cash cobrado (30d)"
          value={stats ? formatEuros(stats.cash_collected_30d) : loading ? '...' : '—'}
          hint="Pagos exitosos"
          icon={Wallet}
          tone="success"
          sentiment="positive"
        />
        <KpiCard
          label="Exposure"
          value={stats ? formatEuros(stats.exposure) : loading ? '...' : '—'}
          hint="Deuda abierta"
          icon={TrendingDown}
          tone="danger"
          sentiment={stats && stats.exposure > 0 ? 'negative' : 'neutral'}
        />
        <KpiCard
          label="Success rate"
          value={stats ? formatPercent(stats.success_rate) : loading ? '...' : '—'}
          hint={stats ? `${stats.paid_invoices}/${stats.total_invoices} pagadas` : undefined}
          icon={CheckCircle2}
          tone="success"
          sentiment={stats && stats.success_rate >= 80 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Total invoices"
          value={stats?.total_invoices ?? (loading ? '...' : '—')}
          icon={Percent}
          tone="default"
          sentiment="neutral"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Aging detallado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="bucket" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {agingData.map((row) => (
                    <Cell key={row.bucket} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash collected diario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={kpis?.cash_by_day}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `€${v}`} />
                <Tooltip formatter={(v) => [formatEuros(Number(v)), 'Cobrado']} />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
