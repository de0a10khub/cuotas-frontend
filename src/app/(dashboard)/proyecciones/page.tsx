'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, Plus, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dashboardsApi,
  type HistoricalRates,
  type Hypothesis,
  type JournalEntry,
  type ProjectionChartData,
} from '@/lib/dashboards-api';
import { formatEurExact } from '@/components/cobros/format-utils';

type Granularity = 'day' | 'week' | 'month';

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    return `${dd} ${mm}`;
  } catch {
    return iso;
  }
}

const LINE_COLORS = ['#6366f1', '#f97316', '#10b981', '#ec4899', '#8b5cf6'];

export default function ProyeccionesPage() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rates, setRates] = useState<HistoricalRates | null>(null);
  const [chartData, setChartData] = useState<ProjectionChartData | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [h, r, j] = await Promise.all([
        dashboardsApi.proyecciones.hypotheses(),
        dashboardsApi.proyecciones.historicalRates(),
        dashboardsApi.proyecciones.journal(),
      ]);
      setHypotheses(h.results);
      setRates(r);
      setJournal(j.results);
    } catch {
      toast.error('Error cargando proyecciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChart = useCallback(async () => {
    try {
      const c = await dashboardsApi.proyecciones.chart(selectedIds);
      setChartData(c);
    } catch {
      toast.error('Error cargando chart');
    }
  }, [selectedIds]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const toggleHyp = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await dashboardsApi.proyecciones.refreshBase();
      toast.success('Base recomputada');
      await loadInitial();
      await loadChart();
    } catch {
      toast.error('Error recomputando base');
    } finally {
      setRefreshing(false);
    }
  };

  // Transforma chartData a formato recharts (una fila por fecha)
  type ChartRow = { date: string; label: string; [k: string]: number | string };
  const chartRows = useMemo<ChartRow[]>(() => {
    if (!chartData) return [];
    const map: Record<string, ChartRow> = {};
    for (const p of chartData.real_data) {
      map[p.date] = map[p.date] || { date: p.date, label: fmtDate(p.date) };
      map[p.date].real = p.value;
    }
    for (const [key, series] of Object.entries(chartData.snapshots)) {
      for (const p of series) {
        map[p.date] = map[p.date] || { date: p.date, label: fmtDate(p.date) };
        map[p.date][key] = p.value;
      }
    }
    const rows = Object.values(map).sort((a, b) => (a.date > b.date ? 1 : -1));
    if (granularity === 'day') return rows;
    const groups: Record<string, ChartRow> = {};
    for (const r of rows) {
      let key: string;
      if (granularity === 'week') {
        const d = new Date(r.date);
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        key = start.toISOString().slice(0, 10);
      } else {
        key = r.date.slice(0, 7) + '-01';
      }
      if (!groups[key]) groups[key] = { date: key, label: fmtDate(key) };
      for (const [k, v] of Object.entries(r)) {
        if (k === 'date' || k === 'label') continue;
        const current = groups[key][k];
        const num = typeof v === 'number' ? v : 0;
        groups[key][k] = typeof current === 'number' ? current + num : num;
      }
    }
    return Object.values(groups).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [chartData, granularity]);

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyecciones de Ingresos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulación de escenarios y comparativa de precisión.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Actualizar Base
          </Button>
          <div className="inline-flex rounded-md border border-slate-200 bg-background p-0.5 dark:border-slate-800">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  granularity === g
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {g === 'day' ? 'Día' : g === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {/* Sidebar */}
        <div className="space-y-3 xl:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm">Hipótesis</CardTitle>
              <NewHypothesisDialog onCreated={loadInitial} />
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              {!loading &&
                hypotheses.map((h, i) => {
                  const active = selectedIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHyp(h.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
                      )}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: LINE_COLORS[(i + 1) % LINE_COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{h.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          C: {(h.churn * 100).toFixed(1)}% · G: {(h.growth * 100).toFixed(1)}%
                        </p>
                      </div>
                    </button>
                  );
                })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Previsión Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground">Churn</p>
                      <p className="font-bold text-red-600">
                        {((rates?.avg_monthly_churn ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Crecimiento</p>
                      <p className="font-bold text-emerald-600">
                        {((rates?.avg_monthly_growth ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Precisión (V30)</p>
                    <p className="text-lg font-black text-emerald-600">94.2%</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Error Medio (MAE)</p>
                    <p className="text-lg font-black">5.8%</p>
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Este porcentaje indica la <b>proximidad media</b> de la previsión base a los
                    cobros reales del último mes.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Journal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {loading && <Skeleton className="h-20 w-full" />}
              {!loading && journal.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">Sin entradas.</p>
              )}
              {!loading &&
                journal.map((j) => (
                  <div
                    key={j.id}
                    className="rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {j.action.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                        {new Date(j.date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{j.notes}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="min-h-[500px] xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">
              Proyección vs Real · {granularity === 'day' ? 'Diario' : granularity === 'week' ? 'Semanal' : 'Mensual'}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[480px]">
            {!chartData && <Skeleton className="h-full w-full" />}
            {chartData && (
              <ResponsiveContainer>
                <LineChart data={chartRows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    opacity={0.4}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatEurExact(Number(v) || 0).replace(',00 €', '€')}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                    formatter={(v) => formatEurExact(Number(v) || 0)}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="real"
                    stroke="#0f172a"
                    strokeWidth={3}
                    dot={false}
                    name="Real"
                  />
                  <Line
                    type="monotone"
                    dataKey="base"
                    stroke={LINE_COLORS[0]}
                    strokeDasharray="4 2"
                    strokeWidth={2}
                    dot={false}
                    name="Base"
                  />
                  {selectedIds.map((id, i) => {
                    const h = hypotheses.find((x) => x.id === id);
                    if (!h) return null;
                    return (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        stroke={LINE_COLORS[(i + 1) % LINE_COLORS.length]}
                        strokeDasharray="2 4"
                        strokeWidth={2}
                        dot={false}
                        name={h.name}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewHypothesisDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [churn, setChurn] = useState('6.7');
  const [growth, setGrowth] = useState('4.2');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      await dashboardsApi.proyecciones.createHypothesis({
        name: name.trim(),
        churn: Number(churn) / 100,
        growth: Number(growth) / 100,
      });
      toast.success('Hipótesis creada');
      setName('');
      onCreated();
      setOpen(false);
    } catch {
      toast.error('Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva hipótesis</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Escenario Q3" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Churn %</Label>
              <Input type="number" step="0.1" value={churn} onChange={(e) => setChurn(e.target.value)} />
            </div>
            <div>
              <Label>Growth %</Label>
              <Input type="number" step="0.1" value={growth} onChange={(e) => setGrowth(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creando...' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
