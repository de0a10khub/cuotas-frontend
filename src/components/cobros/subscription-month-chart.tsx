'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SubscriptionMonthRow } from '@/lib/cobros-types';
import { formatDayLabel, formatEurExact, formatEurShort, formatMonthLabel } from './format-utils';

// Paleta literal de la web vieja (12 colores, cicla si hay más meses).
const PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#6366f1', '#a855f7',
];

interface Props {
  rows: SubscriptionMonthRow[];
}

export function SubscriptionMonthChart({ rows }: Props) {
  const { data, months } = useMemo(() => {
    type Row = { date: string; label: string; [month: string]: number | string };
    const byDay: Record<string, Row> = {};
    const monthsSet = new Set<string>();

    for (const r of rows) {
      monthsSet.add(r.subscription_month);
      if (!byDay[r.invoice_date]) {
        byDay[r.invoice_date] = {
          date: r.invoice_date,
          label: formatDayLabel(r.invoice_date),
        };
      }
      const cur = byDay[r.invoice_date][r.subscription_month];
      byDay[r.invoice_date][r.subscription_month] =
        (typeof cur === 'number' ? cur : 0) + r.amount_eur;
    }

    const months = Array.from(monthsSet).sort();
    const data = Object.values(byDay).sort((a, b) => (a.date > b.date ? 1 : -1));
    return { data, months };
  }, [rows]);

  return (
    <div className="rounded-lg border border-slate-200 bg-background p-4 dark:border-slate-800">
      <h3 className="mb-3 text-sm font-semibold">Distribución cuotas por mes de suscripción</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatEurShort(Number(v) || 0)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-popover)',
                borderColor: 'var(--color-border)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(v) => formatEurExact(Number(v) || 0)}
              labelFormatter={(l) => `Fecha: ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {months.map((m, i) => (
              <Bar
                key={m}
                dataKey={m}
                stackId="months"
                fill={PALETTE[i % PALETTE.length]}
                name={formatMonthLabel(m)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
