'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getDocenteScores, getKpis, getMe, listCases } from '@/lib/crm-docentes-api';
import type {
  DocenteScore, KPIs, OnboardingCaseList, WhoAmI,
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

export default function CrmDocentesPage() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cases, setCases] = useState<OnboardingCaseList[]>([]);
  const [scores, setScores] = useState<DocenteScore[]>([]);
  const [me, setMe] = useState<WhoAmI | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

      {/* Vistas */}
      {tab === 'agenda' && <MiAgenda onOpenAlumno={onOpenAlumno} docentes={scores} isAdmin={isAdmin} />}
      {tab === 'pipeline' && <PipelineKanban cases={cases} onOpen={onOpenAlumno} />}
      {tab === 'alumnos' && <TablaAlumnos cases={cases} onOpen={onOpenAlumno} />}
      {tab === 'docentes' && <PanelDocentes scores={scores} />}

      {/* Modal ficha */}
      <ModalFichaAlumno
        caseId={openCaseId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onChanged={refresh}
      />
    </div>
  );
}
