'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getCohortes,
  getDireccionMe,
  getKpis,
  getMorosidadDocentes,
  type CohortesResponse,
  type DireccionMe,
  type KpisResponse,
  type MorosidadDocentesResponse,
} from '@/lib/direccion-api';

/** Devuelve YYYY-MM del mes actual. */
function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function CuadroDeMandoPage() {
  const [me, setMe] = useState<DireccionMe | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  // Rango cohortes/KPIs
  const [desdeMes, setDesdeMes] = useState('2026-07');
  const [hastaMes, setHastaMes] = useState(currentYearMonth());
  const [desdeYMD, setDesdeYMD] = useState(firstDayOfMonth());
  const [hastaYMD, setHastaYMD] = useState(currentYMD());

  const [cohortes, setCohortes] = useState<CohortesResponse | null>(null);
  const [morosidad, setMorosidad] = useState<MorosidadDocentesResponse | null>(null);
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const m = await getDireccionMe();
        setMe(m);
      } catch (e) {
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
      const [c, mo, k] = await Promise.all([
        getCohortes(desdeMes, hastaMes).catch(() => null),
        getMorosidadDocentes().catch(() => null),
        getKpis(desdeYMD, hastaYMD).catch(() => null),
      ]);
      setCohortes(c);
      setMorosidad(mo);
      setKpis(k);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [me?.is_direccion, desdeMes, hastaMes, desdeYMD, hastaYMD]);

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
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-4 text-white shadow-[0_0_30px_rgba(59,130,246,0.10)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Cuadro de Mando · Dirección</h1>
            <p className="text-[11px] text-yellow-100/70">
              Salud global de la empresa · Cohortes · KPIs bonus Directora
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? 'Cargando…' : 'Refrescar'}
        </Button>
      </header>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          titulo="Mora cohorte (cuota 2)"
          objetivo={`≤ ${kpis?.kpi_1_mora_cohorte.objetivo_max_pct}%`}
          valor={kpis?.kpi_1_mora_cohorte.valor_actual_pct ?? null}
          estado={kpis?.kpi_1_mora_cohorte.estado}
          notas={kpis?.kpi_1_mora_cohorte.nota_maduracion || (kpis?.kpi_1_mora_cohorte.n_evaluables
            ? `${kpis.kpi_1_mora_cohorte.n_impagos}/${kpis.kpi_1_mora_cohorte.n_evaluables} rompen cuota 2 · ${kpis.kpi_1_mora_cohorte.cohortes_maduras} cohortes maduras`
            : '')}
          inverso
        />
        <KpiCard
          titulo="Cobro cuotas continuidad"
          objetivo={`≥ ${kpis?.kpi_2_cobro_continuidad.objetivo_min_pct}%`}
          valor={kpis?.kpi_2_cobro_continuidad.valor_actual_pct ?? null}
          estado={kpis?.kpi_2_cobro_continuidad.estado}
          notas={kpis?.kpi_2_cobro_continuidad.nota_maduracion || (kpis?.kpi_2_cobro_continuidad.n_cuotas_emitidas
            ? `${kpis.kpi_2_cobro_continuidad.n_cobradas}/${kpis.kpi_2_cobro_continuidad.n_cuotas_emitidas} cobradas`
            : '')}
        />
        <KpiCard
          titulo="Reactivación cartera recobros"
          objetivo={`≥ ${kpis?.kpi_3_reactivacion.objetivo_min_pct}%`}
          valor={kpis?.kpi_3_reactivacion.valor_actual_pct ?? null}
          estado={kpis?.kpi_3_reactivacion.estado}
          notas={kpis?.kpi_3_reactivacion.nota_snapshot || kpis?.kpi_3_reactivacion.nota_maduracion || (kpis?.kpi_3_reactivacion.n_recuperables_dia_1
            ? `${kpis.kpi_3_reactivacion.n_reactivados}/${kpis.kpi_3_reactivacion.n_recuperables_dia_1} reactivados`
            : '')}
        />
      </div>

      {/* Selectores de rango */}
      <Card className="p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Rango de fechas
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-[10.5px] text-muted-foreground">Cohortes desde (YYYY-MM)</div>
            <Input type="month" value={desdeMes} onChange={(e) => setDesdeMes(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] text-muted-foreground">Cohortes hasta (YYYY-MM)</div>
            <Input type="month" value={hastaMes} onChange={(e) => setHastaMes(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] text-muted-foreground">KPIs desde (día)</div>
            <Input type="date" value={desdeYMD} onChange={(e) => setDesdeYMD(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] text-muted-foreground">KPIs hasta (día)</div>
            <Input type="date" value={hastaYMD} onChange={(e) => setHastaYMD(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Cohortes retention chart */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-wider">
              Cohortes mensuales — % impago por cuota
            </div>
            <div className="text-[11px] text-muted-foreground">
              Plataforma arrancó {cohortes?.inicio_plataforma}. Sin cohortes anteriores.
            </div>
          </div>
        </div>
        <CohortesTable data={cohortes} />
      </Card>

      {/* Morosidad docentes */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-bold uppercase tracking-wider">
            Morosidad por docente — ranking actual
          </div>
          {morosidad && (
            <div className="text-[11px] text-muted-foreground">
              Global: <b className="text-foreground">{morosidad.global.pct_morosidad_global}%</b>
              {' '}({morosidad.global.n_morosos}/{morosidad.global.n_alumnos_asignados})
            </div>
          )}
        </div>
        <MorosidadTable data={morosidad} />
      </Card>
    </div>
  );
}


function KpiCard({
  titulo, objetivo, valor, estado, notas, inverso = false,
}: {
  titulo: string;
  objetivo: string;
  valor: number | null;
  estado?: 'cumple' | 'no_cumple' | 'insuficientes_datos';
  notas?: string;
  inverso?: boolean; // true = menor es mejor
}) {
  const colorEstado = estado === 'cumple'
    ? '#22c55e'
    : estado === 'no_cumple'
      ? '#ef4444'
      : '#94a3b8';
  const badge = estado === 'cumple'
    ? '✅ Cumple'
    : estado === 'no_cumple'
      ? '🚨 No cumple'
      : '⏳ Sin datos suficientes';
  return (
    <Card className="p-4" style={{ borderTop: `3px solid ${colorEstado}` }}>
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-3xl font-extrabold" style={{ color: colorEstado }}>
          {valor === null ? '—' : `${valor}%`}
        </div>
        <div className="text-[11px] text-muted-foreground">objetivo {objetivo}</div>
      </div>
      <div className="mt-2 text-[12px] font-bold" style={{ color: colorEstado }}>
        {badge}
      </div>
      {notas && (
        <div className="mt-2 text-[11px] leading-snug text-muted-foreground">
          {notas}
        </div>
      )}
    </Card>
  );
}


function CohortesTable({ data }: { data: CohortesResponse | null }) {
  const maxCuota = useMemo(() => {
    if (!data) return 6;
    let m = 0;
    for (const c of data.cohortes) {
      for (const q of c.cuotas) {
        if (q.maduro && q.n_cuota > m) m = q.n_cuota;
      }
    }
    return Math.min(Math.max(m + 1, 4), 12);
  }, [data]);

  if (!data) return <div className="text-[12px] text-muted-foreground">Sin datos.</div>;
  if (data.cohortes.length === 0) {
    return <div className="rounded border p-3 text-center text-[12px] text-muted-foreground">
      Sin cohortes en el rango seleccionado.
    </div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Cohorte</th>
            <th className="p-2 text-right">Altas</th>
            {Array.from({ length: maxCuota }, (_, i) => (
              <th key={i} className="p-2 text-right">
                Cuota {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cohortes.map((c) => (
            <tr key={c.mes} className="border-b hover:bg-muted/30">
              <td className="p-2 font-bold">{c.mes}</td>
              <td className="p-2 text-right tabular-nums">{c.n_altas}</td>
              {Array.from({ length: maxCuota }, (_, i) => {
                const q = c.cuotas.find(x => x.n_cuota === i + 1);
                if (!q) return <td key={i} className="p-2 text-right text-muted-foreground">—</td>;
                if (!q.maduro) {
                  return (
                    <td key={i} className="p-2 text-right text-[10.5px] text-slate-500" title={q.razon_no_maduro}>
                      ⏳ sin datos
                    </td>
                  );
                }
                const pct = q.pct_impago ?? 0;
                const color = pct >= 40 ? '#ef4444' : pct >= 25 ? '#f59e0b' : '#22c55e';
                return (
                  <td key={i} className="p-2 text-right tabular-nums" style={{ color }}>
                    <b>{pct}%</b>
                    <div className="text-[9.5px] text-muted-foreground">
                      {q.n_impagos}/{q.n_evaluables}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function MorosidadTable({ data }: { data: MorosidadDocentesResponse | null }) {
  if (!data) return <div className="text-[12px] text-muted-foreground">Sin datos.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Docente</th>
            <th className="p-2 text-left">Rol</th>
            <th className="p-2 text-right">Alumnos</th>
            <th className="p-2 text-right">Morosos</th>
            <th className="p-2 text-right">% Morosidad</th>
          </tr>
        </thead>
        <tbody>
          {data.docentes.map((d) => {
            const color = d.pct_morosidad >= 25 ? '#ef4444' : d.pct_morosidad >= 10 ? '#f59e0b' : '#22c55e';
            return (
              <tr key={d.email} className="border-b hover:bg-muted/30">
                <td className="p-2 font-bold">{d.display_name}</td>
                <td className="p-2 text-[11px] text-muted-foreground">
                  {d.rol === 'coach_onboarding' ? '🎯 Coach' : '🎓 Docente'}
                </td>
                <td className="p-2 text-right tabular-nums">{d.n_alumnos}</td>
                <td className="p-2 text-right tabular-nums">{d.n_morosos}</td>
                <td className="p-2 text-right tabular-nums font-bold" style={{ color }}>
                  {d.pct_morosidad}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
