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

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isLive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400',
              )}
            />
            Activity Log
          </h1>
          <p className="text-xs text-muted-foreground">
            Feed en vivo de webhooks de pago · {counts.total} eventos ·{' '}
            <span className="text-emerald-600">{counts.success} éxito</span> ·{' '}
            <span className="text-rose-600">{counts.failure} fallo</span>
          </p>
        </div>
        <Button
          size="sm"
          variant={isLive ? 'default' : 'outline'}
          onClick={() => setIsLive((v) => !v)}
        >
          {isLive ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isLive ? 'Pausar' : 'Reanudar'}
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="inline-flex rounded-md border border-slate-200 bg-background p-0.5 dark:border-slate-800">
            {(['all', 'success', 'failure'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {f === 'all' ? 'Todos' : f === 'success' ? 'Éxito' : 'Fallo'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {SOURCES.map((s) => {
              const active = source === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSource((cur) => (cur === s.id ? 'all' : s.id))}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all',
                    active
                      ? 'border-transparent text-white'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900',
                  )}
                  style={active ? { backgroundColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, email..."
              className="h-8 pl-7"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <li key={`sk-${i}`} className="p-3">
                  <Skeleton className="h-6 w-full" />
                </li>
              ))}

            {!loading && events.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">
                Sin eventos con esos filtros.
              </li>
            )}

            {!loading &&
              events.map((e) => {
                const src = SOURCES.find((s) => s.id === e.source);
                return (
                  <li
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/40',
                      !e.is_success && 'bg-rose-50/30 dark:bg-rose-950/20',
                    )}
                  >
                    <span
                      className="w-20 shrink-0 font-mono text-[10px] text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {toMadridTime(e.created_at, 'time')}
                    </span>
                    {src && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                        style={{ backgroundColor: src.color }}
                      >
                        {src.label}
                      </span>
                    )}
                    <span className="shrink-0 w-6 text-center">
                      {e.is_success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{e.customer_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {e.customer_email}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm tabular-nums">
                      {formatEur(e.amount)}
                    </span>
                    {e.failure_reason && (
                      <span className="shrink-0 max-w-[200px] truncate text-xs text-rose-600">
                        {e.failure_reason}
                      </span>
                    )}
                    <span className="shrink-0 w-16 text-right text-[10px] text-muted-foreground">
                      {relativeTime(e.created_at, now)}
                    </span>
                  </li>
                );
              })}
          </ul>
        </CardContent>
      </Card>

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

