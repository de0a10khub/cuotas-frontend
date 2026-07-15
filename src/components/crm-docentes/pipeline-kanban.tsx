'use client';

import type { ColumnaPipeline, OnboardingCaseList } from '@/lib/crm-docentes-types';
import { CardAlumno } from './card-alumno';

// Columnas del tablero, en orden EXACTO del playbook (izq → der).
// `key` casa con columna_pipeline del backend (+ riesgo/perdido transversales).
type Col = {
  key: string;
  title: string;
  sub: string;
  icon: string;
  // clases estáticas (Tailwind no admite interpolación dinámica de color)
  badge: string;
  top: string;
};

const COLUMNAS: Col[] = [
  {
    key: 'onboarding_1',
    title: 'ONBOARDING 1',
    sub: 'Llamada 1 · Lucila · día 1-2',
    icon: '🚀',
    badge: 'bg-cyan-500',
    top: 'border-t-cyan-500',
  },
  {
    key: 'docente_reunion_1',
    title: 'DOCENTE · Reunión 1',
    sub: 'Arranque con docente · día 3',
    icon: '🤝',
    badge: 'bg-violet-500',
    top: 'border-t-violet-500',
  },
  {
    key: 'onboarding_2_control',
    title: 'ONBOARDING 2 · Control D4',
    sub: 'Lucila verifica · día 4',
    icon: '🔍',
    badge: 'bg-cyan-600',
    top: 'border-t-cyan-600',
  },
  {
    key: 'reunion_2',
    title: 'Reunión 2',
    sub: 'día 10',
    icon: '📈',
    badge: 'bg-blue-500',
    top: 'border-t-blue-500',
  },
  {
    key: 'reunion_3',
    title: 'Reunión 3',
    sub: 'día 17',
    icon: '🔧',
    badge: 'bg-indigo-500',
    top: 'border-t-indigo-500',
  },
  {
    key: 'reunion_4',
    title: 'Reunión 4',
    sub: 'Cierre mes 1 · día 24',
    icon: '🏆',
    badge: 'bg-emerald-500',
    top: 'border-t-emerald-500',
  },
  {
    key: 'quincenal_1',
    title: 'Quincenal 1',
    sub: 'Mes 2 · ~día 38',
    icon: '🔄',
    badge: 'bg-teal-500',
    top: 'border-t-teal-500',
  },
  {
    key: 'quincenal_2plus',
    title: 'Quincenal 2 y sig.',
    sub: 'Recurrente · cada 14 días',
    icon: '🔁',
    badge: 'bg-teal-600',
    top: 'border-t-teal-600',
  },
  {
    key: 'riesgo',
    title: 'EN RIESGO',
    sub: 'Transversal · recuperar ya',
    icon: '⚠️',
    badge: 'bg-red-500',
    top: 'border-t-red-500',
  },
  {
    key: 'perdido',
    title: 'PERDIDO',
    sub: 'Baja registrada',
    icon: '❌',
    badge: 'bg-zinc-500',
    top: 'border-t-zinc-500',
  },
];

// Fallback si el backend aún no manda columna_pipeline (ventana de deploy).
const MAP_LEGACY_FASE: Record<string, ColumnaPipeline> = {
  onboarding_1: 'onboarding_1',
  docente_primera_reunion: 'docente_reunion_1',
  onboarding_2_control: 'onboarding_2_control',
  docente_seguimiento: 'reunion_2',
  nuevo: 'onboarding_1',
  onboarding: 'onboarding_1',
  docente: 'reunion_2',
};

function columnaDe(c: OnboardingCaseList): string {
  // Transversales primero: perdido y en-riesgo mandan sobre la etapa.
  if (c.fase === 'perdido') return 'perdido';
  if (c.estado === 'riesgo') return 'riesgo';
  // Acceso defensivo: durante la ventana de deploy el backend viejo puede
  // no mandar columna_pipeline todavía → fallback por fase.
  const raw = c.columna_pipeline as ColumnaPipeline | undefined;
  const col = raw ?? MAP_LEGACY_FASE[c.fase] ?? 'onboarding_1';
  return col === 'perdido' ? 'onboarding_1' : col;
}

export function PipelineKanban({
  cases,
  onOpen,
}: {
  cases: OnboardingCaseList[];
  onOpen: (id: string) => void;
}) {
  const grupos: Record<string, OnboardingCaseList[]> = {};
  for (const col of COLUMNAS) grupos[col.key] = [];
  for (const c of cases) {
    const key = columnaDe(c);
    (grupos[key] ?? grupos.onboarding_1).push(c);
  }

  return (
    // Scroll horizontal para recorrer todas las etapas; cada columna
    // scrollea sus tarjetas en vertical de forma independiente.
    <div className="-mx-1 overflow-x-auto pb-3">
      <div className="flex min-w-max gap-3 px-1">
        {COLUMNAS.map((col) => {
          const items = grupos[col.key] ?? [];
          return (
            <div
              key={col.key}
              className={
                'flex w-[280px] shrink-0 flex-col rounded-xl border border-t-4 bg-card ' +
                col.top
              }
            >
              {/* Cabecera fija */}
              <div className="sticky top-0 z-10 rounded-t-xl border-b bg-card/95 px-3 py-2.5 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11.5px] font-bold uppercase tracking-wide leading-tight">
                    {col.icon} {col.title}
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold text-white ' +
                      col.badge
                    }
                  >
                    {items.length}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {col.sub}
                </div>
              </div>

              {/* Cuerpo: tarjetas con scroll vertical propio */}
              <div className="flex max-h-[calc(100vh-260px)] min-h-[80px] flex-col gap-2 overflow-y-auto p-2">
                {items.length === 0 ? (
                  <div className="py-6 text-center text-[11.5px] text-muted-foreground/50">
                    vacío
                  </div>
                ) : (
                  items.map((c) => <CardAlumno key={c.id} c={c} onOpen={onOpen} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
