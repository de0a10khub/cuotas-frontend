'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Users, Euro, CheckSquare, Calendar, Activity, ArrowRight, UserPlus, ListTodo,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { crmApi, type CrmStats, type CrmActivity } from '@/lib/crm-api';

function formatEur(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatAction(a: string): string {
  return a.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '') || '??').toUpperCase();
}

function formatRelDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function CrmDashboardPage() {
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [activity, setActivity] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([crmApi.stats(), crmApi.recentActivity(10)]);
      setStats(s);
      setActivity(a);
    } catch {
      toast.error('Error cargando CRM');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bienvenido al panel de gestión de clientes.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
          <>
            <KpiCard
              label="Contactos Activos"
              value={stats.totalContacts.toString()}
              sub="Total registrados"
              icon={<Users className="h-4 w-4 text-indigo-600" />}
              bg="bg-indigo-100 dark:bg-indigo-950"
            />
            <KpiCard
              label="Valor Pipeline"
              value={formatEur(stats.pipelineValue)}
              sub="En ventas pendientes"
              icon={<Euro className="h-4 w-4 text-emerald-600" />}
              bg="bg-emerald-100 dark:bg-emerald-950"
            />
            <KpiCard
              label="Tareas Pendientes"
              value={stats.pendingTasks.toString()}
              sub="Asignadas a ti"
              icon={<CheckSquare className="h-4 w-4 text-amber-600" />}
              bg="bg-amber-100 dark:bg-amber-950"
            />
            <KpiCard
              label="Reuniones Hoy"
              value={stats.meetingsToday.toString()}
              sub="Programadas para hoy"
              icon={<Calendar className="h-4 w-4 text-sky-600" />}
              bg="bg-sky-100 dark:bg-sky-950"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="mb-2 h-12 w-full" />
              ))}
            {!loading && activity.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No hay actividad reciente.
              </p>
            )}
            {!loading && (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {initials(a.profiles?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{formatAction(a.action)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.profiles?.full_name || 'Sistema'} sobre{' '}
                        {a.crm_contacts?.full_name ||
                          (a.entity_type ? `entidad ${a.entity_type}` : 'desconocida')}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelDate(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Shortcut href="/crm/contacts" icon={<UserPlus className="h-4 w-4" />} label="Crear Contacto" />
            <Shortcut href="/crm/pipeline" icon={<ListTodo className="h-4 w-4" />} label="Ver Pipeline" />
            <Shortcut href="/crm/contacts" icon={<Users className="h-4 w-4" />} label="Gestionar Contactos" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  bg,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className={`rounded-md ${bg} p-1.5`}>{icon}</div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Shortcut({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 text-sm hover:border-border hover:bg-muted"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}
