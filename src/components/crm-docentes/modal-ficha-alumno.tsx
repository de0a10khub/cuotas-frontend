'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  createComment, createInteraction, createProof, getCase, marcarPerdido,
  marcarRiesgo, quitarRiesgo, recuperar, setNota,
} from '@/lib/crm-docentes-api';
import type {
  InteractionResultado, InteractionTipo, OnboardingCaseDetail,
} from '@/lib/crm-docentes-types';
import { EstadoChip, NotaChip, PagoChip } from './estado-chips';

/**
 * Ficha del alumno en modal (equivalente al modal del prototipo).
 *
 * Todas las escrituras son append-only (sin editar/borrar). El backend
 * también lo refuerza.
 */
export function ModalFichaAlumno({
  caseId,
  open,
  onOpenChange,
  onChanged,
}: {
  caseId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<OnboardingCaseDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const [callTipo, setCallTipo] = useState<InteractionTipo>('llamada_1');
  const [callEnlace, setCallEnlace] = useState('');
  const [callResultado, setCallResultado] = useState<InteractionResultado>('asistio');
  const [callNotas, setCallNotas] = useState('');
  const [siguienteCita, setSiguienteCita] = useState('');

  const [proofDesc, setProofDesc] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [comentText, setComentText] = useState('');

  async function refresh() {
    if (!caseId) return;
    setLoading(true);
    try {
      const d = await getCase(caseId);
      setData(d);
      // Preselección inteligente: usa el next_expected_tipo del backend
      // (calculado según el playbook y el historial del alumno). Si no hay
      // sugerencia, fallback a la próxima tarea pendiente.
      if (d.next_expected_tipo) {
        setCallTipo(d.next_expected_tipo);
      } else {
        const proximaTarea = d.tareas.find((t) => t.estado === 'pendiente' && t.tipo !== 'alerta_24h');
        if (proximaTarea) setCallTipo(proximaTarea.tipo as InteractionTipo);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && caseId) refresh();
    else setData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseId]);

  if (!open || !caseId) return null;

  async function guardarLlamada() {
    if (!data) return;
    const TIPOS_LLAMADA: InteractionTipo[] = [
      'llamada_1', 'reunion_1', 'control_dia_4',
      'reunion_2', 'reunion_3', 'reunion_4',
      'quincenal', 'micro',
      // Legacy
      'primera_reunion', 'seguimiento',
      'llamada_2', 'llamada_3', 'llamada_4',
    ];
    const esLlamada = TIPOS_LLAMADA.includes(callTipo);
    if (esLlamada && !callEnlace.trim()) {
      toast.error('El enlace a la grabación es obligatorio. Sin grabación no hay llamada.');
      return;
    }
    try {
      await createInteraction(data.id, {
        tipo: callTipo,
        resultado: callResultado,
        enlace_grabacion: callEnlace.trim(),
        notas: callNotas.trim(),
        ...(siguienteCita
          ? { siguiente_cita_fecha_hora: new Date(siguienteCita).toISOString() }
          : {}),
      });
      toast.success(
        siguienteCita
          ? 'Llamada registrada + siguiente cita agendada 🎯'
          : 'Llamada registrada.'
      );
      setCallEnlace('');
      setCallNotas('');
      setSiguienteCita('');
      await refresh();
      onChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      toast.error(msg);
    }
  }

  async function guardarPrueba() {
    if (!data) return;
    if (!proofDesc.trim() || !proofUrl.trim()) {
      toast.error('Descripción y enlace obligatorios.');
      return;
    }
    try {
      await createProof(data.id, { descripcion: proofDesc.trim(), enlace: proofUrl.trim() });
      setProofDesc('');
      setProofUrl('');
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function guardarComent() {
    if (!data) return;
    if (!comentText.trim()) return;
    try {
      await createComment(data.id, { texto: comentText.trim() });
      setComentText('');
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function cambiarNota(n: number) {
    if (!data) return;
    try {
      await setNota(data.id, { nota_nueva: n });
      if (n <= 4) toast('⚠ Nota ≤ 4 → EN RIESGO automático');
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function accionMarcarPerdido() {
    if (!data) return;
    const motivo = window.prompt('Motivo de la pérdida (obligatorio):');
    if (!motivo) return;
    try {
      await marcarPerdido(data.id, motivo);
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function accionMarcarRiesgo() {
    if (!data) return;
    await marcarRiesgo(data.id);
    await refresh();
    onChanged?.();
  }

  async function accionQuitarRiesgo() {
    if (!data) return;
    try {
      await quitarRiesgo(data.id);
      toast.success('Marca EN RIESGO quitada. Estado ACTIVO.');
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function accionRecuperar() {
    if (!data) return;
    await recuperar(data.id);
    await refresh();
    onChanged?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          // Fuerza el ancho con `!` porque shadcn base trae `sm:max-w-sm` (384px)
          // que sobrescribiría nuestros valores. Responsive: móvil = casi ancho
          // completo, escritorio hasta 900px (~ prototipo).
          '!max-w-[95vw] sm:!max-w-[560px] md:!max-w-[780px] lg:!max-w-[900px] ' +
          'max-h-[90vh] overflow-y-auto p-6 leading-relaxed'
        }
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {loading || !data ? 'Cargando…' : data.customer_name || data.customer_email}
          </DialogTitle>
        </DialogHeader>

        {data && (
          <>
            <div className="text-[12px] text-muted-foreground">
              {data.customer_email} · {data.producto_nombre || (data.ticket_total_cents ? `${Math.round(data.ticket_total_cents/100)}€` : '—')} · alta{' '}
              {data.created_at.slice(0, 10)}
            </div>

            {/* Datos de contacto — el docente debe poder llamar / mandar WhatsApp con 1 click */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              {data.customer_phone ? (
                <>
                  <a
                    href={`tel:${data.customer_phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-600 hover:bg-emerald-500/25"
                  >
                    📞 {data.customer_phone}
                  </a>
                  <a
                    href={`https://wa.me/${data.customer_phone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-green-500/15 px-2 py-1 font-bold text-green-600 hover:bg-green-500/25"
                  >
                    💬 WhatsApp
                  </a>
                </>
              ) : (
                <span className="rounded-md bg-red-500/15 px-2 py-1 font-bold text-red-500">
                  ⚠ Sin teléfono en el checkout
                </span>
              )}
              {data.docente_nombre && (
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-1 font-bold text-violet-600">
                  🎓 {data.docente_nombre}
                </span>
              )}
              {!data.docente_nombre && data.coach_nombre && (
                <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-1 font-bold text-cyan-600">
                  🎯 {data.coach_nombre}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EstadoChip estado={data.estado} />
              <PagoChip visibilidad={data.pagos_visibilidad} />
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-400">
                {data.fase}
              </span>
              {data.es_urgente_primer_toque_24h && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10.5px] font-extrabold text-red-500 animate-pulse">
                  🚨 URGENTE — sin tocar por el docente
                </span>
              )}
            </div>

            {/* Sección Onboarding — Lucila (bloqueada) */}
            {data.nota_lucila !== null && (
              <div className="mt-6 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-600">
                  🔒 Onboarding — Lucila
                  <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9.5px] font-bold normal-case tracking-normal text-cyan-700">
                    Solo lectura
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[13px]">
                  <div>
                    Nota Lucila:{' '}
                    <span
                      className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md font-extrabold text-white"
                      style={{
                        backgroundColor:
                          data.nota_lucila >= 7 ? '#22c55e'
                          : data.nota_lucila >= 5 ? '#f59e0b'
                          : '#ef4444',
                      }}
                    >
                      {data.nota_lucila}
                    </span>
                  </div>
                  {data.docente_nombre && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <div>
                        Docente valora:{' '}
                        {data.nota_implicacion !== null ? (
                          <span
                            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md font-extrabold text-white"
                            style={{
                              backgroundColor:
                                data.nota_implicacion >= 7 ? '#22c55e'
                                : data.nota_implicacion >= 5 ? '#f59e0b'
                                : '#ef4444',
                            }}
                          >
                            {data.nota_implicacion}
                          </span>
                        ) : (
                          <span className="ml-1 rounded-md bg-slate-500/15 px-2 py-1 text-[11px] font-bold text-muted-foreground">
                            SIN VALORAR
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {data.nota_implicacion !== null && data.nota_lucila - data.nota_implicacion >= 3 && (
                    <span className="rounded-md bg-red-500/15 px-2 py-1 text-[11px] font-bold text-red-500">
                      ⚠ Bajada ≥3 puntos — alarma de producto
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Nota de implicación del docente */}
            <div className="mt-6">
              <Label className="text-[10.5px] font-bold uppercase text-muted-foreground">
                Nota de implicación del {data.docente_nombre ? 'docente' : 'onboarding'}
                {data.nota_vigente_autor && ` — última por ${data.nota_vigente_autor}`}
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => cambiarNota(n)}
                    className={
                      'flex h-8 w-8 items-center justify-center rounded-lg border font-extrabold transition-transform ' +
                      (data.nota_implicacion === n
                        ? 'scale-110 border-transparent text-white'
                        : 'border-border text-muted-foreground hover:border-cyan-500')
                    }
                    style={{
                      backgroundColor:
                        data.nota_implicacion === n
                          ? n >= 7
                            ? '#22c55e'
                            : n >= 5
                              ? '#f59e0b'
                              : '#ef4444'
                          : undefined,
                    }}
                  >
                    {n}
                  </button>
                ))}
                <div className="ml-2 flex items-center text-xs text-muted-foreground">
                  <NotaChip nota={data.nota_implicacion} />
                </div>
              </div>
            </div>

            {/* Grid: llamada | pruebas+comentarios — 2 col en escritorio */}
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Registrar llamada + historial */}
              <div className="rounded-xl border bg-muted/30 p-5">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  📞 Registrar llamada / interacción
                </div>
                <Label className="text-[10.5px] font-bold uppercase text-muted-foreground">Tipo</Label>
                <Select value={callTipo} onValueChange={(v) => setCallTipo(v as InteractionTipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llamada_1">🚀 Onboarding 1 (Lucila)</SelectItem>
                    <SelectItem value="reunion_1">🤝 Reunión 1 — Día 3</SelectItem>
                    <SelectItem value="control_dia_4">🔍 Control Día 4 (Lucila)</SelectItem>
                    <SelectItem value="reunion_2">📈 Reunión 2 — Día 10</SelectItem>
                    <SelectItem value="reunion_3">🔧 Reunión 3 — Día 17</SelectItem>
                    <SelectItem value="reunion_4">🏆 Reunión 4 — Día 24 (cierre mes 1)</SelectItem>
                    <SelectItem value="quincenal">🔄 Quincenal (mes 2+)</SelectItem>
                    <SelectItem value="micro">⚡ Micro-llamada (5-10 min)</SelectItem>
                    <SelectItem value="mensaje">💬 Mensaje</SelectItem>
                    <SelectItem value="email">✉️ Email</SelectItem>
                    <SelectItem value="correccion">✏️ Corrección</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="mt-2 text-[10.5px] font-bold uppercase text-muted-foreground">
                  Enlace grabación (obligatorio en llamadas)
                </Label>
                <Input
                  placeholder="https://zoom.us/rec/..."
                  value={callEnlace}
                  onChange={(e) => setCallEnlace(e.target.value)}
                />

                <Label className="mt-2 text-[10.5px] font-bold uppercase text-muted-foreground">Resultado</Label>
                <Select value={callResultado} onValueChange={(v) => setCallResultado(v as InteractionResultado)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asistio">Asistió</SelectItem>
                    <SelectItem value="no_asistio">No asistió</SelectItem>
                    <SelectItem value="reagendada">Reagendada</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="mt-2 text-[10.5px] font-bold uppercase text-muted-foreground">Notas</Label>
                <Input
                  placeholder="Qué se habló, acuerdos…"
                  value={callNotas}
                  onChange={(e) => setCallNotas(e.target.value)}
                />
                <Label className="mt-2 flex items-center gap-2 text-[10.5px] font-bold uppercase text-muted-foreground">
                  🎯 Siguiente cita (opcional — regla de oro)
                </Label>
                <Input
                  type="datetime-local"
                  value={siguienteCita}
                  onChange={(e) => setSiguienteCita(e.target.value)}
                  placeholder="Agendar la siguiente antes de colgar"
                />
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Si la rellenas, la próxima reunión nace ya en verde (agendada).
                </div>
                <div className="mt-3">
                  <Button onClick={guardarLlamada} size="sm">Guardar (append-only)</Button>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Historial ({data.interacciones.length})
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {data.interacciones.length === 0 && (
                      <div className="rounded border-l-4 border-cyan-500 bg-cyan-500/5 px-3 py-2 text-[12px] text-muted-foreground">
                        Sin interacciones aún
                      </div>
                    )}
                    {data.interacciones.map((i) => (
                      <div key={i.id} className="rounded border-l-4 border-cyan-500 bg-cyan-500/5 px-3 py-2 text-[12.5px]">
                        <b>{i.tipo}</b> · {i.fecha.slice(0, 10)} · {i.resultado}{' '}
                        {i.enlace_grabacion && (
                          <>
                            · <a href={i.enlace_grabacion} target="_blank" rel="noreferrer" className="font-bold text-cyan-500">🎥 grabación</a>
                          </>
                        )}
                        {i.notas && <div className="mt-1">{i.notas}</div>}
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          por {i.autor_nombre}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pruebas + comentarios */}
              <div className="space-y-4">
                {/* Pruebas */}
                <div className="rounded-xl border bg-muted/30 p-5">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    📎 Pruebas de trabajo
                  </div>
                  <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                    {data.pruebas.length === 0 && (
                      <div className="rounded border-l-4 border-cyan-500 bg-cyan-500/5 px-3 py-2 text-[12px] text-muted-foreground">
                        Sin pruebas subidas
                      </div>
                    )}
                    {data.pruebas.map((p) => (
                      <div key={p.id} className="rounded border-l-4 border-cyan-500 bg-cyan-500/5 px-3 py-2 text-[12.5px]">
                        {p.fecha} · {p.descripcion} ·{' '}
                        <a href={p.enlace} target="_blank" rel="noreferrer" className="font-bold text-cyan-500">
                          ver
                        </a>
                      </div>
                    ))}
                  </div>
                  <Label className="text-[10.5px] font-bold uppercase text-muted-foreground">Descripción</Label>
                  <Input
                    placeholder="Ej: captura del agente funcionando"
                    value={proofDesc}
                    onChange={(e) => setProofDesc(e.target.value)}
                  />
                  <Label className="mt-2 text-[10.5px] font-bold uppercase text-muted-foreground">Enlace</Label>
                  <Input
                    placeholder="https://..."
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                  />
                  <div className="mt-3">
                    <Button size="sm" onClick={guardarPrueba}>
                      Añadir prueba
                    </Button>
                  </div>
                </div>

                {/* Comentarios */}
                <div className="rounded-xl border bg-muted/30 p-5">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    💬 Comentarios del equipo
                  </div>
                  <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                    {data.comentarios.length === 0 && (
                      <div className="rounded border-l-4 border-cyan-500 bg-cyan-500/5 px-3 py-2 text-[12px] text-muted-foreground">
                        Sin comentarios
                      </div>
                    )}
                    {data.comentarios.map((c) => (
                      <div key={c.id} className="rounded border-l-4 border-cyan-500 bg-cyan-500/5 px-3 py-2 text-[12.5px]">
                        <div className="text-[10px] text-muted-foreground">
                          {c.autor_nombre} · {c.created_at.slice(0, 10)}
                        </div>
                        <div>{c.texto}</div>
                      </div>
                    ))}
                  </div>
                  <Input
                    placeholder="Añadir comentario…"
                    value={comentText}
                    onChange={(e) => setComentText(e.target.value)}
                  />
                  <div className="mt-3">
                    <Button size="sm" onClick={guardarComent}>
                      Comentar
                    </Button>
                  </div>
                </div>

                {/* Agenda / Próximas reuniones */}
                <div className="rounded-xl border bg-muted/30 p-5">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    📅 Agenda — reuniones pendientes
                  </div>
                  {data.tareas.filter((t) => t.estado === 'pendiente').length === 0 ? (
                    <div className="rounded border-l-4 border-emerald-500 bg-emerald-500/5 px-3 py-2 text-[12px] text-muted-foreground">
                      Sin reuniones pendientes.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.tareas
                        .filter((t) => t.estado === 'pendiente')
                        .sort((a, b) => a.vence.localeCompare(b.vence))
                        .map((t) => {
                          const cls = t.color_estado === 'rojo'
                            ? 'border-red-500 bg-red-500/10 text-red-600 font-bold'
                            : t.color_estado === 'ambar'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-semibold'
                              : 'border-emerald-500 bg-emerald-500/5';
                          const label = t.esta_vencida
                            ? `🔴 VENCIDA hace ${Math.abs(t.dias_para_vencer)}d`
                            : t.esta_urgente
                              ? (t.dias_para_vencer === 0 ? '🟡 VENCE HOY' : `🟡 en ${t.dias_para_vencer}d`)
                              : `en ${t.dias_para_vencer}d`;
                          return (
                            <div key={t.id} className={`rounded border-l-4 px-3 py-2 text-[12.5px] ${cls}`}>
                              <b>{t.tipo_display}</b> · vence {t.vence} · {label}
                            </div>
                          );
                        })}
                    </div>
                  )}
                  {data.tareas.some((t) => t.registrada_fuera_de_plazo) && (
                    <div className="mt-3 rounded border-l-4 border-amber-500 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700">
                      ⚠ Este expediente tiene {data.tareas.filter((t) => t.registrada_fuera_de_plazo).length} reunión(es) registradas fuera de plazo.
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2">
                  {data.fase !== 'perdido' && (
                    <Button size="sm" variant="destructive" onClick={accionMarcarPerdido}>
                      Marcar PERDIDO
                    </Button>
                  )}
                  {data.fase === 'perdido' && (
                    <Button size="sm" onClick={accionRecuperar}>
                      Recuperar
                    </Button>
                  )}
                  {data.estado === 'activo' && data.fase !== 'perdido' && (
                    <Button size="sm" variant="outline" onClick={accionMarcarRiesgo}>
                      ⚠ Marcar EN RIESGO
                    </Button>
                  )}
                  {data.estado === 'riesgo' && data.fase !== 'perdido' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={accionQuitarRiesgo}
                    >
                      ✓ Quitar EN RIESGO
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
