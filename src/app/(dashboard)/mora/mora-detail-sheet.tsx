'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { MORA_STATUSES, type MoraTracking } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Lock,
  LockOpen,
  Mail,
  Phone,
  MessageCircle,
  StickyNote,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  trackingId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const CHANNEL_ICON = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  chatwoot: MessageCircle,
  note: StickyNote,
} as const;

const ACTION_STATUS_ICON = {
  success: CheckCircle2,
  failed: XCircle,
  pending: Clock,
} as const;

const ACTION_STATUS_COLOR = {
  success: 'text-emerald-600 dark:text-emerald-400',
  failed: 'text-red-600 dark:text-red-400',
  pending: 'text-amber-600 dark:text-amber-400',
} as const;

export function MoraDetailSheet({ trackingId, open, onClose, onUpdate }: Props) {
  const [tracking, setTracking] = useState<MoraTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [locking, setLocking] = useState(false);

  const load = async () => {
    if (!trackingId) return;
    setLoading(true);
    try {
      const data = await api.get<MoraTracking>(`/api/v1/mora-tracking/${trackingId}/`);
      setTracking(data);
    } catch {
      toast.error('Error cargando detalle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trackingId && open) load();
    else setTracking(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingId, open]);

  const toggleLock = async () => {
    if (!tracking) return;
    setLocking(true);
    try {
      const action = tracking.is_locked ? 'unlock' : 'lock';
      const data = await api.post<MoraTracking>(
        `/api/v1/mora-tracking/${tracking.id}/${action}/`,
      );
      setTracking(data);
      toast.success(action === 'lock' ? 'Bloqueado por 2 min' : 'Liberado');
      onUpdate?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        const d = err.data as { locked_by?: string };
        toast.error(`Ya bloqueado por ${d.locked_by || 'otro operario'}`);
      } else {
        toast.error('Error al cambiar lock');
      }
    } finally {
      setLocking(false);
    }
  };

  const changeStatus = async (newStatus: string) => {
    if (!tracking || newStatus === tracking.status) return;
    setSavingStatus(true);
    try {
      const data = await api.patch<MoraTracking>(
        `/api/v1/mora-tracking/${tracking.id}/`,
        { status: newStatus },
      );
      setTracking(data);
      toast.success(`Estado actualizado a "${newStatus}"`);
      onUpdate?.();
    } catch {
      toast.error('Error al actualizar estado');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl p-0">
        <SheetHeader className="border-b border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-2xl truncate">
                {loading && !tracking ? <Skeleton className="h-7 w-48" /> : tracking?.customer_name || '—'}
              </SheetTitle>
              <SheetDescription className="truncate">
                {tracking?.customer_email}
              </SheetDescription>
            </div>
            {tracking && (
              <Button
                variant={tracking.is_locked ? 'outline' : 'default'}
                size="sm"
                onClick={toggleLock}
                disabled={locking}
              >
                {locking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : tracking.is_locked ? (
                  <>
                    <LockOpen className="h-4 w-4" />
                    Liberar
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Bloquear 2min
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {loading && !tracking && <Skeleton className="h-32 w-full" />}

          {tracking && (
            <>
              {tracking.is_locked && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  <Lock className="h-4 w-4" />
                  Bloqueado por <strong>{tracking.locked_by_name}</strong>
                </div>
              )}

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={tracking.status}
                  onValueChange={(v) => v && changeStatus(v)}
                  disabled={savingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MORA_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-500">Contactado por</Label>
                  <p className="text-sm font-medium mt-1">{tracking.contacted_by_name || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Continuar con</Label>
                  <p className="text-sm font-medium mt-1">{tracking.continue_with || '—'}</p>
                </div>
              </div>

              {(tracking.comment_1 || tracking.comment_2) && (
                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  {tracking.comment_1 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                      {tracking.comment_1}
                    </div>
                  )}
                  {tracking.comment_2 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                      {tracking.comment_2}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <Tabs defaultValue="interactions">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="interactions">
                    Interacciones ({tracking.interactions?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="actions">
                    Acciones ({tracking.recent_actions?.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="interactions" className="mt-4 space-y-3">
                  <NewInteractionForm
                    trackingId={tracking.id}
                    onCreated={() => {
                      load();
                      onUpdate?.();
                    }}
                  />
                  <div className="space-y-2">
                    {tracking.interactions?.length === 0 && (
                      <p className="py-4 text-center text-sm text-slate-500">Sin interacciones</p>
                    )}
                    {tracking.interactions?.map((i) => {
                      const Icon = CHANNEL_ICON[i.channel] || MessageCircle;
                      return (
                        <div
                          key={i.id}
                          className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                        >
                          <Icon className="h-4 w-4 mt-0.5 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Badge variant="outline" className="text-[10px]">
                                {i.channel}
                              </Badge>
                              <span>{i.created_by_name || 'Sistema'}</span>
                              <span>·</span>
                              <span>{new Date(i.created_at).toLocaleString('es-ES')}</span>
                            </div>
                            <p className="mt-1 text-sm">{i.summary}</p>
                            {i.outcome && (
                              <p className="mt-1 text-xs text-slate-500">→ {i.outcome}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="mt-4 space-y-2">
                  {tracking.recent_actions?.length === 0 && (
                    <p className="py-4 text-center text-sm text-slate-500">Sin acciones</p>
                  )}
                  {tracking.recent_actions?.map((a) => {
                    const StatusIcon = ACTION_STATUS_ICON[a.status] || Clock;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                      >
                        <StatusIcon className={cn('h-4 w-4', ACTION_STATUS_COLOR[a.status])} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{a.action_type}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {a.platform}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {a.performed_by_name || 'Sistema'} · {new Date(a.created_at).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NewInteractionForm({
  trackingId,
  onCreated,
}: {
  trackingId: string;
  onCreated: () => void;
}) {
  const [channel, setChannel] = useState('phone');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;
    setSaving(true);
    try {
      await api.post('/api/v1/mora-interactions/', {
        tracking: trackingId,
        channel,
        summary,
        outcome,
      });
      setSummary('');
      setOutcome('');
      toast.success('Interacción registrada');
      onCreated();
    } catch {
      toast.error('Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Nueva interacción
      </p>
      <div className="flex gap-2">
        <Select value={channel} onValueChange={(v) => setChannel(v || 'phone')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">Teléfono</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="chatwoot">Chatwoot</SelectItem>
            <SelectItem value="note">Nota</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Resultado (opcional)"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="flex-1"
        />
      </div>
      <Textarea
        placeholder="Resumen de la interacción..."
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={2}
        required
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving || !summary.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}
