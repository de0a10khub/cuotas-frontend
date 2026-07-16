'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { agendarTarea, getMiAgenda, marcarContactado, marcarNoAsistio } from '@/lib/crm-docentes-api';
import type { AgendaResponse } from '@/lib/crm-docentes-api';
import type { CaseTask, DocenteScore } from '@/lib/crm-docentes-types';

function colorClasses(t: CaseTask): string {
  if (t.color_estado === 'rojo') return 'border-l-red-500 bg-red-500/8';
  if (t.color_estado === 'ambar') return 'border-l-amber-500 bg-amber-500/8';
  if (t.color_estado === 'verde') return 'border-l-emerald-500 bg-emerald-500/5';
  return 'border-l-slate-500 bg-slate-500/5';
}

/** ISO → valor de <input type="datetime-local"> en hora local (YYYY-MM-DDTHH:mm). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Grupo({
  titulo,
  emoji,
  tareas,
  onAgendar,
  onOpenAlumno,
  onContactado,
  onNoAsistio,
}: {
  titulo: string;
  emoji: string;
  tareas: CaseTask[];
  onAgendar: (t: CaseTask) => void;
  onOpenAlumno: (caseId: string) => void;
  onContactado: (t: CaseTask) => void;
  onNoAsistio: (t: CaseTask) => void;
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
                ) : t.pendiente_llamada ? (
                  <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                    🚨 PENDIENTE DE LLAMADA
                  </span>
                ) : t.en_gestion_contacto ? (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                    🟡 EN GESTIÓN · A AGENDAR
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const clean = (t.customer_phone || '').replace(/\s+/g,'');
                      navigator.clipboard.writeText(clean);
                      toast.success(`Copiado: ${clean}`);
                    }}
                    className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-500/20"
                    title="Click para copiar al portapapeles"
                  >
                    📞 {t.customer_phone}
                  </button>
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
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex gap-2">
                {/* Agendar (o Reagendar si ya tiene cita — la fecha se puede modificar) */}
                <Button size="sm" variant="outline" onClick={() => onAgendar(t)}>
                  {t.agendada ? '🔁 Reagendar' : '📅 Agendar'}
                </Button>
                {t.case_id && (
                  <Button size="sm" onClick={() => onOpenAlumno(t.case_id!)}>
                    Ficha
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* No asistió (1 click, sin nota): vuelve al flujo de reagendar
                    → ámbar 48h → rojo. Siempre disponible en la tarea. */}
                <button
                  onClick={() => onNoAsistio(t)}
                  className="rounded-md bg-red-500/12 px-2 py-1 text-[10.5px] font-bold text-red-600 hover:bg-red-500/22"
                  title="El alumno no se presentó — vuelve al flujo de reagendar (48h)"
                >
                  ❌ No asistió
                </button>
                {/* Marcar contactado (1 click, sin captura). Solo si aún no agendada. */}
                {!t.agendada && !t.en_gestion_contacto && !t.pendiente_llamada && (
                  <button
                    onClick={() => onContactado(t)}
                    className="rounded-md bg-amber-500/15 px-2 py-1 text-[10.5px] font-bold text-amber-700 hover:bg-amber-500/25"
                  >
                    ✅ Contactado
                  </button>
                )}
              </div>
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

  async function marcarContactadoTarea(t: CaseTask) {
    if (!t.case_id) return;
    try {
      await marcarContactado(t.case_id, t.id);
      toast.success('Marcado como contactado. Tienes 48h para agendar la cita.');
      await refresh(selectedProfileId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  // Abre el popup de agendar/reagendar pre-rellenando la cita actual (si la
  // hay) para que la fecha/hora se pueda EDITAR en cualquier momento.
  function openAgendar(t: CaseTask) {
    setAgendarT(t);
    setCitaValue(toLocalInput(t.cita_fecha_hora));
  }

  async function marcarNoAsistioTarea(t: CaseTask) {
    if (!t.case_id) return;
    try {
      await marcarNoAsistio(t.case_id, t.id);
      toast.success('Marcado "No asistió". Vuelve a reagendar: 48h antes de pasar a rojo.');
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

          <Grupo titulo="Vencidas" emoji="🔴" tareas={data.vencidas} onAgendar={openAgendar} onOpenAlumno={onOpenAlumno} onContactado={marcarContactadoTarea} onNoAsistio={marcarNoAsistioTarea} />
          <Grupo titulo="Hoy" emoji="🟡" tareas={data.hoy} onAgendar={openAgendar} onOpenAlumno={onOpenAlumno} onContactado={marcarContactadoTarea} onNoAsistio={marcarNoAsistioTarea} />
          <Grupo titulo="Mañana" emoji="🟢" tareas={data.manana ?? []} onAgendar={openAgendar} onOpenAlumno={onOpenAlumno} onContactado={marcarContactadoTarea} onNoAsistio={marcarNoAsistioTarea} />
          <Grupo titulo="En 2-3 días" emoji="📅" tareas={data.en_2_3_dias ?? []} onAgendar={openAgendar} onOpenAlumno={onOpenAlumno} onContactado={marcarContactadoTarea} onNoAsistio={marcarNoAsistioTarea} />
          <Grupo titulo="Esta semana" emoji="📆" tareas={data.esta_semana} onAgendar={openAgendar} onOpenAlumno={onOpenAlumno} onContactado={marcarContactadoTarea} onNoAsistio={marcarNoAsistioTarea} />
          <Grupo titulo="Después" emoji="⏭" tareas={data.despues ?? data.proximas} onAgendar={openAgendar} onOpenAlumno={onOpenAlumno} onContactado={marcarContactadoTarea} onNoAsistio={marcarNoAsistioTarea} />
        </>
      )}

      {/* Popup agendar */}
      {agendarT && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAgendarT(null)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-lg font-bold">
              {agendarT.agendada ? '🔁 Reagendar reunión' : '📅 Agendar reunión'}
            </div>
            <div className="mb-1 text-sm text-muted-foreground">
              {agendarT.customer_name || agendarT.customer_email} · {agendarT.tipo_display}
            </div>
            {agendarT.agendada && (
              <div className="mb-3 rounded-md bg-emerald-500/10 px-2 py-1.5 text-[11.5px] text-emerald-700">
                Puedes cambiar la fecha las veces que haga falta. No penaliza ni
                marca la cita como perdida — solo queda registrado el cambio.
              </div>
            )}
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
