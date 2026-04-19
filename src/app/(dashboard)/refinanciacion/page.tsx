'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Link as LinkIcon,
  Loader2,
  Search,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/api';
import {
  refinanApi,
  type OrphanSale,
  type RefinanOperation,
} from '@/lib/refinanciacion-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function formatEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format((cents || 0) / 100);
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

export default function RefinanciacionPage() {
  const [ops, setOps] = useState<RefinanOperation[]>([]);
  const [orphans, setOrphans] = useState<OrphanSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [opType, setOpType] = useState<'all' | 'refinanciacion' | 'amortizacion_anticipada'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([refinanApi.list(), refinanApi.orphans()]);
      setOps(a.results);
      setOrphans(b.results);
    } catch {
      toast.error('Error cargando refinanciaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const detect = async () => {
    setDetecting(true);
    try {
      const r = await refinanApi.detect();
      toast.success(r.message);
      await load();
    } catch {
      toast.error('Error ejecutando el motor');
    } finally {
      setDetecting(false);
    }
  };

  const exportCsv = async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}${refinanApi.exportUrl()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `refinanciaciones_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV generado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ops.filter((o) => {
      if (opType !== 'all' && o.operation_type !== opType) return false;
      if (q) {
        const hay =
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_email.toLowerCase().includes(q) ||
          o.original_sub_id.toLowerCase().includes(q) ||
          o.new_sub_id.toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [ops, opType, search]);

  const totalRefinan = ops.filter((o) => o.operation_type === 'refinanciacion').length;
  const totalAmort = ops.filter((o) => o.operation_type === 'amortizacion_anticipada').length;
  const totalSavedCents = ops.reduce((acc, o) => acc + (Number(o.amount_saved) || 0), 0);

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
      <header>
        <h1 className="bg-gradient-to-r from-slate-900 via-indigo-700 to-indigo-600 bg-clip-text text-3xl font-black italic tracking-tighter text-transparent dark:from-white dark:via-indigo-400 dark:to-indigo-300">
          Módulo REFINANCIACIÓN
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de clientes que han refinanciado sus planes o realizado amortizaciones
          anticipadas.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Operaciones" value={ops.length} hint="Total de registros detectados" />
        <KpiCard
          title="Refinanciaciones"
          value={totalRefinan}
          hint="Cambios a menor número de cuotas"
          accent="border-l-indigo-500"
          valueClass="text-indigo-600 dark:text-indigo-400"
        />
        <KpiCard
          title="Amortizaciones"
          value={totalAmort}
          hint="Liquidaciones de pago único"
          accent="border-l-emerald-500"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          title="Ahorro en Intereses"
          value={formatEur(totalSavedCents)}
          hint="Estimación de reducción para clientes"
          accent="border-l-amber-500"
          valueClass="text-amber-600 dark:text-amber-400"
        />
      </div>

      <Tabs defaultValue="detected">
        <TabsList className="h-12 border bg-white/50 p-1 backdrop-blur-md dark:bg-slate-900/40">
          <TabsTrigger
            value="detected"
            className="gap-2 data-active:bg-indigo-600 data-active:text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Operaciones Detectadas
          </TabsTrigger>
          <TabsTrigger
            value="orphan"
            className="gap-2 data-active:bg-indigo-600 data-active:text-white"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Ventas sin emparejar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detected" className="space-y-3">
          <Card className="border bg-white/50 shadow-md backdrop-blur-md dark:bg-slate-900/40">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="text-base">
                {filtered.length} operaciones en el catálogo
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={opType}
                  onValueChange={(v) =>
                    setOpType((v as typeof opType) || 'all')
                  }
                >
                  <SelectTrigger className="h-8 w-44" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="refinanciacion">Refinanciación</SelectItem>
                    <SelectItem value="amortizacion_anticipada">Amortización</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative min-w-60">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, email o ID..."
                    className="h-8 pl-7"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={detect} disabled={detecting}>
                  {detecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Detectar
                </Button>
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={ops.length === 0}>
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente / Operación</TableHead>
                    <TableHead className="bg-slate-50/50 dark:bg-slate-900/30">
                      Original (Suscrip.)
                    </TableHead>
                    <TableHead className="bg-indigo-50/10 dark:bg-indigo-950/10">
                      Nueva Operación
                    </TableHead>
                    <TableHead>Impacto / Ahorro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-12 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Sin operaciones detectadas con estos filtros.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    filtered.map((r) => {
                      const isRefi = r.operation_type === 'refinanciacion';
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-bold">{r.customer_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.customer_email}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge
                                className={cn(
                                  'text-[10px] font-bold',
                                  isRefi
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
                                )}
                              >
                                {isRefi ? 'Refinanciación' : 'Amortización'}
                              </Badge>
                              {r.product_group && (
                                <Badge variant="outline" className="text-[10px]">
                                  {r.product_group}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {r.original_sub_id}
                            </div>
                            <div className="font-medium">{r.product_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(r.original_start_date)}
                            </div>
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              {r.original_installments_paid} de {r.original_installments} cuotas
                            </Badge>
                          </TableCell>
                          <TableCell className="border-x border-indigo-100 bg-indigo-50/10 dark:border-indigo-950/50 dark:bg-indigo-950/10">
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {r.new_sub_id}
                            </div>
                            <div className="font-medium">{r.new_product_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(r.refinance_date)}
                            </div>
                            <Badge
                              className={cn(
                                'mt-1 text-[10px] font-bold',
                                isRefi
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-emerald-600 text-white',
                              )}
                            >
                              {isRefi
                                ? `${r.new_installments} cuotas`
                                : 'Pago Único'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-4 w-4 text-emerald-600" />
                              <span className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                {r.installments_reduced}
                              </span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {r.installments_reduced === 1 ? 'mes menos' : 'meses menos'}
                              </span>
                            </div>
                            <Badge className="mt-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                              Ahorra {formatEur(r.amount_saved)}
                            </Badge>
                            {!isRefi && (
                              <Badge className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                                {formatEur(r.new_amount)}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orphan" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{orphans.length} ventas huérfanas</CardTitle>
              <p className="text-xs text-muted-foreground">
                Ventas que podrían ser refinanciaciones pero no están emparejadas con una
                suscripción original.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Fecha venta</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!loading && orphans.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No hay ventas huérfanas por emparejar.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    orphans.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="font-medium">{o.customer_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.customer_email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{o.product_name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {o.external_identifier}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{o.platform}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(o.sale_date)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatEur(o.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await refinanApi.pair(o.id, '');
                                toast.success('Emparejada (mock)');
                                await load();
                              } catch {
                                toast.error('Error al emparejar');
                              }
                            }}
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            Emparejar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardContent className="p-4 text-xs text-amber-800 dark:text-amber-200">
          ℹ️ <b>Información del motor</b>: El sistema cruza a diario el email del cliente con
          sus múltiples cuentas locales, detectando refinanciaciones automáticas. Si una venta
          no se detecta (por cambio de email o error), úsala desde la pestaña{' '}
          <b>&quot;Ventas sin emparejar&quot;</b> para vincularla manualmente.
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  accent,
  valueClass,
}: {
  title: string;
  value: number | string;
  hint: string;
  accent?: string;
  valueClass?: string;
}) {
  return (
    <Card className={cn('border-l-4 bg-white/50 shadow-md backdrop-blur-md dark:bg-slate-900/40', accent)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-3xl font-black tabular-nums tracking-tight', valueClass)}>
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
