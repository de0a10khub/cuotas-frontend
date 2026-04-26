'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Play, Search, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logApi, type ChargeDetail, type LogEvent } from '@/lib/webhook-log-api';
import { toast } from 'sonner';

const SOURCES = [
  { id: 'stripe', label: 'Stripe', color: '#635bff' },
  { id: 'whop', label: 'Whop', color: '#00ccbb' },
  { id: 'whop-erp', label: 'Whop ERP', color: '#2299aa' },
] as const;

function toMadridTime(iso: string, fmt: 'time' | 'datetime'): string {
  try {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions =
      fmt === 'time'
        ? { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
        : {
            timeZone: 'Europe/Madrid',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          };
    return d.toLocaleString('es-ES', opts);
  } catch {
    return iso;
  }
}

function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function formatEur(eur: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(eur || 0);
}

// YYYY-MM-DD del evento en zona Madrid (para agrupar y filtrar)
function dayKey(iso: string): string {
  const d = new Date(iso);
  // toLocaleString to Madrid then build YYYY-MM-DD manually
  const yyyy = d.toLocaleString('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric' });
  const mm = d.toLocaleString('en-CA', { timeZone: 'Europe/Madrid', month: '2-digit' });
  const dd = d.toLocaleString('en-CA', { timeZone: 'Europe/Madrid', day: '2-digit' });
  return `${yyyy}-${mm}-${dd}`;
}

function dayLabel(iso: string): string {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  const k = dayKey(iso);
  if (k === today) return 'Hoy';
  if (k === yesterday) return 'Ayer';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function LogPage() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [source, setSource] = useState<'all' | 'stripe' | 'whop' | 'whop-erp'>('all');
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('all'); // 'all' | YYYY-MM-DD
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<LogEvent | null>(null);

  const eventsRef = useRef<LogEvent[]>([]);
  eventsRef.current = events;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await logApi.events({ source, filter, search, limit: 200 });
      setEvents(r.results);
    } catch {
      toast.error('Error cargando log');
    } finally {
      setLoading(false);
    }
  }, [source, filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Reloj para tiempo relativo (1s)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Polling incremental 5s
  useEffect(() => {
    if (!isLive) return;
    const poll = async () => {
      const latest = eventsRef.current[0]?.created_at;
      try {
        const r = await logApi.events({ source, filter, search, since: latest, limit: 50 });
        if (r.results.length > 0) {
          setEvents((prev) => {
            const merged = [...r.results, ...prev];
            const seen = new Set<string>();
            return merged.filter((e) => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            });
          });
        }
      } catch {
        // silent
      }
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isLive, source, filter, search]);

  // Días únicos (en orden, más reciente primero) para el selector
  const availableDays = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of events) {
      const k = dayKey(e.created_at);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out;
  }, [events]);

  // Eventos filtrados por día (si dayFilter != 'all')
  const filteredEvents = useMemo(() => {
    if (dayFilter === 'all') return events;
    return events.filter((e) => dayKey(e.created_at) === dayFilter);
  }, [events, dayFilter]);

  const counts = useMemo(
    () => ({
      total: filteredEvents.length,
      success: filteredEvents.filter((e) => e.is_success).length,
      failure: filteredEvents.filter((e) => !e.is_success).length,
    }),
    [filteredEvents],
  );

  // Total cobrado (solo eventos exitosos)
  const totalSuccessAmount = useMemo(
    () => filteredEvents.filter((e) => e.is_success).reduce((s, e) => s + (e.amount || 0), 0),
    [filteredEvents],
  );
  const successRate = counts.total > 0 ? Math.round((counts.success / counts.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      {/* HERO header with live indicator — premium navy + electric blue */}
      <header className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-5 shadow-[0_0_60px_rgba(59,130,246,0.15)]">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl',
                  isLive
                    ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 shadow-[0_0_30px_rgba(56,189,248,0.5)]'
                    : 'bg-slate-700',
                )}
              >
                <span className={cn('text-xl', isLive && 'animate-pulse')}>⚡</span>
              </div>
              {isLive && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-300"></span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Activity Log</h1>
              <p className="text-xs text-blue-200/70">
                {isLive ? 'Feed en vivo' : 'Pausado'} · webhooks de pago en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Día filter */}
            {availableDays.length > 0 && (
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="h-9 rounded-md border border-blue-400/40 bg-blue-500/10 px-2.5 text-xs font-medium text-blue-100 transition-colors hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                <option value="all" className="bg-[#0a1628]">Todos los días</option>
                {availableDays.map((d) => {
                  const today = dayKey(new Date().toISOString());
                  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
                  const label =
                    d === today
                      ? 'Hoy'
                      : d === yesterday
                      ? 'Ayer'
                      : new Date(d + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        });
                  return (
                    <option key={d} value={d} className="bg-[#0a1628]">
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLive((v) => !v)}
              className="gap-1.5 border-blue-400/40 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20 hover:text-white"
            >
              {isLive ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isLive ? 'Pausar' : 'Reanudar'}
            </Button>
          </div>
        </div>

        {/* KPIs row */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="group rounded-xl border border-blue-400/20 bg-white/5 p-3 backdrop-blur-sm transition-all hover:border-blue-400/40 hover:bg-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">Eventos</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{counts.total}</p>
          </div>
          <div className="group rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 backdrop-blur-sm shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Éxito</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-cyan-300">
              {counts.success}
              <span className="ml-1 text-xs font-normal text-cyan-400/70">({successRate}%)</span>
            </p>
          </div>
          <div className="group rounded-xl border border-orange-400/30 bg-orange-500/10 p-3 backdrop-blur-sm shadow-[0_0_20px_rgba(251,146,60,0.1)] transition-all hover:border-orange-400/50 hover:shadow-[0_0_30px_rgba(251,146,60,0.25)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-300">Fallo</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-orange-300">{counts.failure}</p>
          </div>
          <div className="group rounded-xl border border-violet-400/30 bg-violet-500/10 p-3 backdrop-blur-sm shadow-[0_0_20px_rgba(167,139,250,0.1)] transition-all hover:border-violet-400/50 hover:shadow-[0_0_30px_rgba(167,139,250,0.25)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Cobrado</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-violet-300">{formatEur(totalSuccessAmount)}</p>
          </div>
        </div>
      </header>

      {/* Filters — navy premium */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0d1f3a]/80 to-[#1a2c52]/60 p-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-blue-400/20 bg-blue-950/40 p-0.5">
            {(['all', 'success', 'failure'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-all',
                  filter === f
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                    : 'text-blue-200/70 hover:text-white',
                )}
              >
                {f === 'all' ? 'Todos' : f === 'success' ? '✓ Éxito' : '✗ Fallo'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {SOURCES.map((s) => {
              const active = source === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSource((cur) => (cur === s.id ? 'all' : s.id))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all',
                    active
                      ? 'border-transparent text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                      : 'border-blue-400/30 bg-blue-950/40 text-blue-200/70 hover:border-blue-400/50 hover:text-white',
                  )}
                  style={active ? { backgroundColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, email..."
              className="h-9 border-blue-400/20 bg-blue-950/30 pl-8 text-blue-100 placeholder:text-blue-300/40 focus-visible:border-blue-400/60 focus-visible:ring-blue-400/30"
            />
          </div>
        </div>
      </div>

      {/* Events feed — compact data table (Stripe-style en navy) */}
      <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-[#0a1628]">
        {/* Table header */}
        <div className="grid grid-cols-[110px_120px_1fr_140px_90px] items-center gap-4 border-b border-blue-400/20 bg-blue-950/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/60">
          <span>Fecha</span>
          <span>Plataforma</span>
          <span>Cliente</span>
          <span className="text-right">Importe</span>
          <span className="text-center">Estado</span>
        </div>

        <div className="max-h-[78vh] overflow-y-auto">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`sk-${i}`} className="border-b border-blue-400/10 px-4 py-3">
                <Skeleton className="h-5 w-full bg-blue-900/30" />
              </div>
            ))}

          {!loading && filteredEvents.length === 0 && (
            <div className="py-16 text-center text-blue-300/60">
              <Search className="mx-auto mb-2 h-8 w-8 text-blue-500/40" />
              <span className="text-sm">Sin eventos con esos filtros.</span>
            </div>
          )}

          {!loading &&
            filteredEvents.map((e, idx) => {
              const src = SOURCES.find((s) => s.id === e.source);
              const prevDay = idx > 0 ? dayKey(filteredEvents[idx - 1].created_at) : null;
              const curDay = dayKey(e.created_at);
              const showDivider = idx === 0 || prevDay !== curDay;
              return (
                <React.Fragment key={e.id}>
                  {showDivider && (
                    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-blue-400/20 bg-gradient-to-r from-blue-950/95 via-[#0a1628]/90 to-blue-950/95 px-4 py-2 backdrop-blur-md">
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
                        {dayLabel(e.created_at)}
                      </span>
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                    </div>
                  )}
                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className={cn(
                    'group grid w-full grid-cols-[110px_120px_1fr_140px_90px] items-center gap-4 border-b border-blue-400/10 px-4 py-2.5 text-left transition-all hover:bg-blue-500/5',
                    !e.is_success && 'bg-orange-500/[0.02]',
                  )}
                >
                  {/* Fecha + tiempo */}
                  <div className="text-xs">
                    <p
                      className="font-mono font-medium tabular-nums text-blue-100"
                      suppressHydrationWarning
                    >
                      {toMadridTime(e.created_at, 'time')}
                    </p>
                    <p className="text-[10px] text-blue-300/50">
                      {relativeTime(e.created_at, now)}
                    </p>
                  </div>

                  {/* Plataforma badge */}
                  <span
                    className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${src?.color}15`,
                      color: src?.color,
                      border: `1px solid ${src?.color}40`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: src?.color }} />
                    {src?.label}
                  </span>

                  {/* Cliente + razón */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {e.customer_name || e.customer_email || 'Cliente'}
                    </p>
                    <p className="truncate text-xs">
                      {e.failure_reason ? (
                        <span className="text-orange-300/80">{e.failure_reason}</span>
                      ) : (
                        <span className="text-blue-300/50">{e.customer_email || '—'}</span>
                      )}
                    </p>
                  </div>

                  {/* Importe */}
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-base font-bold tabular-nums tracking-tight',
                        e.is_success ? 'text-cyan-300' : 'text-blue-300/40 line-through decoration-orange-400/60',
                      )}
                    >
                      {formatEur(e.amount)}
                    </p>
                  </div>

                  {/* Estado */}
                  <div className="flex justify-center">
                    {e.is_success ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-400/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-300 ring-1 ring-orange-400/30">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.9)]" />
                        FAIL
                      </span>
                    )}
                  </div>
                </button>
                </React.Fragment>
              );
            })}
        </div>
      </div>

      <ChargesDialog event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ChargesDialog({
  event,
  onClose,
}: {
  event: LogEvent | null;
  onClose: () => void;
}) {
  const [charges, setCharges] = useState<ChargeDetail[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    setCharges(null);
    logApi
      .charges(event.customer_id)
      .then((r) => setCharges(r.results))
      .catch(() => toast.error('Error cargando historial'))
      .finally(() => setLoading(false));
  }, [event]);

  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de charges · {event?.customer_name}</DialogTitle>
        </DialogHeader>
        {loading && <Skeleton className="h-40 w-full" />}
        {!loading && charges && charges.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin charges.</p>
        )}
        {!loading && charges && charges.length > 0 && (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {charges.map((c) => (
              <li
                key={c.id}
                className={cn(
                  'rounded-md border p-2 text-xs',
                  c.paid
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/40'
                    : 'border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/40',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">{c.id}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {formatEur(c.amount / 100)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {toMadridTime(c.created, 'datetime')}
                  </span>
                  <Badge
                    variant={c.paid ? 'default' : 'destructive'}
                    className="text-[10px]"
                  >
                    {c.status}
                  </Badge>
                </div>
                {c.failure_code_es && (
                  <p className="mt-1 text-xs text-rose-600">{c.failure_code_es}</p>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {c.card_brand} •••• {c.card_last4} (exp {c.card_exp})
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

