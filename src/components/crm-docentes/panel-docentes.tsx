'use client';

import { Card } from '@/components/ui/card';
import type { DocenteScore } from '@/lib/crm-docentes-types';
import { ScoreRing, tierColor, tierIcon, tierLabel } from './score-ring';

function Barra({
  label,
  val,
  max,
  color,
}: {
  label: string;
  val: number;
  max: number;
  color: string;
}) {
  const p = Math.round((100 * val) / max);
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>{label}</span>
        <b style={{ color }}>
          {val}/{max}
        </b>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-slate-500/15">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(p, 2)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function moroColor(pct: number) {
  return pct < 25 ? '#22c55e' : pct < 40 ? '#f59e0b' : '#ef4444';
}

function notaColor(n: number) {
  if (!n) return '#64748b';
  return n >= 7 ? '#22c55e' : n >= 5 ? '#f59e0b' : '#ef4444';
}

const MEDALLAS = ['🥇', '🥈', '🥉'];

export function PanelDocentes({ scores }: { scores: DocenteScore[] }) {
  return (
    <>
      <div className="mb-4 text-[12.5px] text-muted-foreground">
        🎮 <b className="text-foreground">Nivel de cada docente (1-100)</b> — se
        calcula automáticamente: 50 % pagos de su cartera (ERP), 25 % implicación
        de sus alumnos, 15 % llamadas al día, 10 % pruebas de trabajo.{' '}
        <b className="text-red-400">Aquí no se puede mentir:</b> los pagos los
        dice el ERP y las llamadas o están grabadas o no existen. Nivel &lt; 50
        o alumnos con nota media &lt; 5 = docente EN RIESGO.
      </div>

      {scores.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          El panel Docentes está inicializándose. Recarga en unos segundos.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scores.map((s, i) => {
          const color = tierColor(s.tier);
          const enRiesgo = s.en_riesgo;
          return (
            <Card
              key={s.docente_id || i}
              className={
                'relative overflow-hidden p-4 ' +
                (enRiesgo
                  ? 'border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.15)]'
                  : '')
              }
            >
              <div className="absolute right-3 top-3 text-2xl opacity-85">
                {MEDALLAS[i] ?? ''}
              </div>
              <div className="flex items-center gap-4">
                <div style={{ color }}>
                  <ScoreRing score={s.score} color={color} />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-extrabold">
                    {s.display_name || `Docente ${s.docente_id?.slice(0, 8) ?? '—'}`}
                  </div>
                  <div className="mb-3 text-[11px] text-muted-foreground">
                    {s.rol === 'coach_onboarding' ? '🎯 Coach Onboarding · ' : '🎓 Docente · '}
                    {s.total_alumnos} alumnos en cartera
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[12px] font-bold"
                    style={{
                      backgroundColor: `${color}22`,
                      color,
                    }}
                  >
                    {tierIcon(s.tier)} {tierLabel(s.tier)}
                  </span>
                  {enRiesgo && (
                    <div className="mt-2 text-[11px] font-bold text-red-500">
                      🚨 REVISAR: nivel bajo — cartera en peligro
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <Barra
                  label={`💰 Pagos de su cartera (morosidad ${s.morosidad_pct}%)`}
                  val={s.s_pagos}
                  max={50}
                  color={moroColor(s.morosidad_pct)}
                />
                <Barra
                  label={`📈 Implicación alumnos (media ${s.nota_media.toFixed(1)}/10)`}
                  val={s.s_nota}
                  max={25}
                  color={notaColor(s.nota_media)}
                />
                <Barra
                  label={`📞 Llamadas al día (${s.pct_llamadas_al_dia}%)`}
                  val={s.s_llamadas}
                  max={15}
                  color={s.pct_llamadas_al_dia >= 80 ? '#22c55e' : '#ef4444'}
                />
                <Barra
                  label={`📎 Pruebas de trabajo (${s.pct_alumnos_con_pruebas}% alumnos)`}
                  val={s.s_pruebas}
                  max={10}
                  color={s.pct_alumnos_con_pruebas >= 50 ? '#22c55e' : '#f59e0b'}
                />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="rounded-lg border p-2 text-center">
                  <div
                    className="text-[16px] font-extrabold"
                    style={{ color: moroColor(s.morosidad_pct) }}
                  >
                    {s.morosidad_pct}%
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Morosidad
                  </div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <div
                    className="text-[16px] font-extrabold"
                    style={{ color: notaColor(s.nota_media) }}
                  >
                    {s.nota_media > 0 ? s.nota_media.toFixed(1) : '—'}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Nota alumnos
                  </div>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <div className="text-[16px] font-extrabold">
                    {s.morosos}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Impagos
                  </div>
                </div>
                <div
                  className="rounded-lg border p-2 text-center"
                  style={{
                    borderColor: (s.tareas_vencidas ?? 0) > 0 ? 'rgb(239 68 68)' : undefined,
                    background: (s.tareas_vencidas ?? 0) > 0 ? 'rgba(239,68,68,0.08)' : undefined,
                  }}
                >
                  <div
                    className="text-[16px] font-extrabold"
                    style={{ color: (s.tareas_vencidas ?? 0) > 0 ? '#ef4444' : undefined }}
                  >
                    {s.tareas_vencidas ?? 0}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Reuniones vencidas
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
