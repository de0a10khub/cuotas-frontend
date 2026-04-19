'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DailyCycleRow } from '@/lib/cobros-types';
import { formatDayLabel, formatEurExact } from './format-utils';

interface Props {
  rows: DailyCycleRow[];
  loading?: boolean;
}

export function DailyCyclesTable({ rows, loading }: Props) {
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead className="bg-blue-50/40 text-right font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              Facturado
            </TableHead>
            <TableHead className="text-right">Previsión a Cobrar</TableHead>
            <TableHead className="bg-emerald-50/40 text-right font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              Total Cobrado
            </TableHead>
            <TableHead className="text-right text-blue-600">Cobrado Directo</TableHead>
            <TableHead className="text-right text-emerald-600">Cobrado Cuotas</TableHead>
            <TableHead className="text-right text-amber-600">Pendiente Cuotas</TableHead>
            <TableHead className="text-right">Morosidad %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 7 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                Sin datos en el rango seleccionado
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            rows.map((r) => {
              const ratio = r.ratio_unpaid_pct;
              const ratioTone =
                ratio >= 20
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : ratio >= 10
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
              return (
                <TableRow
                  key={r.invoice_date}
                  onMouseEnter={() => setHoverRow(r.invoice_date)}
                  onMouseLeave={() => setHoverRow(null)}
                >
                  <TableCell className="text-xs font-medium">
                    {formatDayLabel(r.invoice_date)}
                  </TableCell>
                  <TableCell className="bg-blue-50/40 text-right font-semibold tabular-nums text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                    {r.contract_value_eur > 0 ? formatEurExact(r.contract_value_eur) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatEurExact(r.paid_eur + r.open_eur)}
                  </TableCell>
                  <TableCell className="bg-emerald-50/40 text-right font-semibold tabular-nums text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {formatEurExact(r.paid_eur)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-blue-600">
                    {r.direct_payments_eur > 0 ? formatEurExact(r.direct_payments_eur) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {r.paid_invoices_eur > 0 ? formatEurExact(r.paid_invoices_eur) : '—'}
                  </TableCell>
                  <TableCell className="relative text-right tabular-nums text-amber-600">
                    {r.open_eur > 0 ? formatEurExact(r.open_eur) : '—'}
                    {hoverRow === r.invoice_date && r.open_eur > 0 && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-slate-200 bg-popover p-2 text-left text-xs shadow-lg dark:border-slate-800">
                        <div className="mb-1 flex items-center justify-between gap-4 border-b border-muted pb-1 font-semibold">
                          <span>Detalle Pendiente:</span>
                          <span className="tabular-nums">{formatEurExact(r.open_eur)}</span>
                        </div>
                        <ul className="space-y-0.5">
                          <li className="flex items-center justify-between gap-4 text-xs font-medium">
                            <span className="text-yellow-600">- Abiertas (≤7d):</span>
                            <span className="tabular-nums text-yellow-600">
                              {formatEurExact(r.real_open_eur)}
                            </span>
                          </li>
                          <li className="flex items-center justify-between gap-4 text-xs font-medium">
                            <span className="text-orange-600">- Vencidas (8-30d):</span>
                            <span className="tabular-nums text-orange-600">
                              {formatEurExact(r.past_due_eur)}
                            </span>
                          </li>
                          <li className="flex items-center justify-between gap-4 border-b border-muted pb-1 text-xs font-medium">
                            <span className="text-red-600">- Crónicas (31-61d):</span>
                            <span className="tabular-nums text-red-600">
                              {formatEurExact(r.uncollectible_eur)}
                            </span>
                          </li>
                          <li className="flex items-center justify-between gap-4 text-xs font-medium">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              - Incobrable (+61d):
                            </span>
                            <span className="tabular-nums font-bold text-slate-900 dark:text-slate-100">
                              {formatEurExact(r.bad_debt_eur)}
                            </span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium tabular-nums', ratioTone)}>
                      {ratio.toFixed(2)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
