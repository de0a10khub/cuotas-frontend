'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { crmApi, type CrmNotification } from '@/lib/crm-api';

const TYPE_LABELS: Record<string, string> = {
  task_assigned: 'Tarea asignada',
  stage_moved: 'Movimiento de pipeline',
  meeting_reminder: 'Recordatorio',
  mention: 'Mención',
  contact_created: 'Contacto creado',
};

const TYPE_COLORS: Record<string, string> = {
  task_assigned: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  stage_moved: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  meeting_reminder: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  mention: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  contact_created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
};

function relativeTime(iso: string): string {
  const diffMin = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${Math.round(diffMin)} min`;
  const h = diffMin / 60;
  if (h < 24) return `hace ${Math.round(h)} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function NotificationsList() {
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await crmApi.notifications('me'));
    } catch {
      toast.error('Error cargando notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markOne = async (id: string) => {
    setItems((arr) =>
      arr.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)),
    );
    try {
      await crmApi.markNotificationRead(id);
    } catch {
      toast.error('Error marcando leída');
      load();
    }
  };

  const markAll = async () => {
    try {
      const { updated } = await crmApi.markAllNotificationsRead();
      toast.success(`${updated} notificaciones marcadas como leídas`);
      load();
    } catch {
      toast.error('Error');
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-medium">
            {items.length} notificaciones
            {unread > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">
                {unread} sin leer
              </Badge>
            )}
          </span>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Marcar todo como leído
          </Button>
        )}
      </div>

      <div className="max-h-[calc(100vh-200px)] space-y-2 overflow-y-auto">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        {!loading && items.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
            No hay notificaciones.
          </div>
        )}
        {!loading &&
          items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-md border p-3 transition ${
                !n.read ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  TYPE_COLORS[n.type] || 'bg-muted'
                }`}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {TYPE_LABELS[n.type] || n.type}
                  </Badge>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="mt-1 text-sm">{n.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {relativeTime(n.created_at)}
                </p>
              </div>
              {!n.read && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 shrink-0"
                  onClick={() => markOne(n.id)}
                  title="Marcar como leída"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
