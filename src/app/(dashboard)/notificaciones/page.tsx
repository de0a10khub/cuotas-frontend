'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItem {
  key: string;
  label: string;
  count: number;
  severity: 'warning' | 'error' | 'info';
  href: string;
}

const severityClasses: Record<string, string> = {
  warning: 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/20',
  error: 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20',
  info: 'border-l-sky-400 bg-sky-50/50 dark:bg-sky-950/20',
};

export default function NotificacionesPage() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api
      .get<{ items: NotificationItem[]; total_count: number }>('/api/v1/notifications/system/summary/')
      .then((d) => {
        setItems(d.items || []);
        setTotal(d.total_count || 0);
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pendientes del sistema que requieren tu atención.
          </p>
        </div>
      </header>

      {items === null ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-lg font-semibold">Todo al día</p>
            <p className="text-sm text-muted-foreground">No hay notificaciones pendientes.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.key}>
              <Link
                href={it.href}
                className={cn(
                  'flex items-center justify-between rounded-lg border-l-4 border-y border-r bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60',
                  severityClasses[it.severity] || severityClasses.info,
                )}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={cn(
                      'h-5 w-5',
                      it.severity === 'warning' && 'text-amber-500',
                      it.severity === 'error' && 'text-rose-500',
                      it.severity === 'info' && 'text-sky-500',
                    )}
                  />
                  <div>
                    <p className="font-semibold">{it.label}</p>
                    <p className="text-xs text-muted-foreground">{it.count} elemento{it.count === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Total pendiente: {total}
        </p>
      )}
    </div>
  );
}
