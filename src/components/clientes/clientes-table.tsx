'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Lock,
  MessageSquare,
  RotateCw,
  Search,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { formatEuros } from '@/lib/format';
import type { ClienteRow, Operator } from '@/lib/clientes-types';
import { Copyable } from '@/components/data/copyable';
import { StatusPill } from '@/components/data/status-pill';
import { EmptyTable } from '@/components/data/empty-table';
import { DataPagination } from '@/components/data/data-pagination';
import { ExportButton } from './export-button';
import { RefinanIndicator } from '@/components/recovery/refinan-indicator';
import {
  CATEGORY_STYLES,
  PAGE_SIZE_OPTIONS,
  PLATFORM_STYLES,
  RECOVERY_STATUS_STYLES,
  SUBSCRIPTION_STATUS_STYLES,
  categoryFromDays,
  subStatusKey,
} from '@/components/recovery/styles';

type SortKey = 'customer_name' | 'subscription_created_at' | 'unpaid_invoices_total' | null;
type SortDir = 'asc' | 'desc';

interface Props {
  rows: ClienteRow[];
  total: number;
  loading: boolean;
  operators: Operator[];
  category: string; // filtro duro, para decidir el auto-sort por defecto
  platform: string;
  disputeState: string;
  search: string;
  pendingSearch: string;
  onPendingSearchChange: (v: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onRowOpen: (row: ClienteRow) => void;
  onClearFilters: () => void;
}

export function ClientesTable({
  rows,
  total,
  loading,
  operators,
  category,
  platform,
  disputeState,
  search,
  pendingSearch,
  onPendingSearchChange,
  onSearch,
  onClearSearch,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowOpen,
  onClearFilters,
}: Props) {
  // --- Micro-filtros client-side (no persisten en URL) ---
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subStatusFilter, setSubStatusFilter] = useState('all');

  // Reset micro-filtros al cambiar filtros duros o al buscar (mismo comportamiento que la web vieja).
  useEffect(() => {
    setOperatorFilter('all');
    setStatusFilter('all');
    setSubStatusFilter('all');
  }, [category, platform, disputeState, search]);

  // --- Sort client-side ---
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Remount key: cambia al cambiar filtros duros + búsqueda → resetea sort.
  useEffect(() => {
    setSortKey(null);
    setSortDir('asc');
  }, [category, platform, disputeState, search]);

  const operatorOptions = useMemo(() => {
    const fromApi = operators.map((o) => o.display_name);
    const fromRows = rows
      .map((r) => (r.recovery_contacted_by || '').trim())
      .filter((v) => v.length > 0);
    const uniq = Array.from(new Set([...fromApi, ...fromRows]));
    return uniq;
  }, [operators, rows]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.recovery_status || 'Pendiente')));
  }, [rows]);

  const subStatusOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.subscription_status)));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (operatorFilter !== 'all' && (r.recovery_contacted_by || '') !== operatorFilter) return false;
      const rec = r.recovery_status || 'Pendiente';
      if (statusFilter !== 'all' && rec !== statusFilter) return false;
      if (subStatusFilter !== 'all' && r.subscription_status !== subStatusFilter) return false;
      return true;
    });
  }, [rows, operatorFilter, statusFilter, subStatusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortKey) {
      arr.sort((a, b) => {
        let av: number | string;
        let bv: number | string;
        if (sortKey === 'customer_name') {
          av = (a.customer_name || '').toLowerCase();
          bv = (b.customer_name || '').toLowerCase();
        } else if (sortKey === 'subscription_created_at') {
          av = new Date(a.subscription_created_at).getTime();
          bv = new Date(b.subscription_created_at).getTime();
        } else {
          av = Number(a.unpaid_invoices_total) || 0;
          bv = Number(b.unpaid_invoices_total) || 0;
        }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
        // Tie-breaker por nombre ASC
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      });
      return arr;
    }
    // Auto-sort por defecto (como la web vieja)
    if (!category || category === 'all') {
      arr.sort(
        (a, b) =>
          a.days_overdue - b.days_overdue ||
          (a.customer_name || '').localeCompare(b.customer_name || ''),
      );
    } else {
      arr.sort(
        (a, b) =>
          (Number(b.unpaid_invoices_total) || 0) - (Number(a.unpaid_invoices_total) || 0) ||
          (a.customer_name || '').localeCompare(b.customer_name || ''),
      );
    }
    return arr;
  }, [filtered, sortKey, sortDir, category]);

  const kpiCount = sorted.length;
  const kpiTotal = sorted.reduce((acc, r) => acc + (Number(r.unpaid_invoices_total) || 0), 0);

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'unpaid_invoices_total' ? 'desc' : 'asc');
    }
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  const anyMicroFilter =
    operatorFilter !== 'all' || statusFilter !== 'all' || subStatusFilter !== 'all';

  return (
    <div className="flex flex-col gap-3">
      {/* Barra superior: micro-filtros + búsqueda + export */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={operatorFilter} onValueChange={(v) => setOperatorFilter(v || 'all')}>
          <SelectTrigger className="w-44" size="sm">
            <SelectValue placeholder="Operario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los operarios</SelectItem>
            {operatorOptions.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
          <SelectTrigger className="w-44" size="sm">
            <SelectValue placeholder="Estado recobro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subStatusFilter} onValueChange={(v) => setSubStatusFilter(v || 'all')}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue placeholder="Sub. estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {subStatusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={pendingSearch}
            onChange={(e) => onPendingSearchChange(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Buscar: nombre, email o telf..."
            className="h-8 pl-8 pr-8"
          />
          {pendingSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button size="sm" onClick={onSearch}>
          <Search className="h-4 w-4" />
          Buscar
        </Button>

        <ExportButton
          search={search}
          platform={platform}
          category={category}
          dispute_state={disputeState}
          operator={operatorFilter}
          status={statusFilter}
          sub_status={subStatusFilter}
          disabled={loading}
        />

        {(anyMicroFilter || search) && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div
        key={`${search}-${page}-${platform}-${category}-${disputeState}`}
        className="rounded-lg border border-slate-200 bg-background dark:border-slate-800"
      >
        <Table>
          <TableHeader>
            {/* Fila-resumen KPI dentro del thead (3 celdas + franja gris — como la web vieja) */}
            <TableRow className="bg-primary/5">
              <TableHead
                colSpan={4}
                className="py-2 text-sm font-bold uppercase tracking-wider text-primary"
              >
                Resumen filtrado
              </TableHead>
              <TableHead
                colSpan={4}
                className="py-2 text-center text-sm font-bold text-primary"
              >
                {kpiCount} clientes
              </TableHead>
              <TableHead
                colSpan={6}
                className="py-2 text-right text-sm font-bold text-primary"
              >
                Deuda total:{' '}
                <span className={cn(kpiTotal > 0 && 'text-red-600 dark:text-red-400')}>
                  {formatEuros(kpiTotal, { decimals: 2 })}
                </span>
              </TableHead>
              <TableHead
                colSpan={5}
                className="bg-slate-100/60 py-2 dark:bg-slate-800/50"
              />
            </TableRow>

            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              <SortableHead
                label="Cliente"
                active={sortKey === 'customer_name'}
                dir={sortDir}
                onClick={() => toggleSort('customer_name')}
              />
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Tipo mora</TableHead>
              <TableHead>Operario</TableHead>
              <TableHead className="max-w-[220px]">C1 (Inic.)</TableHead>
              <TableHead className="max-w-[180px]">Continuar</TableHead>
              <TableHead className="max-w-[200px]">C2 (Seg.)</TableHead>
              <TableHead>Disputas</TableHead>
              <TableHead>Pagos</TableHead>
              <TableHead>Plat.</TableHead>
              <TableHead>Sub. Est.</TableHead>
              <SortableHead
                label="Alta"
                active={sortKey === 'subscription_created_at'}
                dir={sortDir}
                onClick={() => toggleSort('subscription_created_at')}
              />
              <TableHead>Días</TableHead>
              <SortableHead
                label="Deuda"
                active={sortKey === 'unpaid_invoices_total'}
                dir={sortDir}
                onClick={() => toggleSort('unpaid_invoices_total')}
                className="text-right"
              />
              <TableHead className="text-center" title="Intentos de Cobro">
                <RotateCw className="mx-auto h-3.5 w-3.5" />
              </TableHead>
              <TableHead className="text-center">CRM</TableHead>
              <TableHead className="text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 19 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && sorted.length === 0 && (
              <EmptyTable colSpan={19} icon={Users} title="Sin clientes con esos filtros" />
            )}

            {!loading &&
              sorted.map((r, idx) => {
                const isLocked = !!r.recovery_locked_by;
                const catStyle = CATEGORY_STYLES[r.category] ?? CATEGORY_STYLES[categoryFromDays(r.days_overdue)];
                return (
                  <TableRow
                    key={r.subscription_id}
                    onClick={() => !isLocked && onRowOpen(r)}
                    className={cn(
                      'cursor-pointer',
                      isLocked && 'bg-slate-50 opacity-80 dark:bg-slate-900/40',
                    )}
                  >
                    <TableCell className="text-center text-xs text-slate-400">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>

                    <TableCell className="max-w-[240px] cursor-copy hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.customer_name || '—'}</p>
                        <Copyable
                          value={r.customer_email}
                          className="text-xs text-slate-500"
                        />
                        <RefinanIndicator
                          isRefinanced={r.is_refinanced}
                          status={r.refinance_status}
                          originalSubscriptionId={r.original_subscription_id}
                          className="mt-1"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="cursor-copy text-sm hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20">
                      <Copyable value={r.customer_phone} />
                    </TableCell>

                    <TableCell>
                      <StatusPill
                        value={r.recovery_status || 'Pendiente'}
                        styles={RECOVERY_STATUS_STYLES}
                      />
                    </TableCell>

                    <TableCell>
                      {catStyle && <StatusPill value={r.category} styles={CATEGORY_STYLES} />}
                    </TableCell>

                    <TableCell className="text-sm">
                      {r.recovery_contacted_by || <span className="text-slate-400">—</span>}
                    </TableCell>

                    <TableCell
                      className="max-w-[220px] truncate text-xs text-slate-600 dark:text-slate-300"
                      title={r.recovery_comment_1}
                    >
                      {r.recovery_comment_1 || <span className="text-slate-400">—</span>}
                    </TableCell>

                    <TableCell
                      className="max-w-[180px] truncate text-xs font-medium text-primary"
                      title={r.recovery_continue_with}
                    >
                      {r.recovery_continue_with || <span className="text-slate-400">—</span>}
                    </TableCell>

                    <TableCell
                      className="max-w-[200px] truncate text-xs text-slate-600 dark:text-slate-300"
                      title={r.recovery_comment_2}
                    >
                      {r.recovery_comment_2 || <span className="text-slate-400">—</span>}
                    </TableCell>

                    <TableCell>
                      <DisputesCell
                        open={r.open_disputes}
                        lost={r.lost_disputes}
                        won={r.won_disputes}
                      />
                    </TableCell>

                    <TableCell className="text-xs tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {r.paid_invoices_count}
                      </span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-red-600 dark:text-red-400">
                        {r.unpaid_invoices_count}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusPill value={r.platform} styles={PLATFORM_STYLES} />
                    </TableCell>

                    <TableCell>
                      <StatusPill
                        value={subStatusKey(r.subscription_status, r.pause_collection)}
                        styles={SUBSCRIPTION_STATUS_STYLES}
                      />
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {(() => {
                        try {
                          return format(parseISO(r.subscription_created_at), 'dd/MM/yyyy', {
                            locale: es,
                          });
                        } catch {
                          return '—';
                        }
                      })()}
                    </TableCell>

                    <TableCell className="text-xs font-medium">
                      {r.days_overdue > 0 ? (
                        <span className="text-red-600 dark:text-red-400">
                          {r.days_overdue}d
                        </span>
                      ) : (
                        <span className="text-slate-400">0d</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-semibold tabular-nums">
                      {Number(r.unpaid_invoices_total) > 0 ? (
                        <span className="text-red-600 dark:text-red-400">
                          {formatEuros(r.unpaid_invoices_total, { decimals: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium',
                          r.last_retry_status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : r.last_retry_status === 'FAILURE'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {r.retry_count || 0}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <a
                        href={`/crm/contacts?search=${encodeURIComponent(r.customer_email)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-primary dark:border-slate-800 dark:hover:bg-slate-800"
                        title="Abrir en CRM"
                      >
                        <UserIcon className="h-3.5 w-3.5" />
                      </a>
                    </TableCell>

                    <TableCell className="text-center">
                      {isLocked ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"
                          title={`Bloqueado por ${r.recovery_locked_by}`}
                        >
                          <Lock className="h-3 w-3" />
                          LOCKED
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowOpen(r);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        page={page}
        pageSize={pageSize}
        total={total}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 font-medium transition-colors hover:text-primary',
          active && 'text-primary',
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

function DisputesCell({
  open,
  lost,
  won,
}: {
  open: number;
  lost: number;
  won: number;
}) {
  const hasAny = open > 0 || lost > 0 || won > 0;
  if (!hasAny) {
    return <span className="text-slate-400 opacity-20">—</span>;
  }
  return (
    <div className="flex items-center gap-3 text-xs">
      <DisputeDot color="bg-amber-500" label="Abiertas" value={open} />
      <DisputeDot color="bg-rose-500" label="Perdidas (cliente gana)" value={lost} />
      <DisputeDot color="bg-emerald-500" label="Ganadas (nosotros ganamos)" value={won} />
    </div>
  );
}

function DisputeDot({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <span
      className="flex flex-col items-center leading-none text-slate-600 dark:text-slate-300"
      title={label}
    >
      <span className="text-xs font-medium tabular-nums">{value}</span>
      <span className={cn('mt-0.5 h-1 w-1 rounded-full', color)} />
    </span>
  );
}
