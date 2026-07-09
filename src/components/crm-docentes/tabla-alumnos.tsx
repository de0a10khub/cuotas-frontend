'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OnboardingCaseList } from '@/lib/crm-docentes-types';
import { EstadoChip, NotaChip, PagoChip } from './estado-chips';

export function TablaAlumnos({
  cases,
  onOpen,
}: {
  cases: OnboardingCaseList[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alumno</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Coach / Docente</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead>Llamadas</TableHead>
            <TableHead>Pruebas</TableHead>
            <TableHead>Próxima</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => (
            <TableRow
              key={c.id}
              onClick={() => onOpen(c.id)}
              className={
                'cursor-pointer ' +
                (c.es_urgente_24h ? 'crm-urgente' : '')
              }
            >
              <TableCell>
                <div className="flex items-center gap-2 font-semibold">
                  {c.es_urgente_24h && (
                    <span className="text-red-500 crm-urgente-badge">🔥</span>
                  )}
                  <span>{c.customer_name || '—'}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {c.customer_email}
                </div>
              </TableCell>
              <TableCell className="text-[13px]">
                {c.producto_nombre || (c.ticket_total_cents ? `${Math.round(c.ticket_total_cents/100)}€` : '—')}
              </TableCell>
              <TableCell className="text-[12px]">
                {c.docente_nombre ? (
                  <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-bold text-violet-600">
                    🎓 {c.docente_nombre}
                  </span>
                ) : c.coach_nombre ? (
                  <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-bold text-cyan-600">
                    🎯 {c.coach_nombre}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-[11px] font-bold uppercase text-muted-foreground">
                {c.fase}
              </TableCell>
              <TableCell>
                <EstadoChip estado={c.estado} />
              </TableCell>
              <TableCell>
                <PagoChip visibilidad={c.pagos_visibilidad} />
              </TableCell>
              <TableCell>
                <NotaChip nota={c.nota_implicacion} />
              </TableCell>
              <TableCell className="tabular-nums">
                {c.total_llamadas_hechas}
              </TableCell>
              <TableCell className="tabular-nums">
                {c.total_pruebas}
              </TableCell>
              <TableCell
                className={
                  c.es_vencido ? 'font-bold text-red-500' : 'text-muted-foreground'
                }
              >
                {c.proxima_llamada_vence ?? '—'}
              </TableCell>
            </TableRow>
          ))}
          {cases.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                Sin expedientes que mostrar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
