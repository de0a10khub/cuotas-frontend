'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';
import { formatPercent } from '@/lib/format';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Percent,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface MoraStats {
  total_tracked: number;
  recovery_rate: number;
  retry_success_rate: number;
  total_recuperados: number;
  total_incobrables: number;
  by_status: { status: string; count: number }[];
  actions_by_day: { day: string; status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  'Al Dia': '#10b981',
  Recuperame: '#f59e0b',
  Critico: '#f97316',
  Incobrable: '#ef4444',
  Recuperado: '#10b981',
  Renegociado: '#3b82f6',
  Reembolsado: '#94a3b8',
  'Pagos completados': '#10b981',
  'Disputa perdida': '#dc2626',
};

export default function MoraStatsPage() {
  const [stats, setStats] = useState<MoraStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<MoraStats>('/api/v1/mora-stats/')
      .then(setStats)
      .catch(() => toast.error('Error cargando stats'))
      .finally(() => setLoading(false));
  }, []);

  // Agrupar acciones por día
  type DayRow = { day: string; success?: number; failed?: number; pending?: number };
  const actionsPerDay: DayRow[] = stats?.actions_by_day.reduce<DayRow[]>(
    (acc, row) => {
      const entry = acc.find((a) => a.day === row.day);
      const key = row.status as 'success' | 'failed' | 'pending';
      if (entry) {
        entry[key] = (entry[key] || 0) + row.count;
      } else {
        acc.push({ day: row.day, [key]: row.count });
      }
      return acc;
    },
    [],
  ) || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mora · Estadísticas</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Recovery rate, distribución por estado y evolución de acciones
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Recovery rate"
          value={stats ? formatPercent(stats.recovery_rate) : loading ? '...' : '—'}
          hint="% clientes recuperados sobre total"
          icon={Percent}
          tone="success"
          sentiment={
            stats && stats.recovery_rate >= 50
              ? 'positive'
              : stats && stats.recovery_rate < 25
                ? 'negative'
                : 'neutral'
          }
        />
        <KpiCard
          label="Retry success rate"
          value={stats ? formatPercent(stats.retry_success_rate) : loading ? '...' : '—'}
          hint="% retries exitosos"
          icon={TrendingUp}
          tone="success"
          sentiment={stats && stats.retry_success_rate >= 50 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Recuperados"
          value={stats?.total_recuperados ?? (loading ? '...' : '—')}
          icon={CheckCircle2}
          tone="success"
          sentiment="positive"
        />
        <KpiCard
          label="Incobrables"
          value={stats?.total_incobrables ?? (loading ? '...' : '—')}
          icon={XCircle}
          tone="danger"
          sentiment={stats && stats.total_incobrables > 0 ? 'negative' : 'neutral'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats?.by_status.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats?.by_status}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry: unknown) => {
                      const e = entry as { status?: string };
                      return e.status || '';
                    }}
                  >
                    {stats?.by_status.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trackings por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats?.by_status.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats?.by_status}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis
                    dataKey="status"
                    angle={-20}
                    textAnchor="end"
                    height={60}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stats?.by_status.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones por día (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : actionsPerDay.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={actionsPerDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="success"
                  name="Éxito"
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  name="Fallido"
                  stroke="#ef4444"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Pendiente"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
      <AlertTriangle className="h-10 w-10" />
      <p className="text-sm">Sin datos suficientes para mostrar</p>
    </div>
  );
}
