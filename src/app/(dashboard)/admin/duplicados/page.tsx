'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Merge, Split, X, Search, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  adminDataApi,
  type DuplicatePending,
  type DuplicatesSummary,
} from '@/lib/admin-data-api';

const PLATFORM_COLORS: Record<string, string> = {
  stripe: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  whop_native: 'bg-purple-100 text-purple-800 border-purple-200',
  whop_erp: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function DuplicadosPage() {
  const [summary, setSummary] = useState<DuplicatesSummary | null>(null);
  const [rows, setRows] = useState<DuplicatePending[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        adminDataApi.duplicatesSummary(),
        adminDataApi.listDuplicates({ status: statusFilter, search, page, limit }),
      ]);
      setSummary(s);
      setRows(d.results);
      setTotal(d.total_count);
    } catch {
      toast.error('Error cargando duplicados');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (pendingSearch !== search) {
        setSearch(pendingSearch);
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [pendingSearch, search]);

  const doAction = async (
    id: string,
    action: 'merge' | 'split' | 'ignore',
  ) => {
    const labels = {
      merge: '¿Fusionar estas cuentas como 1 cliente?',
      split: '¿Separar estas cuentas como clientes distintos?',
      ignore: '¿Ignorar este duplicado?',
    };
    if (!confirm(labels[action])) return;
    setBusy(id);
    try {
      if (action === 'merge') await adminDataApi.mergeDuplicate(id);
      else if (action === 'split') await adminDataApi.splitDuplicate(id);
      else await adminDataApi.ignoreDuplicate(id);
      toast.success(
        { merge: 'Fusionado', split: 'Separado', ignore: 'Ignorado' }[action],
      );
      load();
    } catch {
      toast.error('Error');
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Duplicados pendientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clientes con cuentas en múltiples plataformas. Decide si fusionar o separar.
        </p>
      </header>

      {summary && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Kpi label="Total detectados" value={summary.total} icon="📊" />
          <Kpi label="Pendientes" value={summary.pending} icon="⏳" valueClass="text-amber-600" />
          <Kpi label="Fusionados" value={summary.merged} icon="✓" valueClass="text-emerald-600" />
          <Kpi label="Ignorados" value={summary.ignored} icon="—" valueClass="text-slate-500" />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{total} casos</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Buscar email..."
                className="h-8 w-60 pl-7"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v || 'pending');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="merged">Fusionados</SelectItem>
                <SelectItem value="ignored">Ignorados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plataformas</TableHead>
                <TableHead>Cuentas</TableHead>
                <TableHead>Nombres detectados</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-40 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Sin casos para este filtro.
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.map((d) => {
                const names = Array.from(
                  new Set(d.accounts_found.map((a) => a.name).filter(Boolean)),
                ).join(' · ');
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {d.platforms_found.map((p) => (
                          <Badge key={p} variant="outline" className={`text-[10px] ${PLATFORM_COLORS[p] || ''}`}>
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{d.accounts_found.length}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs">
                      {names || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={d.status === 'pending' ? 'outline' : 'secondary'}
                        className="text-[10px]"
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={busy === d.id}
                            onClick={() => doAction(d.id, 'merge')}
                            title="Son el mismo humano → 1 customer con N cuentas"
                          >
                            <Merge className="mr-1 h-3 w-3" /> Fusionar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={busy === d.id}
                            onClick={() => doAction(d.id, 'split')}
                            title="Son humanos distintos → N customers"
                          >
                            <Split className="mr-1 h-3 w-3" /> Separar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7"
                            disabled={busy === d.id}
                            onClick={() => doAction(d.id, 'ignore')}
                            title="Ignorar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">resuelto</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span>{total} duplicados</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="px-2 py-1">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  valueClass = '',
}: {
  label: string;
  value: number;
  icon: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>
          {value.toLocaleString('es-ES')}
        </p>
      </CardContent>
    </Card>
  );
}
