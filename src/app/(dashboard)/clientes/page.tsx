'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { clientesApi } from '@/lib/clientes-api';
import type { ClienteRow, Operator, PersonRow, Platform } from '@/lib/clientes-types';

// Adaptador modo persona → shape ClienteRow para reutilizar ClientesTable.
// Modo persona agrupa por unified_customer: 1 fila con N contratos sumados.
// El "platform" mostrado se queda como el del primer contrato real (no acceso),
// con un fallback a 'multi' visual si hay más de uno.
function personToRow(p: PersonRow): ClienteRow {
  const realContracts = p.contracts.filter((c) => !c.is_access_only);
  const primary = realContracts[0] || p.contracts[0];
  const platforms = (p.platforms as string[]).filter((x) => x !== 'whop' || !p.platforms.includes('whop-erp'));
  const platformLabel = (platforms.length > 1 ? 'multi' : platforms[0]) as Platform;
  return {
    // Usa el sub_id REAL del contrato representativo (lo manda el backend).
    // Antes se mandaba person_key (UUID/'platform:sub') -> el upsert creaba
    // un row huerfano en op_mora_recovery_tracking que el JOIN del listado
    // no encontraba -> notas no aparecian al recargar.
    subscription_id: (p as PersonRow & { subscription_id?: string }).subscription_id || primary?.subscription_id || p.person_key,
    customer_id: (p as PersonRow & { customer_id?: string }).customer_id || p.unified_customer_id || primary?.external_customer_id || p.person_key,
    customer_name: p.customer_name,
    customer_email: p.customer_email,
    customer_phone: p.customer_phone,
    platform: platformLabel,
    subscription_status: primary?.subscription_status || 'unknown',
    // Alta = fecha más antigua entre todos los contratos del cliente
    // (cuándo apareció por primera vez en el sistema). Backend la calcula
    // como first_seen_at; fallback al contrato representativo si no llega.
    subscription_created_at:
      (p as PersonRow & { first_seen_at?: string }).first_seen_at ||
      primary?.subscription_created_at ||
      '',
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
    recovery_contacted_by: p.recovery_contacted_by || '',
    recovery_comment_1: p.recovery_comment_1 || '',
    recovery_comment_2: p.recovery_comment_2 || '',
    recovery_continue_with: p.recovery_continue_with || '',
    recovery_locked_by: null,
    recovery_lock_expires_at: null,
    retry_count: 0,
    last_retry_status: null,
    is_refinanced: false,
    original_subscription_id: null,
    refinance_status: null,
    total_count: p.n_contracts,
    product_name: p.product_name,
    paid_count: p.paid_count,
    paid_total: p.paid_total,
    unpaid_total: p.unpaid_total,
    total_contract_value: p.total_contract_value,
    remaining_contract: p.remaining_contract,
    objeciones_tags: p.objeciones_tags,
    recovery_updated_at: p.recovery_updated_at,
  };
}
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
      // Modo persona: 1 fila por unified_customer (todas sus cuentas sumadas).
      // Antes usábamos `list` (1 fila por contrato) — un cliente con cuentas en
      // varias plataformas salía duplicado.
      const data = await clientesApi.listGrouped({
        search,
        platform: filters.platform,
        category: filters.category,
        page,
        page_size: pageSize,
      });
      setRows(data.results.map(personToRow));
      setTotal(data.total_count);
    } catch {
      toast.error('Error cargando clientes');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, filters.platform, filters.category, page, pageSize]);

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

  const handleSearch = () => {
    // Si el input quedó vacío (usuario borró el texto y volvió a buscar),
    // tratamos como limpiar: pendingSearch resetea + URL pierde ?search=...
    if (!pendingSearch.trim()) {
      setPendingSearch('');
      pushParams({ search: '', page: 1 });
      return;
    }
    pushParams({ search: pendingSearch, page: 1 });
  };
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
    // MERGE en vez de REPLACE: el backend devuelve solo los campos del
    // tracking (status/comments/etc.) o un stub minimo si esta filtrado.
    // Si reemplazaramos el row entero, perderiamos customer_name/paid_count/
    // etc. y la fila apareceria "vacia" en la lista (parece que desaparecio).
    setRows((prev) =>
      prev.map((r) => (r.subscription_id === row.subscription_id ? { ...r, ...row } : r)),
    );
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
    <div className="relative mx-auto max-w-[1900px] space-y-5 p-4">
      {/* Orbs ambient */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              👤
            </span>
            <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Gestión de Clientes
            </span>
          </h1>
          <p className="mt-1 ml-12 text-sm text-blue-300/60">
            Vista unificada de clientes, acciones y seguimiento de actividad
          </p>
          <p className="mt-1 ml-12 text-xs text-blue-300/40">
            Mostrando <b className="text-cyan-300">{rows.length}</b> de{' '}
            <b className="text-cyan-300">{total}</b> clientes
          </p>
        </div>
        <FilterHeader value={filters} onChange={handleFilterChange} />
      </header>

      <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] shadow-[0_0_30px_rgba(59,130,246,0.10)]">
        <div className="flex items-center justify-between border-b border-blue-500/15 bg-gradient-to-r from-blue-950/40 via-blue-900/30 to-blue-950/40 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            👥 Directorio Unificado de Clientes
          </h2>
        </div>
        <div className="p-4">
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
        </div>
      </div>

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
