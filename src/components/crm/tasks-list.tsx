'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Flag, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { crmApi, type CrmTask } from '@/lib/crm-api';
import { CreateTaskDialog } from './create-task-dialog';

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-600',
  high: 'text-amber-600',
  urgent: 'text-rose-600',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function TasksList() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [items, setItems] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await crmApi.tasks({
        assigned_to: 'me',
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: 1,
        limit: 100,
      });
      setItems(res.data);
    } catch {
      toast.error('Error cargando tareas');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Polling cada 30s (mock de realtime)
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const toggleStatus = async (task: CrmTask) => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    setItems((arr) =>
      arr.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
    );
    try {
      await crmApi.updateTaskStatus(task.id, next);
    } catch {
      toast.error('Error actualizando tarea');
      load();
    }
  };

  const onDelete = async (task: CrmTask) => {
    if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    try {
      await crmApi.deleteTask(task.id);
      toast.success('Tarea eliminada');
      load();
    } catch {
      toast.error('Error eliminando');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'pending')}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
        <CreateTaskDialog onCreated={load} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 50 }}></TableHead>
              <TableHead style={{ width: 300 }}>Título</TableHead>
              <TableHead>Relacionado con</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead style={{ width: 50 }}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No hay tareas.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              items.map((t) => (
                <TableRow key={t.id} className={t.status === 'completed' ? 'opacity-60' : ''}>
                  <TableCell>
                    <button
                      onClick={() => toggleStatus(t)}
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                      title="Toggle completada"
                    >
                      {t.status === 'completed' ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className={t.status === 'completed' ? 'line-through' : ''}>
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.description && (
                      <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.crm_contacts ? (
                      <Link
                        href={`/crm/contacts/${t.crm_contacts.id}`}
                        className="text-sm hover:underline"
                      >
                        {t.crm_contacts.full_name}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{t.profiles?.full_name || '—'}</TableCell>
                  <TableCell className="text-xs">{formatDate(t.due_date)}</TableCell>
                  <TableCell>
                    <span
                      className={`flex items-center gap-1 text-xs ${
                        PRIORITY_STYLES[t.priority] || ''
                      }`}
                    >
                      <Flag className="h-3 w-3" />
                      {t.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {STATUS_LABELS[t.status] || t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      onClick={() => onDelete(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
