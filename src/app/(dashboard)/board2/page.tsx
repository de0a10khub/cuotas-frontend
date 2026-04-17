'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/format';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, Users, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardKpis {
  cash_by_day: { day: string; total: number }[];
  invoices_by_status: { status: string; count: number }[];
  subs_by_status: { status: string; count: number }[];
  total_revenue: number;
  avg_ticket_30d: number;
  total_customers: number;
}

const INVOICE_STATUS_COLOR: Record<string, string> = {
  paid: '#10b981',
  open: '#f59e0b',
  uncollectible: '#ef4444',
  void: '#94a3b8',
  draft: '#cbd5e1',
};

const SUB_STATUS_COLOR: Record<string, string> = {
  active: '#10b981',
  past_due: '#ef4444',
  canceled: '#94a3b8',
  paused: '#f59e0b',
  trialing: '#3b82f6',
  incomplete: '#cbd5e1',
};

export default function Board2Page() {
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardKpis>('/api/v1/dashboard-kpis/')
      .then(setData)
      .catch(() => toast.error('Error cargando KPIs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Board KPIs</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Vista gerencial de revenue y estado del negocio
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue total"
          value={data ? formatEuros(data.total_revenue) : loading ? '...' : '—'}
          hint="Histórico de pagos exitosos"
          icon={Wallet}
          tone="success"
          sentiment="positive"
        />
        <KpiCard
          label="Ticket medio (30d)"
          value={data ? formatEuros(data.avg_ticket_30d) : loading ? '...' : '—'}
          hint="Media por pago últimos 30d"
          icon={TrendingUp}
          tone="default"
          sentiment="neutral"
        />
        <KpiCard
          label="Clientes totales"
          value={data?.total_customers ?? (loading ? '...' : '—')}
          hint="Base de clientes"
          icon={Users}
          tone="default"
          sentiment="neutral"
        />
        <KpiCard
          label="Invoices"
          value={
            data ? data.invoices_by_status.reduce((a, b) => a + b.count, 0) : loading ? '...' : '—'
          }
          hint="Facturas en el sistema"
          icon={Receipt}
          tone="default"
          sentiment="neutral"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Revenue diario (últimos 30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data?.cash_by_day}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  formatter={(value) => [formatEuros(Number(value)), 'Revenue']}
                  labelClassName="text-slate-600"
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoices por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.invoices_by_status} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="status" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data?.invoices_by_status.map((s) => (
                      <Cell key={s.status} fill={INVOICE_STATUS_COLOR[s.status] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suscripciones por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.subs_by_status} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="status" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data?.subs_by_status.map((s) => (
                      <Cell key={s.status} fill={SUB_STATUS_COLOR[s.status] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
