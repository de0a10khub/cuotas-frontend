'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/format';
import type { Invoice, Paginated } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_TONE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  uncollectible: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  void: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const AGING_TONE: Record<string, string> = {
  'Al Dia': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Recuperame: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Critico: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  Incobrable: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function CobrosPage() {
  const [data, setData] = useState<Paginated<Invoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced, statusFilter]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced) params.set('search', debounced);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('page', String(page));
    setLoading(true);
    api
      .get<Paginated<Invoice>>(`/api/v1/invoices/?${params}`)
      .then(setData)
      .catch(() => toast.error('Error cargando cobros'))
      .finally(() => setLoading(false));
  }, [debounced, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.ceil(data.count / 50) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Cobros</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {data ? `${data.count} facturas en el sistema` : 'Cargando...'}
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o ID Stripe..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="open">Abierta</SelectItem>
            <SelectItem value="paid">Pagada</SelectItem>
            <SelectItem value="uncollectible">Incobrable</SelectItem>
            <SelectItem value="void">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Aging</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead>Vencimiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {data?.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Receipt className="h-10 w-10" />
                    <p>No hay facturas con esos filtros</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {data?.results.map((inv) => {
              const remaining = Number(inv.amount_remaining);
              return (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="font-medium">{inv.customer_name || '—'}</div>
                    <div className="text-xs text-slate-500">{inv.customer_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('font-medium', STATUS_TONE[inv.status])}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inv.status === 'paid' ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <Badge className={cn('font-medium', AGING_TONE[inv.aging_bucket])}>
                        {inv.aging_bucket}
                        {inv.aging_days !== null && inv.aging_days > 0 && (
                          <span className="ml-1 opacity-70">+{inv.aging_days}d</span>
                        )}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatEuros(inv.amount_due)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-medium',
                      remaining > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-400',
                    )}
                  >
                    {formatEuros(inv.amount_remaining)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString('es-ES') : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {data && data.count > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
