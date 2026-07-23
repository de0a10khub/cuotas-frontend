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

// ── Columnas por SITUACIÓN de la reunión, no por fecha ni por antigüedad.
// Cada una junta las de TODOS los docentes; dentro se ordena por fecha.
//
// Rediseño Carlos 2026-07-21: tres columnas y una sola pregunta para
// decidirlas — ¿tiene cita puesta? ¿se ha contactado ya? El tiempo
// transcurrido NO mueve a nadie de columna; se muestra como dato en la
// tarjeta. Antes había una cuarta ("Próximas") que duplicaba alumnos ya
// presentes en las otras. ───────────────────────────────────────────────
type EstadoCol = 'pendiente' | 'gestion' | 'agendada';

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
    // Cola normal de alumnos por atender: color NEUTRO (azul), no alarma.
    // Los recién entrados son normales; solo los que llevan >3 días sin que
    // nadie los toque salen con acento rojo dentro (color_estado='rojo').
    key: 'pendiente', title: 'Por atender', sub: 'Aún sin contactar · agéndalas',
    emoji: '🔵',
    strip: 'bg-gradient-to-r from-sky-500 to-blue-500',
    header: 'bg-gradient-to-r from-sky-500/10 to-blue-500/10',
    badge: 'bg-gradient-to-r from-sky-500 to-blue-500',
  },
  {
    key: 'gestion', title: 'En gestión', sub: 'Contactado · agendando',
    emoji: '🟡',
    strip: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    header: 'bg-gradient-to-r from-amber-400/10 to-yellow-500/10',
    badge: 'bg-gradient-to-r from-amber-400 to-yellow-500',
  },
  {
    key: 'agendada', title: 'Agendadas', sub: 'Con cita puesta',
    emoji: '🟢',
    strip: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
    header: 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10',
    badge: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
  },
];

/**
 * A qué columna va una tarea. Depende SOLO de dónde está la reunión, nunca
 * de cuánto lleva ahí:
 *
 *   ¿tiene cita puesta?      → Agendadas
 *   ¿ya se ha tocado?        → En gestión  (contacto probado O cualquier
 *                                           interacción — refinado 2026-07-22:
 *                                           antes solo miraba el botón y 36
 *                                           alumnos ya atendidos caían aquí)
 *   ni tocado ni agendado    → Por atender
 *
 * No se lee `color_estado` para agrupar: el color es presentación (lo usa
 * `colorBorde`), la columna es situación. Así no se pueden desincronizar.
 */
function columnaDe(t: CaseTask): EstadoCol {
  if (t.agendada) return 'agendada';
  if (t.contacto_probado_en || t.case_atendido) return 'gestion';
  return 'pendiente';
}

/** Reunión ya celebrada que nadie ha cerrado: va arriba de "Agendadas". */
function sinRegistrar(t: CaseTask): boolean {
  if (t.cita_pasada_sin_registrar !== undefined) return t.cita_pasada_sin_registrar;
  // Fallback si el backend aún no manda el campo (deploy escalonado).
  return Boolean(
    t.agendada && t.cita_fecha_hora && new Date(t.cita_fecha_hora).getTime() < Date.now(),
  );
}

/**
 * Orden dentro de la columna. En "Agendadas" las reuniones sin registrar van
 * primero y por antigüedad (la más vieja arriba), que son las que hay que
 * cerrar; después las citas futuras por proximidad.
 */
function fechaOrden(t: CaseTask): number {
  const iso = t.agendada && t.cita_fecha_hora ? t.cita_fecha_hora : t.vence;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function ordenarColumna(tareas: CaseTask[]): CaseTask[] {
  return [...tareas].sort((a, b) => {
    const aSin = sinRegistrar(a);
    const bSin = sinRegistrar(b);
    if (aSin !== bSin) return aSin ? -1 : 1;
    return fechaOrden(a) - fechaOrden(b);
  });
}

// Follow-ups "blandos": tareas secundarias que NO deben ganar a una reunión
// real como tarjeta representativa del alumno.
const SOFT_FOLLOWUP = new Set(['reintentar_contacto', 'micro', 'sin_respuesta', 'alerta_24h']);

/** Cuánto merece una tarea ser LA tarjeta del alumno (mayor = más). */
function prioridadTarea(t: CaseTask): number {
  if (t.agendada) return 3;                  // la cita puesta manda
  if (!SOFT_FOLLOWUP.has(t.tipo)) return 2;  // reunión real > follow-up blando
  return 1;
}

/**
 * UNA sola tarjeta por alumno (Carlos 2026-07-23: "una única tarjeta por
 * alumno, en un único estado"). Un alumno con varias tareas pendientes
 * (p.ej. Reunión 1 + Reintentar contacto) salía dos veces. Nos quedamos con
 * la tarea más representativa: cita puesta > reunión real > follow-up; a
 * igualdad, la más urgente por fecha.
 */
function unaPorAlumno(tareas: CaseTask[]): CaseTask[] {
  const mejor = new Map<string, CaseTask>();
  const sinCase: CaseTask[] = [];
  for (const t of tareas) {
    if (!t.case_id) { sinCase.push(t); continue; }
    const prev = mejor.get(t.case_id);
    if (!prev) { mejor.set(t.case_id, t); continue; }
    const pa = prioridadTarea(t);
    const pp = prioridadTarea(prev);
    if (pa > pp || (pa === pp && fechaOrden(t) < fechaOrden(prev))) {
      mejor.set(t.case_id, t);
    }
  }
  return [...mejor.values(), ...sinCase];
}

/** "hace 3 días" / "en 5 días" — dato de referencia, nunca disparador. */
function diasTexto(dias: number): string {
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return dias < 0 ? `hace ${Math.abs(dias)} días` : `en ${dias} días`;
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
  { value: 'pendiente', label: '🔵 Por atender' },
  { value: 'gestion', label: '🟡 En gestión' },
  { value: 'agendada', label: '🟢 Agendadas' },
];

function colorBorde(t: CaseTask): string {
  // El rojo ya solo lo pone el backend cuando es REAL (sin atender >3 días
  // o reunión sin registrar >48h). El recién entrado sin tocar es 'nuevo'
  // → azul neutro, sin alarma.
  if (t.color_estado === 'rojo') return 'border-l-red-500 bg-red-500/8';
  if (t.color_estado === 'ambar' || t.color_estado === 'ambar_historico')
    return 'border-l-amber-500 bg-amber-500/8';
  if (t.color_estado === 'verde') return 'border-l-emerald-500 bg-emerald-500/5';
  if (t.color_estado === 'nuevo') return 'border-l-sky-500 bg-sky-500/5';
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
          {sinRegistrar(t) ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold ${
                t.registro_vencido
                  ? 'bg-red-500/15 text-red-500'
                  : 'bg-amber-500/15 text-amber-600'
              }`}
            >
              ⚠️ SIN REGISTRAR
            </span>
          ) : t.agendada ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-600">
              AGENDADA
            </span>
          ) : t.contacto_probado_en || t.case_atendido ? (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-600">
              🟡 EN GESTIÓN
            </span>
          ) : t.color_estado === 'rojo' ? (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-red-500">
              🔴 SIN ATENDER
            </span>
          ) : (
            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-sky-600">
              🔵 NUEVO
            </span>
          )}
        </div>

        {/* Aviso de reunión celebrada y sin cerrar. A las 48h pasa a rojo y
            penaliza en el score: estar agendada no la cierra. */}
        {sinRegistrar(t) && t.cita_fecha_hora && (
          <div
            className={`mt-1 rounded px-2 py-1 text-[10.5px] font-semibold ${
              t.registro_vencido
                ? 'bg-red-500/10 text-red-600'
                : 'bg-amber-500/10 text-amber-700'
            }`}
          >
            La cita fue el {new Date(t.cita_fecha_hora).toLocaleString('es-ES')}
            {' — '}
            {t.registro_vencido
              ? 'lleva más de 48h sin registrar y está penalizando.'
              : 'márcala antes de 48h.'}
          </div>
        )}

        {/* Datos de referencia. La fecha de ALTA es una GUÍA, no una alarma:
            lo ideal es agendar pronto, pero cuadrar la cita un par de días
            más tarde (por disponibilidad del alumno) es atención normal. */}
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {t.tipo_display}
          {t.agendada && t.cita_fecha_hora && (
            <> · cita {new Date(t.cita_fecha_hora).toLocaleString('es-ES')}</>
          )}
          {t.alta && (
            <> · entró {new Date(t.alta).toLocaleDateString('es-ES')}
              {typeof t.dias_desde_alta === 'number' && ` (${diasTexto(-t.dias_desde_alta)})`}</>
          )}
          {!t.agendada && (
            <span className="text-muted-foreground/70"> · ideal agendar antes del {t.vence}</span>
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
        {/* Reunión ya celebrada: lo primero es cerrarla, no reagendarla. */}
        {sinRegistrar(t) && t.case_id && (
          <Button
            size="sm"
            onClick={() => onOpenAlumno(t.case_id!)}
            title="Registrar la reunión (necesita el enlace de la grabación)"
          >
            ✅ Se hizo
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onAgendar(t)}>
          {t.agendada ? '🔁 Reagendar' : '📅 Agendar'}
        </Button>
        {t.case_id && !sinRegistrar(t) && (
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
        {!t.agendada && !t.contacto_probado_en && (
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
    // Una sola tarjeta por alumno, aunque tenga varias tareas pendientes.
    return unaPorAlumno(out);
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

  // Reparto por columnas. Dentro de cada una: primero las reuniones sin
  // registrar (más antigua arriba), luego el resto por fecha.
  const porColumna = useMemo(() => {
    const grupos: Record<EstadoCol, CaseTask[]> = {
      pendiente: [], gestion: [], agendada: [],
    };
    for (const t of tareasFiltradas) grupos[columnaDe(t)].push(t);
    for (const k of Object.keys(grupos) as EstadoCol[]) {
      grupos[k] = ordenarColumna(grupos[k]);
    }
    return grupos;
  }, [tareasFiltradas]);

  // Reuniones celebradas y sin cerrar — el contador que no deja esconderlas.
  const sinRegistrarTotal = useMemo(
    () => tareasFiltradas.filter(sinRegistrar).length,
    [tareasFiltradas],
  );
  const sinRegistrarVencidas = useMemo(
    () => tareasFiltradas.filter((t) => sinRegistrar(t) && t.registro_vencido).length,
    [tareasFiltradas],
  );

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
            {hayFiltros ? ` de ${todasTareas.length}` : ''} reunión(es). El rojo
            solo marca lo que de verdad está sin atender; la fecha de alta es una guía.
          </div>

          {/* Las reuniones celebradas y sin cerrar no se esconden en verde. */}
          {sinRegistrarTotal > 0 && (
            <div className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-[12.5px] font-semibold text-amber-800 ring-1 ring-amber-500/25">
              ⚠️ {sinRegistrarTotal} reunión(es) ya celebradas sin registrar
              {sinRegistrarVencidas > 0 && (
                <span className="text-red-600">
                  {' '}· {sinRegistrarVencidas} llevan más de 48h y ya penalizan
                </span>
              )}
              . Están arriba de <b>Agendadas</b>: márcalas <b>Se hizo</b> o{' '}
              <b>No asistió</b>.
            </div>
          )}

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
