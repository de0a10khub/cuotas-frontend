'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyCycleRow } from '@/lib/cobros-types';
import { formatDayLabel, formatEurExact, formatEurShort } from './format-utils';

// Stacks fieles a la web vieja. Hex exactos.
const STACKS = [
  { key: 'Cierres (Directo)', color: '#3b82f6' },
  { key: 'Cuotas Pagadas', color: '#22c55e' },
  { key: 'Abiertas (≤7d)', color: '#eab308' },
  { key: 'Vencidas (8-30d)', color: '#f97316' },
  { key: 'Crónicas (31-61d)', color: '#ef4444' },
  { key: 'Incobrable (+61d)', color: '#020617' },
] as const;

interface ChartRow {
  date: string;
  label: string;
  'Cierres (Directo)': number;
  'Cuotas Pagadas': number;
  'Abiertas (≤7d)': number;
  'Vencidas (8-30d)': number;
  'Crónicas (31-61d)': number;
  'Incobrable (+61d)': number;
  total: number;
}

interface Props {
  rows: DailyCycleRow[];
}

export function StatusStackedChart({ rows }: Props) {
  const data: ChartRow[] = useMemo(
    () =>
      [...rows].reverse().map((r) => ({
        date: r.invoice_date,
        label: formatDayLabel(r.invoice_date),
        'Cierres (Directo)': r.direct_payments_eur,
        'Cuotas Pagadas': r.paid_invoices_eur,
        'Abiertas (≤7d)': r.real_open_eur,
        'Vencidas (8-30d)': r.past_due_eur,
        'Crónicas (31-61d)': r.uncollectible_eur,
        'Incobrable (+61d)': r.bad_debt_eur,
        total: r.total_eur,
      })),
    [rows],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-background p-4 dark:border-slate-800">
      <h3 className="mb-3 text-sm font-semibold">Distribución por estado</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatEurShort(Number(v) || 0)}
              width={60}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
              content={<CustomTooltip />}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {STACKS.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color}>
                {/* Total encima solo del último stack */}
                {i === STACKS.length - 1 && (
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={(v: unknown) => {
                      const n = Number(v) || 0;
                      return n > 0 ? formatEurShort(n) : '';
                    }}
                    style={{ fontSize: 10, fill: 'var(--color-foreground)' }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const items = payload.filter((p) => Number(p.value) > 0);
  const total = items.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  return (
    <div className="rounded-md border border-slate-200 bg-popover p-2 shadow-md dark:border-slate-800">
      <p className="mb-1 border-b border-slate-200 pb-1 text-[11px] font-bold uppercase text-muted-foreground dark:border-slate-800">
        Fecha: {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((p) => (
          <li key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="flex-1 text-slate-600 dark:text-slate-300">{p.name}</span>
            <span className="tabular-nums font-medium">
              {formatEurExact(Number(p.value) || 0)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1 dark:border-slate-800">
        <span className="text-[11px] font-bold uppercase text-muted-foreground">Total</span>
        <span className="tabular-nums text-xs font-bold">{formatEurExact(total)}</span>
      </div>
    </div>
  );
}
