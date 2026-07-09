'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { agendarTarea, getMiAgenda } from '@/lib/crm-docentes-api';
import type { AgendaResponse } from '@/lib/crm-docentes-api';
import type { CaseTask } from '@/lib/crm-docentes-types';

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
}: {
  onOpenAlumno: (caseId: string) => void;
}) {
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [agendarT, setAgendarT] = useState<CaseTask | null>(null);
  const [citaValue, setCitaValue] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getMiAgenda();
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando agenda');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function confirmarAgenda() {
    if (!agendarT || !citaValue) return;
    if (!agendarT.case_id) return;
    try {
      await agendarTarea(agendarT.case_id, agendarT.id, new Date(citaValue).toISOString());
      toast.success('Cita agendada.');
      setAgendarT(null);
      setCitaValue('');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  if (loading || !data) {
    return <div className="text-sm text-muted-foreground">Cargando agenda…</div>;
  }

  const vacio = data.total === 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-4 text-[13px] text-muted-foreground">
        📅 <b className="text-foreground">Mi agenda</b> — {data.total} reunión(es) pendientes.
        {' '}Cada reunión debe estar <b className="text-emerald-600">agendada</b> con
        fecha-hora pactada. Sin agendar aparece en <b className="text-red-500">rojo</b> desde
        el primer día.
      </div>

      {vacio && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          🎉 Sin reuniones pendientes. Buen trabajo.
        </Card>
      )}

      <Grupo titulo="Vencidas" emoji="🔴" tareas={data.vencidas} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />
      <Grupo titulo="Hoy" emoji="🟡" tareas={data.hoy} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />
      <Grupo titulo="Esta semana" emoji="📆" tareas={data.esta_semana} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />
      <Grupo titulo="Próximas" emoji="⏭" tareas={data.proximas} onAgendar={setAgendarT} onOpenAlumno={onOpenAlumno} />

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
