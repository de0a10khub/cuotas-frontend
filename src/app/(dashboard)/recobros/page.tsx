'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { recobrosApi } from '@/lib/recobros-api';
import { moraApi } from '@/lib/mora-api';
import type { MoraRow, Operator } from '@/lib/mora-types';
import type { ObjecionTag } from '@/lib/clientes-types';
import { MoraFilterHeader, type MoraHardFilters } from '@/components/mora/filter-header';
import { MoraTable } from '@/components/mora/mora-table';
import { RecoveryDrawer } from '@/components/recovery/recovery-drawer';
import { RECOVERY_STATUS_OPTIONS_MORA } from '@/components/recovery/styles';
import { RecobrosSyncSheetsButton } from '@/components/recobros/sync-sheets-button';

export default function RecobrosPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // /recobros no tiene filtro de categoría — se fuerza a 'Incobrable' hardcoded
  // en el MoraTable (aunque el dropdown esté oculto).
  const filters: MoraHardFilters = {
    category: 'Incobrable',
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
      platform: string;
      dispute_state: string;
      search: string;
      page: number;
      limit: number;
    }>) => {
      const q = new URLSearchParams(sp.toString());
      const merged = {
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
      router.push(`/recobros${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp, filters.platform, filters.dispute_state, search, page, pageSize],
  );

  const [rows, setRows] = useState<MoraRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [objecionesCatalog, setObjecionesCatalog] = useState<ObjecionTag[]>([]);
  const [selected, setSelected] = useState<MoraRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recobrosApi.list({
        search,
        platform: filters.platform,
        dispute_state: filters.dispute_state,
        page,
        page_size: pageSize,
      });
      setRows(data.results);
      setTotal(data.total_count);
    } catch {
      toast.error('Error cargando recobros');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, filters.platform, filters.dispute_state, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    moraApi.operators().then((d) => setOperators(d.results)).catch(() => setOperators([]));
    moraApi.objecionesTags().then((d) => setObjecionesCatalog(d.results)).catch(() => setObjecionesCatalog([]));
  }, []);

  const handleFilterChange = (next: MoraHardFilters) =>
    pushParams({
      platform: next.platform,
      dispute_state: next.dispute_state,
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
  const clearFilters = () => {
    setPendingSearch('');
    pushParams({ search: '', page: 1 });
  };
  const handleRowOpen = (row: MoraRow) => setSelected(row);
  const handleUpdated = (row: MoraRow) =>
    setRows((prev) => prev.map((r) => (r.subscription_id === row.subscription_id ? row : r)));

  return (
    <div className="relative mx-auto max-w-[1800px] space-y-5 p-4">
      {/* Orbs ambient */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              ⚖️
            </span>
            <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Recobrame
            </span>
          </h1>
          <p className="mt-1 ml-12 text-sm text-blue-300/60">
            Casos derivados a recobros externo (recovery_status = Recobrame)
          </p>
          <p className="mt-1 ml-12 text-xs text-blue-300/40">
            Mostrando <b className="text-cyan-300">{rows.length}</b> de{' '}
            <b className="text-cyan-300">{total}</b> casos
          </p>
        </div>
        <MoraFilterHeader value={filters} onChange={handleFilterChange} hideCategory />
      </header>

      <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] shadow-[0_0_30px_rgba(59,130,246,0.10)]">
        <div className="flex items-center justify-between border-b border-blue-500/15 bg-gradient-to-r from-blue-950/40 via-blue-900/30 to-blue-950/40 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            🔴 Casos para Departamento de Recobros
          </h2>
          <RecobrosSyncSheetsButton />
        </div>
        <div className="p-4">
          <MoraTable
            rows={rows}
            total={total}
            loading={loading}
            operators={operators}
            objecionesCatalog={objecionesCatalog}
            category="Incobrable"
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
            onClearFilters={clearFilters}
            mode="recobros"
          />
        </div>
      </div>

      <RecoveryDrawer
        mode="mora"
        api={moraApi}
        statusOptions={RECOVERY_STATUS_OPTIONS_MORA}
        row={selected}
        operators={operators}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
