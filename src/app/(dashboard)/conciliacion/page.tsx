'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { conciliacionApi, type ConciliacionRow } from '@/lib/conciliacion-api';
import { ExportConciliacionButton } from '@/components/conciliacion/export-button';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const YEARS = [2024, 2025, 2026];

function badgeClass(status: string): string {
  switch (status) {
    case 'PAGADA':
      return 'bg-emerald-600 text-white';
    case 'IMPAGADA':
    case 'DISPUTA':
      return 'bg-rose-600 text-white';
    case 'REEMBOLSADA':
      return 'bg-amber-500 text-white';
    case 'CANCELADA':
    case 'NO GENERADA':
      return 'bg-slate-500 text-white';
    case 'PENDIENTE':
      return 'border border-slate-300 text-slate-700 bg-white';
    default:
      return 'border border-slate-300 text-slate-700 bg-white';
  }
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format((cents || 0) / 100);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
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

export default function ConciliacionPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const now = new Date();
  const month = Math.max(1, Math.min(12, Number(sp.get('month')) || now.getMonth() + 1));
  const year = Number(sp.get('year')) || now.getFullYear();

  const [rows, setRows] = useState<ConciliacionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const pushParams = useCallback(
    (next: Partial<{ month: number; year: number }>) => {
      const q = new URLSearchParams();
      q.set('month', String(next.month ?? month));
      q.set('year', String(next.year ?? year));
      router.push(`/conciliacion?${q}`);
    },
    [router, month, year],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await conciliacionApi.list(month, year);
      setRows(r.results);
      setTotal(r.total_count);
    } catch {
      toast.error('Error cargando conciliación');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold uppercase italic tracking-tight">
            Conciliación de Pagos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seguimiento de 1ª y 2ª cuota por mes de adquisición.
          </p>
        </div>
        <ExportConciliacionButton month={month} year={year} disabled={rows.length === 0} />
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <label className="text-xs font-medium text-muted-foreground">Mes:</label>
          <Select value={String(month)} onValueChange={(v) => pushParams({ month: Number(v) })}>
            <SelectTrigger className="h-8 w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="text-xs font-medium text-muted-foreground">Año:</label>
          <Select value={String(year)} onValueChange={(v) => pushParams({ year: Number(v) })}>
            <SelectTrigger className="h-8 w-24" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
          <CardTitle className="text-base">
            📊 Datos de Conciliación - {month}/{year}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {total} registros encontrados
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Info Contacto</TableHead>
                <TableHead>Plataforma / Producto</TableHead>
                <TableHead>Fecha Compra</TableHead>
                <TableHead className="text-center">Cuota 1</TableHead>
                <TableHead className="text-center">Cuota 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
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
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Sin registros en {MONTHS[month - 1]} {year}.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((r) => (
                  <TableRow key={r.customer_id}>
                    <TableCell>
                      <div className="font-medium">{r.customer_name}</div>
                      <div className="font-mono text-[10px] uppercase text-muted-foreground">
                        {r.customer_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.customer_email}</div>
                      <div className="text-xs text-muted-foreground">{r.customer_phone || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="mb-0.5 text-[10px] uppercase"
                      >
                        {r.platform}
                      </Badge>
                      <div className="font-semibold">{r.product_name}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(r.purchase_date)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn('text-[10px] font-bold', badgeClass(r.cuota_1_status))}>
                        {r.cuota_1_status}
                      </Badge>
                      <div className="mt-0.5 font-mono text-xs">{formatEur(r.cuota_1_amount)}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn('text-[10px] font-bold', badgeClass(r.cuota_2_status))}>
                        {r.cuota_2_status}
                      </Badge>
                      {r.cuota_2_amount > 0 && (
                        <div className="mt-0.5 font-mono text-xs">
                          {formatEur(r.cuota_2_amount)}
                        </div>
                      )}
                      {r.cuota_2_date && (
                        <div className="text-[10px] text-muted-foreground">
                          {formatDateTime(r.cuota_2_date)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
