'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { adminDataApi, type DuplicatePending, type DuplicatesSummary } from '@/lib/admin-data-api';
import { clientesApi } from '@/lib/clientes-api';
import type { ClienteRow, Operator } from '@/lib/clientes-types';
import { Card, CardContent } from '@/components/ui/card';
import { ClientesTable } from '@/components/clientes/clientes-table';
import { DuplicatesDrawer } from '@/components/admin/duplicates-drawer';

export default function DuplicadosPage() {
  const [summary, setSummary] = useState<DuplicatesSummary | null>(null);
  const [rows, setRows] = useState<ClienteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [dupesByEmail, setDupesByEmail] = useState<Record<string, DuplicatePending>>({});
  const [selectedDupe, setSelectedDupe] = useState<DuplicatePending | null>(null);
  const [loadingDupe, setLoadingDupe] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [pendingSearch, setPendingSearch] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, dupes] = await Promise.all([
        adminDataApi.duplicatesSummary(),
        adminDataApi.duplicatesClientRows({
          search: search || undefined,
          page,
          page_size: pageSize,
        }),
        adminDataApi.listDuplicates({ limit: 1000 }),
      ]);
      setSummary(s);
      setRows(d.results as ClienteRow[]);
      setTotal(d.total_count);
      const byEmail: Record<string, DuplicatePending> = {};
      for (const dp of dupes.results) byEmail[dp.email.toLowerCase()] = dp;
      setDupesByEmail(byEmail);
    } catch {
      toast.error('Error cargando duplicados');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  const handleRowOpen = useCallback(
    async (row: ClienteRow) => {
      const email = (row.email || '').toLowerCase();
      if (!email) return;
      const local = dupesByEmail[email];
      if (local) {
        setSelectedDupe(local);
        return;
      }
      setLoadingDupe(true);
      setSelectedDupe(null);
      try {
        const resp = await adminDataApi.listDuplicates({ search: email, limit: 1 });
        const match = resp.results.find((dp) => dp.email.toLowerCase() === email);
        if (match) setSelectedDupe(match);
        else toast.error('No se encontró el duplicado para ese email');
      } catch {
        toast.error('Error cargando duplicado');
      } finally {
        setLoadingDupe(false);
      }
    },
    [dupesByEmail],
  );

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
          Clientes con cuentas en múltiples plataformas. Al abrir un cliente, elige una de las 3 acciones.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ActionHelp
          icon="🔗"
          title="Unificar mismo contrato"
          color="border-l-emerald-500"
          description="Misma compra, solo cambió dónde cobraste (ej. pagó 2 cuotas por Stripe y el resto por Whop-ERP)."
          when="Úsalo cuando NO hubo cambio de precio ni de número de cuotas. Es el mismo plan, simplemente migrado de plataforma."
        />
        <ActionHelp
          icon="🔄"
          title="Marcar como refinanciación"
          color="border-l-indigo-500"
          description="Se canceló el plan viejo y se creó uno nuevo con diferente precio o distinta cantidad de cuotas."
          when="Úsalo cuando el contrato cambió. El sistema vincula el plan original con el nuevo y suma solo la deuda real, sin duplicar."
        />
        <ActionHelp
          icon="✕"
          title="No es lo mismo"
          color="border-l-slate-400"
          description="Son 2 compras distintas del mismo cliente (ej. curso 1 y curso 2). Coincide el email pero no el contrato."
          when="Úsalo para descartar el candidato. El cliente sigue saliendo en /clientes con sus dos planes separados."
        />
      </div>

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
        onRowOpen={handleRowOpen}
        onClearFilters={() => {
          setPendingSearch('');
          setSearch('');
          setPage(1);
        }}
      />

      <DuplicatesDrawer
        duplicate={selectedDupe}
        open={!!selectedDupe || loadingDupe}
        onClose={() => setSelectedDupe(null)}
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

function ActionHelp({
  icon,
  title,
  color,
  description,
  when,
}: {
  icon: string;
  title: string;
  color: string;
  description: string;
  when: string;
}) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold">Cuándo: </span>
          {when}
        </p>
      </CardContent>
    </Card>
  );
}
