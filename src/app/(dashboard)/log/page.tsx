'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export default function LogPage() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [source, setSource] = useState<'all' | 'stripe' | 'whop' | 'whop-erp'>('all');
  const [search, setSearch] = useState('');
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

  const counts = useMemo(
    () => ({
      total: events.length,
      success: events.filter((e) => e.is_success).length,
      failure: events.filter((e) => !e.is_success).length,
    }),
    [events],
  );

  // Total cobrado (solo eventos exitosos)
  const totalSuccessAmount = useMemo(
    () => events.filter((e) => e.is_success).reduce((s, e) => s + (e.amount || 0), 0),
    [events],
  );
  const successRate = counts.total > 0 ? Math.round((counts.success / counts.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      {/* HERO header with live indicator */}
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl',
                  isLive
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30 shadow-lg'
                    : 'bg-slate-200 dark:bg-slate-800',
                )}
              >
                <span className={cn('text-xl', isLive && 'animate-pulse')}>⚡</span>
              </div>
              {isLive && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
              <p className="text-xs text-muted-foreground">
                {isLive ? 'Feed en vivo' : 'Pausado'} · webhooks de pago en tiempo real
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={isLive ? 'outline' : 'default'}
            onClick={() => setIsLive((v) => !v)}
            className="gap-1.5"
          >
            {isLive ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isLive ? 'Pausar' : 'Reanudar'}
          </Button>
        </div>

        {/* KPIs row */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Eventos</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{counts.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Éxito</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {counts.success}
              <span className="ml-1 text-xs font-normal text-emerald-600/70">({successRate}%)</span>
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/40 dark:bg-rose-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Fallo</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">{counts.failure}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">Cobrado</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-300">{formatEur(totalSuccessAmount)}</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
            {(['all', 'success', 'failure'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-all',
                  filter === f
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
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
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
                  )}
                  style={active ? { backgroundColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, email..."
              className="h-9 pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Events feed — terminal/log style */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-2xl dark:border-slate-800">
        {/* Terminal header bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              ~/payments.log · {events.length} entries
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">live</span>
        </div>

        <div className="max-h-[80vh] overflow-y-auto font-mono text-[13px] leading-relaxed">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`sk-${i}`} className="border-b border-slate-900 px-4 py-2">
                <Skeleton className="h-4 w-full bg-slate-800" />
              </div>
            ))}

          {!loading && events.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-500">
              <Search className="mx-auto mb-2 h-8 w-8 text-slate-700" />
              <span className="font-mono text-xs">// no events match filters</span>
            </div>
          )}

          {!loading &&
            events.map((e, idx) => {
              const src = SOURCES.find((s) => s.id === e.source);
              const platformIcon = e.source === 'stripe' ? '💳' : e.source === 'whop' ? '⚡' : '📦';
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelected(e)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 border-b border-slate-900 px-4 py-2 text-left transition-colors hover:bg-slate-900',
                    !e.is_success && 'bg-rose-950/10',
                  )}
                >
                  {/* Line number */}
                  <span className="w-8 shrink-0 select-none text-right text-[10px] text-slate-700 group-hover:text-slate-500">
                    {String(idx + 1).padStart(3, '0')}
                  </span>

                  {/* Status indicator (colored vertical bar) */}
                  <span
                    className={cn(
                      'h-8 w-1 shrink-0 rounded-full',
                      e.is_success ? 'bg-emerald-500' : 'bg-rose-500',
                    )}
                  />

                  {/* Time */}
                  <span
                    className="w-16 shrink-0 text-[11px] font-medium text-slate-400 tabular-nums"
                    suppressHydrationWarning
                  >
                    {toMadridTime(e.created_at, 'time')}
                  </span>

                  {/* Platform icon */}
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm"
                    style={{ backgroundColor: `${src?.color}25` }}
                    title={src?.label}
                  >
                    {platformIcon}
                  </span>

                  {/* Status text */}
                  <span
                    className={cn(
                      'w-[72px] shrink-0 text-[10px] font-bold uppercase tracking-wider',
                      e.is_success ? 'text-emerald-400' : 'text-rose-400',
                    )}
                  >
                    {e.is_success ? 'SUCCESS' : 'FAILED'}
                  </span>

                  {/* Customer + reason */}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-slate-100">{e.customer_email || '—'}</span>
                    {e.customer_name && (
                      <span className="ml-2 text-slate-500">// {e.customer_name}</span>
                    )}
                    {e.failure_reason && (
                      <span className="ml-2 text-rose-400/80">→ {e.failure_reason}</span>
                    )}
                  </span>

                  {/* Amount */}
                  <span
                    className={cn(
                      'shrink-0 text-right font-bold tabular-nums tracking-tight',
                      e.is_success ? 'text-emerald-400' : 'text-slate-600',
                    )}
                  >
                    {formatEur(e.amount)}
                  </span>

                  {/* Relative time */}
                  <span className="w-14 shrink-0 text-right text-[10px] text-slate-600">
                    {relativeTime(e.created_at, now)}
                  </span>
                </button>
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

