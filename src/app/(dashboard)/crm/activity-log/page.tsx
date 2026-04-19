'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ScrollText } from 'lucide-react';
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
import { crmApi, type CrmActivity } from '@/lib/crm-api';

const ACTION_BADGES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-rose-100 text-rose-800 border-rose-200',
  stage_change: 'bg-purple-100 text-purple-800 border-purple-200',
  assign: 'bg-amber-100 text-amber-800 border-amber-200',
  note: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  backfill: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

function formatDate(iso: string): string {
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

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stringifyDetails(d: Record<string, unknown>): string {
  if (!d || Object.keys(d).length === 0) return '—';
  try {
    const s = JSON.stringify(d);
    return s.length > 80 ? `${s.slice(0, 80)}...` : s;
  } catch {
    return '—';
  }
}

export default function CrmActivityLogPage() {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setActivities(await crmApi.activityLog(200));
    } catch {
      toast.error('Error cargando audit trail');
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
          <h1 className="text-3xl font-bold tracking-tight">Registro de Actividad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit trail de todas las acciones realizadas en el CRM.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <ScrollText className="h-3.5 w-3.5" />
          {activities.length} registros
        </Badge>
      </header>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 180 }}>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Detalles</TableHead>
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
            {!loading && activities.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No hay actividad registrada.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              activities.map((a) => {
                const contactName = a.crm_contacts?.full_name;
                const userName = a.profiles?.full_name || 'Sistema';
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{formatDate(a.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {initials(userName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ACTION_BADGES[a.action] ||
                          'bg-zinc-100 text-zinc-800 border-zinc-200'
                        }`}
                      >
                        {a.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{capitalize(a.entity_type || '')}</TableCell>
                    <TableCell>
                      {contactName && a.entity_id ? (
                        <Link
                          href={`/crm/contacts/${a.entity_id}`}
                          className="text-sm hover:underline"
                        >
                          {contactName}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate font-mono text-[11px] text-muted-foreground">
                      {stringifyDetails(a.details || {})}
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
