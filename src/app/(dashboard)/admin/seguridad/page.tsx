'use client';

/**
 * /admin/seguridad — panel de eventos de seguridad capturados por el
 * SecurityEventsMiddleware del backend. Muestra KPIs 24h, lista de
 * eventos con filtros, top IPs ofensoras, distribución por tipo.
 *
 * Auto-refresh cada 30s para que el admin vea ataques en (casi) tiempo
 * real. Eventos high/critical también disparan aviso a Telegram en
 * server-side (env vars TELEGRAM_BOT_TOKEN + TELEGRAM_SECURITY_CHAT_ID).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Activity,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  securityApi,
  type SecurityEvent,
  type SecurityStats,
  type Severity,
  type EventType,
} from '@/lib/security-api';

const SEVERITY_LABELS: Record<Severity, { label: string; cls: string; dot: string }> = {
  low: {
    label: 'LOW',
    cls: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  medium: {
    label: 'MEDIUM',
    cls: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
    dot: 'bg-amber-400',
  },
  high: {
    label: 'HIGH',
    cls: 'border-orange-500/50 bg-orange-500/15 text-orange-200',
    dot: 'bg-orange-500',
  },
  critical: {
    label: 'CRITICAL',
    cls: 'border-rose-500/60 bg-rose-500/20 text-rose-200 font-bold animate-pulse',
    dot: 'bg-rose-500',
  },
};

const TYPE_LABELS: Record<EventType, string> = {
  login_failed: '🔑 Login fallido',
  login_locked: '🔒 Cuenta bloqueada',
  rate_limit: '⚡ Rate limit',
  unauthorized: '🚫 401 Sin auth',
  forbidden: '⛔ 403 Sin permiso',
  suspicious_path: '🤖 Path sospechoso',
  server_error: '💥 5xx error',
  other: '❓ Otro',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SeguridadPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<'all' | Severity>('all');
  const [type, setType] = useState<'all' | EventType>('all');
  const [days, setDays] = useState(7);
  const [ipFilter, setIpFilter] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        securityApi.list({ severity, type, days, page, ip: ipFilter }),
        securityApi.stats(),
      ]);
      setEvents(list.results);
      setTotal(list.total_count);
      setStats(st);
    } catch {
      toast.error('Error cargando eventos de seguridad');
    } finally {
      setLoading(false);
    }
  }, [severity, type, days, page, ipFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh cada 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  const maxByHour = useMemo(
    () => Math.max(1, ...(stats?.by_hour_24h.map((b) => b.count) || [1])),
    [stats?.by_hour_24h],
  );

  return (
    <div className="relative mx-auto max-w-[1500px] space-y-5 p-4">
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 bg-gradient-to-r from-cyan-200 via-blue-100 to-cyan-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            <ShieldAlert className="h-8 w-8 text-cyan-300" />
            Seguridad
          </h1>
          <p className="mt-1 text-sm text-blue-300/60">
            Eventos de seguridad capturados en tiempo real. Auto-refresh 30s. Alertas
            high/critical envían aviso a Telegram.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-blue-500/30 bg-blue-950/40 text-blue-200 hover:bg-blue-900/40 hover:text-cyan-200"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Activity className="h-4 w-4 text-cyan-300" />}
          label="Eventos 24h"
          value={stats?.total_24h ?? 0}
          accent="cyan"
        />
        <KpiCard
          icon={<Globe className="h-4 w-4 text-violet-300" />}
          label="IPs únicas 24h"
          value={stats?.unique_ips_24h ?? 0}
          accent="violet"
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-orange-300" />}
          label="High 24h"
          value={stats?.high_24h ?? 0}
          accent="orange"
        />
        <KpiCard
          icon={<ShieldAlert className="h-4 w-4 text-rose-300" />}
          label="Critical 24h"
          value={stats?.critical_24h ?? 0}
          accent="rose"
          pulse={!!stats?.critical_24h && stats.critical_24h > 0}
        />
      </div>

      {/* Charts row: hourly histogram + top ips */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-[#0a1628] to-cyan-950/30 shadow-[0_0_30px_rgba(34,211,238,0.1)] lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-100">Eventos por hora (últ. 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-1">
              {(stats?.by_hour_24h || []).map((b, i) => (
                <div
                  key={i}
                  className="group relative flex-1"
                  title={`${b.hour}: ${b.count}`}
                >
                  <div
                    className="rounded-t bg-gradient-to-t from-cyan-600 to-cyan-300 transition-all"
                    style={{
                      height: `${(b.count / maxByHour) * 100}%`,
                      minHeight: b.count > 0 ? '3px' : '0',
                      opacity: b.count > 0 ? 1 : 0.2,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-cyan-400/50">
              <span>-24h</span>
              <span>-12h</span>
              <span>ahora</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-[#0a1628] to-cyan-950/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-100">Top IPs (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.top_ips_7d?.length || 0) === 0 ? (
              <p className="text-xs italic text-blue-200/40">Sin actividad</p>
            ) : (
              <ul className="space-y-1.5">
                {(stats?.top_ips_7d || []).map((row) => (
                  <li
                    key={row.source_ip}
                    className="flex items-center justify-between rounded border border-cyan-500/20 bg-blue-950/40 px-2 py-1.5 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setIpFilter(row.source_ip)}
                      className="font-mono text-cyan-200 hover:text-cyan-100 hover:underline"
                    >
                      {row.source_ip}
                    </button>
                    <Badge
                      variant="outline"
                      className="border-rose-400/40 bg-rose-500/15 text-rose-200"
                    >
                      {row.count}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros + tabla */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-blue-950/40 via-[#0a1628] to-cyan-950/30 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base text-cyan-100">Eventos</CardTitle>
            <p className="text-xs text-blue-200/60">
              {ipFilter ? (
                <>
                  Filtrando IP <code className="font-mono text-cyan-300">{ipFilter}</code>{' '}
                  <button
                    type="button"
                    onClick={() => setIpFilter(undefined)}
                    className="ml-2 text-rose-300 hover:underline"
                  >
                    quitar filtro
                  </button>
                </>
              ) : (
                <>{total} eventos en los últimos {days} días</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={severity} onValueChange={(v) => setSeverity(v as 'all' | Severity)}>
              <SelectTrigger className="h-8 w-32" size="sm">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as 'all' | EventType)}>
              <SelectTrigger className="h-8 w-44" size="sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(Object.keys(TYPE_LABELS) as EventType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v) || 7)}>
              <SelectTrigger className="h-8 w-32" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último 1d</SelectItem>
                <SelectItem value="7">Últimos 7d</SelectItem>
                <SelectItem value="30">Últimos 30d</SelectItem>
                <SelectItem value="90">Últimos 90d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-cyan-500/20 hover:bg-transparent">
                <TableHead className="text-cyan-300/80">Cuándo</TableHead>
                <TableHead className="text-cyan-300/80">Severidad</TableHead>
                <TableHead className="text-cyan-300/80">Tipo</TableHead>
                <TableHead className="text-cyan-300/80">IP</TableHead>
                <TableHead className="text-cyan-300/80">Método</TableHead>
                <TableHead className="text-cyan-300/80">Path</TableHead>
                <TableHead className="text-cyan-300/80">Status</TableHead>
                <TableHead className="text-cyan-300/80">Usuario</TableHead>
                <TableHead className="text-cyan-300/80">UA</TableHead>
                <TableHead className="text-center text-cyan-300/80">📲</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-cyan-500/10">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading && events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-sm text-blue-200/50">
                    Sin eventos para los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                events.map((e) => {
                  const sev = SEVERITY_LABELS[e.severity];
                  return (
                    <TableRow
                      key={e.id}
                      className="border-cyan-500/10 hover:bg-cyan-500/5"
                    >
                      <TableCell
                        className="whitespace-nowrap text-xs text-blue-200/80"
                        title={e.created_at}
                      >
                        {fmtDate(e.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', sev.cls)}>
                          <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', sev.dot)} />
                          {sev.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-cyan-100">
                        {TYPE_LABELS[e.event_type]}
                      </TableCell>
                      <TableCell>
                        {e.source_ip ? (
                          <button
                            type="button"
                            onClick={() => setIpFilter(e.source_ip!)}
                            className="font-mono text-xs text-cyan-300 hover:underline"
                          >
                            {e.source_ip}
                          </button>
                        ) : (
                          <span className="text-blue-200/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-200/80">
                        {e.method || '—'}
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate font-mono text-xs text-blue-200/80"
                        title={e.path}
                      >
                        {e.path || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-blue-200/80">
                        {e.status_code ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-blue-200/80">
                        {e.user_email || '—'}
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate text-[10px] text-blue-200/50"
                        title={e.user_agent}
                      >
                        {e.user_agent || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {e.notified_telegram ? (
                          <span className="text-emerald-300" title="Aviso enviado a Telegram">
                            ✓
                          </span>
                        ) : (
                          <span className="text-blue-200/30">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {/* Paginación simple */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-cyan-500/20 p-3 text-xs text-blue-200/70">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-cyan-500/30 bg-blue-950/40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-cyan-500/30 bg-blue-950/40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tipo breakdown 24h */}
      {stats?.by_type_24h && stats.by_type_24h.length > 0 && (
        <Card className="border-cyan-500/20 bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-100">Distribución por tipo (24h)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {stats.by_type_24h.map((t) => (
              <button
                key={t.event_type}
                type="button"
                onClick={() => setType(t.event_type as EventType)}
                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-blue-950/40 px-2 py-1 text-xs text-cyan-200 hover:bg-blue-900/40"
              >
                <span>{TYPE_LABELS[t.event_type as EventType]}</span>
                <Badge
                  variant="outline"
                  className="border-cyan-400/40 bg-cyan-500/10 text-[10px] text-cyan-200"
                >
                  {t.count}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: 'cyan' | 'violet' | 'orange' | 'rose';
  pulse?: boolean;
}) {
  const ringMap: Record<typeof accent, string> = {
    cyan: 'border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]',
    violet: 'border-violet-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]',
    orange: 'border-orange-500/40 shadow-[0_0_20px_rgba(251,146,60,0.12)]',
    rose: 'border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.18)]',
  };
  return (
    <Card
      className={cn(
        'border bg-gradient-to-br from-blue-950/40 via-[#0a1628] to-cyan-950/30',
        ringMap[accent],
        pulse && 'animate-pulse',
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-blue-200/70">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-cyan-100">
          {value.toLocaleString('es-ES')}
        </p>
      </CardContent>
    </Card>
  );
}
