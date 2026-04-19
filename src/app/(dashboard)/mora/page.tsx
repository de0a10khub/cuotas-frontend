'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { moraApi } from '@/lib/mora-api';
import type { MoraRow, Operator } from '@/lib/mora-types';
import type { ObjecionTag } from '@/lib/clientes-types';
import { Card, CardContent } from '@/components/ui/card';
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

  // /mora usa debounce 500ms + mínimo 3 chars (a diferencia de /clientes que es Enter).
  useEffect(() => {
    const cleaned = pendingSearch.trim();
    if (cleaned === search) return;
    const t = setTimeout(() => {
      if (cleaned.length >= 3 || cleaned === '') {
        pushParams({ search: cleaned, page: 1 });
      }
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
  const handleSearch = () => pushParams({ search: pendingSearch, page: 1 });
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
    <div className="mx-auto max-w-[1800px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes con Pagos Pendientes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Investigación de deuda y comportamiento de pago por cliente
          </p>
        </div>
        <MoraFilterHeader value={filters} onChange={handleFilterChange} />
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Gestión operativa de mora
            </h2>
            {hasAnyFilter && <span className="text-xs text-slate-400">Filtros activos</span>}
          </div>
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
        </CardContent>
      </Card>

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
