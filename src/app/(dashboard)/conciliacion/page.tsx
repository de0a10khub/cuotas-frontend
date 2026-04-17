'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, GitMerge, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InstallmentData {
  invoice_id: string | null;
  status: string;
  invoice_status: string | null;
  amount_due: string | null;
  amount_paid: string | null;
  due_date: string | null;
  paid_at: string | null;
}

interface Row {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  cuota_1: InstallmentData;
  cuota_2: InstallmentData;
}

interface ConciliacionResponse {
  month: string;
  total_customers: number;
  summary_cuota_1: Record<string, number>;
  summary_cuota_2: Record<string, number>;
  rows: Row[];
}

const STATUS_TONE: Record<string, string> = {
  PAGADA_ONTIME: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  PAGADA_LATE: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
  PENDIENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  INCOBRABLE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  OTHER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  MISSING: 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
  PAGADA_ONTIME: 'On-time',
  PAGADA_LATE: 'Late',
  PENDIENTE: 'Pendiente',
  INCOBRABLE: 'Incobrable',
  OTHER: 'Otro',
  MISSING: 'Sin cuota',
};

const STATUS_COLOR_VAR: Record<string, string> = {
  PAGADA_ONTIME: 'text-emerald-600 dark:text-emerald-400',
  PAGADA_LATE: 'text-lime-600 dark:text-lime-400',
  PENDIENTE: 'text-amber-600 dark:text-amber-400',
  INCOBRABLE: 'text-red-600 dark:text-red-400',
  OTHER: 'text-slate-500',
  MISSING: 'text-slate-400',
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ConciliacionPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<ConciliacionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api
      .get<ConciliacionResponse>(`/api/v1/conciliacion/?month=${month}`)
      .then(setData)
      .catch(() => toast.error('Error cargando conciliación'))
      .finally(() => setLoading(false));
  }, [month]);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const newDate = new Date(y, m - 1 + delta, 1);
    setMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const filteredRows = data?.rows.filter(
    (r) =>
      !debounced ||
      r.customer_name.toLowerCase().includes(debounced.toLowerCase()) ||
      r.customer_email.toLowerCase().includes(debounced.toLowerCase()),
  );

  const exportCsv = () => {
    if (!data) return;
    const header = [
      'cliente', 'email',
      'cuota_1_status', 'cuota_1_vencimiento', 'cuota_1_importe', 'cuota_1_pagado_el',
      'cuota_2_status', 'cuota_2_vencimiento', 'cuota_2_importe', 'cuota_2_pagado_el',
    ];
    const rows = (filteredRows || []).map((r) => [
      r.customer_name, r.customer_email,
      r.cuota_1.status, r.cuota_1.due_date || '', r.cuota_1.amount_due || '',
      r.cuota_1.paid_at || '',
      r.cuota_2.status, r.cuota_2.due_date || '', r.cuota_2.amount_due || '',
      r.cuota_2.paid_at || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciliacion-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV descargado');
  };

  const monthLabel = data
    ? new Date(data.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : month;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conciliación</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            1ª y 2ª cuota por mes · {data ? `${data.total_customers} clientes` : 'Cargando...'}
          </p>
        </div>
        <Button onClick={exportCsv} disabled={!data}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-background p-2 dark:border-slate-800 w-fit">
        <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-36 border-0 focus-visible:ring-0 text-center font-medium capitalize"
        />
        <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryCard title="1ª cuota" summary={data.summary_cuota_1} />
          <SummaryCard title="2ª cuota" summary={data.summary_cuota_2} />
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>1ª cuota</TableHead>
              <TableHead className="text-right">Importe 1ª</TableHead>
              <TableHead>Vencimiento 1ª</TableHead>
              <TableHead>2ª cuota</TableHead>
              <TableHead className="text-right">Importe 2ª</TableHead>
              <TableHead>Vencimiento 2ª</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            )}
            {filteredRows?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <GitMerge className="h-10 w-10" />
                    <p>Sin datos para este mes</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filteredRows?.map((r) => (
              <TableRow key={r.customer_id}>
                <TableCell>
                  <div className="font-medium">{r.customer_name || '—'}</div>
                  <div className="text-xs text-slate-500">{r.customer_email}</div>
                </TableCell>
                <TableCell>
                  <Badge className={cn('font-medium', STATUS_TONE[r.cuota_1.status])}>
                    {STATUS_LABEL[r.cuota_1.status] || r.cuota_1.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {r.cuota_1.amount_due ? formatEuros(r.cuota_1.amount_due) : '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {r.cuota_1.due_date
                    ? new Date(r.cuota_1.due_date).toLocaleDateString('es-ES')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={cn('font-medium', STATUS_TONE[r.cuota_2.status])}>
                    {STATUS_LABEL[r.cuota_2.status] || r.cuota_2.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {r.cuota_2.amount_due ? formatEuros(r.cuota_2.amount_due) : '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {r.cuota_2.due_date
                    ? new Date(r.cuota_2.due_date).toLocaleDateString('es-ES')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-slate-400 text-center capitalize">{monthLabel}</p>
    </div>
  );
}

function SummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: Record<string, number>;
}) {
  const order = ['PAGADA_ONTIME', 'PAGADA_LATE', 'PENDIENTE', 'INCOBRABLE', 'OTHER', 'MISSING'];
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {order.map((status) => {
            const count = summary[status] || 0;
            return (
              <div key={status} className="min-w-0">
                <p className={cn('text-2xl font-bold tabular-nums', STATUS_COLOR_VAR[status])}>
                  {count}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">
                  {STATUS_LABEL[status]}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
