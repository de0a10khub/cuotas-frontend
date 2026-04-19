'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  FileText,
  Lock,
  MessageSquare,
  Phone,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatEurExact } from '@/components/cobros/format-utils';
import { Copyable } from '@/components/data/copyable';
import { EmptyTable } from '@/components/data/empty-table';
import { DataPagination } from '@/components/data/data-pagination';
import type { FullPayLead } from '@/lib/fullpay-types';
import { PAGE_SIZE_OPTIONS, statusBadgeClass } from './constants';

interface Props {
  rows: FullPayLead[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onRowOpen: (row: FullPayLead) => void;
}

function formatShortDate(iso: string): string {
  try {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y.slice(2)}`;
  } catch {
    return iso;
  }
}

export function FullPayTable({
  rows,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowOpen,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead>Cliente / Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Producto / Cuotas</TableHead>
              <TableHead>Disputas</TableHead>
              <TableHead>Pagos</TableHead>
              <TableHead>Alta / Días</TableHead>
              <TableHead className="text-right">LTV</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Comentario</TableHead>
              <TableHead className="text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 13 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <EmptyTable colSpan={13} title="Sin leads con esos filtros" />
            )}

            {!loading &&
              rows.map((r, idx) => {
                const isLocked = !!r.recovery_locked_by;
                const status = r.recovery_status || 'PENDIENTE';
                return (
                  <TableRow
                    key={r.subscription_id}
                    onClick={() => !isLocked && onRowOpen(r)}
                    className={cn(
                      'cursor-pointer',
                      isLocked && 'bg-slate-50 opacity-80 dark:bg-slate-900/40',
                    )}
                  >
                    <TableCell className="text-center text-xs text-slate-400">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate font-medium">{r.customer_name}</p>
                      <Copyable
                        value={r.customer_email}
                        className="text-xs text-slate-500"
                      />
                    </TableCell>
                    <TableCell>
                      {r.customer_phone ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <Copyable value={r.customer_phone} />
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <p className="truncate text-xs font-medium">
                        {r.product_name || 'Suscripción'}
                      </p>
                      <p className="text-[10px] text-primary">
                        {r.paid_count} cuotas pagadas
                      </p>
                    </TableCell>
                    <TableCell>
                      <DisputesCompact
                        open={r.open_disputes}
                        lost={r.lost_disputes}
                        won={r.won_disputes}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums dark:bg-slate-800">
                        <CreditCard className="h-3 w-3 text-slate-400" />
                        {r.paid_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{formatShortDate(r.alta_date)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.days_since_alta} días
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {Number(r.paid_total || 0).toLocaleString('es-ES')}€
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] font-bold', statusBadgeClass(status))}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.recovery_operator ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <UserIcon className="h-3 w-3 text-slate-400" />
                          {r.recovery_operator}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.recovery_payment_proof ? (
                        <a
                          href={r.recovery_payment_proof}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="line-clamp-2 max-w-[200px] text-xs italic text-slate-600 dark:text-slate-300"
                      title={r.recovery_comment || undefined}
                    >
                      {r.recovery_comment || (
                        <span className="not-italic text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isLocked ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"
                          title={`Bloqueado por ${r.recovery_locked_by}`}
                        >
                          <Lock className="h-3 w-3" />
                          LOCKED
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowOpen(r);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        page={page}
        pageSize={pageSize}
        total={total}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

function DisputesCompact({
  open,
  lost,
  won,
}: {
  open: number;
  lost: number;
  won: number;
}) {
  const any = open > 0 || lost > 0 || won > 0;
  if (!any) return <span className="text-xs italic text-slate-400">Sin disp.</span>;
  return (
    <div className="flex items-center gap-2 text-xs">
      {open > 0 && (
        <span className="inline-flex items-center gap-0.5 text-amber-600" title="Abiertas">
          <span className="h-1 w-1 rounded-full bg-amber-500" />
          {open}
        </span>
      )}
      {lost > 0 && (
        <span className="inline-flex items-center gap-0.5 text-rose-600" title="Perdidas">
          <span className="h-1 w-1 rounded-full bg-rose-500" />
          {lost}
        </span>
      )}
      {won > 0 && (
        <span className="inline-flex items-center gap-0.5 text-emerald-600" title="Ganadas">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          {won}
        </span>
      )}
    </div>
  );
}

// Silence unused re-export warning if formatEurExact is imported but unused.
void formatEurExact;
