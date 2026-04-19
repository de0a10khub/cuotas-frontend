'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, CreditCard, TrendingUp, Calendar } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminDataApi, type CustomerActivity } from '@/lib/admin-data-api';

const PLATFORM_COLORS: Record<string, string> = {
  stripe: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  whop_native: 'bg-purple-100 text-purple-800 border-purple-200',
  whop_erp: 'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  refunded: 'bg-amber-100 text-amber-700',
  pending: 'bg-slate-100 text-slate-700',
  disputed: 'bg-rose-100 text-rose-700',
  void: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
};

function formatEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format((cents || 0) / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CustomerActivityDrawer({
  email,
  open,
  onOpenChange,
  renderFooter,
}: {
  email: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  renderFooter?: () => React.ReactNode;
}) {
  const [data, setData] = useState<CustomerActivity | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setData(null);
    try {
      const d = await adminDataApi.customerActivity(email);
      setData(d);
    } catch {
      toast.error('Error cargando actividad');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (open && email) load();
  }, [open, email, load]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-xl">
            {data?.candidate_name || email || 'Cliente'}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{email}</p>
        </SheetHeader>

        {loading && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {!loading && data && (
          <div className="mt-4 space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-2">
              <KpiMini
                label="Total pagado"
                value={formatEur(data.summary.total_paid_cents)}
                icon={<TrendingUp className="h-3 w-3" />}
                valueClass="text-emerald-600"
              />
              <KpiMini
                label="Deuda"
                value={formatEur(data.summary.total_debt_cents)}
                icon={<CreditCard className="h-3 w-3" />}
                valueClass={
                  data.summary.total_debt_cents > 0 ? 'text-rose-600' : ''
                }
              />
              <KpiMini
                label="Plataformas"
                value={`${data.summary.n_platforms} (${data.summary.n_accounts} cuentas)`}
                icon={<span className="text-[10px]">🔀</span>}
              />
              <KpiMini
                label="Actividad"
                value={formatDate(data.summary.last_activity)}
                icon={<Calendar className="h-3 w-3" />}
              />
            </div>

            {/* Mora + Objeciones */}
            {(data.mora_tracking.length > 0 || data.objeciones.length > 0) && (
              <div className="rounded-md border p-3">
                {data.mora_tracking.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Gestión mora
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {data.mora_tracking.map((m, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {String(m.status || m.recovery_status || '—')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {data.objeciones.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Objeciones
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {data.objeciones.map((o, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            background: o.bg_color,
                            color: o.text_color,
                            borderColor: o.bg_color,
                          }}
                        >
                          {o.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs Accounts / Timeline */}
            <Tabs defaultValue="accounts">
              <TabsList>
                <TabsTrigger value="accounts">
                  Cuentas ({data.accounts.length})
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  Timeline ({data.timeline.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="accounts">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="text-right">Pagado</TableHead>
                        <TableHead className="text-right">Deuda</TableHead>
                        <TableHead className="text-right">OK / Fail</TableHead>
                        <TableHead>Primer</TableHead>
                        <TableHead>Último</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.accounts.map((a) => (
                        <TableRow key={`${a.platform}-${a.external_id}`}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                PLATFORM_COLORS[a.platform] || ''
                              }`}
                            >
                              {a.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[10px]">
                            {a.external_id.slice(0, 18)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.name || '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.phone || '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-emerald-700">
                            {formatEur(a.total_paid_cents)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs ${
                              a.total_debt_cents > 0 ? 'text-rose-700' : ''
                            }`}
                          >
                            {formatEur(a.total_debt_cents)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {a.charges_succeeded} / {a.charges_failed}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(a.first_activity)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(a.last_activity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalle</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.timeline.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-6 text-center text-xs text-muted-foreground"
                          >
                            Sin eventos
                          </TableCell>
                        </TableRow>
                      )}
                      {data.timeline.map((e) => (
                        <TableRow key={`${e.platform}-${e.external_id}`}>
                          <TableCell className="text-xs">
                            {formatDateTime(e.date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                PLATFORM_COLORS[e.platform] || ''
                              }`}
                            >
                              {e.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {e.type}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs">
                            {e.description}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatEur(e.amount_cents)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                STATUS_COLORS[e.status] || 'bg-slate-100'
                              }`}
                            >
                              {e.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

            {renderFooter && (
              <div className="sticky bottom-0 -mx-6 -mb-6 border-t bg-background px-6 py-3">
                {renderFooter()}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function KpiMini({
  label,
  value,
  icon,
  valueClass = '',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border p-2">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
