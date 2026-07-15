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
  const nota = Number(s.nota_media) || 0;
  const mora = Number(s.morosidad_pct) || 0;
  const pctLl = Number(s.pct_llamadas_al_dia) || 0;
  const pctPr = Number(s.pct_alumnos_con_pruebas) || 0;
  return (
    <>
      <Barra
        label={`💰 Pagos de su cartera (morosidad ${mora}%)`}
        val={Number(s.s_pagos) || 0}
        max={50}
        color={moroColor(mora)}
      />
      <Barra
        label={`📈 Implicación alumnos (media ${nota.toFixed(1)}/10, solo notas suyas)`}
        val={Number(s.s_nota) || 0}
        max={25}
        color={notaColor(nota)}
      />
      <Barra
        label={`📞 Reuniones al día (${pctLl}%)`}
        val={Number(s.s_llamadas) || 0}
        max={15}
        color={pctLl >= 80 ? '#22c55e' : '#ef4444'}
      />
      <Barra
        label={`📎 Pruebas de trabajo (${pctPr}% alumnos)`}
        val={Number(s.s_pruebas) || 0}
        max={10}
        color={pctPr >= 50 ? '#22c55e' : '#f59e0b'}
      />
    </>
  );
}

function DesgloseOnboardingBloque({ d }: { d: Partial<DesgloseOnboarding> | undefined }) {
  const safe = d || {};
  const pctContacto = Number(safe.pct_contactados_24h) || 0;
  const pctExped = Number(safe.pct_expediente_completo) || 0;
  const pctControl = Number(safe.pct_control_d4_efectivo) || 0;
  const pctActiv = Number(safe.pct_activacion_r1) || 0;
  const mediana = safe.mediana_dias_traspaso ?? null;
  return (
    <>
      <Barra
        label={`🕒 Contacto <24h (${pctContacto}%)`}
        val={Number(safe.contacto_24h_pts) || 0}
        max={20}
        color={pctColor(pctContacto)}
      />
      <Barra
        label={
          mediana !== null
            ? `🚀 Velocidad embudo (mediana ${mediana}d hasta docente)`
            : '🚀 Velocidad embudo (sin datos aún)'
        }
        val={Number(safe.velocidad_embudo_pts) || 0}
        max={20}
        color={
          mediana === null
            ? '#64748b'
            : mediana <= 3
              ? '#22c55e'
              : mediana <= 4
                ? '#f59e0b'
                : '#ef4444'
        }
      />
      <Barra
        label={`📋 Expediente completo al traspaso (${pctExped}%)`}
        val={Number(safe.expediente_completo_pts) || 0}
        max={20}
        color={pctColor(pctExped)}
      />
      <Barra
        label={`🔍 Control Día 4 real (${pctControl}%)`}
        val={Number(safe.control_dia_4_pts) || 0}
        max={20}
        color={pctColor(pctControl)}
      />
      <Barra
        label={`🎯 Activación (asisten R1 docente) (${pctActiv}%)`}
        val={Number(safe.activacion_reunion_1_pts) || 0}
        max={20}
        color={
          pctActiv >= 85
            ? '#22c55e'
            : pctActiv >= 70
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
          const enArranque = Boolean(s.en_arranque);
          const enRiesgo = !enArranque && Boolean(s.en_riesgo);
          const nivel = Number(s.nivel ?? s.score ?? 0);
          const posicion = Number(s.posicion ?? 0);
          const tendencia = (s.tendencia ?? 'debut') as Tendencia;
          const delta = s.nivel_anterior != null ? nivel - Number(s.nivel_anterior) : null;
          const esCoach = s.rol === 'coach_onboarding';
          const totalAlumnos = Number(s.total_alumnos ?? 0);
          return (
            <Card
              key={s.docente_id || s.email || Math.random()}
              className={
                'relative overflow-hidden p-4 ' +
                (enRiesgo
                  ? 'border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.15)]'
                  : enArranque
                    ? 'border-slate-500/40 opacity-90'
                    : '')
              }
            >
              {/* Cabecera: medalla o "en arranque" */}
              <div className="absolute right-3 top-3 flex items-center gap-1">
                {enArranque ? (
                  <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    fuera del ranking
                  </span>
                ) : (
                  <MedallaOPosicion posicion={posicion} />
                )}
              </div>

              <div className="flex items-center gap-4">
                <div style={{ color }}>
                  {enArranque ? (
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-dashed border-slate-500/50 text-2xl">
                      ⏳
                    </div>
                  ) : (
                    <ScoreRing score={nivel} color={color} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-lg font-extrabold">
                      {s.display_name || `Docente ${(s.docente_id || '').slice(0, 8)}`}
                    </div>
                    {!enArranque && <TendenciaChip tendencia={tendencia} delta={delta} />}
                  </div>
                  <div className="mb-2 text-[11px] text-muted-foreground">
                    {esCoach ? '🎯 Coach Onboarding' : '🎓 Docente'} · {totalAlumnos} alumnos
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
                  {enArranque && (
                    <div className="mt-2 text-[11.5px] text-slate-500">
                      Sin actividad propia todavía. Registra tu 1ª reunión y tu 1ª nota para entrar en el ranking.
                    </div>
                  )}
                </div>
              </div>

              {/* Mensaje de vestuario del día */}
              {s.mensaje_vestuario && (
                <div className={
                  'mt-3 rounded-lg border p-2.5 text-[12.5px] leading-snug ' +
                  (enArranque
                    ? 'border-slate-500/30 bg-slate-500/10 text-slate-500'
                    : 'border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-violet-500/10')
                }>
                  {s.mensaje_vestuario}
                </div>
              )}

              {/* Desglose — ocultar en EN ARRANQUE (no hay datos válidos) */}
              {!enArranque && (
                <div className="mt-4">
                  {esCoach
                    ? <DesgloseOnboardingBloque d={s.desglose as Partial<DesgloseOnboarding> | undefined} />
                    : <DesgloseDocente s={s} />}
                </div>
              )}

              {/* KPIs numéricos (solo docentes activos, no EN ARRANQUE) */}
              {!esCoach && !enArranque && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="rounded-lg border p-2 text-center">
                    <div
                      className="text-[16px] font-extrabold"
                      style={{ color: moroColor(Number(s.morosidad_pct) || 0) }}
                    >
                      {Number(s.morosidad_pct) || 0}%
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      Morosidad
                    </div>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <div
                      className="text-[16px] font-extrabold"
                      style={{ color: notaColor(Number(s.nota_media) || 0) }}
                    >
                      {(Number(s.nota_media) || 0) > 0 ? (Number(s.nota_media) || 0).toFixed(1) : '—'}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      Nota alumnos
                    </div>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <div className="text-[16px] font-extrabold">
                      {Number(s.morosos) || 0}
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

              {/* % agendadas — indicador preventivo (solo docentes activos) */}
              {!esCoach && !enArranque && (
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

              {/* Cartera de reactivación (clientes antiguos a recuperar) */}
              {!esCoach && (s.cartera_reactivacion ?? 0) > 0 && (
                <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/5 p-2">
                  <div className="mb-1 flex items-center justify-between text-[10.5px]">
                    <span className="font-bold text-purple-500">🔁 Reactivación (clientes antiguos)</span>
                    <b style={{ color: (s.pct_activacion_cartera ?? 0) >= 50 ? '#22c55e' : '#f59e0b' }}>
                      {s.reactivados_al_dia ?? 0}/{s.cartera_reactivacion ?? 0} al día · {s.pct_activacion_cartera ?? 0}%
                    </b>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-500/15">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(s.pct_activacion_cartera ?? 0, 2)}%`,
                        backgroundColor: (s.pct_activacion_cartera ?? 0) >= 50 ? '#a855f7' : '#f59e0b',
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[9.5px] text-muted-foreground">
                    No cuenta en la nota. Objetivo: recuperarlos y ponerlos al día.
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
