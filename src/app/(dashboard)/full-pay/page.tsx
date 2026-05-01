'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PhoneCall, Search, X } from 'lucide-react';

import { fullpayApi } from '@/lib/fullpay-api';
import type { FullPayLead } from '@/lib/fullpay-types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FullPayFilter, type FullPayFilters } from '@/components/full-pay/full-pay-filter';
import { FullPayTable } from '@/components/full-pay/full-pay-table';
import { FullPayDrawer } from '@/components/full-pay/full-pay-drawer';

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
  const [operators, setOperators] = useState<string[]>([]);
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
    fullpayApi.operators().then((d) => setOperators(d.results)).catch(() => setOperators([]));
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
  const handleUpdated = (row: FullPayLead) =>
    setRows((prev) => prev.map((r) => (r.subscription_id === row.subscription_id ? row : r)));

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
        <FullPayFilter value={filters} operators={operators} onChange={handleFilterChange} />
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

      <FullPayDrawer
        row={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
