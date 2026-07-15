'use client';

import { Card } from '@/components/ui/card';
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
      className="flex items-center gap-1"
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

function precioLabel(c: OnboardingCaseList): string {
  if (c.producto_nombre) return c.producto_nombre;
  if (c.ticket_total_cents)
    return `${Math.round(c.ticket_total_cents / 100).toLocaleString('es-ES')} €`;
  return '—';
}

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

  // Flags compactos en una sola línea (solo los que aplican) para no
  // romper la uniformidad de altura de las tarjetas.
  const flags: { t: string; cls: string }[] = [];
  if (c.es_urgente_24h) flags.push({ t: '🔥 +24h', cls: 'text-red-500' });
  if (c.es_urgente_primer_toque_24h)
    flags.push({ t: '🚨 sin tocar', cls: 'text-red-500' });
  if (c.esperando_respuesta) flags.push({ t: '📨 esperando', cls: 'text-amber-500' });
  if (c.es_reactivacion || c.es_antiguo)
    flags.push({ t: '🔁 reactivación', cls: 'text-purple-500' });

  return (
    <Card
      onClick={() => onOpen(c.id)}
      className={
        'cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:ring-cyan-500/40 ' +
        (urgente ? 'ring-red-500/50' : vencido ? 'ring-red-500/40' : '')
      }
    >
      {/* Tira superior de estado — familia visual del CRM (cyan→violet;
          rojo→ámbar si urgente/vencida). */}
      <div
        className={
          'h-[3px] w-full ' +
          (urgente
            ? 'bg-gradient-to-r from-red-500 to-amber-500'
            : vencido
              ? 'bg-red-500/70'
              : 'bg-gradient-to-r from-cyan-500 to-violet-500 opacity-60')
        }
      />

      <div className="flex flex-col gap-1.5 p-2.5">
        {flags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] font-bold leading-none">
            {flags.map((f) => (
              <span key={f.t} className={f.cls}>
                {f.t}
              </span>
            ))}
          </div>
        )}

        <div className="line-clamp-2 text-[12.5px] font-bold leading-tight">
          {nombre}
        </div>

        <div className="truncate text-[10.5px] text-muted-foreground">
          {precioLabel(c)} · alta {c.created_at.slice(0, 10)}
        </div>

        {/* Asignado: docente o coach (siempre presente, estructura uniforme) */}
        <div className="flex items-center gap-1 text-[10px]">
          {c.docente_nombre ? (
            <span className="max-w-full truncate rounded bg-violet-500/12 px-1.5 py-0.5 font-bold text-violet-500">
              🎓 {c.docente_nombre}
            </span>
          ) : c.coach_nombre ? (
            <span className="max-w-full truncate rounded bg-cyan-500/12 px-1.5 py-0.5 font-bold text-cyan-500">
              🎯 {c.coach_nombre}
            </span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground/70">
              sin asignar
            </span>
          )}
        </div>

        <ProgresoReuniones col={c.columna_pipeline} />

        <div className="flex items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <EstadoChip estado={c.estado} />
            <PagoChip visibilidad={c.pagos_visibilidad} />
          </div>
          <NotaChip nota={c.nota_implicacion} />
        </div>
      </div>
    </Card>
  );
}
