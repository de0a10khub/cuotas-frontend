'use client';

import { Card } from '@/components/ui/card';
import type { ColumnaPipeline, OnboardingCaseList } from '@/lib/crm-docentes-types';
import { EstadoChip, NotaChip, PagoChip } from './estado-chips';

// Progreso de reuniones por columna: cuántos círculos van "hechos" (done)
// y cuál es el que toca AHORA (current). Círculos = [R1, R2, R3, R4, Q].
const PROGRESO_REUNIONES: Record<string, { done: number; current: number }> = {
  onboarding_1: { done: 0, current: 0 },
  docente_reunion_1: { done: 0, current: 0 },
  onboarding_2_control: { done: 1, current: 1 },
  reunion_2: { done: 1, current: 1 },
  reunion_3: { done: 2, current: 2 },
  reunion_4: { done: 3, current: 3 },
  quincenal_1: { done: 4, current: 4 },
  quincenal_2plus: { done: 5, current: 4 },
};
const CIRCULO_LABELS = ['1', '2', '3', '4', 'Q'];

function ProgresoReuniones({ col }: { col?: ColumnaPipeline }) {
  const p = (col && PROGRESO_REUNIONES[col]) || { done: 0, current: -1 };
  return (
    <div
      className="mt-2 flex items-center gap-1"
      title="Progreso: Reunión 1 → 2 → 3 → 4 → Quincenal"
    >
      {CIRCULO_LABELS.map((lab, i) => {
        const done = i < p.done;
        const current = i === p.current;
        return (
          <span
            key={lab}
            className={
              'flex h-[15px] w-[15px] items-center justify-center rounded-full text-[8.5px] font-bold leading-none ' +
              (done
                ? 'bg-emerald-500 text-white'
                : current
                  ? 'bg-violet-500 text-white ring-1 ring-violet-300'
                  : 'bg-muted text-muted-foreground/40')
            }
          >
            {lab}
          </span>
        );
      })}
    </div>
  );
}

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
      {c.es_urgente_primer_toque_24h && (
        <div className="mb-2 text-[11px] font-extrabold text-red-500 crm-urgente-badge">
          🚨 URGENTE · sin tocar por el docente (24h)
        </div>
      )}
      {c.esperando_respuesta && (
        <div className="mb-2 text-[10.5px] font-bold text-amber-600">
          📨 Esperando respuesta{
            c.esperando_respuesta_desde
              ? ` · desde ${new Date(c.esperando_respuesta_desde).toLocaleDateString('es-ES')}`
              : ''
          }
        </div>
      )}
      {(c.es_reactivacion || c.es_antiguo) && (
        <div className="mb-2 rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-purple-600">
          🔁 EN REACTIVACIÓN{
            c.primera_compra_stripe
              ? ` · cliente desde ${new Date(c.primera_compra_stripe).toLocaleDateString('es-ES')}`
              : ''
          } · recuperar y poner al día
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
      {c.fase !== 'perdido' && <ProgresoReuniones col={c.columna_pipeline} />}
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
