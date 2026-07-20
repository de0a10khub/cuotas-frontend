'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { agendarTarea, getMiAgenda, marcarContactado, marcarNoAsistio } from '@/lib/crm-docentes-api';
import type { AgendaResponse } from '@/lib/crm-docentes-api';
import type { CaseTask, DocenteScore, TaskTipo } from '@/lib/crm-docentes-types';

/**
 * Normaliza texto para búsqueda: minúsculas, sin espacios ni signos.
 * Igual que el buscador del pipeline, para que "691 83 41 13" matchee con
 * "+34691834113" o "691834113".
 */
function normalizarBusqueda(s: string | null | undefined): string {
  return (s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

// ── Columnas por ESTADO (color), no por fecha. Cada una junta las reuniones
// de ese estado de TODOS los docentes; dentro se ordena por fecha. ──────────
type EstadoCol = 'urgente' | 'gestion' | 'agendada' | 'proxima';

const COLUMNAS: {
  key: EstadoCol;
  title: string;
  sub: string;
  emoji: string;
  strip: string;
  header: string;
  badge: string;
}[] = [
  {
    key: 'urgente', title: 'Vencidas / Urgentes', sub: 'Arden hoy · agéndalas ya',
    emoji: '🔴',
    strip: 'bg-gradient-to-r from-red-500 to-amber-500',
    header: 'bg-gradient-to-r from-red-500/10 to-amber-500/10',
    badge: 'bg-gradient-to-r from-red-500 to-amber-500',
  },
  {
    key: 'gestion', title: 'En gestión', sub: 'Contactado · 48h para agendar',
    emoji: '🟡',
    strip: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    header: 'bg-gradient-to-r from-amber-400/10 to-yellow-500/10',
    badge: 'bg-gradient-to-r from-amber-400 to-yellow-500',
  },
  {
    key: 'agendada', title: 'Agendadas al día', sub: 'Con cita futura · controlado',
    emoji: '🟢',
    strip: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
    header: 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10',
    badge: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
  },
  {
    key: 'proxima', title: 'Próximas', sub: 'Aún no urgentes · agéndalas pronto',
    emoji: '⚪',
    strip: 'bg-gradient-to-r from-slate-400 to-slate-500',
    header: 'bg-gradient-to-r from-slate-400/10 to-slate-500/10',
    badge: 'bg-gradient-to-r from-slate-400 to-slate-500',
  },
];

/**
 * A qué columna de estado va una tarea. Mapea el `color_estado` del backend
 * (no lo recalcula) a los 4 cajones operativos, separando el rojo que ARDE
 * (vencida / cita pasada / 48h sin agendar) del rojo que aún es futuro.
 */
function columnaDe(t: CaseTask): EstadoCol {
  if (t.color_estado === 'ambar' || t.color_estado === 'ambar_historico') return 'gestion';
  if (t.color_estado === 'verde') return 'agendada';
  if (t.color_estado === 'rojo') {
    const citaPasada =
      t.agendada && t.cita_fecha_hora && new Date(t.cita_fecha_hora).getTime() < Date.now();
    const arde = t.esta_vencida || t.pendiente_llamada || t.dias_para_vencer < 0 || citaPasada;
    return arde ? 'urgente' : 'proxima';
  }
  return 'proxima'; // gris / cancelada / resto
}

/** Fecha efectiva para ordenar dentro de la columna: la cita si está agendada,
 *  si no la fecha de vencimiento. */
function fechaOrden(t: CaseTask): number {
  const iso = t.agendada && t.cita_fecha_hora ? t.cita_fecha_hora : t.vence;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

const TIPO_OPCIONES: { value: TaskTipo | ''; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'reunion_1', label: 'Reunión 1' },
  { value: 'reunion_2', label: 'Reunión 2' },
  { value: 'reunion_3', label: 'Reunión 3' },
  { value: 'reunion_4', label: 'Reunión 4' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'control_dia_4', label: 'Control Día 4' },
  { value: 'llamada_1', label: 'Onboarding 1' },
  { value: 'reintentar_contacto', label: 'Reintentar contacto' },
];

const ESTADO_OPCIONES: { value: EstadoCol | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'urgente', label: '🔴 Vencidas / Urgentes' },
  { value: 'gestion', label: '🟡 En gestión' },
  { value: 'agendada', label: '🟢 Agendadas al día' },
  { value: 'proxima', label: '⚪ Próximas' },
];

function colorBorde(t: CaseTask): string {
  if (t.color_estado === 'rojo') return 'border-l-red-500 bg-red-500/8';
  if (t.color_estado === 'ambar' || t.color_estado === 'ambar_historico')
    return 'border-l-amber-500 bg-amber-500/8';
  if (t.color_estado === 'verde') return 'border-l-emerald-500 bg-emerald-500/5';
  return 'border-l-slate-500 bg-slate-500/5';
}

/** ISO → valor de <input type="datetime-local"> en hora local. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TaskCard({
  t,
  mostrarResponsable,
  onAgendar,
  onOpenAlumno,
  onContactado,
  onNoAsistio,
}: {
  t: CaseTask;
  mostrarResponsable: boolean;
  onAgendar: (t: CaseTask) => void;
  onOpenAlumno: (caseId: string) => void;
  onContactado: (t: CaseTask) => void;
  onNoAsistio: (t: CaseTask) => void;
}) {
  return (
    <Card className={`shrink-0 border-l-4 p-3 ${colorBorde(t)}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
          <button
            onClick={() => t.case_id && onOpenAlumno(t.case_id)}
            className="truncate text-left hover:underline"
          >
            {t.customer_name || t.customer_email || 'Alumno'}
          </button>
          {t.es_reactivacion && (
            <span className="rounded bg-gradient-to-r from-emerald-500 to-cyan-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
              🔄 React.
            </span>
          )}
          {t.agendada ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-600">
              AGENDADA
            </span>
          ) : t.pendiente_llamada ? (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-red-500">
              🚨 PENDIENTE
            </span>
          ) : t.en_gestion_contacto ? (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-600">
              🟡 EN GESTIÓN
            </span>
          ) : (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-red-500">
              SIN AGENDAR
            </span>
          )}
        </div>

        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {t.tipo_display} · vence {t.vence}
          {t.dias_para_vencer >= 0
            ? ` · en ${t.dias_para_vencer}d`
            : ` · vencida hace ${Math.abs(t.dias_para_vencer)}d`}
          {t.agendada && t.cita_fecha_hora && (
            <> · cita {new Date(t.cita_fecha_hora).toLocaleString('es-ES')}</>
          )}
        </div>

        {/* Responsable — solo en la vista de "Todos" para saber de quién es */}
        {mostrarResponsable && t.responsable_nombre && (
          <div className="mt-1 text-[10.5px]">
            <span className="rounded bg-violet-500/12 px-1.5 py-0.5 font-bold text-violet-500">
              🎓 {t.responsable_nombre}
            </span>
          </div>
        )}

        {t.customer_phone && (
          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const clean = (t.customer_phone || '').replace(/\s+/g, '');
                navigator.clipboard.writeText(clean);
                toast.success(`Copiado: ${clean}`);
              }}
              className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-500/20"
              title="Click para copiar al portapapeles"
            >
              📞 {t.customer_phone}
            </button>
            <a
              href={`https://wa.me/${t.customer_phone.replace(/[^\d]/g, '')}`}
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

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-foreground/8 pt-2">
        <Button size="sm" variant="outline" onClick={() => onAgendar(t)}>
          {t.agendada ? '🔁 Reagendar' : '📅 Agendar'}
        </Button>
        {t.case_id && (
          <Button size="sm" onClick={() => onOpenAlumno(t.case_id!)}>
            Ficha
          </Button>
        )}
        <button
          onClick={() => onNoAsistio(t)}
          className="rounded-md bg-red-500/12 px-2 py-1 text-[10.5px] font-bold text-red-600 hover:bg-red-500/22"
          title="El alumno no se presentó — vuelve al flujo de reagendar (48h)"
        >
          ❌ No asistió
        </button>
        {!t.agendada && !t.en_gestion_contacto && !t.pendiente_llamada && (
          <button
            onClick={() => onContactado(t)}
            className="rounded-md bg-amber-500/15 px-2 py-1 text-[10.5px] font-bold text-amber-700 hover:bg-amber-500/25"
          >
            ✅ Contactado
          </button>
        )}
      </div>
    </Card>
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
  // Fuente de datos (servidor): 'all' (admin), null=yo, o un docente.
  // El admin arranca en "Todos" — su caso de uso es ver a todos juntos.
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    isAdmin ? 'all' : null,
  );
  // Filtros de vista (cliente): buscador + estado + tipo. Combinables.
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoCol | ''>('');
  const [filtroTipo, setFiltroTipo] = useState<TaskTipo | ''>('');

  const opcionesDocentes = (docentes || []).filter((d) => !!d.docente_id);

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
    if (!agendarT || !citaValue || !agendarT.case_id) return;
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

  // Aplana todas las franjas temporales de la respuesta en una sola lista
  // (dedupe por id: 'despues' y 'proximas' son alias) y luego reagrupa por
  // estado/color, que es lo que pide la nueva vista.
  const todasTareas = useMemo(() => {
    if (!data) return [] as CaseTask[];
    const bloques = [
      data.vencidas, data.hoy, data.manana, data.en_2_3_dias,
      data.esta_semana, data.despues ?? data.proximas,
    ];
    const vistas = new Set<string>();
    const out: CaseTask[] = [];
    for (const bloque of bloques) {
      for (const t of bloque ?? []) {
        if (!vistas.has(t.id)) { vistas.add(t.id); out.push(t); }
      }
    }
    return out;
  }, [data]);

  const verTodos = selectedProfileId === 'all';

  // Filtrado combinado: buscador + estado + tipo.
  const tareasFiltradas = useMemo(() => {
    const qn = normalizarBusqueda(q);
    return todasTareas.filter((t) => {
      if (filtroTipo && t.tipo !== filtroTipo) return false;
      if (filtroEstado && columnaDe(t) !== filtroEstado) return false;
      if (qn) {
        const bag = [t.customer_name, t.customer_email, t.customer_phone, t.responsable_nombre]
          .map(normalizarBusqueda).join('|');
        if (!bag.includes(qn)) return false;
      }
      return true;
    });
  }, [todasTareas, q, filtroEstado, filtroTipo]);

  // Reparto por columnas de estado, ordenado por fecha dentro de cada una.
  const porColumna = useMemo(() => {
    const grupos: Record<EstadoCol, CaseTask[]> = {
      urgente: [], gestion: [], agendada: [], proxima: [],
    };
    for (const t of tareasFiltradas) grupos[columnaDe(t)].push(t);
    for (const k of Object.keys(grupos) as EstadoCol[]) {
      grupos[k].sort((a, b) => fechaOrden(a) - fechaOrden(b));
    }
    return grupos;
  }, [tareasFiltradas]);

  const seleccionado = opcionesDocentes.find((d) => d.docente_id === selectedProfileId);
  const hayFiltros = q !== '' || filtroEstado !== '' || filtroTipo !== '';

  const selectCls =
    'rounded-lg border border-foreground/15 bg-background px-2.5 py-1.5 text-[12.5px] font-medium';

  return (
    <div className="mx-auto max-w-[1560px]">
      {/* Fuente de datos: de quién es la agenda (servidor) */}
      {opcionesDocentes.length > 0 && (
        <Card className="mb-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Ver agenda de:
            </span>
            {isAdmin && (
              <button
                onClick={() => setSelectedProfileId('all')}
                className={
                  'rounded-full px-3 py-1 text-[12px] font-bold transition ' +
                  (verTodos
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow'
                    : 'bg-slate-500/10 text-muted-foreground hover:bg-slate-500/20')
                }
              >
                👥 Todos
              </button>
            )}
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

      {/* Buscador + filtros (cliente) */}
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Buscar alumno por nombre, email o teléfono…"
          className="h-9 min-w-[240px] flex-1"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoCol | '')}
          className={selectCls}
          aria-label="Filtrar por estado"
        >
          {ESTADO_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TaskTipo | '')}
          className={selectCls}
          aria-label="Filtrar por tipo de reunión"
        >
          {TIPO_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hayFiltros && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setQ(''); setFiltroEstado(''); setFiltroTipo(''); }}
          >
            Limpiar
          </Button>
        )}
      </Card>

      {loading || !data ? (
        <div className="text-sm text-muted-foreground">Cargando agenda…</div>
      ) : (
        <>
          <div className="mb-3 text-[13px] text-muted-foreground">
            📅{' '}
            <b className="text-foreground">
              {verTodos
                ? 'Agenda de todos los docentes'
                : selectedProfileId === null
                  ? 'Mi agenda'
                  : `Agenda de ${seleccionado?.display_name || seleccionado?.email || 'seleccionado'}`}
            </b>{' '}
            — {tareasFiltradas.length}
            {hayFiltros ? ` de ${todasTareas.length}` : ''} reunión(es). Columnas por
            estado, ordenadas por fecha (lo más urgente arriba).
          </div>

          {todasTareas.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              🎉 Sin reuniones pendientes.
            </Card>
          ) : (
            <div className="-mx-1 overflow-x-auto pb-3">
              <div className="flex min-w-max gap-3 px-1">
                {COLUMNAS.map((col) => {
                  const items = porColumna[col.key];
                  return (
                    <div
                      key={col.key}
                      className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                    >
                      <div className={'h-[3px] w-full ' + col.strip} />
                      <div className={'border-b border-foreground/10 px-3 py-2.5 ' + col.header}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[12px] font-bold uppercase leading-tight tracking-wide">
                            {col.emoji} {col.title}
                          </div>
                          <span
                            className={
                              'flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow-sm ' +
                              col.badge
                            }
                          >
                            {items.length}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                          {col.sub}
                        </div>
                      </div>
                      <div className="flex max-h-[calc(100vh-320px)] min-h-[84px] flex-col gap-2 overflow-y-auto scroll-smooth p-2 [scrollbar-width:thin]">
                        {items.length === 0 ? (
                          <div className="py-6 text-center text-[11.5px] text-muted-foreground/50">
                            vacío
                          </div>
                        ) : (
                          items.map((t) => (
                            <TaskCard
                              key={t.id}
                              t={t}
                              mostrarResponsable={verTodos}
                              onAgendar={openAgendar}
                              onOpenAlumno={onOpenAlumno}
                              onContactado={marcarContactadoTarea}
                              onNoAsistio={marcarNoAsistioTarea}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Popup agendar / reagendar */}
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
