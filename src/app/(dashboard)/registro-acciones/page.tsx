'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MoraActionLog, Paginated } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Search, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_ICON = {
  success: CheckCircle2,
  failed: XCircle,
  pending: Clock,
} as const;

const STATUS_TONE: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

const PLATFORM_COLOR: Record<string, string> = {
  stripe: 'text-purple-600 dark:text-purple-400',
  whop: 'text-blue-600 dark:text-blue-400',
  manual: 'text-slate-600 dark:text-slate-400',
};

export default function RegistroAccionesPage() {
  const [data, setData] = useState<Paginated<MoraActionLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced) params.set('search', debounced);
    if (actionType !== 'all') params.set('action_type', actionType);
    if (platform !== 'all') params.set('platform', platform);
    if (status !== 'all') params.set('status', status);
    setLoading(true);
    api
      .get<Paginated<MoraActionLog>>(`/api/v1/mora-actions/?${params}`)
      .then(setData)
      .catch(() => toast.error('Error cargando registro'))
      .finally(() => setLoading(false));
  }, [debounced, actionType, platform, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalByStatus = data?.results.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Registro de acciones</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {data ? `${data.count} acciones registradas` : 'Cargando...'} · Auditoría de retries, cambios de estado y recoveries manuales
        </p>
      </header>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <MiniCounter
            label="Éxitos"
            value={totalByStatus?.success ?? 0}
            icon={CheckCircle2}
            tone="success"
          />
          <MiniCounter
            label="Fallidas"
            value={totalByStatus?.failed ?? 0}
            icon={XCircle}
            tone="danger"
          />
          <MiniCounter
            label="Pendientes"
            value={totalByStatus?.pending ?? 0}
            icon={Clock}
            tone="warning"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente..."
            className="pl-9"
          />
        </div>
        <Select value={actionType} onValueChange={(v) => setActionType(v || 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="retry_payment">Retry payment</SelectItem>
            <SelectItem value="manual_recovery">Manual recovery</SelectItem>
            <SelectItem value="status_change">Cambio estado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={(v) => setPlatform(v || 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="whop">Whop</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v || 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Éxito</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acción</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ejecutado por</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            )}
            {data?.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <History className="h-10 w-10" />
                    <p>Sin acciones con esos filtros</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {data?.results.map((a) => {
              const StatusIcon = STATUS_ICON[a.status] || Clock;
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium font-mono text-sm">{a.action_type}</TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono">
                    {a.customer.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-xs font-medium', PLATFORM_COLOR[a.platform])}>
                      {a.platform}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('font-medium gap-1', STATUS_TONE[a.status])}>
                      <StatusIcon className="h-3 w-3" />
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">
                    {a.performed_by_name || 'Sistema'}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                    {new Date(a.created_at).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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

function MiniCounter({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'success' | 'warning' | 'danger';
}) {
  const color = {
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-background p-4 dark:border-slate-800">
      <Icon className={cn('h-5 w-5', color)} />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={cn('text-2xl font-bold', color)}>{value}</p>
      </div>
    </div>
  );
}
