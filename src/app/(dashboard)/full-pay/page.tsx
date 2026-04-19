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
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black italic uppercase tracking-tighter">
            <PhoneCall className="h-6 w-6 text-primary" />
            Call Full Pay
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversión de clientes al día a pagos completos
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mostrando <b>{rows.length}</b> de <b>{total}</b> leads
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
