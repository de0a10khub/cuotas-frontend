'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Receipt,
  ShieldAlert,
  Users,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardsApi, type HomeSummary } from '@/lib/dashboards-api';
import { useAuth } from '@/lib/auth-context';

function fmtEur(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n || 0);
}

function fmtDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 60000);
    if (diff < 1) return 'ahora';
    if (diff < 60) return `${diff} min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

const SHORTCUTS = [
  { label: 'Clientes', href: '/clientes', icon: Users, color: 'bg-blue-100 text-blue-600' },
  { label: 'Mora', href: '/mora', icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  { label: 'Cobros', href: '/cobros', icon: Receipt, color: 'bg-emerald-100 text-emerald-600' },
  { label: 'Riesgos', href: '/riesgos', icon: ShieldAlert, color: 'bg-rose-100 text-rose-600' },
];

export default function HomePage() {
  const { profile } = useAuth();
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardsApi
      .home()
      .then(setData)
      .catch(() => toast.error('Error cargando resumen'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenida{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen general del sistema.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          iconClass="bg-blue-100 text-blue-600"
          label="Clientes"
          value={loading ? '—' : String(data?.kpis.total_customers ?? 0)}
          loading={loading}
        />
        <Kpi
          icon={Wallet}
          iconClass="bg-emerald-100 text-emerald-600"
          label="Cash cobrado"
          value={loading ? '—' : fmtEur(data?.kpis.cash_collected_eur ?? 0)}
          loading={loading}
        />
        <Kpi
          icon={AlertTriangle}
          iconClass="bg-amber-100 text-amber-600"
          label="Deuda pendiente"
          value={loading ? '—' : fmtEur(data?.kpis.total_debt_eur ?? 0)}
          loading={loading}
          valueClass="text-amber-600"
        />
        <Kpi
          icon={ShieldAlert}
          iconClass="bg-rose-100 text-rose-600"
          label="Disputas abiertas"
          value={loading ? '—' : String(data?.kpis.open_disputes ?? 0)}
          loading={loading}
          valueClass={data && data.kpis.open_disputes > 0 ? 'text-rose-600' : ''}
        />
      </section>

      {/* Shortcuts */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SHORTCUTS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn('rounded-md p-2', s.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">Abrir →</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Actividad reciente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Actividad reciente</CardTitle>
          <Link
            href="/registro-acciones"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver todo
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {!loading && (!data || data.recent_activity.length === 0) && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Sin actividad reciente.
            </p>
          )}
          {!loading && data && data.recent_activity.length > 0 && (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.recent_activity.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-medium uppercase',
                      e.modulo === 'mora' && 'bg-orange-100 text-orange-700',
                      e.modulo === 'recobros' && 'bg-rose-100 text-rose-700',
                      e.modulo === 'mentorias' && 'bg-blue-100 text-blue-700',
                    )}
                  >
                    {e.modulo}
                  </Badge>
                  <span className="font-mono text-xs">{e.tipo_accion.replace(/_/g, ' ')}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {e.cliente_nombre || '—'} · {e.usuario_nombre}
                  </span>
                  <span
                    className={cn(
                      'text-xs',
                      e.resultado === 'SUCCESS' && 'text-emerald-600',
                      e.resultado === 'FAILURE' && 'text-rose-600',
                    )}
                  >
                    {e.resultado}
                  </span>
                  <span className="w-16 text-right text-[11px] text-muted-foreground" suppressHydrationWarning>
                    {fmtDateShort(e.fecha)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  iconClass,
  label,
  value,
  loading,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string;
  loading?: boolean;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className={cn('rounded-md p-1.5', iconClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={cn('text-2xl font-bold tabular-nums tracking-tight', valueClass)}>
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
