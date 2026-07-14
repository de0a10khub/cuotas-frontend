'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Target, TrendingUp, Users, Trophy, Rocket, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getCohortes,
  getDireccionMe,
  getEvolucion,
  getKpis,
  getMorosidadDocentes,
  getOnboardingLucila,
  type CohortesResponse,
  type DireccionMe,
  type EvolucionResponse,
  type KpiResultado,
  type KpisResponse,
  type MorosidadDocentesResponse,
  type OnboardingLucila,
} from '@/lib/direccion-api';


// ============================================================================
// Utilidades de fechas
// ============================================================================

/** Convierte Date a 'YYYY-MM-DD'. */
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Devuelve la fecha de inicio del "Mes N" relativo a la fecha inicio elegida. */
function inicioMesN(inicio: string, n: number): string {
  const d = fromYMD(inicio);
  d.setDate(d.getDate() + (n - 1) * 30);
  return toYMD(d);
}

function finMesN(inicio: string, n: number): string {
  const d = fromYMD(inicio);
  d.setDate(d.getDate() + n * 30 - 1);
  return toYMD(d);
}


// ============================================================================
// Componente Anillo de progreso (SVG circular)
// ============================================================================

function AnilloKPI({
  pct,
  color,
  size = 96,
  strokeWidth = 8,
  label,
}: {
  pct: number | null;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pctSafe = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  const offset = circumference - (pctSafe / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={strokeWidth}
        />
        {pct !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 500ms ease',
              filter: `drop-shadow(0 0 8px ${color}66)`,
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-2xl font-extrabold tabular-nums"
          style={{ color: pct === null ? '#94a3b8' : color }}
        >
          {pct === null ? '—' : `${Math.round(pct)}%`}
        </div>
        {label && (
          <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================================
// KPI Card con anillo (tarjeta grande superior)
// ============================================================================

function KpiCardAnillo({
  titulo,
  kpi,
  objetivoTxt,
  frase,
  detalle,
  inverso = false,
}: {
  titulo: string;
  kpi: KpiResultado | undefined;
  objetivoTxt: string;
  frase: string;
  detalle?: string;
  inverso?: boolean; // true = menor es mejor
}) {
  const estado = kpi?.estado;
  const valor = kpi?.valor_actual_pct ?? null;

  const color = estado === 'cumple'
    ? '#22c55e'
    : estado === 'no_cumple'
      ? '#ef4444'
      : '#f59e0b';
  const badge = estado === 'cumple'
    ? '✓ CUMPLE'
    : estado === 'no_cumple'
      ? '✗ NO CUMPLE'
      : '⏳ SIN DATOS SUFICIENTES';
  const badgeColor = estado === 'cumple'
    ? 'text-emerald-500'
    : estado === 'no_cumple'
      ? 'text-red-500'
      : 'text-amber-500';

  return (
    <Card
      className="relative overflow-hidden p-5"
      style={{
        borderTop: `3px solid ${color}`,
        boxShadow: `0 0 24px ${color}22`,
      }}
    >
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <AnilloKPI pct={valor} color={color} />
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] font-extrabold ${badgeColor}`}>
            {badge}
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">
            objetivo {objetivoTxt}
          </div>
          <div className="mt-2 text-[11.5px] leading-snug text-foreground/80">
            {frase}
          </div>
        </div>
      </div>
      {detalle && (
        <div className="mt-3 border-t border-slate-500/15 pt-2 text-[10.5px] text-muted-foreground">
          {detalle}
        </div>
      )}
    </Card>
  );
}


// ============================================================================
// Selector de periodo con date-picker + botones Mes N
// ============================================================================

function SelectorPeriodo({
  inicio,
  onInicio,
  nMeses,
  mesActivo,
  onMesActivo,
}: {
  inicio: string;
  onInicio: (v: string) => void;
  nMeses: number;
  mesActivo: number | 'rango';
  onMesActivo: (n: number | 'rango') => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        📅 PERIODO
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          Inicio desde:
          <Input
            type="date"
            value={inicio}
            onChange={(e) => onInicio(e.target.value)}
            className="w-[170px]"
          />
        </label>
        <div className="text-[11px] italic text-muted-foreground/70">
          (pon la fecha que quieras)
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: nMeses }, (_, i) => i + 1).map((n) => {
            const active = mesActivo === n;
            return (
              <button
                key={n}
                onClick={() => onMesActivo(n)}
                className={
                  'rounded-lg px-3 py-1.5 text-[12px] font-bold transition ' +
                  (active
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg'
                    : 'bg-slate-500/10 text-muted-foreground hover:bg-slate-500/20')
                }
              >
                Mes {n}
              </button>
            );
          })}
          <button
            onClick={() => onMesActivo('rango')}
            className={
              'rounded-lg px-3 py-1.5 text-[12px] font-bold transition ' +
              (mesActivo === 'rango'
                ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg'
                : 'bg-slate-500/10 text-muted-foreground hover:bg-slate-500/20')
            }
          >
            Rango a medida
          </button>
        </div>
      </div>
    </Card>
  );
}


// ============================================================================
// Tabla evolución mes a mes
// ============================================================================

function EvolucionTabla({ data, mesActivo }: { data: EvolucionResponse | null; mesActivo: number | 'rango' }) {
  if (!data) return <div className="text-[12px] text-muted-foreground">Cargando…</div>;

  const meses = data.meses;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              MÉTRICA
            </th>
            {meses.map((m) => (
              <th
                key={m.n}
                className={
                  'p-2 text-left text-[11px] font-bold uppercase tracking-wider ' +
                  (mesActivo === m.n ? 'text-cyan-400' : 'text-muted-foreground')
                }
              >
                MES {m.n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <RowMetrica
            label="% Morosidad de la cohorte"
            values={meses.map((m) => {
              if (m.morosidad.estado === 'maduro' && m.morosidad.pct !== null) {
                return { txt: `${m.morosidad.pct}%`, color: '#ef4444' };
              }
              if (m.morosidad.estado === 'en_curso') return { txt: 'en curso', color: '#f59e0b' };
              return { txt: '—', color: '#64748b' };
            })}
          />
          <RowMetrica
            label="% Retención (siguen pagando)"
            values={meses.map((m) => {
              if (m.retencion_pct !== null) {
                const color = m.retencion_pct >= 75 ? '#22c55e' : m.retencion_pct >= 50 ? '#f59e0b' : '#ef4444';
                return { txt: `${m.retencion_pct}%`, color };
              }
              if (m.morosidad.estado === 'en_curso') return { txt: 'en curso', color: '#22c55e' };
              return { txt: '—', color: '#64748b' };
            })}
          />
          <RowMetrica
            label="Clientes nuevos únicos"
            values={meses.map((m) => ({
              txt: m.clientes_unicos > 0 ? String(m.clientes_unicos) : '—',
              color: m.clientes_unicos > 0 ? '#f8fafc' : '#64748b',
              bold: m.clientes_unicos > 0,
            }))}
          />
          <RowMetrica
            label="% Crecimiento vs mes anterior"
            values={meses.map((m) => {
              if (m.crecimiento_pct === null) return { txt: '—', color: '#64748b' };
              const color = m.crecimiento_pct > 0 ? '#22c55e' : m.crecimiento_pct < 0 ? '#ef4444' : '#94a3b8';
              const sign = m.crecimiento_pct > 0 ? '+' : '';
              return { txt: `${sign}${m.crecimiento_pct}%`, color };
            })}
          />
        </tbody>
      </table>
    </div>
  );
}

function RowMetrica({
  label,
  values,
}: {
  label: string;
  values: { txt: string; color: string; bold?: boolean }[];
}) {
  return (
    <tr className="border-b border-slate-500/10">
      <td className="p-2 text-[12.5px] text-foreground/80">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={'p-2 text-[13px] ' + (v.bold ? 'font-bold' : '')}
          style={{ color: v.color }}
        >
          {v.txt}
        </td>
      ))}
    </tr>
  );
}


// ============================================================================
// Embudo cohorte con barras horizontales
// ============================================================================

function CohorteEmbudo({ data }: { data: CohortesResponse | null }) {
  if (!data || data.cohortes.length === 0) {
    return <div className="text-[12px] text-muted-foreground">Sin cohortes en el rango.</div>;
  }
  const c = data.cohortes[0]; // primera cohorte del rango
  const cuotasVis = c.cuotas.slice(0, 4); // hasta 4 cuotas
  const hayImmaduro = cuotasVis.some((q) => !q.maduro);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="text-[15px] font-extrabold">
          Cohorte {c.mes} — embudo por cuota
        </h3>
        {hayImmaduro && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-500">
            🕐 aún madurando
          </span>
        )}
      </div>
      <span className="mb-3 inline-block rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-400">
        {c.n_altas} únicos
      </span>
      <div className="mt-3 space-y-3">
        {cuotasVis.map((q) => {
          const pct = q.pct_impago ?? 0;
          const cobrado = q.maduro ? 100 - pct : 0;
          const color = pct >= 40 ? '#ef4444' : pct >= 25 ? '#f59e0b' : '#22c55e';
          return (
            <div key={q.n_cuota}>
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Cuota {q.n_cuota}</span>
                {q.maduro ? (
                  <span className="font-bold" style={{ color }}>{cobrado.toFixed(0)}% cobrada</span>
                ) : q.n_cuota === 2 ? (
                  <span className="font-bold text-amber-500">inmadura</span>
                ) : (
                  <span className="text-slate-500">— sin datos</span>
                )}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-500/15">
                {q.maduro && (
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${cobrado}%`, backgroundColor: color }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ============================================================================
// Ranking docentes por morosidad (podio)
// ============================================================================

const MEDALLAS = ['🥇', '🥈', '🥉'];

function RankingDocentes({ data }: { data: MorosidadDocentesResponse | null }) {
  if (!data) return null;
  // Solo docentes con cartera — filtrar Lucila (coach) y los que tengan 0 alumnos
  const docentesReales = data.docentes.filter(
    (d) => d.rol === 'docente' && d.n_alumnos > 0,
  );
  // Orden: por morosidad ASC (menor mejor). Empate: menos alumnos primero.
  const orden = [...docentesReales].sort((a, b) => {
    if (a.pct_morosidad !== b.pct_morosidad) return a.pct_morosidad - b.pct_morosidad;
    return b.n_alumnos - a.n_alumnos;
  });
  const globalPct = data.global.pct_morosidad_global;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-extrabold flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Ranking de docentes por morosidad
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Solo docentes con cartera. El mejor se lleva el bonus del mes.
          </p>
        </div>
        <span
          className="rounded-lg bg-emerald-500/15 px-3 py-1 text-[12px] font-bold text-emerald-500"
        >
          Global docentes: {globalPct}%
        </span>
      </div>

      <div className="space-y-3">
        {orden.map((d, i) => {
          const color = d.pct_morosidad < 10 ? '#22c55e' : d.pct_morosidad < 25 ? '#f59e0b' : '#ef4444';
          const bg = d.pct_morosidad < 10 ? '#22c55e15' : d.pct_morosidad < 25 ? '#f59e0b15' : '#ef444415';
          const barPct = Math.max(2, Math.min(100, d.pct_morosidad * 2)); // escalado visual
          const esBonus = i === 0;
          const esCritico = d.pct_morosidad >= 25;
          const inicial = (d.display_name || '?')[0].toUpperCase();

          return (
            <div
              key={d.email || i}
              className={
                'flex items-center gap-3 rounded-xl border p-3 transition ' +
                (esCritico
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-slate-500/20')
              }
            >
              <span className="text-2xl w-8 text-center">{MEDALLAS[i] || `#${i+1}`}</span>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-extrabold text-white"
                style={{ backgroundColor: color }}
              >
                {inicial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold">{d.display_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {d.n_alumnos} alumnos · {d.n_morosos} moroso{d.n_morosos === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex min-w-[200px] items-center gap-2">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-500/15">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
              {esBonus && (
                <span className="rounded-md bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1.5 text-[11px] font-extrabold text-black shadow-lg">
                  🏆 BONUS
                </span>
              )}
              <div
                className="text-[18px] font-extrabold tabular-nums min-w-[64px] text-right"
                style={{ color }}
              >
                {d.pct_morosidad}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[10.5px]">
        <span className="font-bold text-muted-foreground">Barras:</span>
        <LeyendaColor color="#22c55e" txt="<10% sano" />
        <LeyendaColor color="#f59e0b" txt="10-25% vigilar" />
        <LeyendaColor color="#ef4444" txt=">25% actuar" />
      </div>
      <div className="mt-2 text-[10.5px] text-muted-foreground">
        Lucila no aparece aquí — solo hace onboarding, no tiene cartera de morosidad. Su rendimiento se mide abajo.
      </div>
    </div>
  );
}

function LeyendaColor({ color, txt }: { color: string; txt: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{txt}</span>
    </span>
  );
}


// ============================================================================
// Tarjeta Onboarding Lucila (borde violeta)
// ============================================================================

function OnboardingLucilaCard({ data }: { data: OnboardingLucila | null }) {
  const inicial = 'L';
  return (
    <Card
      className="p-5"
      style={{ borderLeft: '4px solid #a855f7', boxShadow: '0 0 24px rgba(168,85,247,0.15)' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Rocket className="h-4 w-4 text-violet-500" />
        <h3 className="text-[15px] font-extrabold">
          Onboarding — {data?.display_name || 'Lucila'} (métrica propia)
        </h3>
      </div>
      <p className="mb-4 text-[11.5px] text-muted-foreground">
        No compite en morosidad. Se mide por velocidad y calidad del arranque.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-[18px] font-extrabold text-white"
          style={{ backgroundColor: '#a855f7' }}
        >
          {inicial}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="Contacto <24h" value={fmtPct(data?.contacto_24h_pct)} />
          <MiniStat
            label="Días hasta docente"
            value={data?.dias_hasta_docente_mediana != null ? `${data.dias_hasta_docente_mediana}d` : '—'}
          />
          <MiniStat label="Asisten a Reunión 1" value={fmtPct(data?.asisten_reunion_1_pct)} />
          <MiniStat
            label="Nivel onboarding"
            value={data?.nivel_onboarding != null ? `${data.nivel_onboarding}/100` : '—'}
          />
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 text-center">
      <div className="text-[9.5px] uppercase tracking-wider text-violet-400/80">{label}</div>
      <div className="mt-1 text-[15px] font-extrabold text-violet-300">{value}</div>
    </div>
  );
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${Math.round(v)}%`;
}


// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

const INICIO_DEFAULT = '2026-07-08';
const N_MESES_DEFAULT = 4;

export default function CuadroDeMandoPage() {
  const [me, setMe] = useState<DireccionMe | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  const [inicio, setInicio] = useState(INICIO_DEFAULT);
  const [mesActivo, setMesActivo] = useState<number | 'rango'>(1);
  const [nMeses, setNMeses] = useState(N_MESES_DEFAULT);

  const [cohortes, setCohortes] = useState<CohortesResponse | null>(null);
  const [morosidad, setMorosidad] = useState<MorosidadDocentesResponse | null>(null);
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [evolucion, setEvolucion] = useState<EvolucionResponse | null>(null);
  const [lucila, setLucila] = useState<OnboardingLucila | null>(null);
  const [loading, setLoading] = useState(false);

  // Rango efectivo del mes activo (para /kpis/ y /cohortes/)
  const desdeYMD = useMemo(
    () => (typeof mesActivo === 'number' ? inicioMesN(inicio, mesActivo) : inicio),
    [inicio, mesActivo]
  );
  const hastaYMD = useMemo(() => {
    if (typeof mesActivo === 'number') return finMesN(inicio, mesActivo);
    // Rango a medida: desde inicio hasta hoy
    return toYMD(new Date());
  }, [inicio, mesActivo]);

  const desdeMes = useMemo(() => desdeYMD.slice(0, 7), [desdeYMD]);
  const hastaMes = useMemo(() => hastaYMD.slice(0, 7), [hastaYMD]);

  useEffect(() => {
    (async () => {
      try {
        const m = await getDireccionMe();
        setMe(m);
      } catch {
        setMe(null);
      } finally {
        setMeLoading(false);
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!me?.is_direccion) return;
    setLoading(true);
    try {
      const [c, mo, k, ev, lu] = await Promise.all([
        getCohortes(desdeMes, hastaMes).catch(() => null),
        getMorosidadDocentes().catch(() => null),
        getKpis(desdeYMD, hastaYMD).catch(() => null),
        getEvolucion(inicio, nMeses).catch(() => null),
        getOnboardingLucila().catch(() => null),
      ]);
      setCohortes(c);
      setMorosidad(mo);
      setKpis(k);
      setEvolucion(ev);
      setLucila(lu);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [me?.is_direccion, desdeMes, hastaMes, desdeYMD, hastaYMD, inicio, nMeses]);

  useEffect(() => { refresh(); }, [refresh]);

  if (meLoading) return <div className="p-8 text-center text-muted-foreground">Cargando…</div>;

  if (!me?.is_direccion) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Card className="p-6 text-center">
          <div className="mb-2 text-4xl">🔒</div>
          <div className="mb-1 text-lg font-bold">Sin acceso</div>
          <div className="text-[13px] text-muted-foreground">
            El Cuadro de Mando es un panel restringido de dirección.
            Si crees que deberías tener acceso, contacta con Carlos.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-5">
      {/* ================ Header ================ */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-muted-foreground">
            Cuadro de Mando · Dirección
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Salud de la empresa
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 px-4 py-2 text-[12px] font-bold">
            <Crown className="mr-1 inline h-4 w-4 text-yellow-400" />
            <span className="text-cyan-300">Carlos · Flor · Paula</span>
          </span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? '…' : 'Refrescar'}
          </Button>
        </div>
      </div>

      {/* ================ Selector de periodo ================ */}
      <SelectorPeriodo
        inicio={inicio}
        onInicio={setInicio}
        nMeses={nMeses}
        mesActivo={mesActivo}
        onMesActivo={setMesActivo}
      />

      {/* ================ 3 KPIs ================ */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[13px] font-bold">
          <Target className="h-4 w-4 text-cyan-400" />
          Los 3 objetivos — cómo vamos
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCardAnillo
            titulo="Mora de cohorte · Cuota 2"
            kpi={kpis?.kpi_1_mora_cohorte}
            objetivoTxt="≤ 25%"
            frase="% de alumnos nuevos que dejan de pagar en su 2ª cuota."
            detalle={
              kpis?.kpi_1_mora_cohorte.n_evaluables
                ? `${kpis.kpi_1_mora_cohorte.n_impagos}/${kpis.kpi_1_mora_cohorte.n_evaluables} rompen · ${kpis.kpi_1_mora_cohorte.cohortes_maduras} cohortes maduras`
                : kpis?.kpi_1_mora_cohorte.nota_maduracion
            }
            inverso
          />
          <KpiCardAnillo
            titulo="Cobro cuotas continuidad"
            kpi={kpis?.kpi_2_cobro_continuidad}
            objetivoTxt="≥ 75%"
            frase="% de las cuotas 2ª y siguientes que se cobra de verdad."
            detalle={
              kpis?.kpi_2_cobro_continuidad.n_cuotas_emitidas
                ? `${kpis.kpi_2_cobro_continuidad.n_cobradas}/${kpis.kpi_2_cobro_continuidad.n_cuotas_emitidas} cobradas`
                : kpis?.kpi_2_cobro_continuidad.nota_maduracion
            }
          />
          <KpiCardAnillo
            titulo="Reactivación · recobros"
            kpi={kpis?.kpi_3_reactivacion}
            objetivoTxt="≥ 15%"
            frase="% de caídos antiguos asignados que vuelven a pagar."
            detalle={
              kpis?.kpi_3_reactivacion.snapshot_fecha
                ? `Snapshot ${kpis.kpi_3_reactivacion.snapshot_fecha.slice(0, 10)} · ${kpis.kpi_3_reactivacion.n_recuperables_dia_1} recuperables`
                : kpis?.kpi_3_reactivacion.nota_maduracion
            }
          />
        </div>
      </div>

      {/* ================ Evolución mes a mes ================ */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <h3 className="text-[15px] font-extrabold">Evolución de la empresa mes a mes</h3>
        </div>
        <p className="mb-4 text-[11.5px] text-muted-foreground">
          En porcentajes y clientes únicos (sin duplicados ni mismo email). Se rellena solo cada mes.
        </p>
        <EvolucionTabla data={evolucion} mesActivo={mesActivo} />
        <div className="mt-3 text-[10.5px] text-muted-foreground">
          Solo porcentajes y nº de clientes únicos — nada de cash collect. A partir del mes 2 se rellenan las columnas y se muestra la evolución de morosidad.
        </div>
      </Card>

      {/* ================ Cohorte embudo ================ */}
      <Card className="p-5">
        <CohorteEmbudo data={cohortes} />
      </Card>

      {/* ================ Ranking docentes ================ */}
      <Card className="p-5">
        <RankingDocentes data={morosidad} />
      </Card>

      {/* ================ Onboarding Lucila ================ */}
      <OnboardingLucilaCard data={lucila} />

      {/* ================ Cómo funciona ================ */}
      <Card className="p-4">
        <div className="flex items-start gap-2 text-[12px]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
          <div>
            <b>Cómo funciona:</b> eliges la fecha de inicio que quieras (8 de julio, 8 de marzo, la que sea) y ves Mes 1, 2, 3... desde ahí.
            Arriba, los tres objetivos en porcentaje. En medio, cómo crece la empresa en % y clientes únicos —
            sin duplicados ni cash collect—. Abajo, qué docente retiene mejor:{' '}
            {morosidad?.docentes && morosidad.docentes.filter(d => d.rol === 'docente' && d.n_alumnos > 0).length > 0 && (
              <>
                <b className="text-emerald-500">
                  {[...morosidad.docentes.filter(d => d.rol === 'docente' && d.n_alumnos > 0)]
                    .sort((a,b) => a.pct_morosidad - b.pct_morosidad)[0].display_name} se lleva el bonus
                </b>
                {(() => {
                  const peor = [...morosidad.docentes.filter(d => d.rol === 'docente' && d.n_alumnos > 0)]
                    .sort((a,b) => b.pct_morosidad - a.pct_morosidad)[0];
                  return peor && peor.pct_morosidad >= 10 ? (
                    <>, <b className="text-red-500">{peor.display_name} en rojo</b> es con quien Paula trabaja esta semana</>
                  ) : null;
                })()}.
              </>
            )}
            {' '}Todo con las ventas reales del CRM desde el 8 de julio.
          </div>
        </div>
      </Card>
    </div>
  );
}
