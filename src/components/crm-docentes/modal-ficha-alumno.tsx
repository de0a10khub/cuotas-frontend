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
  marcarRiesgo, recuperar, setNota,
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

  const [proofDesc, setProofDesc] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [comentText, setComentText] = useState('');

  async function refresh() {
    if (!caseId) return;
    setLoading(true);
    try {
      const d = await getCase(caseId);
      setData(d);
      // Sugerimos el siguiente tipo de llamada (siguiente pendiente)
      const proximaTarea = d.tareas.find((t) => t.estado === 'pendiente' && t.tipo !== 'alerta_24h');
      if (proximaTarea) setCallTipo(proximaTarea.tipo as InteractionTipo);
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
    const esLlamada = callTipo.startsWith('llamada_') || callTipo === 'quincenal';
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
      });
      toast.success('Llamada registrada.');
      setCallEnlace('');
      setCallNotas('');
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

  async function accionRecuperar() {
    if (!data) return;
    await recuperar(data.id);
    await refresh();
    onChanged?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {loading || !data ? 'Cargando…' : data.customer_name || data.customer_email}
          </DialogTitle>
        </DialogHeader>

        {data && (
          <>
            <div className="text-[12px] text-muted-foreground">
              {data.customer_email} · {data.producto_nombre} · alta{' '}
              {data.created_at.slice(0, 10)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EstadoChip estado={data.estado} />
              <PagoChip visibilidad={data.pagos_visibilidad} />
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-400">
                {data.fase}
              </span>
            </div>

            {/* Nota implicación */}
            <div className="mt-4">
              <Label className="text-[10.5px] font-bold uppercase text-muted-foreground">
                Nota de implicación — ¿está poniendo el trabajo?
              </Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
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

            {/* Grid: llamada | pruebas+comentarios */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Registrar llamada */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  📞 Registrar llamada / interacción
                </div>
                <Label className="text-[10.5px] font-bold uppercase text-muted-foreground">Tipo</Label>
                <Select value={callTipo} onValueChange={(v) => setCallTipo(v as InteractionTipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llamada_1">Llamada 1</SelectItem>
                    <SelectItem value="llamada_2">Llamada 2</SelectItem>
                    <SelectItem value="llamada_3">Llamada 3</SelectItem>
                    <SelectItem value="llamada_4">Llamada 4</SelectItem>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensaje">Mensaje</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="correccion">Corrección</SelectItem>
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
                <div className="rounded-xl border bg-muted/30 p-4">
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
                <div className="rounded-xl border bg-muted/30 p-4">
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
                      EN RIESGO
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
