'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { DailyCycleRow } from '@/lib/cobros-types';
import { formatDayLabel, formatEurExact } from './format-utils';

interface Props {
  rows: DailyCycleRow[];
  loading?: boolean;
}

export function DailyCyclesTable({ rows, loading }: Props) {
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] shadow-[0_0_30px_rgba(59,130,246,0.10)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blue-500/15 bg-gradient-to-r from-blue-950/40 via-blue-900/30 to-blue-950/40">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300/70">
                Fecha
              </th>
              <th className="bg-blue-500/10 px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-blue-300">
                Facturado
              </th>
              <th className="bg-emerald-500/10 px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                Cobrado
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300/70">
                Directo
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300/70">
                Cuotas
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-300/80">
                Pendiente
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300/70">
                Mora %
              </th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-blue-500/10">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <Skeleton className="h-4 w-full bg-blue-900/30" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-blue-300/40">
                  Sin datos en el rango seleccionado
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((r) => {
                const ratio = r.ratio_unpaid_pct;
                const ratioTone =
                  ratio >= 20
                    ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                    : ratio >= 10
                      ? 'bg-orange-500/15 text-orange-300 ring-orange-500/30'
                      : ratio > 0
                        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                        : 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
                return (
                  <tr
                    key={r.invoice_date}
                    onMouseEnter={() => setHoverRow(r.invoice_date)}
                    onMouseLeave={() => setHoverRow(null)}
                    className="border-b border-blue-500/10 transition-colors hover:bg-blue-500/5"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-blue-100">
                      {formatDayLabel(r.invoice_date)}
                    </td>
                    <td className="bg-blue-500/5 px-3 py-2.5 text-right font-bold tabular-nums text-blue-200">
                      {formatEurExact(r.paid_eur + r.open_eur)}
                    </td>
                    <td className="bg-emerald-500/5 px-3 py-2.5 text-right font-bold tabular-nums text-emerald-200">
                      {formatEurExact(r.paid_eur)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-blue-300">
                      {r.direct_payments_eur > 0 ? formatEurExact(r.direct_payments_eur) : <span className="text-blue-300/30">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">
                      {r.paid_invoices_eur > 0 ? formatEurExact(r.paid_invoices_eur) : <span className="text-blue-300/30">—</span>}
                    </td>
                    <td className="relative px-3 py-2.5 text-right tabular-nums text-amber-300">
                      {r.open_eur > 0 ? formatEurExact(r.open_eur) : <span className="text-blue-300/30">—</span>}
                      {hoverRow === r.invoice_date && r.open_eur > 0 && (
                        <div className="absolute right-2 top-full z-20 mt-1 w-72 rounded-lg border border-blue-500/30 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-3 text-left text-xs shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                          <div className="mb-2 flex items-center justify-between border-b border-blue-500/20 pb-2 font-semibold uppercase tracking-wider text-blue-200">
                            <span className="text-[10px]">Detalle Pendiente</span>
                            <span className="tabular-nums text-amber-300">{formatEurExact(r.open_eur)}</span>
                          </div>
                          <ul className="space-y-1.5">
                            <li className="flex items-center justify-between gap-4">
                              <span className="text-yellow-300/80">▸ Abiertas (≤7d)</span>
                              <span className="tabular-nums text-yellow-200">{formatEurExact(r.real_open_eur)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4">
                              <span className="text-orange-300/80">▸ Vencidas (8-30d)</span>
                              <span className="tabular-nums text-orange-200">{formatEurExact(r.past_due_eur)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4">
                              <span className="text-rose-300/80">▸ Crónicas (31-61d)</span>
                              <span className="tabular-nums text-rose-200">{formatEurExact(r.uncollectible_eur)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 border-t border-blue-500/15 pt-1.5 font-bold">
                              <span className="text-rose-200">▸ Incobrable (+61d)</span>
                              <span className="tabular-nums text-rose-100">{formatEurExact(r.bad_debt_eur)}</span>
                            </li>
                          </ul>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ring-1', ratioTone)}>
                        {ratio.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
