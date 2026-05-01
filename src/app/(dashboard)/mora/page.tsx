'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { moraApi } from '@/lib/mora-api';
import type { MoraRow, Operator } from '@/lib/mora-types';
import type { ObjecionTag } from '@/lib/clientes-types';
import { MoraFilterHeader, type MoraHardFilters } from '@/components/mora/filter-header';
import { MoraTable } from '@/components/mora/mora-table';
import { RecoveryDrawer } from '@/components/recovery/recovery-drawer';
import { RECOVERY_STATUS_OPTIONS_MORA } from '@/components/recovery/styles';

export default function MoraPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const filters: MoraHardFilters = {
    category: sp.get('category') || 'all',
    platform: sp.get('platform') || 'all',
    dispute_state: sp.get('dispute_state') || 'all',
  };
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.max(10, Number(sp.get('limit')) || 50);
  const search = sp.get('search') || '';

  const [pendingSearch, setPendingSearch] = useState(search);
  useEffect(() => setPendingSearch(search), [search]);

  // /mora usa debounce 500ms (sin mínimo de chars: con 1 carácter o vacío también busca).
  useEffect(() => {
    const cleaned = pendingSearch.trim();
    if (cleaned === search) return;
    const t = setTimeout(() => {
      pushParams({ search: cleaned, page: 1 });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch]);

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
      router.push(`/mora${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp, filters.category, filters.platform, filters.dispute_state, search, page, pageSize],
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
      const data = await moraApi.list({
        search,
        platform: filters.platform,
        category: filters.category,
        dispute_state: filters.dispute_state,
        page,
        page_size: pageSize,
      });
      setRows(data.results);
      setTotal(data.total_count);
    } catch {
      toast.error('Error cargando mora');
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
    moraApi.operators().then((d) => setOperators(d.results)).catch(() => setOperators([]));
    moraApi.objecionesTags().then((d) => setObjecionesCatalog(d.results)).catch(() => setObjecionesCatalog([]));
  }, []);

  const handleFilterChange = (next: MoraHardFilters) => pushParams({ ...next, page: 1 });
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
  const handleUpdated = (row: MoraRow) => {
    setRows((prev) => prev.map((r) => (r.subscription_id === row.subscription_id ? row : r)));
  };

  const hasAnyFilter = useMemo(
    () =>
      search !== '' ||
      filters.category !== 'all' ||
      filters.platform !== 'all' ||
      filters.dispute_state !== 'all',
    [search, filters.category, filters.platform, filters.dispute_state],
  );

  return (
    <div className="relative mx-auto max-w-[1800px] space-y-5 p-4">
      {/* Orbs ambient navy estándar */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none fixed left-1/3 top-2/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              ⚠️
            </span>
            <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Mora N1 — Clientes con Deuda
            </span>
          </h1>
          <p className="mt-1 ml-12 text-sm text-blue-300/60">
            Casos activos. Los marcados como Incobrable o Abogado pasan a Mora N2.
          </p>
          <p className="mt-1 ml-12 text-xs text-blue-300/40">
            Mostrando <b className="text-cyan-300">{rows.length}</b> de{' '}
            <b className="text-cyan-300">{total}</b> clientes
          </p>
        </div>
        <MoraFilterHeader value={filters} onChange={handleFilterChange} />
      </header>

      <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] shadow-[0_0_30px_rgba(59,130,246,0.10)]">
        {hasAnyFilter && (
          <div className="flex items-center justify-end border-b border-blue-500/15 bg-blue-950/40 px-4 py-2">
            <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300">
              Filtros activos
            </span>
          </div>
        )}
        <div className="p-4">
          <MoraTable
            rows={rows}
            total={total}
            loading={loading}
            operators={operators}
            objecionesCatalog={objecionesCatalog}
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
            onClearFilters={clearFilters}
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
