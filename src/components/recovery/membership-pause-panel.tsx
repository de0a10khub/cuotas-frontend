'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { translateError } from '@/lib/error-translations';

const MAX_PAUSE_DAYS = 30;

interface ActivePause {
  id: string;
  paused_by_email: string;
  pause_until: string;
  reason: string | null;
}

interface Props {
  subscriptionId: string;
  /** Callback opcional para refrescar el drawer cuando algo cambia. */
  onChanged?: () => void;
}

function daysRemaining(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function MembershipPausePanel({ subscriptionId, onChanged }: Props) {
  const [active, setActive] = useState<ActivePause | null>(null);
  const [loading, setLoading] = useState(true);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [days, setDays] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!subscriptionId) return;
    setLoading(true);
    try {
      const r = await api.get<{ results: { pause_id: string; subscription_id: string;
        paused_by_email?: string; pause_until: string; reason: string | null;
      }[] }>('/api/v1/mis-casos/pendientes/');
      const mine = r.results.find((p) => p.subscription_id === subscriptionId);
      if (mine) {
        setActive({
          id: mine.pause_id,
          paused_by_email: mine.paused_by_email || '',
          pause_until: mine.pause_until,
          reason: mine.reason,
        });
      } else {
        setActive(null);
      }
    } catch {
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => { refresh(); }, [refresh]);

  const submitPause = async () => {
    const d = parseInt(days, 10);
    if (!Number.isFinite(d) || d < 1 || d > MAX_PAUSE_DAYS) {
      toast.error(`Días debe estar entre 1 y ${MAX_PAUSE_DAYS}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/v1/membership/pause/', {
        subscription_id: subscriptionId,
        days: d,
        reason: reason.trim() || undefined,
      });
      toast.success(`Suscripción pausada ${d} días`);
      setPauseOpen(false);
      setDays('');
      setReason('');
      await refresh();
      onChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { detail?: string; whop_response?: { error?: { message?: string } } };
        const msg = translateError(data?.whop_response?.error?.message) || data?.detail || `Error ${err.status}`;
        toast.error(msg);
      } else {
        toast.error('Error de red');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitResume = async () => {
    if (!active) return;
    if (!confirm('¿Reanudar la suscripción ahora?')) return;
    setSubmitting(true);
    try {
      await api.post('/api/v1/membership/resume/', {
        subscription_id: subscriptionId,
        reason: 'Reanudación manual',
      });
      toast.success('Suscripción reanudada');
      await refresh();
      onChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { detail?: string; whop_response?: { error?: { message?: string } } };
        const msg = translateError(data?.whop_response?.error?.message) || data?.detail || `Error ${err.status}`;
        toast.error(msg);
      } else {
        toast.error('Error de red');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Solo mem_*, po_*, sub_* tienen sentido
  const supported =
    subscriptionId.startsWith('mem_') ||
    subscriptionId.startsWith('po_') ||
    subscriptionId.startsWith('sub_');
  if (!supported) return null;

  return (
    <>
      {/* Banner si hay pausa activa */}
      {!loading && active && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-200">
              <Pause className="h-4 w-4" />
              Suscripción pausada hasta {formatDate(active.pause_until)}
              <span className="text-xs font-normal opacity-80">
                ({daysRemaining(active.pause_until)} días restantes)
              </span>
            </div>
            {active.reason && (
              <div className="mt-0.5 truncate text-xs text-amber-700/80 dark:text-amber-200/70">
                Motivo: {active.reason}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={submitResume}
            disabled={submitting}
            className="shrink-0 border-amber-400/50 text-amber-700 hover:bg-amber-500/20 dark:text-amber-200"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            <span className="ml-1">Reanudar</span>
          </Button>
        </div>
      )}

      {/* Botón pausar (solo si NO hay pausa activa) */}
      {!loading && !active && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPauseOpen(true)}
          className="gap-1.5"
        >
          <Pause className="h-3.5 w-3.5" />
          Pausar suscripción
        </Button>
      )}

      {/* Modal pausa */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar suscripción</DialogTitle>
            <DialogDescription>
              Mientras esté pausada, los cobros automáticos no se ejecutarán.
              Se reactiva sola al cumplir los días o con el botón Reanudar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="pause-days">Días de pausa (1–{MAX_PAUSE_DAYS})</Label>
              <Input
                id="pause-days"
                type="number"
                min={1}
                max={MAX_PAUSE_DAYS}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="Ej. 7"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pause-reason">Motivo (opcional)</Label>
              <Textarea
                id="pause-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Cliente se va de viaje, problema temporal, etc."
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-50/50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div>
                Cobros pendientes/past-due se anularán al pausar. Al reanudar,
                vuelven los cobros del próximo ciclo.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitPause} disabled={submitting || !days}>
              {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className={submitting ? 'ml-2' : ''}>Pausar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
