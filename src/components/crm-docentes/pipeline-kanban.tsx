'use client';

import type { ColumnaPipeline, OnboardingCaseList } from '@/lib/crm-docentes-types';
import { CardAlumno } from './card-alumno';

// Columnas del tablero, en orden EXACTO del playbook (izq → der).
// `key` casa con columna_pipeline del backend (+ riesgo/perdido transversales).
type Variant = 'normal' | 'reactivacion' | 'riesgo' | 'perdido';
type Col = { key: string; title: string; sub: string; icon: string; variant: Variant };

const COLUMNAS: Col[] = [
  // Reactivaciones: proceso APARTE (Carlos 2026-07-17). No pasan por
  // onboarding y solo tienen 4 reuniones, sin quincenal. Va la primera
  // para que se lea como un carril propio, no como una etapa del pipeline.
  { key: 'reactivacion', title: 'Reactivaciones', sub: 'Proceso aparte · 4 reuniones', icon: '🔄', variant: 'reactivacion' },
  { key: 'onboarding_1', title: 'Onboarding 1', sub: 'Llamada 1 · Lucila · día 1-2', icon: '🚀', variant: 'normal' },
  { key: 'docente_reunion_1', title: 'Docente · Reunión 1', sub: 'Arranque con docente · día 3', icon: '🤝', variant: 'normal' },
  { key: 'onboarding_2_control', title: 'Onboarding 2 · Control D4', sub: 'Lucila verifica · día 4', icon: '🔍', variant: 'normal' },
  { key: 'reunion_2', title: 'Reunión 2', sub: 'día 10', icon: '📈', variant: 'normal' },
  { key: 'reunion_3', title: 'Reunión 3', sub: 'día 17', icon: '🔧', variant: 'normal' },
  { key: 'reunion_4', title: 'Reunión 4', sub: 'Cierre mes 1 · día 24', icon: '🏆', variant: 'normal' },
  { key: 'quincenal_1', title: 'Quincenal 1', sub: 'Mes 2 · ~día 38', icon: '🔄', variant: 'normal' },
  { key: 'quincenal_2plus', title: 'Quincenal 2 y sig.', sub: 'Recurrente · cada 14 días', icon: '🔁', variant: 'normal' },
  { key: 'riesgo', title: 'En riesgo', sub: 'Transversal · recuperar ya', icon: '⚠️', variant: 'riesgo' },
  { key: 'perdido', title: 'Perdido', sub: 'Baja registrada', icon: '❌', variant: 'perdido' },
];

// Estilos por variante — misma familia visual que el resto del CRM
// (degradado cyan→violet; rojo→ámbar para riesgo; zinc para perdido).
const VARIANT_STYLES: Record<Variant, { strip: string; header: string; badge: string }> = {
  normal: {
    strip: 'bg-gradient-to-r from-cyan-500 to-violet-500',
    header: 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10',
    badge: 'bg-gradient-to-r from-cyan-500 to-violet-500',
  },
  // Verde→cyan: carril propio, distinguible de un vistazo del cyan→violet
  // del pipeline normal, sin caer en el rojo→ámbar de riesgo.
  reactivacion: {
    strip: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
    header: 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10',
    badge: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
  },
  riesgo: {
    strip: 'bg-gradient-to-r from-red-500 to-amber-500',
    header: 'bg-gradient-to-r from-red-500/10 to-amber-500/10',
    badge: 'bg-gradient-to-r from-red-500 to-amber-500',
  },
  perdido: {
    strip: 'bg-gradient-to-r from-zinc-500 to-zinc-600',
    header: 'bg-gradient-to-r from-zinc-500/10 to-zinc-600/10',
    badge: 'bg-zinc-600',
  },
};

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
  // Transversales primero: perdido manda sobre cualquier etapa.
  if (c.fase === 'perdido') return 'perdido';
  // Reactivación: carril propio y exclusivo (Carlos 2026-07-17). NO cae en
  // EN RIESGO, que es del pipeline de alumnos nuevos — un reactivado no
  // cuenta en la morosidad normal del docente. Su urgencia sigue viéndose
  // en el color de la propia tarjeta, no se pierde.
  if (c.es_reactivacion) return 'reactivacion';
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
  isAdmin = false,
  docentes = [],
  onReasignar,
}: {
  cases: OnboardingCaseList[];
  onOpen: (id: string) => void;
  /** Directora/Admin: puede reasignar el alumno de docente desde la tarjeta. */
  isAdmin?: boolean;
  docentes?: { id: string; name: string; rol: string }[];
  onReasignar?: (caseId: string, profileId: string | null) => void;
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
          const st = VARIANT_STYLES[col.variant];
          return (
            <div
              key={col.key}
              className="flex w-[268px] shrink-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
            >
              {/* Tira superior degradada (familia visual del CRM) */}
              <div className={'h-[3px] w-full ' + st.strip} />

              {/* Cabecera: título + subtítulo + contador redondo */}
              <div className={'border-b border-foreground/10 px-3 py-2.5 ' + st.header}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11.5px] font-bold uppercase leading-tight tracking-wide">
                    {col.icon} {col.title}
                  </div>
                  <span
                    className={
                      'flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow-sm ' +
                      st.badge
                    }
                  >
                    {items.length}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {col.sub}
                </div>
              </div>

              {/* Cuerpo: tarjetas con scroll vertical suave e independiente */}
              <div className="flex max-h-[calc(100vh-250px)] min-h-[84px] flex-col gap-2 overflow-y-auto scroll-smooth p-2 [scrollbar-width:thin]">
                {items.length === 0 ? (
                  <div className="py-6 text-center text-[11.5px] text-muted-foreground/50">
                    vacío
                  </div>
                ) : (
                  items.map((c) => (
                    <CardAlumno
                      key={c.id}
                      c={c}
                      onOpen={onOpen}
                      isAdmin={isAdmin}
                      docentes={docentes}
                      onReasignar={onReasignar}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
