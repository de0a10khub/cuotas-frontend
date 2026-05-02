'use client';

// Página "Casos por Operario" — vista admin/manager con un grid de cards.
// Cada card resume los KPIs de un operario y enlaza a /mis-casos?as=email
// para impersonarlo (banner ámbar en la otra página).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Users, Briefcase, Wallet } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuros } from '@/lib/format';
import {
  misCasosApi,
  type OperatorWithKPIs,
} from '@/lib/mis-casos-api';
import { cn } from '@/lib/utils';

function initials(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/[ ._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

// Pequeño helper para colorear consistentemente cada operario por hash del email.
function gradientForEmail(email: string): string {
  const palette = [
    'from-cyan-400 via-blue-500 to-blue-700',
    'from-violet-400 via-purple-500 to-indigo-700',
    'from-emerald-400 via-teal-500 to-cyan-700',
    'from-amber-400 via-orange-500 to-rose-600',
    'from-pink-400 via-fuchsia-500 to-purple-700',
    'from-sky-400 via-cyan-500 to-blue-700',
  ];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export default function CasosPorOperarioPage() {
  const [operators, setOperators] = useState<OperatorWithKPIs[]>([]);
  const [teamTotalCasos, setTeamTotalCasos] = useState<number | null>(null);
  const [teamTotalDeuda, setTeamTotalDeuda] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await misCasosApi.summary();
        if (cancelled) return;
        setOperators(r.results || []);
        setTeamTotalCasos(r.team_total_casos ?? null);
        setTeamTotalDeuda(r.team_total_deuda_eur ?? null);
      } catch {
        if (!cancelled) {
          toast.error('Error cargando operarios');
          setOperators([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter(
      (o) =>
        o.display_name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q),
    );
  }, [operators, search]);

  // Si el backend no devuelve totales del equipo, los calculamos en cliente.
  const computedTotals = useMemo(() => {
    const casos = operators.reduce((s, o) => s + (o.total_casos || 0), 0);
    const deuda = operators.reduce((s, o) => s + (o.deuda_total_eur || 0), 0);
    return { casos, deuda };
  }, [operators]);

  const totalCasos = teamTotalCasos ?? computedTotals.casos;
  const totalDeuda = teamTotalDeuda ?? computedTotals.deuda;

  return (
    <div className="relative mx-auto max-w-[1500px] space-y-5 p-4">
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      {/* HERO */}
      <header className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-5 shadow-[0_0_60px_rgba(59,130,246,0.15)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 text-white shadow-[0_0_30px_rgba(56,189,248,0.5)]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                Casos por Operario
              </h1>
              <p className="mt-0.5 text-xs text-blue-200/70">
                Vista agregada del equipo. Click en un operario para ver sus casos.
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-xs sm:w-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar operario..."
              className="h-9 border-blue-400/20 bg-blue-950/30 pl-8 text-blue-100 placeholder:text-blue-300/40 focus-visible:border-blue-400/60"
            />
          </div>
        </div>

        {/* KPIs equipo */}
        <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiPill
            label="Operarios"
            value={loading ? '—' : String(operators.length)}
            tone="blue"
            icon={<Users className="h-4 w-4" />}
          />
          <KpiPill
            label="Casos totales"
            value={loading ? '—' : new Intl.NumberFormat('es-ES').format(totalCasos)}
            tone="cyan"
            icon={<Briefcase className="h-4 w-4" />}
          />
          <KpiPill
            label="Deuda total"
            value={loading ? '—' : formatEuros(totalDeuda)}
            tone="violet"
            icon={<Wallet className="h-4 w-4" />}
          />
        </div>
      </header>

      {/* Grid de operarios */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={`sk-${i}`}
              className="h-56 rounded-2xl bg-blue-950/40"
            />
          ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-[#0a1628] py-20 text-blue-300/60">
            <Users className="h-10 w-10 text-blue-500/30" />
            <p className="text-sm">
              {search ? 'Ningún operario coincide con la búsqueda.' : 'Sin operarios.'}
            </p>
          </div>
        )}

        {!loading && filtered.map((op) => <OperatorCard key={op.id} op={op} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────────────────

function KpiPill({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'cyan' | 'violet';
  icon: React.ReactNode;
}) {
  const palette = {
    blue: {
      ring: 'border-blue-400/30',
      bg: 'bg-blue-500/10',
      text: 'text-blue-200',
      label: 'text-blue-300/70',
    },
    cyan: {
      ring: 'border-cyan-400/30',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-200',
      label: 'text-cyan-300/70',
    },
    violet: {
      ring: 'border-violet-400/30',
      bg: 'bg-violet-500/10',
      text: 'text-violet-200',
      label: 'text-violet-300/70',
    },
  }[tone];

  return (
    <div
      className={cn(
        'rounded-xl border p-3 backdrop-blur-sm',
        palette.ring,
        palette.bg,
      )}
    >
      <div className={cn('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider', palette.label)}>
        {icon}
        {label}
      </div>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', palette.text)}>
        {value}
      </p>
    </div>
  );
}

function OperatorCard({ op }: { op: OperatorWithKPIs }) {
  const gradient = gradientForEmail(op.email);

  return (
    <Link
      href={`/mis-casos?as=${encodeURIComponent(op.email)}`}
      className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-[#0a1628] p-5 transition-all hover:border-cyan-400/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
    >
      {/* Glow on hover */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/0 blur-3xl transition-all group-hover:bg-cyan-500/20" />

      {/* Header con avatar */}
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-lg',
            gradient,
          )}
        >
          {initials(op.display_name || op.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">
            {op.display_name || op.email.split('@')[0]}
          </p>
          <p className="truncate text-[11px] text-blue-300/60">{op.email}</p>
        </div>
      </div>

      {/* Totales destacados */}
      <div className="relative mt-4 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tabular-nums text-cyan-300">
            {new Intl.NumberFormat('es-ES').format(op.total_casos)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-blue-300/60">
            casos
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums text-white">
            {formatEuros(op.deuda_total_eur)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-blue-300/60">
            deuda
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="relative my-3 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />

      {/* Breakdown por panel */}
      <ul className="relative space-y-1 text-xs">
        <BreakdownRow label="Mora N1" value={op.n_casos_mora_n1} accent="cyan" />
        <BreakdownRow label="Mora N2" value={op.n_casos_mora_n2} accent="orange" />
        <BreakdownRow label="Recobrame" value={op.n_casos_recobros} accent="violet" />
        {op.n_casos_full_pay != null && (
          <BreakdownRow label="Full-Pay" value={op.n_casos_full_pay} accent="emerald" />
        )}
        <BreakdownRow label="Clientes" value={op.n_casos_clientes} accent="blue" />
      </ul>
    </Link>
  );
}

function BreakdownRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'cyan' | 'orange' | 'violet' | 'emerald' | 'blue';
}) {
  const dot = {
    cyan: 'bg-cyan-400',
    orange: 'bg-orange-400',
    violet: 'bg-violet-400',
    emerald: 'bg-emerald-400',
    blue: 'bg-blue-400',
  }[accent];

  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-blue-200/70">
        <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
        {label}
      </span>
      <span className="font-mono tabular-nums text-blue-100">{value}</span>
    </li>
  );
}
