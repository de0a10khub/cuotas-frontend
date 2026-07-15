'use client';

import type { ColumnaPipeline, OnboardingCaseList } from '@/lib/crm-docentes-types';
import { cleanCustomerName } from '@/lib/utils';
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
      className="flex items-center gap-1.5"
      title="Reunión 1 → 2 → 3 → 4 → Quincenal"
    >
      {CIRCULO_LABELS.map((lab, i) => {
        const done = i < p.done;
        const current = i === p.current;
        return (
          <span
            key={lab}
            className={
              'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ' +
              (done
                ? 'bg-emerald-500 text-white'
                : current
                  ? 'bg-violet-500 text-white ring-2 ring-violet-300/50'
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

function precioLabel(c: OnboardingCaseList): string {
  if (c.producto_nombre) return c.producto_nombre;
  if (c.ticket_total_cents)
    return `${Math.round(c.ticket_total_cents / 100).toLocaleString('es-ES')} €`;
  return '—';
}

/**
 * Tarjeta ÚNICA del pipeline — idéntica en todas las columnas y para todos
 * los alumnos. `shrink-0` es CRÍTICO: sin él, al ser hija de un flex-col con
 * overflow, la tarjeta se encoge y colapsa cuando la columna tiene muchos
 * alumnos (era el bug de "rayas finas" en Reunión 1 y "lista de nombres" en
 * Reunión 2+). Estructura 100% incondicional: siempre se ve completa.
 */
export function CardAlumno({
  c,
  onOpen,
}: {
  c: OnboardingCaseList;
  onOpen: (id: string) => void;
}) {
  const vencido = c.es_vencido && c.fase !== 'perdido';
  const urgente = c.es_urgente_24h || c.es_urgente_primer_toque_24h;
  const nombre = cleanCustomerName(c.customer_name) || c.customer_email;

  return (
    <div
      onClick={() => onOpen(c.id)}
      className={
        'w-full shrink-0 cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-md ' +
        (urgente
          ? 'border-red-500/60'
          : vencido
            ? 'border-red-500/40'
            : 'border-foreground/12')
      }
    >
      {/* Avisos (una línea, solo si aplican) */}
      {(urgente || c.esperando_respuesta || c.es_reactivacion || c.es_antiguo) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold leading-tight">
          {c.es_urgente_24h && <span className="text-red-500">🔥 +24h sin contactar</span>}
          {c.es_urgente_primer_toque_24h && (
            <span className="text-red-500">🚨 sin tocar (24h)</span>
          )}
          {c.esperando_respuesta && (
            <span className="text-amber-500">📨 esperando respuesta</span>
          )}
          {(c.es_reactivacion || c.es_antiguo) && (
            <span className="text-purple-500">🔁 reactivación</span>
          )}
        </div>
      )}

      {/* Nombre (deduplicado, una sola vez) */}
      <div className="text-[13px] font-bold leading-tight">{nombre}</div>

      {/* Producto / precio · fecha de alta */}
      <div className="mt-1 text-[11px] text-muted-foreground">
        {precioLabel(c)} · alta {c.created_at.slice(0, 10)}
      </div>

      {/* Docente o coach asignado (siempre presente) */}
      <div className="mt-2 flex items-center gap-1 text-[10.5px]">
        {c.docente_nombre ? (
          <span className="rounded bg-violet-500/12 px-1.5 py-0.5 font-bold text-violet-500">
            🎓 {c.docente_nombre}
          </span>
        ) : c.coach_nombre ? (
          <span className="rounded bg-cyan-500/12 px-1.5 py-0.5 font-bold text-cyan-500">
            🎯 {c.coach_nombre}
          </span>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground/70">
            sin asignar
          </span>
        )}
      </div>

      {/* Círculos de llamadas ①②③④→Q con su color */}
      <div className="mt-2.5">
        <ProgresoReuniones col={c.columna_pipeline} />
      </div>

      {/* Estado + pago + nota */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <EstadoChip estado={c.estado} />
          <PagoChip visibilidad={c.pagos_visibilidad} />
        </div>
        <NotaChip nota={c.nota_implicacion} />
      </div>
    </div>
  );
}
