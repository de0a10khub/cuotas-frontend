'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { formatEuros, formatPercent } from '@/lib/format';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldAlert, TrendingDown, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface RiesgosData {
  total_subs: number;
  active_subs: number;
  canceled_subs: number;
  past_due_subs: number;
  churn_rate: number;
  disputed_payments: number;
  dispute_rate: number;
  at_risk_count: number;
  at_risk_top: { id: string; name: string; email: string; exposure: number }[];
}

export default function RiesgosPage() {
  const [data, setData] = useState<RiesgosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<RiesgosData>('/api/v1/riesgos/')
      .then(setData)
      .catch(() => toast.error('Error cargando riesgos'))
      .finally(() => setLoading(false));
  }, []);

  const subsPie = data
    ? [
        { name: 'Activas', value: data.active_subs, color: '#10b981' },
        { name: 'Past due', value: data.past_due_subs, color: '#ef4444' },
        { name: 'Canceladas', value: data.canceled_subs, color: '#94a3b8' },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Riesgos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Churn, disputes y clientes en riesgo de impago
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Churn rate"
          value={data ? formatPercent(data.churn_rate) : loading ? '...' : '—'}
          hint={data ? `${data.canceled_subs} canceladas de ${data.total_subs}` : undefined}
          icon={TrendingDown}
          tone="danger"
          sentiment={data && data.churn_rate > 10 ? 'negative' : 'neutral'}
        />
        <KpiCard
          label="Dispute rate"
          value={data ? formatPercent(data.dispute_rate) : loading ? '...' : '—'}
          hint={data ? `${data.disputed_payments} disputas` : undefined}
          icon={ShieldAlert}
          tone="danger"
          sentiment={data && data.disputed_payments > 0 ? 'negative' : 'neutral'}
        />
        <KpiCard
          label="Clientes en riesgo"
          value={data?.at_risk_count ?? (loading ? '...' : '—')}
          hint="Con cuotas vencidas >30d"
          icon={AlertCircle}
          tone="warning"
          sentiment={data && data.at_risk_count > 0 ? 'negative' : 'neutral'}
        />
        <KpiCard
          label="Subs activas"
          value={data?.active_subs ?? (loading ? '...' : '—')}
          icon={Users}
          tone="success"
          sentiment="positive"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de suscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : subsPie.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">Sin suscripciones</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={subsPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: unknown) => {
                      const e = entry as { name?: string };
                      return e.name || '';
                    }}
                  >
                    {subsPie.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top clientes en riesgo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : data?.at_risk_top.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">
                Sin clientes en riesgo ahora mismo
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Exposure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.at_risk_top.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name || '—'}</div>
                        <div className="text-xs text-slate-500">{c.email}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                        {formatEuros(c.exposure)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
