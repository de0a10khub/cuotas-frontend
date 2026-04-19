'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { CrmTask } from '@/lib/crm-api';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function TasksTab({ tasks }: { tasks: CrmTask[] }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No hay tareas relacionadas con este contacto.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li
          key={t.id}
          className="flex items-center justify-between rounded-md border p-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p
              className={`font-medium ${
                t.status === 'completed' ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {t.title}
            </p>
            {t.description && (
              <p className="truncate text-xs text-muted-foreground">{t.description}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {t.profiles?.full_name || 'Sin asignar'} · Vence {formatDate(t.due_date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {t.priority}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {t.status}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
