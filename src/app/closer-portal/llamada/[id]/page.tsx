'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  closerPortalApi,
  getCloserSessionToken,
  type Meeting,
} from '@/lib/closers-api';

export default function LlamadaFillPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [attendance, setAttendance] = useState<'attended' | 'no_show' | ''>('');
  const [saleStatus, setSaleStatus] = useState<'yes' | 'no' | ''>('');
  const [lossReason, setLossReason] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!getCloserSessionToken()) {
      router.replace('/closer-portal');
      return;
    }
    closerPortalApi
      .meeting(id)
      .then((m) => {
        setMeeting(m);
        setAttendance((m.attendance as '' | 'attended' | 'no_show') || '');
        setSaleStatus((m.sale_status as '' | 'yes' | 'no') || '');
        setLossReason(m.loss_reason || '');
        setComment(m.closer_comment || '');
      })
      .catch(() => toast.error('Reunión no encontrada'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const submit = async () => {
    if (!attendance) {
      toast.error('Marca si atendió o no');
      return;
    }
    setSaving(true);
    try {
      await closerPortalApi.fillMeeting(id, {
        attendance,
        sale_status: saleStatus || undefined,
        loss_reason: lossReason || undefined,
        closer_comment: comment || undefined,
      });
      toast.success('Reunión actualizada');
      router.replace('/closer-portal/calendario');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !meeting) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const c = meeting.crm_contacts;
  const name = c ? `${c.first_name} ${c.last_name}` : '—';

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Link
        href="/closer-portal/calendario"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al calendario
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {meeting.event_type_name || meeting.title} · {meeting.duration_minutes} min
          </p>
          <p className="text-xs text-muted-foreground">{c?.email}</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado de la llamada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Asistencia</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAttendance('attended')}
                className={cn(
                  'flex items-center gap-2 rounded-md border-2 p-3 text-sm transition-colors',
                  attendance === 'attended'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                Atendió
              </button>
              <button
                type="button"
                onClick={() => setAttendance('no_show')}
                className={cn(
                  'flex items-center gap-2 rounded-md border-2 p-3 text-sm transition-colors',
                  attendance === 'no_show'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
                )}
              >
                <XCircle className="h-4 w-4" />
                No show
              </button>
            </div>
          </div>

          {attendance === 'attended' && (
            <div>
              <Label className="mb-2 block">¿Hubo venta?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSaleStatus('yes')}
                  className={cn(
                    'rounded-md border-2 p-3 text-sm font-semibold transition-colors',
                    saleStatus === 'yes'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
                  )}
                >
                  Sí, cerró venta
                </button>
                <button
                  type="button"
                  onClick={() => setSaleStatus('no')}
                  className={cn(
                    'rounded-md border-2 p-3 text-sm transition-colors',
                    saleStatus === 'no'
                      ? 'border-slate-500 bg-slate-50 text-slate-700 dark:bg-slate-900/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
                  )}
                >
                  No vendida
                </button>
              </div>
            </div>
          )}

          {attendance === 'attended' && saleStatus === 'no' && (
            <div>
              <Label>Motivo de pérdida</Label>
              <Textarea
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                placeholder="Precio, duda, etc."
                rows={2}
              />
            </div>
          )}

          <div>
            <Label>Comentario del closer</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Detalles de la llamada, seguimiento..."
              rows={4}
            />
          </div>

          <Button
            onClick={submit}
            disabled={saving || !attendance}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {saving ? 'Guardando...' : 'Guardar resultado'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
