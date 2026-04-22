'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { clientesApi } from '@/lib/clientes-api';
import type { ClienteRow, Operator, PersonRow } from '@/lib/clientes-types';

/**
 * Convierte una fila agrupada por persona en el formato ClienteRow que usa
 * la tabla y el drawer.
 *
 * Estrategia: el "contrato representativo" es el primero (ya viene ordenado
 * por urgencia). Sus identificadores (subscription_id, customer_id) son los
 * que se usan para acciones (drawer, retry, lock, tracking). Los totales y
 * numeros se toman de los agregados de la persona (sumas, peor estado).
 *
 * Limitacion temporal: acciones operan sobre el contrato representativo.
 * Para gestionar N contratos por separado hay que rediseñar el drawer
 * (proximas sesiones).
 */
function personToClienteRow(p: PersonRow): ClienteRow {
  const rep = p.contracts[0] ?? null;
  return {
    subscription_id: rep?.subscription_id ?? p.person_key,
    customer_id: rep?.external_customer_id ?? (p.unified_customer_id ?? ''),
    customer_name: p.customer_name,
    customer_email: p.customer_email,
    customer_phone: p.customer_phone,
    platform: (rep?.platform as ClienteRow['platform']) ?? 'stripe',
    subscription_status: rep?.subscription_status ?? 'unknown',
    subscription_created_at: rep?.subscription_created_at ?? '',
    pause_collection: null,
    days_overdue: p.days_overdue,
    paid_invoices_count: p.paid_count,
    unpaid_invoices_count: p.unpaid_count,
    unpaid_invoices_total: p.unpaid_total,
    category: p.category,
    open_disputes: p.open_disputes,
    won_disputes: p.won_disputes,
    lost_disputes: p.lost_disputes,
    recovery_status: p.recovery_status,
    recovery_contacted_by: p.recovery_contacted_by ?? '',
    recovery_comment_1: p.recovery_comment_1 ?? '',
    recovery_comment_2: p.recovery_comment_2 ?? '',
    recovery_continue_with: p.recovery_continue_with ?? '',
    recovery_locked_by: null,
    recovery_lock_expires_at: null,
    retry_count: 0,
    last_retry_status: null,
    is_refinanced: false,
    original_subscription_id: null,
    refinance_status: null,
    total_count: 0,
    product_name: p.product_name,
    paid_count: p.paid_count,
    paid_total: p.paid_total,
    unpaid_total: p.unpaid_total,
    total_contract_value: p.total_contract_value,
    remaining_contract: p.remaining_contract,
    recovery_updated_at: p.recovery_updated_at,
    objeciones_tags: p.objeciones_tags,
  };
}
import { Card, CardContent } from '@/components/ui/card';
import { FilterHeader, type HardFilters } from '@/components/clientes/filter-header';
import { ClientesTable } from '@/components/clientes/clientes-table';
import { RecoveryDrawer } from '@/components/recovery/recovery-drawer';
import { RECOVERY_STATUS_OPTIONS_BASE } from '@/components/recovery/styles';

// Filtros duros viven en URL; micro-filtros y sort viven en memoria (tabla).
const DEFAULT_FILTERS: HardFilters = {
  category: 'all',
  platform: 'all',
  dispute_state: 'all',
};

export default function ClientesPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const filters: HardFilters = {
    category: sp.get('category') || 'all',
    platform: sp.get('platform') || 'all',
    dispute_state: sp.get('dispute_state') || 'all',
  };
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.max(10, Number(sp.get('limit')) || 50);
  const search = sp.get('search') || '';

  const [pendingSearch, setPendingSearch] = useState(search);
  useEffect(() => setPendingSearch(search), [search]);

  const pushParams = useCallback(
    (next: Partial<{
      category: string;
      platform: string;
      dispute_state: string;
      search: string;
      page: number;
      limit: number;
    }>) => {
      const q = new URLSearchParams(sp.toString());
      const merged = {
        category: next.category ?? filters.category,
        platform: next.platform ?? filters.platform,
        dispute_state: next.dispute_state ?? filters.dispute_state,
        search: next.search ?? search,
        page: next.page ?? page,
        limit: next.limit ?? pageSize,
      };
      for (const [k, v] of Object.entries(merged)) {
        if (v === '' || v === 'all' || v === undefined || v === null) q.delete(k);
        else q.set(k, String(v));
      }
      router.push(`/clientes${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp, filters.category, filters.platform, filters.dispute_state, search, page, pageSize],
  );

  // --- Datos ---
  const [rows, setRows] = useState<ClienteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selected, setSelected] = useState<ClienteRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientesApi.listGrouped({
        search,
        platform: filters.platform,
        category: filters.category,
        dispute_state: filters.dispute_state,
        page,
        page_size: pageSize,
      });
      setRows(data.results.map(personToClienteRow));
      setTotal(data.total_count);
    } catch {
      toast.error('Error cargando clientes');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, filters.platform, filters.category, filters.dispute_state, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    clientesApi
      .operators()
      .then((d) => setOperators(d.results))
      .catch(() => setOperators([]));
  }, []);

  const handleFilterChange = (next: HardFilters) => {
    pushParams({ ...next, page: 1 });
  };

  const handleSearch = () => pushParams({ search: pendingSearch, page: 1 });
  const handleClearSearch = () => {
    setPendingSearch('');
    pushParams({ search: '', page: 1 });
  };

  const clearAll = () => {
    setPendingSearch('');
    router.push('/clientes');
  };

  const handleRowOpen = (row: ClienteRow) => setSelected(row);
  const handleUpdated = (row: ClienteRow) => {
    setRows((prev) => prev.map((r) => (r.subscription_id === row.subscription_id ? row : r)));
    // Si se vació la deuda, no recargamos la página entera; el total no cambia.
  };

  const hasFilters = useMemo(
    () =>
      search !== '' ||
      filters.category !== 'all' ||
      filters.platform !== 'all' ||
      filters.dispute_state !== 'all',
    [search, filters.category, filters.platform, filters.dispute_state],
  );

  return (
    <div className="mx-auto max-w-[1900px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de clientes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vista unificada de clientes, acciones y seguimiento de actividad
          </p>
        </div>
        <FilterHeader value={filters} onChange={handleFilterChange} />
      </header>

      <Card>
        <CardContent className="p-4">
          <ClientesTable
            rows={rows}
            total={total}
            loading={loading}
            operators={operators}
            category={filters.category}
            platform={filters.platform}
            disputeState={filters.dispute_state}
            search={search}
            pendingSearch={pendingSearch}
            onPendingSearchChange={setPendingSearch}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            page={page}
            pageSize={pageSize}
            onPageChange={(p) => pushParams({ page: p })}
            onPageSizeChange={(s) => pushParams({ limit: s, page: 1 })}
            onRowOpen={handleRowOpen}
            onClearFilters={hasFilters ? clearAll : () => {}}
          />
        </CardContent>
      </Card>

      <RecoveryDrawer
        mode="clientes"
        api={clientesApi}
        statusOptions={RECOVERY_STATUS_OPTIONS_BASE}
        row={selected}
        operators={operators}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}

// Suprime el warning del linter: DEFAULT_FILTERS se mantiene para documentar
// el shape por defecto aunque no se use directamente en el render.
void DEFAULT_FILTERS;
