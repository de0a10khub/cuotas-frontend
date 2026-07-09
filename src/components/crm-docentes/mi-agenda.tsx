'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { agendarTarea, getMiAgenda } from '@/lib/crm-docentes-api';
import type { AgendaResponse } from '@/lib/crm-docentes-api';
import type { CaseTask, DocenteScore } from '@/lib/crm-docentes-types';

function colorClasses(t: CaseTask): string {
  if (t.color_estado === 'rojo') return 'border-l-red-500 bg-red-500/8';
  if (t.color_estado === 'ambar') return 'border-l-amber-500 bg-amber-500/8';
  if (t.color_estado === 'verde') return 'border-l-emerald-500 bg-emerald-500/5';
  return 'border-l-slate-500 bg-slate-500/5';
}

function Grupo({
  titulo,
  emoji,
  tareas,
  onAgendar,
  onOpenAlumno,
}: {
  titulo: string;
  emoji: string;
  tareas: CaseTask[];
  onAgendar: (t: CaseTask) => void;
  onOpenAlumno: (caseId: string) => void;
}) {
  if (tareas.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>{emoji}</span>
        <span>{titulo}</span>
        <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px]">
          {tareas.length}
        </span>
      </div>
      <div className="space-y-2">
        {tareas.map((t) => (
          <Card
            key={t.id}
            className={`border-l-4 p-3 ${colorClasses(t)} flex items-center justify-between gap-3`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold">
                <button
                  onClick={() => t.case_id && onOpenAlumno(t.case_id)}
                  className="truncate text-left hover:underline"
                >
                  {t.customer_name || t.customer_email || 'Alumno'}
                </button>
                {t.agendada ? (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    AGENDADA
                  </span>
                ) : (
                  <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                    SIN AGENDAR
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {t.tipo_display} · vence {t.vence}
                {t.dias_para_vencer >= 0
                  ? ` · en ${t.dias_para_vencer}d`
                  : ` · vencida hace ${Math.abs(t.dias_para_vencer)}d`}
                {t.agendada && t.cita_fecha_hora && (
                  <> · cita {new Date(t.cita_fecha_hora).toLocaleString('es-ES')}</>
                )}
              </div>
              {t.customer_phone && (
                <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                  <a
                    href={`tel:${t.customer_phone.replace(/\s+/g,'')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-500/20"
                  >
                    📞 {t.customer_phone}
                  </a>
                  <a
                    href={`https://wa.me/${t.customer_phone.replace(/[^\d]/g,'')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded bg-green-500/10 px-1.5 py-0.5 font-semibold text-green-700 hover:bg-green-500/20"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {!t.agendada && (
                <Button size="sm" variant="outline" onClick={() => onAgendar(t)}>
                  📅 Agendar
                </Button>
              )}
              {t.case_id && (
                <Button size="sm" onClick={() => onOpenAlumno(t.case_id!)}>
                  Ficha
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MiAgenda({
  onOpenAlumno,
  docentes,
  isAdmin = false,
}: {
  onOpenAlumno: (caseId: string) => void;
  docentes: DocenteScore[];
  isAdmin?: boolean;
}) {
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [agendarT, setAgendarT] = useState<CaseTask | null>(null);
  const [citaValue, setCitaValue] = useState('');
  // Admin puede escoger de quién ver la agenda. Si nada seleccionado → cola
  // propia (misma que antes). Los operarios (coach/docente) verán su cola
  // aunque no toquen el selector.
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const opcionesDocentes = (docentes || []).filter(d => !!d.docente_id);

  const refresh = useCallback(async (profileId?: string | null) => {
    setLoading(true);
    try {
      const d = await getMiAgenda(profileId || undefined);
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando agenda');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(selectedProfileId); }, [refresh, selectedProfileId]);

  async function confirmarAgenda() {
    if (!agendarT || !citaValue) return;
    if (!agendarT.case_id) return;
    try {
      await agendarTarea(agendarT.case_id, agendarT.id, new Date(citaValue).toISOString());
      toast.success('Cita agendada.');
      setAgendarT(null);
      setCitaValue('');
      await refresh(selectedProfileId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  const seleccionado = opcionesDocentes.find(d => d.docente_id === selectedProfileId);

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Selector de agenda. El backend ya protege que solo Admin pueda
          consultar la agenda de otros; para docentes/coach el backend
          ignora ?profile_id y devuelve la propia. Mostramos el selector
          siempre para no depender de que /me/ resuelva rápido. */}
      {opcionesDocentes.length > 0 && (
        <Card className="mb-4 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Ver agenda de:
            </span>
            <button
              onClick={() => setSelectedProfileId(null)}
              className={
                'rounded-full px-3 py-1 text-[12px] font-bold transition ' +
                (selectedProfileId === null
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow'
                  : 'bg-slate-500/10 text-muted-foreground hover:bg-slate-500/20')
              }
            >
              🙋 Yo
            </button>
            {opcionesDocentes.map((d) => (
              <button
                key={d.docente_id}
                onClick={() => setSelectedProfileId(d.docente_id)}
                className={
                  'rounded-full px-3 py-1 text-[12px] font-bold transition ' +
                  (selectedProfileId === d.docente_id
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow'
                    : 'bg-slate-500/10 text-muted-foreground hover:bg-slate-500/20')
                }
              >
                {d.rol === 'coach_onboarding' ? '🎯' : '🎓'} {d.display_name || d.email || 'Docente'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {loading || !data ? (
        <div className="text-sm text-muted-foreground">Cargando agenda…</div>
      ) : (
        <>
          <div className="mb-4 text-[13px] text-muted-foreground">
            📅{' '}
            <b className="text-foreground">
              {selectedProfileId === null
                ? 'Mi agenda'
                : `Agenda de ${seleccionado?.display_name || seleccionado?.email || 'seleccionado'}`}
            </b>{' '}
            — {data.total} reunión(es) pendientes. Cada reunión debe estar{' '}
            <b className="text-emerald-600">agendada</b> con fecha-hora pactada. Sin
            agendar aparece en <b className="text-red-500">rojo</b> desde el primer día.
          </div>

          {data.total === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              🎉 Sin reuniones pendientes.
              {selectedProfileId === null && (
                <div className="mt-2 text-[12px]">
                  Si eres Admin, elige un docente arriba para ver su cola.
                </div>
              )}
            </Card>
          )}

          <Grupo titulo="Vencidas" emoji="🔴" tareas={data.vencidas} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />
          <Grupo titulo="Hoy" emoji="🟡" tareas={data.hoy} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />
          <Grupo titulo="Esta semana" emoji="📆" tareas={data.esta_semana} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />
          <Grupo titulo="Próximas" emoji="⏭" tareas={data.proximas} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />
        </>
      )}

      {/* Popup agendar */}
      {agendarT && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAgendarT(null)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-lg font-bold">Agendar reunión</div>
            <div className="mb-3 text-sm text-muted-foreground">
              {agendarT.customer_name || agendarT.customer_email} · {agendarT.tipo_display}
            </div>
            <label className="text-[11px] font-bold uppercase text-muted-foreground">
              Fecha y hora pactada con el alumno
            </label>
            <Input
              type="datetime-local"
              value={citaValue}
              onChange={(e) => setCitaValue(e.target.value)}
              className="mt-1"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAgendarT(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmarAgenda} disabled={!citaValue}>
                Guardar agenda
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
