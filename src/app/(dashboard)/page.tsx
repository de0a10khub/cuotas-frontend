'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatEuros, formatPercent, sentimentFor } from '@/lib/format';
import type { AgingBuckets, InvoiceStats } from '@/lib/types';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingDown, AlertTriangle, CheckCircle2, Flame, ShieldX, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [aging, setAging] = useState<AgingBuckets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<InvoiceStats>('/api/v1/invoices/stats/'),
      api.get<AgingBuckets>('/api/v1/invoices/aging/'),
    ])
      .then(([s, a]) => {
        setStats(s);
        setAging(a);
      })
      .catch(() => toast.error('Error cargando métricas'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Resumen de actividad de los últimos 30 días
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Cash cobrado (30d)"
          value={stats ? formatEuros(stats.cash_collected_30d) : loading ? '...' : '—'}
          hint="Pagos exitosos últimos 30 días"
          icon={Wallet}
          tone="success"
          sentiment={sentimentFor('income', stats?.cash_collected_30d ?? 0)}
        />
        <KpiCard
          label="Exposure actual"
          value={stats ? formatEuros(stats.exposure) : loading ? '...' : '—'}
          hint="Deuda abierta sin cobrar"
          icon={TrendingDown}
          tone="danger"
          sentiment={sentimentFor('debt', stats?.exposure ?? 0)}
        />
        <KpiCard
          label="Success rate"
          value={stats ? formatPercent(stats.success_rate) : loading ? '...' : '—'}
          hint={stats ? `${stats.paid_invoices} de ${stats.total_invoices} facturas` : undefined}
          icon={CheckCircle2}
          tone="success"
          sentiment={sentimentFor('rate', stats?.success_rate ?? 0)}
        />
        <KpiCard
          label="Total invoices"
          value={stats?.total_invoices ?? (loading ? '...' : '—')}
          hint="En todo el sistema"
          icon={Receipt}
          tone="default"
          sentiment="neutral"
        />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Aging de facturas sin cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <AgingBucket
                label="Al día"
                hint="0-7 días"
                value={aging?.al_dia ?? 0}
                icon={CheckCircle2}
                sentiment="positive"
              />
              <AgingBucket
                label="Recupérame"
                hint="8-30 días"
                value={aging?.recuperame ?? 0}
                icon={AlertTriangle}
                sentiment={aging?.recuperame ? 'negative' : 'neutral'}
              />
              <AgingBucket
                label="Crítico"
                hint="31-60 días"
                value={aging?.critico ?? 0}
                icon={Flame}
                sentiment={aging?.critico ? 'negative' : 'neutral'}
              />
              <AgingBucket
                label="Incobrable"
                hint="60+ días"
                value={aging?.incobrable ?? 0}
                icon={ShieldX}
                sentiment={aging?.incobrable ? 'negative' : 'neutral'}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AgingBucket({
  label,
  hint,
  value,
  icon: Icon,
  sentiment,
}: {
  label: string;
  hint: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  sentiment: 'positive' | 'negative' | 'neutral';
}) {
  const valueColor = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-foreground',
  }[sentiment];
  const iconColor = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-500',
  }[sentiment];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <Icon className={`h-5 w-5 ${iconColor}`} />
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
    </div>
  );
}
