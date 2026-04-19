'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Scale,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  disputesApi,
  type DisputeRow,
  type DisputesKpis,
  type RefundsKpis,
} from '@/lib/disputes-api';

const DISPUTE_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  none: { label: 'Sin Disputa', cls: 'bg-slate-100 text-slate-500' },
  under_review: {
    label: 'En Revisión',
    cls: 'bg-orange-100 text-orange-700 font-medium',
  },
  needs_response: {
    label: 'Acción Requerida',
    cls: 'bg-red-100 text-red-700 font-bold animate-pulse',
  },
  won: { label: 'Ganada', cls: 'bg-green-100 text-green-700 font-medium' },
  lost: { label: 'Perdida', cls: 'bg-red-50 text-red-600' },
  warning_needs_response: {
    label: 'Aviso previo',
    cls: 'bg-amber-100 text-amber-700 font-bold',
  },
};

function formatEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format((cents || 0) / 100);
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return iso;
  }
}

export default function DisputasPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const platform = sp.get('platform') || 'all';
  const from = sp.get('from') || undefined;
  const to = sp.get('to') || undefined;
  const search = sp.get('search') || '';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.max(10, Number(sp.get('pageSize')) || 20);

  const [pendingSearch, setPendingSearch] = useState(search);
  useEffect(() => setPendingSearch(search), [search]);

  // Debounce 500ms
  useEffect(() => {
    const cleaned = pendingSearch.trim();
    if (cleaned === search) return;
    const t = setTimeout(() => pushParams({ search: cleaned, page: '1' }), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch]);

  const pushParams = useCallback(
    (next: Record<string, string>) => {
      const q = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next)) {
        if (!v || v === 'all') q.delete(k);
        else q.set(k, v);
      }
      router.push(`/disputas${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp],
  );

  const [kpis, setKpis] = useState<DisputesKpis | null>(null);
  const [refunds, setRefunds] = useState<RefundsKpis | null>(null);
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, r, lst] = await Promise.all([
        disputesApi.kpis({ from, to, platform }),
        disputesApi.refundsKpis({ from, to, platform }),
        disputesApi.list({ from, to, platform, search, page, pageSize }),
      ]);
      setKpis(k);
      setRefunds(r);
      setRows(lst.results);
      setTotal(lst.total_count);
    } catch {
      toast.error('Error cargando disputas');
    } finally {
      setLoading(false);
    }
  }, [from, to, platform, search, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  const totalResolved = (kpis?.disputas_ganadas || 0) + (kpis?.disputas_perdidas || 0);
  const totalDisputes = totalResolved + (kpis?.disputas_abiertas || 0);
  const pctOpen =
    totalDisputes > 0 ? ((kpis?.disputas_abiertas || 0) / totalDisputes) * 100 : 0;
  const pctWon =
    totalDisputes > 0 ? ((kpis?.disputas_ganadas || 0) / totalDisputes) * 100 : 0;
  const pctLost =
    totalDisputes > 0 ? ((kpis?.disputas_perdidas || 0) / totalDisputes) * 100 : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Scale className="h-6 w-6 text-primary" />
            Disputas y Reembolsos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chargebacks, devoluciones e incidencias financieras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {platform === 'stripe' ? '💳 Stripe' : platform === 'whop' ? '🎮 Whop' : '🌎 Todo'}
          </Badge>
          <Select value={platform} onValueChange={(v) => pushParams({ platform: v || 'all' })}>
            <SelectTrigger className="h-8 w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="whop">Whop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              ⚖️ Disputas Abiertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {kpis?.disputas_abiertas ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pctOpen.toFixed(1)}% de {totalDisputes} totales
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              💸 Importe en Disputa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {kpis ? formatEur(kpis.importe_en_disputa_eur * 100) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              ✅ Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {kpis ? `${kpis.win_rate_pct}%` : '—'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              sobre {totalResolved} resueltas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              📊 Histórico
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Ganadas</p>
              <p className="font-bold text-emerald-600">{kpis?.disputas_ganadas ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">
                {kpis ? formatEur(kpis.importe_ganadas_eur * 100) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Perdidas</p>
              <p className="font-bold text-red-600">{kpis?.disputas_perdidas ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">
                {kpis ? formatEur(kpis.importe_perdidas_eur * 100) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📈 Resultado de Disputas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totalDisputes === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay disputas resueltas todavía
            </p>
          ) : (
            <>
              <Bar label="Ganadas" value={kpis?.disputas_ganadas || 0} pct={pctWon} tone="bg-green-500" />
              <Bar label="Perdidas" value={kpis?.disputas_perdidas || 0} pct={pctLost} tone="bg-red-500" />
              <Bar label="Abiertas" value={kpis?.disputas_abiertas || 0} pct={pctOpen} tone="bg-yellow-500" />
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="text-base">💸 Reembolsos (Período Seleccionado)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Devoluciones voluntarias y membresías canceladas
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <MiniKpi label="Pagos Reembolsados" value={String(refunds?.total_refunds ?? 0)} tone="text-amber-600" />
          <MiniKpi
            label="Importe Reembolsado"
            value={refunds ? formatEur(refunds.importe_reembolsado_eur * 100) : '—'}
            tone="text-amber-600"
          />
          <MiniKpi
            label="Suscripciones Canceladas"
            value={String(refunds?.suscripciones_canceladas ?? 0)}
            tone="text-red-600"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">📋 Listado Detallado de Incidencias</CardTitle>
            <p className="text-xs text-muted-foreground">
              Disputas y operaciones con reembolso (Ordenado por fecha desc)
            </p>
          </div>
          <div className="relative min-w-64">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="Buscar por cliente, email o ID..."
              className="h-8 pl-7"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>IDs Internos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Sin incidencias en este período.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((r) => {
                  const st = DISPUTE_STATUS_LABELS[r.dispute_status] || {
                    label: r.dispute_status,
                    cls: 'bg-slate-100 text-slate-600',
                  };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs" suppressHydrationWarning>
                        {formatDateTime(r.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{r.customer_email}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatEur(r.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border-0 px-2 py-0 text-[10px] uppercase', st.cls)}>
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border text-[11px]',
                            r.platform === 'stripe'
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'bg-cyan-50 text-cyan-600',
                          )}
                        >
                          {r.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        <div>Disp: {r.dispute_id}</div>
                        <div>Fact: {r.invoice_id}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-slate-200 p-3 text-xs dark:border-slate-800">
            <span className="text-muted-foreground">
              Mostrando {rows.length === 0 ? 0 : (page - 1) * pageSize + 1} - {(page - 1) * pageSize + rows.length} de {total}
            </span>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="outline" disabled={page <= 1} onClick={() => pushParams({ page: '1' })}>
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-sm" variant="outline" disabled={page <= 1} onClick={() => pushParams({ page: String(page - 1) })}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="mx-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <Button size="icon-sm" variant="outline" disabled={page >= totalPages} onClick={() => pushParams({ page: String(page + 1) })}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-sm" variant="outline" disabled={page >= totalPages} onClick={() => pushParams({ page: String(totalPages) })}>
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
              <Select value={String(pageSize)} onValueChange={(v) => pushParams({ pageSize: v || '20', page: '1' })}>
                <SelectTrigger className="ml-2 h-7 w-20" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[20, 50, 100, 200].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm">¿Qué es una disputa?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            Una disputa (chargeback) ocurre cuando un cliente contacta a su banco para
            solicitar la devolución de un cargo.
          </p>
          <div>
            <p className="font-semibold text-foreground">Impacto:</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>El importe se congela hasta la resolución</li>
              <li>Si se pierde, se devuelve el dinero + comisión (~15€)</li>
              <li>Demasiadas disputas pueden bloquear la cuenta de Stripe</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Prevención:</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>Comunicación clara de términos</li>
              <li>Descripción reconocible en extracto bancario</li>
              <li>Soporte rápido antes de que escale</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Bar({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-900">
        <div
          className={cn('absolute inset-y-0 left-0 flex items-center justify-end pr-2', tone)}
          style={{ width: `${Math.max(pct, 5)}%` }}
        >
          <span className="text-xs font-bold text-white">{value}</span>
        </div>
      </div>
      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', tone)}>{value}</p>
    </div>
  );
}
