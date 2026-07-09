'use client';

import { Card } from '@/components/ui/card';
import type { KPIs } from '@/lib/crm-docentes-types';

/**
 * Barra de KPIs superior — 6 métricas globales del CRM.
 * Layout responsive: grid autofit min 170px.
 */
interface KpiItem {
  v: number | string;
  l: string;
  mal?: boolean;
  fire?: boolean;
}

export function KpisBar({ kpis, loading }: { kpis: KPIs | null; loading?: boolean }) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  const morosidadMal = kpis.morosidad_pct >= 25;
  const urgentes = kpis.urgentes_24h ?? kpis.nuevos_sin_primera_llamada;
  const items: KpiItem[] = [
    { v: kpis.activos, l: 'Alumnos activos' },
    {
      v: `${kpis.morosidad_pct}%`,
      l: 'Morosidad global · objetivo <25%',
      mal: morosidadMal,
    },
    {
      v: urgentes,
      l: '🔥 URGENTES sin contactar +24h',
      mal: urgentes > 0,
      fire: urgentes > 0,
    },
    {
      v: kpis.llamadas_vencidas,
      l: 'Llamadas vencidas',
      mal: kpis.llamadas_vencidas > 0,
    },
    { v: kpis.en_riesgo, l: 'En riesgo', mal: kpis.en_riesgo > 0 },
    { v: kpis.nota_media ?? '—', l: 'Nota media implicación' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items.map((it, i) => (
        <Card
          key={i}
          className={
            'relative overflow-hidden p-4 ' +
            (it.fire ? 'crm-urgente ' : it.mal ? 'border-red-500/30 bg-red-500/5' : '')
          }
        >
          <span
            className={
              'absolute inset-x-0 top-0 h-[3px] ' +
              (it.mal
                ? 'bg-gradient-to-r from-red-500 to-amber-500'
                : 'bg-gradient-to-r from-cyan-500 to-violet-500 opacity-70')
            }
          />
          <div
            className={
              'text-2xl font-extrabold ' + (it.mal ? 'text-red-500' : '')
            }
          >
            {it.v}
          </div>
          <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
            {it.l}
          </div>
        </Card>
      ))}
    </div>
  );
}
