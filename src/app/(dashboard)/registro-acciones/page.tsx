'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  FilterX,
  History,
  Info,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { auditApi } from '@/lib/audit-api';
import type { ActivityLogEntry, AuditFilters, AuditMetadata } from '@/lib/audit-types';
import { cn } from '@/lib/utils';

const MODULE_STYLES: Record<string, string> = {
  mora: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  recobros: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  mentorias: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  empleados: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  integraciones: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  default: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};

const PAGE_SIZE = 50;

function defaultFilters(sp: URLSearchParams): AuditFilters {
  return {
    module: sp.get('module') || 'all',
    role: sp.get('role') || 'all',
    user_email: sp.get('user_email') || 'all',
    platform: sp.get('platform') || 'all',
    result: sp.get('result') || 'all',
    action_type: sp.get('action_type') || 'all',
    search: sp.get('search') || '',
    page: Math.max(1, Number(sp.get('page')) || 1),
  };
}

export default function RegistroAccionesPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [filters, setFilters] = useState<AuditFilters>(() => defaultFilters(sp));
  const [metadata, setMetadata] = useState<AuditMetadata | null>(null);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityLogEntry | null>(null);

  // Sync filters → URL
  const pushFilters = (next: AuditFilters) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v !== '' && v !== 'all' && v !== 1) q.set(k, String(v));
    }
    router.push(`/registro-acciones${q.toString() ? `?${q}` : ''}`);
  };

  // Carga metadata una vez
  useEffect(() => {
    auditApi
      .metadata()
      .then(setMetadata)
      .catch(() => toast.error('Error cargando metadata'));
  }, []);

  // Fetch con debounce 300ms
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await auditApi.logs({
          module: filters.module,
          role: filters.role,
          user_email: filters.user_email,
          platform: filters.platform,
          result: filters.result,
          action_type: filters.action_type,
          search: filters.search,
          page: filters.page,
          page_size: PAGE_SIZE,
        });
        setLogs(r.results);
        setTotal(r.total_count);
      } catch {
        toast.error('Error cargando log');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.module,
    filters.role,
    filters.user_email,
    filters.platform,
    filters.result,
    filters.action_type,
    filters.search,
    filters.page,
  ]);

  // Sync → URL en cambios
  useEffect(() => {
    pushFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const update = useCallback((patch: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const clear = () =>
    setFilters({
      module: 'all',
      role: 'all',
      user_email: 'all',
      platform: 'all',
      result: 'all',
      action_type: 'all',
      search: '',
      page: 1,
    });

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Registro de Acciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auditoría unificada de todas las operaciones realizadas en la plataforma.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span>Filtros de Auditoría</span>
            <Button variant="ghost" size="sm" onClick={clear}>
              <FilterX className="h-3.5 w-3.5" />
              Limpiar Filtros
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-7">
            <LabeledSelect
              label="Módulo"
              value={filters.module}
              onChange={(v) => update({ module: v })}
              options={[
                { value: 'all', label: 'Todos los módulos' },
                ...(metadata?.modules || []).map((m) => ({ value: m, label: m })),
              ]}
            />
            <LabeledSelect
              label="Rol"
              value={filters.role}
              onChange={(v) => update({ role: v })}
              options={[
                { value: 'all', label: 'Todos los roles' },
                ...(metadata?.roles || []).map((r) => ({ value: r, label: r })),
              ]}
            />
            <LabeledSelect
              label="Operario"
              value={filters.user_email}
              onChange={(v) => update({ user_email: v })}
              options={[
                { value: 'all', label: 'Todos los operarios' },
                ...(metadata?.users || []).map((u) => ({
                  value: u.email,
                  label: u.name || u.email,
                })),
              ]}
            />
            <LabeledSelect
              label="Plataforma"
              value={filters.platform}
              onChange={(v) => update({ platform: v })}
              options={[
                { value: 'all', label: 'Todas' },
                ...(metadata?.platforms || []).map((p) => ({ value: p, label: p })),
              ]}
            />
            <LabeledSelect
              label="Resultado"
              value={filters.result}
              onChange={(v) => update({ result: v })}
              options={[
                { value: 'all', label: 'Todos' },
                ...(metadata?.results || []).map((r) => ({ value: r, label: r })),
              ]}
            />
            <LabeledSelect
              label="Tipo de Acción"
              value={filters.action_type}
              onChange={(v) => update({ action_type: v })}
              options={[
                { value: 'all', label: 'Todas' },
                ...(metadata?.commonActions || []).map((a) => ({
                  value: a,
                  label: a.replace(/_/g, ' '),
                })),
              ]}
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Búsqueda</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={filters.search}
                  onChange={(e) => update({ search: e.target.value })}
                  placeholder="Cliente, email..."
                  className="h-8 pl-7"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Módulo / Acción</TableHead>
                <TableHead>Operario / Rol</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="w-16 text-center">Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Sin registros con esos filtros.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap font-mono text-[11px]" suppressHydrationWarning>
                      <div>
                        {(() => {
                          try {
                            return format(parseISO(log.fecha), 'dd MMM yyyy', { locale: es });
                          } catch {
                            return '—';
                          }
                        })()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {(() => {
                          try {
                            return format(parseISO(log.fecha), 'HH:mm:ss');
                          } catch {
                            return '';
                          }
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'text-[10px] font-medium',
                          MODULE_STYLES[log.modulo] || MODULE_STYLES.default,
                        )}
                      >
                        {log.modulo}
                      </Badge>
                      <div className="mt-0.5 text-xs">
                        {log.tipo_accion.replace(/_/g, ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <UserIcon className="h-3 w-3 text-slate-400" />
                        {log.usuario_nombre}
                      </div>
                      <div className="font-mono text-[10px] italic text-muted-foreground">
                        {log.usuario_email}
                      </div>
                      <div className="text-[10px] font-bold text-primary/80">
                        {log.usuario_rol}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.cliente_nombre ? (
                        <>
                          <div className="text-sm">{log.cliente_nombre}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {log.cliente_id}
                          </div>
                        </>
                      ) : (
                        <span className="italic text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {log.plataforma || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="max-w-[150px] truncate text-xs"
                      title={log.resultado}
                    >
                      <span
                        className={cn(
                          log.resultado === 'SUCCESS' && 'text-emerald-600',
                          log.resultado === 'FAILURE' && 'text-rose-600',
                        )}
                      >
                        {log.resultado}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setSelected(log)}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-slate-200 p-3 text-xs dark:border-slate-800">
            <span className="text-muted-foreground">
              Mostrando <b>{logs.length}</b> de <b>{total}</b> resultados
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() => update({ page: Math.max(1, filters.page - 1) })}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
              <span className="tabular-nums text-muted-foreground">
                Página {filters.page} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={filters.page >= totalPages}
                onClick={() => update({ page: Math.min(totalPages, filters.page + 1) })}
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailsDialog log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v || 'all')}>
        <SelectTrigger className="h-8 w-full" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DetailsDialog({
  log,
  onClose,
}: {
  log: ActivityLogEntry | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!log} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Detalles de la Acción
          </DialogTitle>
          <DialogDescription>
            Información técnica completa registrada para este evento.
          </DialogDescription>
        </DialogHeader>

        {log && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoBlock title="General">
                <InfoLine label="ID Evento" value={log.id} mono />
                <InfoLine label="ID Cliente" value={log.cliente_id || 'N/A'} mono />
                <InfoLine label="Módulo" value={log.modulo} />
                <InfoLine label="Plataforma" value={log.plataforma || '—'} />
              </InfoBlock>
              <InfoBlock title="Trazabilidad">
                <InfoLine
                  label="Fecha"
                  value={(() => {
                    try {
                      return format(parseISO(log.fecha), 'PPPpp', { locale: es });
                    } catch {
                      return log.fecha;
                    }
                  })()}
                />
                <InfoLine label="Operario" value={log.usuario_nombre} />
                <InfoLine label="Email" value={log.usuario_email} mono />
                <InfoLine label="Rol" value={log.usuario_rol} />
              </InfoBlock>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payload / Comentarios
              </p>
              <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] text-slate-50">
                {JSON.stringify(log.detalles, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('truncate text-right', mono && 'font-mono')} title={value}>
        {value}
      </span>
    </div>
  );
}
