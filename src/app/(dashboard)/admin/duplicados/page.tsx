'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { adminDataApi, type DuplicatePending, type DuplicatesSummary } from '@/lib/admin-data-api';
import { clientesApi } from '@/lib/clientes-api';
import type { ClienteRow, Operator } from '@/lib/clientes-types';
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
      const email = (row.customer_email || '').toLowerCase();
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
    <div className="relative mx-auto max-w-[1900px] space-y-6 p-4">
      {/* Orbs ambient navy */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none fixed left-1/3 top-2/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />

      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            🔀
          </span>
          <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
            Duplicados pendientes
          </span>
        </h1>
        <p className="mt-1 ml-12 text-sm text-blue-300/60">
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
        onResolved={() => {
          setSelectedDupe(null);
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
  // Mapeo del valueClass viejo al nuevo (más vivo)
  const newValueClass = valueClass
    ? valueClass.replace('-600', '-300').replace('-500', '-300')
    : 'text-cyan-300';
  return (
    <div className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-4 shadow-[0_0_20px_rgba(59,130,246,0.10)] transition-all hover:border-cyan-400/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/15 blur-3xl opacity-40 transition-opacity group-hover:opacity-70" />
      <div className="relative flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-300/60">
            {label}
          </div>
          <div className={`text-3xl font-bold tabular-nums tracking-tight ${newValueClass}`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

const ACTION_COLORS: Record<string, { ring: string; glow: string; bar: string }> = {
  'border-l-emerald-500': {
    ring: 'ring-emerald-400/40',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    bar: 'bg-gradient-to-b from-emerald-400 to-cyan-400',
  },
  'border-l-indigo-500': {
    ring: 'ring-indigo-400/40',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.12)]',
    bar: 'bg-gradient-to-b from-indigo-400 to-blue-500',
  },
  'border-l-slate-400': {
    ring: 'ring-slate-400/30',
    glow: 'shadow-[0_0_15px_rgba(148,163,184,0.10)]',
    bar: 'bg-gradient-to-b from-slate-400 to-slate-500',
  },
};

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
  const c = ACTION_COLORS[color] || ACTION_COLORS['border-l-slate-400'];
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-4 ${c.glow}`}
    >
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${c.bar}`} />
      <div className="relative space-y-2 pl-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${c.ring} bg-blue-950/40 text-base`}>
            {icon}
          </span>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <p className="text-xs leading-relaxed text-blue-200/70">{description}</p>
        <p className="text-[11px] leading-relaxed text-blue-300/60">
          <span className="font-bold text-cyan-300">Cuándo: </span>
          {when}
        </p>
      </div>
    </div>
  );
}
