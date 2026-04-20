'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { adminDataApi, type DuplicatesSummary } from '@/lib/admin-data-api';
import { clientesApi } from '@/lib/clientes-api';
import type { ClienteRow, Operator } from '@/lib/clientes-types';
import { Card, CardContent } from '@/components/ui/card';
import { ClientesTable } from '@/components/clientes/clientes-table';
import { RecoveryDrawer } from '@/components/recovery/recovery-drawer';
import { RECOVERY_STATUS_OPTIONS_BASE } from '@/components/recovery/styles';

export default function DuplicadosPage() {
  const [summary, setSummary] = useState<DuplicatesSummary | null>(null);
  const [rows, setRows] = useState<ClienteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selected, setSelected] = useState<ClienteRow | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [pendingSearch, setPendingSearch] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        adminDataApi.duplicatesSummary(),
        adminDataApi.duplicatesClientRows({
          search: search || undefined,
          page,
          page_size: pageSize,
        }),
      ]);
      setSummary(s);
      setRows(d.results as ClienteRow[]);
      setTotal(d.total_count);
    } catch {
      toast.error('Error cargando duplicados');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    clientesApi.operators().then((data) => setOperators(data.results)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-[1900px] space-y-6 p-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Duplicados pendientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clientes con cuentas en múltiples plataformas. Decide si fusionar o separar.
        </p>
      </header>

      {summary && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Kpi label="Total detectados" value={summary.total} icon="📊" />
          <Kpi label="Pendientes" value={summary.pending} icon="⏳" valueClass="text-amber-600" />
          <Kpi label="Fusionados" value={summary.merged} icon="✓" valueClass="text-emerald-600" />
          <Kpi label="Ignorados" value={summary.ignored} icon="—" valueClass="text-slate-500" />
        </div>
      )}

      <ClientesTable
        rows={rows}
        total={total}
        loading={loading}
        operators={operators}
        category="all"
        platform="all"
        disputeState="all"
        search={search}
        pendingSearch={pendingSearch}
        onPendingSearchChange={setPendingSearch}
        onSearch={() => {
          setSearch(pendingSearch);
          setPage(1);
        }}
        onClearSearch={() => {
          setPendingSearch('');
          setSearch('');
          setPage(1);
        }}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        onRowOpen={setSelected}
        onClearFilters={() => {
          setPendingSearch('');
          setSearch('');
          setPage(1);
        }}
      />

      <RecoveryDrawer
        mode="clientes"
        api={clientesApi}
        statusOptions={RECOVERY_STATUS_OPTIONS_BASE}
        row={selected}
        operators={operators}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          setSelected(null);
          load();
        }}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: number;
  icon: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold ${valueClass || ''}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
