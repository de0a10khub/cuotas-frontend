'use client';

import { Card } from '@/components/ui/card';
import type { OnboardingCaseList } from '@/lib/crm-docentes-types';
import { EstadoChip, NotaChip, PagoChip } from './estado-chips';

export function CardAlumno({
  c,
  onOpen,
}: {
  c: OnboardingCaseList;
  onOpen: (id: string) => void;
}) {
  const vencido = c.es_vencido && c.fase !== 'perdido';
  const urgente = c.es_urgente_24h;
  return (
    <Card
      onClick={() => onOpen(c.id)}
      className={
        'cursor-pointer p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/10 ' +
        (urgente
          ? 'crm-urgente'
          : vencido ? 'border-red-500/50 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]' : '')
      }
    >
      {urgente && (
        <div className="mb-2 text-[11px] font-extrabold text-red-500 crm-urgente-badge">
          🔥 URGENTE · +24h sin contactar
        </div>
      )}
      <div className="text-[13px] font-bold leading-tight">
        {c.customer_name || c.customer_email}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {c.producto_nombre || (c.ticket_total_cents ? `${Math.round(c.ticket_total_cents/100)}€` : '—')} · alta {c.created_at.slice(0, 10)}
      </div>
      {(c.docente_nombre || c.coach_nombre) && (
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10.5px]">
          {c.docente_nombre && (
            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-bold text-violet-600">
              🎓 {c.docente_nombre}
            </span>
          )}
          {!c.docente_nombre && c.coach_nombre && (
            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-bold text-cyan-600">
              🎯 {c.coach_nombre}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <EstadoChip estado={c.estado} />
          <PagoChip visibilidad={c.pagos_visibilidad} />
        </div>
        <NotaChip nota={c.nota_implicacion} />
      </div>
      {c.proxima_llamada_vence && c.fase !== 'perdido' && (
        <div
          className={
            'mt-2 text-[11px] ' +
            (vencido
              ? 'font-bold text-red-500'
              : 'text-muted-foreground')
          }
        >
          📞 Próxima: {c.proxima_llamada_vence}
          {vencido ? ' · VENCIDA' : ''}
        </div>
      )}
    </Card>
  );
}
