'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { buscarAlumno, getDocenteScores, getKpis, getMe, listCases, reasignarAlumno } from '@/lib/crm-docentes-api';
import type {
  AlumnoLocalizado, DocenteScore, KPIs, OnboardingCaseList, WhoAmI,
} from '@/lib/crm-docentes-types';
import { KpisBar } from '@/components/crm-docentes/kpis-bar';
import { PipelineKanban } from '@/components/crm-docentes/pipeline-kanban';
import { TablaAlumnos } from '@/components/crm-docentes/tabla-alumnos';
import { PanelDocentes } from '@/components/crm-docentes/panel-docentes';
import { ModalFichaAlumno } from '@/components/crm-docentes/modal-ficha-alumno';
import { MiAgenda } from '@/components/crm-docentes/mi-agenda';

type Tab = 'pipeline' | 'alumnos' | 'docentes' | 'agenda';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'agenda', label: '📅 Mi agenda' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'alumnos', label: 'Alumnos' },
  { key: 'docentes', label: 'Docentes' },
];

/**
 * Normaliza texto para búsqueda: lowercase, quita espacios y caracteres no
 * alfanuméricos. Útil para que "654 024 367" matchee con "654024367" o con
 * "+34 654 024 367".
 */
function normalizarBusqueda(s: string): string {
  return (s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export default function CrmDocentesPage() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cases, setCases] = useState<OnboardingCaseList[]>([]);
  const [scores, setScores] = useState<DocenteScore[]>([]);
  const [me, setMe] = useState<WhoAmI | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [q, setQ] = useState('');
  // Localizador global: busca en TODAS las carteras (para encontrar a un
  // alumno que está con otro docente, p.ej. cuando el PWA lo asigna distinto).
  const [locResults, setLocResults] = useState<AlumnoLocalizado[] | null>(null);
  const [locTotal, setLocTotal] = useState(0);
  const [locLoading, setLocLoading] = useState(false);

  async function buscarEnTodas() {
    if (!q.trim()) return;
    setLocLoading(true);
    try {
      const r = await buscarAlumno(q.trim());
      setLocResults(r.resultados);
      setLocTotal(r.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error buscando');
    } finally {
      setLocLoading(false);
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [k, c, s, m] = await Promise.all([
        getKpis().catch(() => null),
        listCases().catch(() => [] as OnboardingCaseList[]),
        getDocenteScores().then((r) => r.docentes).catch(() => [] as DocenteScore[]),
        getMe().catch(() => null),
      ]);
      setKpis(k);
      setCases(c);
      setScores(s);
      setMe(m);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cargando datos';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = me?.crm_role === 'admin';

  // Los 4 responsables para el selector de reasignación (admin/Directora).
  const docentesLista = scores
    .filter((d) => d.docente_id)
    .map((d) => ({
      id: d.docente_id as string,
      name: d.display_name || d.email || 'docente',
      rol: d.rol || 'docente',
    }));

  async function reasignarDocenteDesdePipeline(caseId: string, profileId: string | null) {
    try {
      await reasignarAlumno(caseId, 'docente', profileId);
      toast.success('Alumno reasignado');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo reasignar');
    }
  }

  const casesFiltrados = (() => {
    const qn = normalizarBusqueda(q);
    if (!qn) return cases;
    return cases.filter((c) => {
      const bag = [c.customer_name, c.customer_email, c.customer_phone, c.docente_nombre, c.coach_nombre]
        .map(normalizarBusqueda).join('|');
      return bag.includes(qn);
    });
  })();

  function onOpenAlumno(id: string) {
    setOpenCaseId(id);
    setModalOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-4 text-white shadow-[0_0_30px_rgba(59,130,246,0.10)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">CRM · Éxito del Alumno</h1>
            <p className="text-[11px] text-cyan-100/70">
              Onboarding · Seguimiento · Retención — conectado al ERP en tiempo real
              {me && (
                <> · <b className="text-white">
                  {me.crm_role === 'admin' ? '👑 Admin'
                    : me.crm_role === 'coach_onboarding' ? '🎯 Onboarding'
                    : me.crm_role === 'docente' ? '🎓 Docente'
                    : '· sin rol'}
                </b>{me.display_name && me.crm_role !== 'admin' && <> · {me.display_name}</>}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-900/50 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                'rounded-lg px-4 py-1.5 text-[13px] font-bold transition ' +
                (tab === t.key
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg'
                  : 'text-cyan-200/70 hover:text-white')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? 'Cargando…' : 'Refrescar'}
        </Button>
      </header>

      {/* KPIs */}
      <KpisBar kpis={kpis} loading={loading} />

      {/* Buscador global (activo en Pipeline y Alumnos) */}
      {(tab === 'pipeline' || tab === 'alumnos') && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setLocResults(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') buscarEnTodas(); }}
            placeholder="🔍 Buscar por nombre, email, teléfono o docente (ignora espacios)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-[13px] outline-none focus:border-cyan-500"
          />
          {q && (
            <div className="whitespace-nowrap text-[11px] text-muted-foreground">
              {casesFiltrados.length} de {cases.length}
            </div>
          )}
          {q && (
            <button
              onClick={buscarEnTodas}
              disabled={locLoading}
              className="whitespace-nowrap rounded bg-cyan-500/12 px-2.5 py-1.5 text-[11.5px] font-bold text-cyan-600 hover:bg-cyan-500/22"
              title="Busca este alumno en la cartera de TODOS los docentes"
            >
              {locLoading ? '…' : '🌐 Buscar en todas las carteras'}
            </button>
          )}
          {q && (
            <button
              onClick={() => { setQ(''); setLocResults(null); }}
              className="rounded bg-slate-500/10 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-500/20"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Resultados del localizador global (todas las carteras) */}
      {(tab === 'pipeline' || tab === 'alumnos') && locResults !== null && (
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.05] p-3">
          <div className="mb-2 text-[12px] font-bold text-cyan-700">
            🌐 En todas las carteras — {locTotal} resultado(s)
            {locTotal > locResults.length && ` (mostrando ${locResults.length})`}
          </div>
          {locResults.length === 0 ? (
            <div className="text-[12px] text-muted-foreground">
              Ningún alumno coincide en todo el CRM.
            </div>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {locResults.map((r) => (
                <button
                  key={r.case_id}
                  onClick={() => onOpenAlumno(r.case_id)}
                  className="flex flex-col items-start rounded-md border bg-background px-2.5 py-1.5 text-left hover:border-cyan-500"
                >
                  <span className="text-[13px] font-semibold">{r.customer_name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {r.customer_phone || 'sin teléfono'} · {r.customer_email}
                  </span>
                  <span className="mt-0.5 text-[11px] font-bold text-violet-500">
                    {r.docente_nombre
                      ? `🎓 ${r.docente_nombre}`
                      : r.coach_nombre
                        ? `🎯 ${r.coach_nombre}`
                        : '— sin asignar —'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vistas */}
      {tab === 'agenda' && <MiAgenda onOpenAlumno={onOpenAlumno} docentes={scores} isAdmin={isAdmin} />}
      {tab === 'pipeline' && (
        <PipelineKanban
          cases={casesFiltrados}
          onOpen={onOpenAlumno}
          isAdmin={isAdmin}
          docentes={docentesLista}
          onReasignar={reasignarDocenteDesdePipeline}
        />
      )}
      {tab === 'alumnos' && <TablaAlumnos cases={casesFiltrados} onOpen={onOpenAlumno} />}
      {tab === 'docentes' && <PanelDocentes scores={scores} />}

      {/* Modal ficha */}
      <ModalFichaAlumno
        caseId={openCaseId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onChanged={refresh}
        isAdmin={isAdmin}
      />
    </div>
  );
}
