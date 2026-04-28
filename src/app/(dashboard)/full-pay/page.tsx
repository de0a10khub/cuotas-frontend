'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PhoneCall } from 'lucide-react';

import { fullpayApi } from '@/lib/fullpay-api';
import type { FullPayLead } from '@/lib/fullpay-types';
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
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.max(10, Number(sp.get('limit')) || 50);

  const pushParams = useCallback(
    (next: Partial<{ platform: string; status: string; operator: string; page: number; limit: number }>) => {
      const q = new URLSearchParams(sp.toString());
      const merged = {
        platform: next.platform ?? filters.platform,
        status: next.status ?? filters.status,
        operator: next.operator ?? filters.operator,
        page: next.page ?? page,
        limit: next.limit ?? pageSize,
      };
      for (const [k, v] of Object.entries(merged)) {
        if (v === '' || v === 'all' || v === undefined || v === null) q.delete(k);
        else q.set(k, String(v));
      }
      router.push(`/full-pay${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp, filters.platform, filters.status, filters.operator, page, pageSize],
  );

  const [rows, setRows] = useState<FullPayLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<string[]>([]);
  const [selected, setSelected] = useState<FullPayLead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fullpayApi.list({ ...filters, page, page_size: pageSize });
      setRows(data.results);
      setTotal(data.total_count);
    } catch {
      toast.error('Error cargando leads');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters.platform, filters.status, filters.operator, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

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
