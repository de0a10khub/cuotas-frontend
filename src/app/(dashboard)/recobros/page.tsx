'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { recobrosApi } from '@/lib/recobros-api';
import { moraApi } from '@/lib/mora-api';
import type { MoraRow, Operator } from '@/lib/mora-types';
import type { ObjecionTag } from '@/lib/clientes-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const handleUpdated = (row: MoraRow) =>
    setRows((prev) => prev.map((r) => (r.subscription_id === row.subscription_id ? row : r)));

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold italic tracking-tight">
            <span className="text-rose-600">🔴</span>
            Gestión de Recobros
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seguimiento de clientes críticos y deuda incobrable.
          </p>
        </div>
        <MoraFilterHeader value={filters} onChange={handleFilterChange} hideCategory />
      </header>

      <Card className="border-t-4 border-t-rose-500 bg-white/60 shadow-2xl backdrop-blur-xl dark:bg-slate-950/40">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 bg-rose-500/5">
          <CardTitle className="text-rose-700 dark:text-rose-400">
            ⚖️ Casos para Departamento de Recobros
          </CardTitle>
          <RecobrosSyncSheetsButton />
        </CardHeader>
        <CardContent className="p-4">
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
