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
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Lock,
  Search,
  Users,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { formatEuros } from '@/lib/format';
import type { MoraRow, Operator } from '@/lib/mora-types';
import type { ObjecionTag } from '@/lib/clientes-types';
import { Copyable } from '@/components/data/copyable';
import { StatusPill } from '@/components/data/status-pill';
import { EmptyTable } from '@/components/data/empty-table';
import { DataPagination } from '@/components/data/data-pagination';
import { RefinanIndicator } from '@/components/recovery/refinan-indicator';
import { MultiSelectTags } from '@/components/recovery/multi-select-tags';
import {
  CATEGORY_STYLES,
  PAGE_SIZE_OPTIONS,
  PLATFORM_STYLES,
  RECOVERY_STATUS_STYLES,
  SUBSCRIPTION_STATUS_STYLES,
  categoryFromDays,
  subStatusKey,
} from '@/components/recovery/styles';
import { MoraExportButton } from './export-button';
import { SyncSheetsButton } from './sync-sheets-button';
import { ACTION_NEEDED_OPTIONS } from './constants';

type SortKey =
  | 'customer_name'
  | 'subscription_created_at'
  | 'days_overdue'
  | 'unpaid_total'
  | 'paid_total'
  | 'remaining_contract'
  | null;
type SortDir = 'asc' | 'desc';

const COLSPAN_TOTAL = 17;

interface Props {
  rows: MoraRow[];
  total: number;
  loading: boolean;
  operators: Operator[];
  objecionesCatalog: ObjecionTag[];
  category: string;
  platform: string;
  disputeState: string;
  search: string;
  pendingSearch: string;
  onPendingSearchChange: (v: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  page: number;
  pageSize: number;
  /** 'mora' (default) o 'recobros' — cambia export endpoint y oculta SyncSheets en barra. */
  mode?: 'mora' | 'recobros';
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onRowOpen: (row: MoraRow) => void;
  onClearFilters: () => void;
}

export function MoraTable({
  rows,
  total,
  loading,
  operators,
  objecionesCatalog,
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
  mode = 'mora',
}: Props) {
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionNeededFilter, setActionNeededFilter] = useState<'all' | 'needed' | 'not_needed'>('all');
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);

  useEffect(() => {
    setOperatorFilter('all');
    setStatusFilter('all');
    setActionNeededFilter('all');
    setTagsFilter([]);
  }, [category, platform, disputeState, search]);

  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    setSortKey(null);
    setSortDir('asc');
  }, [category, platform, disputeState, search]);

  const operatorOptions = useMemo(() => {
    const fromApi = operators.map((o) => o.display_name);
    const fromRows = rows
      .map((r) => (r.recovery_contacted_by || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromRows]));
  }, [operators, rows]);

  const statusOptionsInData = useMemo(
    () => Array.from(new Set(rows.map((r) => r.recovery_status || 'Pendiente'))),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (operatorFilter === '__none__') {
        if ((r.recovery_contacted_by || '').trim()) return false;
      } else if (operatorFilter !== 'all' && (r.recovery_contacted_by || '') !== operatorFilter) {
        return false;
      }
      const rec = r.recovery_status || 'Pendiente';
      if (statusFilter !== 'all' && rec !== statusFilter) return false;
      if (actionNeededFilter === 'needed' && !r.is_action_needed) return false;
      if (actionNeededFilter === 'not_needed' && r.is_action_needed) return false;
      if (tagsFilter.length > 0) {
        const rowTags = new Set((r.objeciones_tags || []).map((t) => t.id));
        const hasAny = tagsFilter.some((t) => rowTags.has(t));
        if (!hasAny) return false;
      }
      return true;
    });
  }, [rows, operatorFilter, statusFilter, actionNeededFilter, tagsFilter]);

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
        } else if (sortKey === 'days_overdue') {
          av = a.days_overdue;
          bv = b.days_overdue;
        } else if (sortKey === 'paid_total') {
          av = Number(a.paid_total) || 0;
          bv = Number(b.paid_total) || 0;
        } else if (sortKey === 'remaining_contract') {
          av = Number(a.remaining_contract) || 0;
          bv = Number(b.remaining_contract) || 0;
        } else {
          av = Number(a.unpaid_total ?? a.unpaid_invoices_total) || 0;
          bv = Number(b.unpaid_total ?? b.unpaid_invoices_total) || 0;
        }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
      return arr;
    }
    // default sort: days_overdue ASC siempre en /mora
    arr.sort((a, b) => a.days_overdue - b.days_overdue);
    return arr;
  }, [filtered, sortKey, sortDir]);

  const kpiCount = sorted.length;
  const kpiUnpaid = sorted.reduce(
    (acc, r) => acc + (Number(r.unpaid_total ?? r.unpaid_invoices_total) || 0),
    0,
  );
  const kpiPaid = sorted.reduce((acc, r) => acc + (Number(r.paid_total) || 0), 0);

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'unpaid_total' || key === 'paid_total' ? 'desc' : 'asc');
    }
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  const anyMicroFilter =
    operatorFilter !== 'all' ||
    statusFilter !== 'all' ||
    actionNeededFilter !== 'all' ||
    tagsFilter.length > 0 ||
    !!search;

  return (
    <div className="flex flex-col gap-3">
      {/* Micro-filtros + búsqueda + acciones globales */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={operatorFilter} onValueChange={(v) => setOperatorFilter(v || 'all')}>
          <SelectTrigger className="w-44" size="sm">
            <SelectValue placeholder="Operario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los operarios</SelectItem>
            <SelectItem value="__none__">Sin asignar</SelectItem>
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
            {statusOptionsInData.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actionNeededFilter}
          onValueChange={(v) => setActionNeededFilter((v as typeof actionNeededFilter) || 'all')}
        >
          <SelectTrigger className="w-44" size="sm">
            <SelectValue placeholder="Action needed" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_NEEDED_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-60">
          <MultiSelectTags
            options={objecionesCatalog}
            selected={tagsFilter}
            onChange={setTagsFilter}
            placeholder="Objeciones..."
            emptyText="Sin etiquetas disponibles"
          />
        </div>

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

        {mode === 'mora' && <SyncSheetsButton />}

        <MoraExportButton
          search={search}
          platform={platform}
          category={category}
          dispute_state={disputeState}
          operator={operatorFilter}
          status={statusFilter}
          action_needed={actionNeededFilter}
          tags={tagsFilter}
          disabled={loading}
          mode={mode}
        />

        {anyMicroFilter && (
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
        <Table
          className={cn(
            // Densidad compacta (como Conciliación y /clientes): cabe en ~1600px.
            'text-[11px]',
            '[&_th]:h-8 [&_th]:px-1.5 [&_th]:text-[10.5px]',
            '[&_td]:px-1.5 [&_td]:py-1.5',
            '[&_[data-slot=badge]]:text-[10px] [&_[data-slot=badge]]:px-1.5 [&_[data-slot=badge]]:py-0',
          )}
        >
          <TableHeader>
            {/* KPI row: 6 celdas con proporciones 1+2+2+3+2+7 = 17 */}
            <TableRow className="bg-primary/5">
              <TableHead colSpan={1} className="py-2" />
              <TableHead
                colSpan={2}
                className="py-2 text-sm font-bold uppercase tracking-wider text-primary"
              >
                Resumen filtrado
              </TableHead>
              <TableHead
                colSpan={2}
                className="py-2 text-center text-sm font-bold text-primary"
              >
                {kpiCount} clientes
              </TableHead>
              <TableHead
                colSpan={3}
                className="py-2 text-right text-sm font-bold text-primary"
              >
                Deuda total:{' '}
                <span className={cn(kpiUnpaid > 0 && 'text-red-600 dark:text-red-400')}>
                  {formatEuros(kpiUnpaid, { decimals: 2 })}
                </span>
              </TableHead>
              <TableHead
                colSpan={2}
                className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400"
              >
                Pagado: {formatEuros(kpiPaid, { decimals: 2 })}
              </TableHead>
              <TableHead
                colSpan={7}
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
              <TableHead>Objeciones</TableHead>
              <TableHead>Operario</TableHead>
              <TableHead className="max-w-[200px]">C1</TableHead>
              <TableHead className="max-w-[160px]">Continuar</TableHead>
              <TableHead className="max-w-[180px]">C2</TableHead>
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
              <SortableHead
                label="Días"
                active={sortKey === 'days_overdue'}
                dir={sortDir}
                onClick={() => toggleSort('days_overdue')}
              />
              <SortableHead
                label="Deuda"
                active={sortKey === 'unpaid_total'}
                dir={sortDir}
                onClick={() => toggleSort('unpaid_total')}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: COLSPAN_TOTAL }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && sorted.length === 0 && (
              <EmptyTable colSpan={COLSPAN_TOTAL} icon={Users} title="Sin clientes en mora" />
            )}

            {!loading &&
              sorted.map((r, idx) => {
                const isLocked = !!r.recovery_locked_by;
                const catStyle =
                  CATEGORY_STYLES[r.category] ??
                  CATEGORY_STYLES[categoryFromDays(r.days_overdue)];
                const unpaid = Number(r.unpaid_total ?? r.unpaid_invoices_total) || 0;
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
                        <div className="flex items-center gap-1.5">
                          {r.is_action_needed && (
                            <AlertCircle
                              className="h-4 w-4 shrink-0 animate-pulse text-rose-500"
                              aria-label="Requiere acción"
                            />
                          )}
                          <p className="truncate font-medium">{r.customer_name || '—'}</p>
                        </div>
                        <Copyable value={r.customer_email} className="text-xs text-slate-500" />
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

                    <TableCell className="px-1">
                      <div className="flex flex-col gap-1">
                        <StatusPill
                          value={r.recovery_status || 'Pendiente'}
                          styles={RECOVERY_STATUS_STYLES}
                        />
                        {r.is_action_needed && (
                          <span
                            className="flex h-3 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-1 text-[7px] font-black uppercase tracking-tighter text-rose-600 animate-pulse dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300"
                          >
                            DEUDA NUEVA
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {catStyle && <StatusPill value={r.category} styles={CATEGORY_STYLES} />}
                    </TableCell>

                    <TableCell className="max-w-[180px]">
                      {r.objeciones_tags && r.objeciones_tags.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {r.objeciones_tags.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                              style={{ backgroundColor: t.bg_color, color: t.text_color }}
                              title={t.name}
                            >
                              {t.name}
                            </span>
                          ))}
                          {r.objeciones_tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{r.objeciones_tags.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-sm">
                      {r.recovery_contacted_by || <span className="text-slate-400">—</span>}
                    </TableCell>

                    <TableCell
                      className="max-w-[200px] truncate text-xs text-slate-600 dark:text-slate-300"
                      title={r.recovery_comment_1}
                    >
                      {r.recovery_comment_1 || <span className="text-slate-400">—</span>}
                    </TableCell>

                    <TableCell
                      className="max-w-[160px] truncate text-xs font-medium text-primary"
                      title={r.recovery_continue_with}
                    >
                      {r.recovery_continue_with || <span className="text-slate-400">—</span>}
                    </TableCell>

                    <TableCell
                      className="max-w-[180px] truncate text-xs text-slate-600 dark:text-slate-300"
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
                        <span className="text-red-600 dark:text-red-400">{r.days_overdue}d</span>
                      ) : (
                        <span className="text-slate-400">0d</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-semibold tabular-nums">
                      {unpaid > 0 ? (
                        <span className="text-red-600 dark:text-red-400">
                          {formatEuros(unpaid, { decimals: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {isLocked && (
                        <span
                          className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600"
                          title={`Bloqueado por ${r.recovery_locked_by}`}
                        >
                          <Lock className="h-3 w-3" />
                        </span>
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
  if (!hasAny) return <span className="text-slate-400 opacity-20">—</span>;
  return (
    <div className="flex items-center gap-3 text-xs">
      <DisputeDot color="bg-amber-500" label="Abiertas" value={open} />
      <DisputeDot color="bg-rose-500" label="Perdidas (cliente gana)" value={lost} />
      <DisputeDot color="bg-emerald-500" label="Ganadas (nosotros ganamos)" value={won} />
    </div>
  );
}

function DisputeDot({ color, label, value }: { color: string; label: string; value: number }) {
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
