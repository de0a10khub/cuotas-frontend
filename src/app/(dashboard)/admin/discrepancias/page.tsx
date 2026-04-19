'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  adminDataApi,
  type Discrepancy,
  type DiscrepancySummary,
} from '@/lib/admin-data-api';

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-rose-100 text-rose-800 border-rose-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  status_mismatch: 'Status distinto',
  amount_paid_mismatch: 'Importe distinto',
  missing_in_source: 'Falta en fuente',
};

export default function DiscrepanciasPage() {
  const [summary, setSummary] = useState<DiscrepancySummary | null>(null);
  const [rows, setRows] = useState<Discrepancy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [resolved, setResolved] = useState('false');
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 100;
  const [busy, setBusy] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        adminDataApi.discrepanciesSummary(),
        adminDataApi.listDiscrepancies({
          entity_type: entity !== 'all' ? entity : undefined,
          severity: severity !== 'all' ? severity : undefined,
          resolved,
          search,
          page,
          limit,
        }),
      ]);
      setSummary(s);
      setRows(d.results);
      setTotal(d.total_count);
    } catch {
      toast.error('Error cargando discrepancias');
    } finally {
      setLoading(false);
    }
  }, [entity, severity, resolved, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (pendingSearch !== search) {
        setSearch(pendingSearch);
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [pendingSearch, search]);

  const resolve = async (id: number) => {
    if (!confirm('¿Marcar resuelto?')) return;
    setBusy(id);
    try {
      await adminDataApi.resolveDiscrepancy(id);
      toast.success('Resuelto');
      load();
    } catch {
      toast.error('Error');
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Discrepancias de datos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inconsistencias detectadas entre Conciliación y Stripe/Whop APIs.
        </p>
      </header>

      {summary && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Kpi label="Total" value={summary.totals.total} icon="📊" />
          <Kpi label="Pendientes" value={summary.totals.pending} icon="⏳" valueClass="text-amber-600" />
          <Kpi label="High pendientes" value={summary.totals.high_pending} icon="🚨" valueClass="text-rose-600" />
          <Kpi label="Resueltas" value={summary.totals.resolved} icon="✓" valueClass="text-emerald-600" />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{total} casos</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Email o ID..."
                className="h-8 w-56 pl-7"
              />
            </div>
            <Select value={entity} onValueChange={(v) => { setEntity(v || 'all'); setPage(1); }}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo tipo</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => { setSeverity(v || 'all'); setPage(1); }}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo sev</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolved} onValueChange={(v) => { setResolved(v || 'false'); setPage(1); }}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Pendientes</SelectItem>
                <SelectItem value="true">Resueltas</SelectItem>
                <SelectItem value="">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Discrepancia</TableHead>
                <TableHead>Conci</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Sev</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Sin discrepancias para este filtro.
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.map((r) => (
                <>
                  <TableRow key={r.id} className={r.resolved ? 'opacity-50' : ''}>
                    <TableCell className="text-sm capitalize">{r.entity_type}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="text-xs font-mono hover:underline"
                        title="Ver detalle"
                      >
                        {r.entity_id.slice(0, 20)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{r.platform}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{TYPE_LABELS[r.discrepancy_type] || r.discrepancy_type}</TableCell>
                    <TableCell className="font-mono text-xs text-rose-700">{r.conci_value || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-emerald-700">{r.source_value || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[r.severity]}`}>
                        {r.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{r.customer_email || '—'}</TableCell>
                    <TableCell>
                      {!r.resolved ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          disabled={busy === r.id}
                          onClick={() => resolve(r.id)}
                        >
                          <Check className="mr-1 h-3 w-3" /> OK
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">✓</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === r.id && (
                    <TableRow key={`${r.id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/30">
                        <pre className="max-h-40 overflow-auto text-[10px]">
                          {JSON.stringify(r.details, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span>{total} discrepancias</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="px-2 py-1">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  valueClass = '',
}: {
  label: string;
  value: number;
  icon: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>
          {value.toLocaleString('es-ES')}
        </p>
      </CardContent>
    </Card>
  );
}
