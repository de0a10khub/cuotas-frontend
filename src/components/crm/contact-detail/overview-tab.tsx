'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CrmContact, CrmActivity, CrmTask, CrmNote } from '@/lib/crm-api';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OverviewTab({
  contact,
  activities,
  tasks,
  notes,
}: {
  contact: CrmContact;
  activities: CrmActivity[];
  tasks: CrmTask[];
  notes: CrmNote[];
}) {
  const recentActivity = activities.slice(0, 5);
  const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
  const recentNote = notes[0] || null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimas actividades</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">Sin actividad.</p>
            ) : (
              <ul className="space-y-2">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">
                      {a.action}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p>
                        {a.profiles?.full_name || 'Sistema'} — {a.entity_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(a.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {recentNote && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Nota más reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{recentNote.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {recentNote.created_by_name} · {formatDateTime(recentNote.created_at)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tareas pendientes</p>
            <p className="text-2xl font-bold">{pendingTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Notas totales</p>
            <p className="text-2xl font-bold">{notes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Estado actual</p>
            <p className="text-lg font-semibold capitalize">{contact.status}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Origen</p>
            <p className="text-lg font-semibold capitalize">{contact.source}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
