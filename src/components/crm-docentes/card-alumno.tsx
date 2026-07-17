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

/**
 * Círculos de avance. Dos modos:
 *  - normal: [1,2,3,4,Q], posición deducida de la columna del tablero.
 *  - reactivación: [1,2,3,4] SIN quincenal (su proceso son 4 reuniones y
 *    ahí termina). La columna no sirve para deducir el avance porque todas
 *    las reactivaciones comparten columna → viene del backend en `etapa`.
 */
function ProgresoReuniones({
  col,
  etapa,
}: {
  col?: ColumnaPipeline;
  etapa?: number | null;
}) {
  const esReactivacion = etapa !== null && etapa !== undefined;
  const labels = esReactivacion ? CIRCULO_LABELS.slice(0, 4) : CIRCULO_LABELS;
  const p = esReactivacion
    ? { done: etapa, current: etapa < 4 ? etapa : -1 }
    : (col && PROGRESO_REUNIONES[col]) || { done: 0, current: -1 };
  return (
    <div
      className="flex items-center gap-1.5"
      title={
        esReactivacion
          ? 'Reactivación: Reunión 1 → 2 → 3 → 4 (sin quincenal)'
          : 'Reunión 1 → 2 → 3 → 4 → Quincenal'
      }
    >
      {labels.map((lab, i) => {
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
  const esReactivacion = c.es_reactivacion || c.es_antiguo;

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
      {/* Badge de reactivación: destacado, no un aviso más. Es lo primero
          que el docente tiene que saber — cambia toda la conversación. */}
      {esReactivacion && (
        <div className="mb-1.5">
          <span className="inline-flex items-center rounded bg-gradient-to-r from-emerald-500 to-cyan-500 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            🔄 Reactivación
          </span>
        </div>
      )}

      {/* Avisos (una línea, solo si aplican) */}
      {(urgente || c.esperando_respuesta) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold leading-tight">
          {c.es_urgente_24h && <span className="text-red-500">🔥 +24h sin contactar</span>}
          {c.es_urgente_primer_toque_24h && (
            <span className="text-red-500">🚨 sin tocar (24h)</span>
          )}
          {c.esperando_respuesta && (
            <span className="text-amber-500">📨 esperando respuesta</span>
          )}
        </div>
      )}

      {/* Nombre (deduplicado, una sola vez) */}
      <div className="text-[13px] font-bold leading-tight">{nombre}</div>

      {/* Producto / precio · fecha de alta.
          En reactivación el importe NO es el precio del producto: es la
          deuda refinanciada, y la fecha de alta es la de la ficha, no la de
          entrada en la academia. Se etiquetan para no engañar al docente;
          el detalle real está en la ficha. */}
      <div className="mt-1 text-[11px] text-muted-foreground">
        {esReactivacion ? (
          <>
            {precioLabel(c)} <span className="opacity-70">deuda refinanciada</span>
          </>
        ) : (
          <>
            {precioLabel(c)} · alta {c.created_at.slice(0, 10)}
          </>
        )}
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
        <ProgresoReuniones col={c.columna_pipeline} etapa={c.reactivacion_etapa} />
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
