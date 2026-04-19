'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { webhookErrorsApi, type WebhookError } from '@/lib/webhook-errors-api';

export default function WebhooksPage() {
  const [errors, setErrors] = useState<WebhookError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState(false);
  const [payloadOpen, setPayloadOpen] = useState<WebhookError | null>(null);
  const [payloadData, setPayloadData] = useState<Record<string, unknown> | null>(null);
  const [loadingPayload, setLoadingPayload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await webhookErrorsApi.list();
      setErrors(r.results);
      setSelected(new Set());
    } catch {
      toast.error('Error cargando errores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === errors.length ? new Set() : new Set(errors.map((e) => e.id)),
    );
  };

  const retryOne = async (e: WebhookError) => {
    setRetrying(true);
    try {
      await webhookErrorsApi.retry(e.id);
      toast.success('Webhook reenviado a reprocesado');
      setErrors((prev) => prev.filter((x) => x.id !== e.id));
    } catch {
      toast.error('Error al reintentar');
    } finally {
      setRetrying(false);
    }
  };

  const retryBatch = async () => {
    if (selected.size === 0) return;
    setRetrying(true);
    try {
      const r = await webhookErrorsApi.retryBatch(Array.from(selected));
      toast.success(`${r.retried} eventos enviados a reprocesado`);
      await load();
    } catch {
      toast.error('Error en reintento masivo');
    } finally {
      setRetrying(false);
    }
  };

  const openPayload = async (e: WebhookError) => {
    setPayloadOpen(e);
    setPayloadData(null);
    setLoadingPayload(true);
    try {
      const r = await webhookErrorsApi.payload(e.id);
      setPayloadData(r.payload);
    } catch {
      toast.error('Error cargando payload');
    } finally {
      setLoadingPayload(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Monitor de Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seguimiento de eventos de Stripe y errores de procesamiento.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            {errors.length} errores pendientes de procesar
          </CardTitle>
          <Button
            size="sm"
            onClick={retryBatch}
            disabled={selected.size === 0 || retrying}
          >
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reprocesar seleccionados ({selected.size})
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={errors.length > 0 && selected.size === errors.length}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer"
                  />
                </TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && errors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    ✓ Sin errores de procesamiento pendientes.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                errors.map((e) => (
                  <TableRow key={e.id} className={cn(selected.has(e.id) && 'bg-primary/5')}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs" suppressHydrationWarning>
                      {new Date(e.created_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {e.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-xs text-rose-700 dark:text-rose-300" title={e.processing_error}>
                      {e.processing_error}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon-sm" variant="ghost" onClick={() => openPayload(e)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={retrying}
                        onClick={() => retryOne(e)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!payloadOpen} onOpenChange={(v) => !v && setPayloadOpen(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payload · {payloadOpen?.type}</DialogTitle>
          </DialogHeader>
          {loadingPayload ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] text-slate-50">
              {payloadData ? JSON.stringify(payloadData, null, 2) : ''}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
