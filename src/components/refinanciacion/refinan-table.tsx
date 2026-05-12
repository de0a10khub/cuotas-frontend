'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { refinanApi, type RefinanOperation } from '@/lib/refinanciacion-api';
import { formatEuros } from '@/lib/format';

interface Props {
  rows: RefinanOperation[];
  onUpdated?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completado' },
  { value: 'FULL-PAY', label: 'FULL-PAY' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function RefinanTable({ rows, onUpdated }: Props) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await refinanApi.overrideStatus(id, status);
      toast.success('Estado actualizado');
      onUpdated?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error actualizando estado';
      toast.error(msg);
    } finally {
      setUpdating(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No hay refinanciaciones detectadas. Usa &ldquo;Detectar refinanciaciones&rdquo; para que el motor empareje
        ventas nuevas con suscripciones originales.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Original</TableHead>
            <TableHead className="text-center">→</TableHead>
            <TableHead>Nueva</TableHead>
            <TableHead>Fecha refi</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead className="text-right">Ahorro</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Plataforma</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{r.customer_name || 'Sin nombre'}</span>
                  <span className="text-[10px] text-muted-foreground">{r.customer_email}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    r.operation_type === 'amortizacion_anticipada'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  }
                >
                  {r.operation_type === 'amortizacion_anticipada' ? 'Amortización' : 'Refinanciación'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-xs">
                  <span className="truncate font-medium">{r.product_name || '-'}</span>
                  <span className="text-muted-foreground">
                    {r.original_installments_paid}/{r.original_installments} cuotas
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <ArrowRight className="mx-auto h-4 w-4 text-indigo-500" />
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-xs">
                  <span className="truncate font-medium">{r.new_product_name || '-'}</span>
                  <span className="text-muted-foreground">
                    {r.new_installments} {r.new_installments === 1 ? 'cuota' : 'cuotas'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {r.refinance_date
                  ? new Date(r.refinance_date).toLocaleDateString('es-ES', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })
                  : '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {formatEuros((r.new_amount || 0) / 100)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                {r.amount_saved ? formatEuros(r.amount_saved / 100) : '-'}
              </TableCell>
              <TableCell>
                <Select
                  value={r.refinance_status || 'pending'}
                  onValueChange={(v) => { if (v) handleStatusChange(r.id, v); }}
                  disabled={updating === r.id}
                >
                  <SelectTrigger className="h-7 w-32 text-xs">
                    {updating === r.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">
                  {r.platform}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
