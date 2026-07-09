'use client';

import { Card } from '@/components/ui/card';
import type { DesgloseOnboarding, DocenteScore, Tendencia } from '@/lib/crm-docentes-types';
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
function pctColor(pct: number) {
  return pct >= 85 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444';
}

function TendenciaChip({ tendencia, delta }: { tendencia: Tendencia; delta: number | null }) {
  const map = {
    sube:  { icon: '↑', color: '#22c55e', text: 'text-emerald-600', bg: 'bg-emerald-500/15' },
    baja:  { icon: '↓', color: '#ef4444', text: 'text-red-500',     bg: 'bg-red-500/15' },
    igual: { icon: '=', color: '#94a3b8', text: 'text-slate-400',    bg: 'bg-slate-500/15' },
    debut: { icon: '·', color: '#94a3b8', text: 'text-slate-400',    bg: 'bg-slate-500/15' },
  } as const;
  const t = map[tendencia];
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full ${t.bg} px-2 py-0.5 text-[11px] font-bold ${t.text}`}>
      <span>{t.icon}</span>
      {delta !== null && delta !== 0 && (
        <span>{delta > 0 ? `+${delta}` : delta}</span>
      )}
    </span>
  );
}

function MedallaOPosicion({ posicion }: { posicion: number }) {
  const MEDALLAS = ['🥇', '🥈', '🥉'];
  if (posicion >= 1 && posicion <= 3) {
    return <span className="text-3xl leading-none">{MEDALLAS[posicion - 1]}</span>;
  }
  return (
    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[13px] font-bold text-slate-500">
      #{posicion}
    </span>
  );
}

function DesgloseDocente({ s }: { s: DocenteScore }) {
  return (
    <>
      <Barra
        label={`💰 Pagos de su cartera (morosidad ${s.morosidad_pct}%)`}
        val={s.s_pagos}
        max={50}
        color={moroColor(s.morosidad_pct)}
      />
      <Barra
        label={`📈 Implicación alumnos (media ${s.nota_media.toFixed(1)}/10, solo notas suyas)`}
        val={s.s_nota}
        max={25}
        color={notaColor(s.nota_media)}
      />
      <Barra
        label={`📞 Reuniones al día (${s.pct_llamadas_al_dia}%)`}
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
    </>
  );
}

function DesgloseOnboardingBloque({ d }: { d: DesgloseOnboarding }) {
  return (
    <>
      <Barra
        label={`🕒 Contacto <24h (${d.pct_contactados_24h}%)`}
        val={d.contacto_24h_pts}
        max={20}
        color={pctColor(d.pct_contactados_24h)}
      />
      <Barra
        label={
          d.mediana_dias_traspaso !== null
            ? `🚀 Velocidad embudo (mediana ${d.mediana_dias_traspaso}d hasta docente)`
            : '🚀 Velocidad embudo (sin datos aún)'
        }
        val={d.velocidad_embudo_pts}
        max={20}
        color={
          d.mediana_dias_traspaso === null
            ? '#64748b'
            : d.mediana_dias_traspaso <= 3
              ? '#22c55e'
              : d.mediana_dias_traspaso <= 4
                ? '#f59e0b'
                : '#ef4444'
        }
      />
      <Barra
        label={`📋 Expediente completo al traspaso (${d.pct_expediente_completo}%)`}
        val={d.expediente_completo_pts}
        max={20}
        color={pctColor(d.pct_expediente_completo)}
      />
      <Barra
        label={`🔍 Control Día 4 real (${d.pct_control_d4_efectivo}%)`}
        val={d.control_dia_4_pts}
        max={20}
        color={pctColor(d.pct_control_d4_efectivo)}
      />
      <Barra
        label={`🎯 Activación (asisten R1 docente) (${d.pct_activacion_r1}%)`}
        val={d.activacion_reunion_1_pts}
        max={20}
        color={
          d.pct_activacion_r1 >= 85
            ? '#22c55e'
            : d.pct_activacion_r1 >= 70
              ? '#f59e0b'
              : '#ef4444'
        }
      />
    </>
  );
}

export function PanelDocentes({ scores }: { scores: DocenteScore[] }) {
  return (
    <>
      <div className="mb-4 text-[12.5px] text-muted-foreground">
        🎮 <b className="text-foreground">Ranking único del día (1-100).</b> Cada rol
        mide su propio juego: los docentes con su fórmula (pagos, implicación,
        reuniones, pruebas), Lucila con la del embudo (contacto &lt;24h, velocidad,
        expediente completo, control D4, activación). Snapshot a las 8:00 UTC con
        tendencia vs día anterior sobre ventana móvil de 14 días.
      </div>

      {scores.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Sin datos del panel. Recarga en unos segundos.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scores.map((s) => {
          const color = tierColor(s.tier);
          const enRiesgo = s.en_riesgo;
          const delta = s.nivel_anterior !== null ? s.nivel - s.nivel_anterior : null;
          const esCoach = s.rol === 'coach_onboarding';
          return (
            <Card
              key={s.docente_id || s.email || Math.random()}
              className={
                'relative overflow-hidden p-4 ' +
                (enRiesgo
                  ? 'border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.15)]'
                  : '')
              }
            >
              {/* Cabecera: medalla + tendencia */}
              <div className="absolute right-3 top-3 flex items-center gap-1">
                <MedallaOPosicion posicion={s.posicion} />
              </div>

              <div className="flex items-center gap-4">
                <div style={{ color }}>
                  <ScoreRing score={s.nivel} color={color} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-lg font-extrabold">
                      {s.display_name || `Docente ${(s.docente_id || '').slice(0, 8)}`}
                    </div>
                    <TendenciaChip tendencia={s.tendencia} delta={delta} />
                  </div>
                  <div className="mb-2 text-[11px] text-muted-foreground">
                    {esCoach ? '🎯 Coach Onboarding' : '🎓 Docente'} · {s.total_alumnos} alumnos
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-[12px] font-bold"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {tierIcon(s.tier)} {tierLabel(s.tier)}
                    </span>
                  </div>
                  {enRiesgo && (
                    <div className="mt-2 text-[11px] font-bold text-red-500">
                      🚨 REVISAR: nivel bajo — cartera en peligro
                    </div>
                  )}
                </div>
              </div>

              {/* Mensaje de vestuario del día */}
              {s.mensaje_vestuario && (
                <div className="mt-3 rounded-lg border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 p-2.5 text-[12.5px] leading-snug">
                  {s.mensaje_vestuario}
                </div>
              )}

              {/* Desglose */}
              <div className="mt-4">
                {esCoach
                  ? <DesgloseOnboardingBloque d={s.desglose as DesgloseOnboarding} />
                  : <DesgloseDocente s={s} />}
              </div>

              {/* KPIs numéricos (solo docentes) */}
              {!esCoach && (
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
              )}

              {/* % agendadas — indicador preventivo (solo docentes) */}
              {!esCoach && (
                <div className="mt-3 rounded-lg border p-2">
                  <div className="mb-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
                    <span>📅 Agenda: {s.tareas_agendadas ?? 0} / {s.tareas_pendientes ?? 0} agendadas</span>
                    <b style={{ color: (s.pct_agendadas ?? 0) >= 80 ? '#22c55e' : (s.pct_agendadas ?? 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {s.pct_agendadas ?? 0}%
                    </b>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-500/15">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(s.pct_agendadas ?? 0, 2)}%`,
                        backgroundColor: (s.pct_agendadas ?? 0) >= 80 ? '#22c55e' : (s.pct_agendadas ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
