'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Clock, User, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { crmApi, type CrmMeeting } from '@/lib/crm-api';

type StatusKey = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; className: string }
> = {
  scheduled: {
    label: 'Programada',
    className: 'border-blue-500 text-blue-700 bg-transparent dark:text-blue-400',
  },
  completed: {
    label: 'Completada',
    className: 'bg-emerald-600 border-transparent text-white',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-destructive text-destructive-foreground border-transparent',
  },
  no_show: {
    label: 'No Show',
    className: 'bg-amber-600 border-transparent text-white',
  },
};

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '') || '??').toUpperCase();
}

export default function CrmMeetingsPage() {
  const [rows, setRows] = useState<CrmMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await crmApi.meetings());
    } catch {
      toast.error('Error cargando reuniones');
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
          <h1 className="text-3xl font-bold tracking-tight">Reuniones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona las reuniones programadas del equipo comercial.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {rows.length} reuniones
        </Badge>
      </header>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contacto</TableHead>
              <TableHead>Closer</TableHead>
              <TableHead>Fecha / Hora</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  <Video className="mx-auto mb-2 h-5 w-5 opacity-40" />
                  No hay reuniones registradas.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((m) => {
                const cname = m.crm_contacts
                  ? `${m.crm_contacts.first_name} ${m.crm_contacts.last_name}`
                  : '—';
                const cfg = STATUS_CONFIG[m.status as StatusKey] || STATUS_CONFIG.scheduled;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">
                            {initials(cname)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{cname}</p>
                          {m.crm_contacts?.email && (
                            <p className="text-[10px] text-muted-foreground">
                              {m.crm_contacts.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.assigned ? (
                        <span className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {m.assigned.full_name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDateTime(m.scheduled_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {m.duration_minutes} min
                      </span>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{m.meeting_type}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${cfg.className}`} variant="outline">
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.outcome}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
