'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { MORA_STATUSES, type MoraTracking, type Paginated } from '@/lib/types';
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
import { Search, AlertTriangle, Lock, LockOpen } from 'lucide-react';
import { MoraDetailSheet } from './mora-detail-sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_TONE: Record<string, string> = {
  'Al Dia': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Recuperame: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Critico: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  Incobrable: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  Recuperado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Renegociado: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Reembolsado: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'Pagos completados': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'Disputa perdida': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export default function MoraPage() {
  const [data, setData] = useState<Paginated<MoraTracking> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced) params.set('search', debounced);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    setLoading(true);
    api
      .get<Paginated<MoraTracking>>(`/api/v1/mora-tracking/?${params}`)
      .then(setData)
      .catch(() => toast.error('Error cargando morosos'))
      .finally(() => setLoading(false));
  }, [debounced, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mora</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {data ? `${data.count} clientes en gestión` : 'Cargando...'} · Excluye estados terminales
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {MORA_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Contactado por</TableHead>
              <TableHead>Lock</TableHead>
              <TableHead>Última actualización</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
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
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <AlertTriangle className="h-10 w-10" />
                    <p>No hay morosos con esos filtros</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {data?.results.map((m) => (
              <TableRow
                key={m.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(m.id)}
              >
                <TableCell>
                  <div className="font-medium">{m.customer_name || '—'}</div>
                  <div className="text-xs text-slate-500">{m.customer_email}</div>
                </TableCell>
                <TableCell>
                  <Badge className={cn('font-medium', STATUS_TONE[m.status])}>{m.status}</Badge>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {m.contacted_by_name || '—'}
                </TableCell>
                <TableCell>
                  {m.is_locked ? (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Lock className="h-3.5 w-3.5" />
                      <span className="text-xs">{m.locked_by_name}</span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <LockOpen className="h-3.5 w-3.5" />
                      Libre
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                  {new Date(m.updated_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MoraDetailSheet
        trackingId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={load}
      />
    </div>
  );
}
