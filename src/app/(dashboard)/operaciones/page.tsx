'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { formatPercent } from '@/lib/format';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, RefreshCcw, Users } from 'lucide-react';
import { toast } from 'sonner';

interface OperacionesData {
  cohorts: { cohort: string; total: number; defaulted: number; default_rate: number }[];
  refinance_customers: number;
  refinance_rate: number;
  total_customers: number;
}

export default function OperacionesPage() {
  const [data, setData] = useState<OperacionesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<OperacionesData>('/api/v1/operaciones/')
      .then(setData)
      .catch(() => toast.error('Error cargando operaciones'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Operaciones</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cohort default rate y clientes refinanciados
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label="Clientes totales"
          value={data?.total_customers ?? (loading ? '...' : '—')}
          icon={Users}
          tone="default"
          sentiment="neutral"
        />
        <KpiCard
          label="Refinanciados"
          value={data?.refinance_customers ?? (loading ? '...' : '—')}
          hint="Clientes con >1 compra"
          icon={RefreshCcw}
          tone="default"
          sentiment="neutral"
        />
        <KpiCard
          label="Refinance rate"
          value={data ? formatPercent(data.refinance_rate) : loading ? '...' : '—'}
          hint="% clientes que recompran"
          icon={Briefcase}
          tone="default"
          sentiment={data && data.refinance_rate > 20 ? 'positive' : 'neutral'}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Cohort default rate (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data?.cohorts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="cohort" className="text-xs" />
                <YAxis
                  yAxisId="left"
                  className="text-xs"
                  label={{ value: '%', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                  allowDecimals={false}
                  label={{ value: 'compras', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="default_rate"
                  name="Default rate (%)"
                  stroke="#ef4444"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="total"
                  name="Compras"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compras por cohorte</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.cohorts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="cohort" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total compras" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="defaulted" name="Con default" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
