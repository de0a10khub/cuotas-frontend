'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PhoneCall, Search, X } from 'lucide-react';

import { fullpayApi } from '@/lib/fullpay-api';
import { moraApi } from '@/lib/mora-api';
import type { FullPayLead } from '@/lib/fullpay-types';
import type { ClienteRow, Operator } from '@/lib/clientes-types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FullPayFilter, type FullPayFilters } from '@/components/full-pay/full-pay-filter';
import { FullPayTable } from '@/components/full-pay/full-pay-table';
import { RecoveryDrawer } from '@/components/recovery/recovery-drawer';
import { RECOVERY_STATUS_OPTIONS_MORA } from '@/components/recovery/styles';

/**
 * Convierte un FullPayLead al shape ClienteRow que necesita RecoveryDrawer.
 * Reusamos el drawer de mora para que los operarios tengan el mismo flujo
 * (Gestión, Seguimiento, Pagos, Reintentos, Mora) y queden las notas de
 * Seguimiento registradas en op_mora_recovery_tracking.
 */
function fullPayLeadToClienteRow(lead: FullPayLead): ClienteRow {
  return {
    subscription_id: lead.subscription_id,
    customer_id: lead.customer_id,
    customer_name: lead.customer_name || '',
    customer_email: lead.customer_email || '',
    customer_phone: lead.customer_phone || '',
    platform: lead.platform,
    subscription_status: 'active',
    subscription_created_at: lead.alta_date,
    pause_collection: null,
    days_overdue: 0,
    paid_invoices_count: lead.paid_count || 0,
    unpaid_invoices_count: 0,
    unpaid_invoices_total: 0,
    category: 'Al día',
    open_disputes: lead.open_disputes || 0,
    won_disputes: lead.won_disputes || 0,
    lost_disputes: lead.lost_disputes || 0,
    recovery_status: lead.recovery_status,
    recovery_contacted_by: lead.recovery_operator || '',
    recovery_comment_1: lead.recovery_comment || '',
    recovery_comment_2: '',
    recovery_continue_with: '',
    recovery_locked_by: lead.recovery_locked_by,
    recovery_lock_expires_at: lead.recovery_lock_expires_at,
    retry_count: 0,
    last_retry_status: null,
    is_refinanced: false,
    original_subscription_id: null,
    refinance_status: null,
    total_count: lead.total_count || 0,
    product_name: lead.product_name,
    paid_count: lead.paid_count,
    paid_total: lead.paid_total,
  };
}

export default function FullPayPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const filters: FullPayFilters = {
    platform: sp.get('platform') || 'all',
    status: sp.get('status') || 'all',
    operator: sp.get('operator') || 'all',
  };
  const search = sp.get('search') || '';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.max(10, Number(sp.get('limit')) || 50);

  const [pendingSearch, setPendingSearch] = useState(search);
  useEffect(() => setPendingSearch(search), [search]);

  const pushParams = useCallback(
    (next: Partial<{ platform: string; status: string; operator: string; search: string; page: number; limit: number }>) => {
      const q = new URLSearchParams(sp.toString());
      const merged = {
        platform: next.platform ?? filters.platform,
        status: next.status ?? filters.status,
        operator: next.operator ?? filters.operator,
        search: next.search ?? search,
        page: next.page ?? page,
        limit: next.limit ?? pageSize,
      };
      for (const [k, v] of Object.entries(merged)) {
        if (v === '' || v === 'all' || v === undefined || v === null) q.delete(k);
        else q.set(k, String(v));
      }
      router.push(`/full-pay${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp, filters.platform, filters.status, filters.operator, search, page, pageSize],
  );

  const [rows, setRows] = useState<FullPayLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // operators del filtro: lista de strings (nombres) que usa el FullPayFilter
  const [operatorNames, setOperatorNames] = useState<string[]>([]);
  // operators del drawer: objeto Operator{id, display_name} para el RecoveryDrawer
  const [drawerOperators, setDrawerOperators] = useState<Operator[]>([]);
  const [selected, setSelected] = useState<FullPayLead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fullpayApi.list({ ...filters, search, page, page_size: pageSize });
      setRows(data.results);
      setTotal(data.total_count);
    } catch {
      toast.error('Error cargando leads');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters.platform, filters.status, filters.operator, search, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fullpayApi.operators().then((d) => setOperatorNames(d.results)).catch(() => setOperatorNames([]));
    // Cargar operators con shape Operator{id, display_name} para el RecoveryDrawer
    moraApi.operators().then((d) => setDrawerOperators(d.results)).catch(() => setDrawerOperators([]));
  }, []);

  const handleFilterChange = (next: FullPayFilters) =>
    pushParams({
      platform: next.platform,
      status: next.status,
      operator: next.operator,
      page: 1,
    });

  const handleSearch = () => {
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
  const handleRowOpen = (row: FullPayLead) => setSelected(row);

  return (
    <div className="relative mx-auto max-w-[1600px] space-y-5 p-4">
      {/* Orbs ambient */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <PhoneCall className="h-5 w-5 text-cyan-300" />
            </span>
            <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Call Full Pay
            </span>
          </h1>
          <p className="mt-1 ml-12 text-sm text-blue-300/60">
            Conversión de clientes al día a pagos completos
          </p>
          <p className="mt-1 ml-12 text-xs text-blue-300/40">
            Mostrando <b className="text-cyan-300">{rows.length}</b> de{' '}
            <b className="text-cyan-300">{total}</b> leads
          </p>
        </div>
        <FullPayFilter value={filters} operators={operatorNames} onChange={handleFilterChange} />
      </header>

      {/* Buscador con lupa */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/60" />
          <Input
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
              if (e.key === 'Escape') handleClearSearch();
            }}
            placeholder="Buscar por nombre, email o teléfono..."
            className="pl-9 pr-9 border-blue-500/30 bg-blue-950/40 text-cyan-50 placeholder:text-blue-300/40 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
          />
          {pendingSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-cyan-200"
              aria-label="Limpiar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          className="border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400"
        >
          Buscar
        </Button>
      </div>

      <FullPayTable
        rows={rows}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => pushParams({ page: p })}
        onPageSizeChange={(s) => pushParams({ limit: s, page: 1 })}
        onRowOpen={handleRowOpen}
      />

      <RecoveryDrawer
        mode="mora"
        api={moraApi}
        statusOptions={RECOVERY_STATUS_OPTIONS_MORA}
        operators={drawerOperators}
        row={selected ? fullPayLeadToClienteRow(selected) : null}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          // El drawer escribe en op_mora_recovery_tracking (mora). Refrescamos
          // la lista para que la fila Full Pay reciba los datos actualizados
          // (al volver al servidor, /full-pay rehace su query y trae lo nuevo).
          load();
        }}
      />
    </div>
  );
}
