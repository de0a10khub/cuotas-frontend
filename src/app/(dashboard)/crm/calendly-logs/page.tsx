'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { History, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { crmApi, type CrmCalendlyLog } from '@/lib/crm-api';

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : `${s.slice(0, n)}...`;
}

export default function CrmCalendlyLogsPage() {
  const [logs, setLogs] = useState<CrmCalendlyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await crmApi.calendlyLogs());
    } catch {
      toast.error('Error cargando logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs de Calendly</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro forense de todos los webhooks recibidos desde Calendly.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <History className="h-3.5 w-3.5" />
          {logs.length} eventos
        </Badge>
      </header>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 180 }}>Fecha</TableHead>
              <TableHead style={{ width: 180 }}>Event ID</TableHead>
              <TableHead>Tipo de Evento</TableHead>
              <TableHead style={{ width: 100 }}>Procesado</TableHead>
              <TableHead>Error</TableHead>
              <TableHead style={{ width: 80 }} className="text-center">
                Reintentos
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  <History className="mx-auto mb-2 h-5 w-5" />
                  No hay logs de Calendly registrados.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{formatDate(l.created_at)}</TableCell>
                  <TableCell>
                    <code className="text-xs">{truncate(l.event_id, 20)}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {l.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.processed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-600" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                    {l.error || '—'}
                  </TableCell>
                  <TableCell className="text-center text-sm">{l.retry_count || 0}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
