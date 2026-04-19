'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { JsonCell } from './json-cell';

interface Props {
  rows: Record<string, unknown>[];
  loading?: boolean;
  emptyMessage?: string;
}

const DISPUTE_STATUS_STYLES: Record<string, string> = {
  none: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  needs_response: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  warning_needs_response: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  lost: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

function titleize(key: string): string {
  return key
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function isDateKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('at') || k.includes('date') || k.includes('snapshot');
}

function isAmountKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes('amount') ||
    k.includes('total') ||
    k.includes('price') ||
    k.includes('collected') ||
    k.includes('refunded')
  );
}

function looksLikeExternalId(val: string): boolean {
  return (
    val.length > 20 &&
    (val.includes('-') ||
      val.startsWith('sub_') ||
      val.startsWith('in_') ||
      val.startsWith('pi_') ||
      val.startsWith('dp_') ||
      val.startsWith('cus_'))
  );
}

function renderCell(key: string, value: unknown) {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">null</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <Badge variant={value ? 'default' : 'outline'} className="text-[10px]">
        {value ? 'Sí' : 'No'}
      </Badge>
    );
  }

  if (typeof value === 'object') {
    return <JsonCell value={value} />;
  }

  if (typeof value === 'string' && isDateKey(key)) {
    try {
      const d = parseISO(value);
      if (!isNaN(d.getTime())) {
        return (
          <span suppressHydrationWarning className="whitespace-nowrap font-mono text-[11px]">
            {format(d, 'dd/MM/yyyy HH:mm', { locale: es })}
          </span>
        );
      }
    } catch {}
  }

  if (typeof value === 'number' && isAmountKey(key)) {
    return (
      <span className="tabular-nums">
        {(value / 100).toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + ' €'}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="tabular-nums">{value.toLocaleString('es-ES')}</span>;
  }

  if (key === 'dispute_status' && typeof value === 'string') {
    const cls = DISPUTE_STATUS_STYLES[value] || 'bg-slate-100 text-slate-600';
    return <Badge className={cn('text-[10px]', cls)}>{value}</Badge>;
  }

  if (typeof value === 'string' && looksLikeExternalId(value)) {
    return (
      <span className="font-mono text-[11px]" title={value}>
        {value.slice(0, 8)}…
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

export function DynamicTable({ rows, loading, emptyMessage = 'Sin resultados' }: Props) {
  const headers = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  // Summary: suma de columnas con keys de amount/total/price
  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const numericAmountKeys = headers.filter((h) =>
      isAmountKey(h) && typeof rows[0][h] === 'number',
    );
    if (numericAmountKeys.length === 0) return null;
    const sums: Record<string, number> = {};
    for (const h of numericAmountKeys) {
      sums[h] = rows.reduce((acc, r) => acc + (Number(r[h]) || 0), 0) / 100;
    }
    return sums;
  }, [rows, headers]);

  if (loading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-sm text-muted-foreground dark:border-slate-800">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              {headers.map((h) => (
                <TableHead key={h} className="whitespace-nowrap">
                  {titleize(h)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-center text-xs text-slate-400">{i + 1}</TableCell>
                {headers.map((h) => (
                  <TableCell key={h}>{renderCell(h, r[h])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {summary && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs">
          <span className="font-semibold">Totales:</span>
          {Object.entries(summary).map(([k, v]) => (
            <span key={k} className="tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">{titleize(k)}:</span>{' '}
              {v.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) + ' €'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
