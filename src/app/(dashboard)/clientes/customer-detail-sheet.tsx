'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/format';
import type { CustomerDetail, Invoice, Subscription } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mail, Phone, CreditCard, TrendingUp, FileText, Wallet, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  customerId: string | null;
  open: boolean;
  onClose: () => void;
}

const INVOICE_STATUS_TONE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  uncollectible: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  void: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const SUB_STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  past_due: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  canceled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  incomplete: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export function CustomerDetailSheet({ customerId, open, onClose }: Props) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId || !open) {
      setCustomer(null);
      setInvoices(null);
      setSubs(null);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get<CustomerDetail>(`/api/v1/customers/${customerId}/`),
      api.get<Invoice[]>(`/api/v1/customers/${customerId}/invoices/`),
      api.get<Subscription[]>(`/api/v1/customers/${customerId}/subscriptions/`),
    ])
      .then(([c, i, s]) => {
        setCustomer(c);
        setInvoices(i);
        setSubs(s);
      })
      .finally(() => setLoading(false));
  }, [customerId, open]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl p-0">
        <SheetHeader className="border-b border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/50">
          <SheetTitle className="text-2xl">
            {loading && !customer ? <Skeleton className="h-7 w-48" /> : customer?.name || '—'}
          </SheetTitle>
          <SheetDescription>Detalle del cliente</SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {loading && !customer && <Skeleton className="h-24 w-full" />}

          {customer && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow icon={Mail} label="Email" value={customer.email} />
                <InfoRow icon={Phone} label="Teléfono" value={customer.phone || '—'} />
                <InfoRow icon={CreditCard} label="Plataforma" value={customer.platform} />
                <InfoRow
                  icon={FileText}
                  label="Invoices"
                  value={String(customer.total_invoices)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MiniKpi
                  label="Total cobrado"
                  value={formatEuros(customer.total_paid)}
                  icon={Wallet}
                  tone="positive"
                />
                <MiniKpi
                  label="Pendiente"
                  value={formatEuros(customer.total_remaining)}
                  icon={TrendingDown}
                  tone={Number(customer.total_remaining) > 0 ? 'negative' : 'neutral'}
                />
              </div>

              {customer.objeciones && customer.objeciones.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Objeciones
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {customer.objeciones.map((o) => (
                      <Badge
                        key={o.id}
                        style={{ backgroundColor: `${o.tag.color}20`, color: o.tag.color }}
                      >
                        {o.tag.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Tabs defaultValue="invoices">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="invoices">
                    Facturas ({invoices?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="subscriptions">
                    Suscripciones ({subs?.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="invoices" className="mt-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estado</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Pendiente</TableHead>
                          <TableHead>Vencimiento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                              Sin facturas
                            </TableCell>
                          </TableRow>
                        )}
                        {invoices?.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell>
                              <Badge className={cn('font-medium', INVOICE_STATUS_TONE[inv.status])}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatEuros(inv.amount_due)}
                            </TableCell>
                            <TableCell
                              className={cn(
                                Number(inv.amount_remaining) > 0
                                  ? 'text-red-600 dark:text-red-400 font-medium'
                                  : 'text-slate-400',
                              )}
                            >
                              {formatEuros(inv.amount_remaining)}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                              {inv.due_date
                                ? new Date(inv.due_date).toLocaleDateString('es-ES')
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="subscriptions" className="mt-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estado</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Próximo ciclo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subs?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-sm text-slate-500">
                              Sin suscripciones
                            </TableCell>
                          </TableRow>
                        )}
                        {subs?.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <Badge className={cn('font-medium', SUB_STATUS_TONE[sub.status])}>
                                {sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {sub.amount ? formatEuros(sub.amount) : '—'}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                              {sub.current_period_end
                                ? new Date(sub.current_period_end).toLocaleDateString('es-ES')
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <Icon className="h-4 w-4 mt-1 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'positive' | 'negative' | 'neutral';
}) {
  const color = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-foreground',
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn('mt-1 text-2xl font-bold', color)}>{value}</p>
    </div>
  );
}
