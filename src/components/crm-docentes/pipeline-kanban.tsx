'use client';

import { Card } from '@/components/ui/card';
import type { OnboardingCaseList } from '@/lib/crm-docentes-types';
import { CardAlumno } from './card-alumno';

const COLUMNAS: Array<{ key: string; title: string; icon: string }> = [
  { key: 'onboarding_1', title: 'Onboarding 1', icon: '🚀' },
  { key: 'docente_primera_reunion', title: 'Docente · 1ª reunión', icon: '🤝' },
  { key: 'onboarding_2_control', title: 'Onboarding 2 · Control D4', icon: '🔍' },
  { key: 'docente_seguimiento', title: 'Docente · Seguimiento', icon: '🎓' },
  { key: 'riesgo', title: 'En riesgo', icon: '⚠️' },
  { key: 'perdido', title: 'Perdido', icon: '❌' },
];

export function PipelineKanban({
  cases,
  onOpen,
}: {
  cases: OnboardingCaseList[];
  onOpen: (id: string) => void;
}) {
  const grupos: Record<string, OnboardingCaseList[]> = {
    onboarding_1: [],
    docente_primera_reunion: [],
    onboarding_2_control: [],
    docente_seguimiento: [],
    riesgo: [],
    perdido: [],
  };

  // Mapeo de fases legacy a nuevas (por si aparecen expedientes viejos sin migrar)
  const mapLegacy: Record<string, string> = {
    nuevo: 'onboarding_1',
    onboarding: 'onboarding_1',
    docente: 'docente_seguimiento',
  };

  for (const c of cases) {
    if (c.fase === 'perdido') {
      grupos.perdido.push(c);
    } else if (c.estado === 'riesgo') {
      grupos.riesgo.push(c);
    } else {
      const key = mapLegacy[c.fase] ?? c.fase;
      (grupos[key] ?? grupos.onboarding_1).push(c);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {COLUMNAS.map((col) => {
        const items = grupos[col.key] ?? [];
        return (
          <Card key={col.key} className="min-h-[110px] p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {col.icon} {col.title}
              </div>
              <span className="rounded-md bg-gradient-to-r from-cyan-500 to-violet-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.length === 0 ? (
                <div className="py-3 text-center text-[12px] text-muted-foreground/60">
                  vacío
                </div>
              ) : (
                items.map((c) => <CardAlumno key={c.id} c={c} onOpen={onOpen} />)
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
