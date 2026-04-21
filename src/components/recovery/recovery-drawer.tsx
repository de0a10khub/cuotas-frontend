'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  RotateCcw,
  Save,
  WalletCards,
  Link as LinkIcon,
  Copy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { formatEuros } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import type { ObjecionTag } from '@/lib/clientes-types';
import { PdfViewerModal } from '@/components/data/pdf-viewer-modal';
import { ActionHistoryList } from './action-history-list';
import { FailedPaymentsList } from './failed-payments-list';
import { InteractionHistoryList } from './interaction-history-list';
import { MultiSelectTags } from './multi-select-tags';
import type { DrawerMode, RecoveryDrawerApi, RecoveryRow } from './types';

interface Props {
  mode: DrawerMode;
  api: RecoveryDrawerApi;
  operators: { id: string; display_name: string }[];
  statusOptions: string[];
  row: RecoveryRow | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (row: RecoveryRow) => void;
}

type TabKey = 'gestion' | 'seguimiento' | 'pagos' | 'historial';

export function RecoveryDrawer({
  mode,
  api,
  operators,
  statusOptions,
  row,
  open,
  onClose,
  onUpdated,
}: Props) {
  const { profile } = useAuth();
  const userEmail = profile?.user.email || profile?.user.username || 'anon@cuotas.local';
  const isMora = mode === 'mora';

  const [lockState, setLockState] = useState<'loading' | 'owned' | 'blocked'>('loading');
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>('gestion');

  // Form state
  const [status, setStatus] = useState('Pendiente');
  const [contactedBy, setContactedBy] = useState('');
  const [comment1, setComment1] = useState('');
  const [continueWith, setContinueWith] = useState('');
  const [comment2, setComment2] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Catálogo de objeciones (solo en mora)
  const [objecionesCatalog, setObjecionesCatalog] = useState<ObjecionTag[]>([]);

  // Acciones de cabecera
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const operatorOptions = useMemo(() => {
    const base = operators.map((o) => ({ value: o.display_name, label: o.display_name }));
    const current = (row?.recovery_contacted_by || '').trim();
    if (current && !base.some((o) => o.value === current)) {
      base.push({ value: current, label: `${current} (anterior)` });
    }
    return base;
  }, [operators, row?.recovery_contacted_by]);

  // Sincroniza form cuando cambia la fila.
  useEffect(() => {
    if (!row) return;
    setStatus(row.recovery_status || 'Pendiente');
    setContactedBy(row.recovery_contacted_by || '');
    setComment1(row.recovery_comment_1 || '');
    setContinueWith(row.recovery_continue_with || '');
    setComment2(row.recovery_comment_2 || '');
    setTags((row.objeciones_tags || []).map((t) => t.id));
    setPaymentLink(null);
    setContractUrl(null);
    setTab('gestion');
  }, [row?.subscription_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga catálogo de objeciones (solo en mora).
  useEffect(() => {
    if (!isMora || !api.objecionesTags) return;
    let cancel = false;
    api
      .objecionesTags()
      .then((r) => !cancel && setObjecionesCatalog(r.results))
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [isMora, api]);

  // Lock al abrir + libera al cerrar.
  useEffect(() => {
    if (!open || !row) return;
    setLockState('loading');
    setLockedBy(null);

    api
      .lockAcquire(row.subscription_id, row.customer_id, userEmail)
      .then((r) => {
        if (r.locked) {
          setLockState('owned');
          setLockedBy(r.locked_by);
        } else {
          setLockState('blocked');
          setLockedBy(r.locked_by);
        }
      })
      .catch((err: unknown) => {
        const data = (err as { data?: { locked_by?: string } })?.data;
        setLockState('blocked');
        setLockedBy(data?.locked_by ?? 'otro operario');
      });

    api
      .contract(row.subscription_id)
      .then((r) => setContractUrl(r.url))
      .catch(() => {});

    return () => {
      api.lockRelease(row.subscription_id, userEmail).catch(() => {});
    };
  }, [open, row?.subscription_id, userEmail, api]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const updated = await api.upsertTracking({
        subscription_id: row.subscription_id,
        customer_id: row.customer_id,
        status,
        contacted_by: contactedBy,
        comment_1: comment1,
        continue_with: continueWith,
        comment_2: comment2,
        tags: isMora ? tags : undefined,
      });
      toast.success('Gestión guardada');
      onUpdated?.(updated);
      onClose();
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentLink = async () => {
    if (!row) return;
    setGeneratingLink(true);
    try {
      const r = await api.paymentUpdateLink({
        subscription_id: row.subscription_id,
        customer_id: row.customer_id,
        platform: row.platform,
      });
      setPaymentLink(r.url);
      await navigator.clipboard.writeText(r.url).catch(() => {});
      toast.success('Link generado', {
        description: 'Visualízalo o cópialo debajo.',
      });
    } catch {
      toast.error('No se pudo generar el link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!row) return;
    if (contractUrl) {
      setPdfOpen(true);
      return;
    }
    setGeneratingContract(true);
    try {
      const r = await api.generateContract({
        subscription_id: row.subscription_id,
        customer_id: row.customer_id,
        customer_email: row.customer_email,
        platform: row.platform,
      });
      setContractUrl(r.url);
      setPdfOpen(true);
      toast.success('Contrato generado');
    } catch {
      toast.error('No se pudo generar el contrato');
    } finally {
      setGeneratingContract(false);
    }
  };

  if (!row) return null;

  const showActionNeeded = isMora && row.is_action_needed;
  const showMentorship = isMora && !!row.mentor_name;
  const tcv = Number(row.total_contract_value) || 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <SheetTitle className="text-lg">
              {isMora ? 'Gestión de Recobro' : 'Detalles Cliente'}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-slate-500">
            Lock exclusivo 2 min
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-6">
            {/* Cabecera: nombre, producto, sub id, acciones */}
            <div className="rounded-lg border border-slate-200 bg-background p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">
                    {row.customer_name?.trim() || row.customer_email || row.subscription_id}
                  </h3>
                  {isMora && (
                    <p className="text-sm font-semibold text-primary">
                      {row.product_name || 'Suscripción'}
                    </p>
                  )}
                  <p className="font-mono text-xs text-slate-500">{row.subscription_id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePaymentLink}
                    disabled={generatingLink}
                    title={
                      row.platform === 'whop-erp'
                        ? 'Genera link de pago de la cuota pendiente. La nueva tarjeta se guarda para futuros cobros.'
                        : undefined
                    }
                  >
                    <CreditCard className="h-4 w-4" />
                    Cambio Tarjeta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateContract}
                    disabled={generatingContract}
                  >
                    <FileText className="h-4 w-4" />
                    Contrato
                  </Button>
                </div>
              </div>

              {paymentLink && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-900">
                  <LinkIcon className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate font-mono">{paymentLink}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentLink);
                      toast.success('Copiado');
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPaymentLink(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Bloque financiero: 3 tiles siempre visibles en /mora */}
              {isMora && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <FinancialTile
                    label="Pagado"
                    amount={Number(row.paid_total) || 0}
                    subtitle={`${row.paid_count ?? 0} cuotas`}
                    tone="emerald"
                  />
                  <FinancialTile
                    label="Deuda"
                    amount={Number(row.unpaid_total) || 0}
                    subtitle={`${row.unpaid_invoices_count} cuotas`}
                    tone="rose"
                  />
                  <FinancialTile
                    label="A Pagar"
                    amount={tcv > 0 ? Number(row.remaining_contract) || 0 : null}
                    subtitle={tcv > 0 ? `de ${formatEuros(tcv, { decimals: 0 })}` : undefined}
                    tone="slate"
                  />
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoRow icon={Mail} label="Email" value={row.customer_email} />
                <InfoRow icon={Phone} label="Teléfono" value={row.customer_phone || '—'} />
              </div>

              {/* Bloque mentoría (solo mora) */}
              {showMentorship && (
                <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <GraduationCap className="h-4 w-4" />
                    Contexto de Mentoría: {row.mentor_name}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {row.mentorship_comment || 'El mentor no ha dejado comentarios todavía.'}
                  </p>
                </div>
              )}

              {/* Bloque action needed (solo mora) */}
              {showActionNeeded && (
                <div className="mt-3 flex gap-2 rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 animate-pulse dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Se han detectado facturas impagadas{' '}
                    {row.oldest_invoice_date && (
                      <>
                        desde el{' '}
                        <b>
                          {new Date(row.oldest_invoice_date).toLocaleDateString('es-ES')}
                        </b>{' '}
                      </>
                    )}
                    posteriores a la última gestión. Por favor, actualiza el estado.
                  </p>
                </div>
              )}

              {contractUrl && (
                <button
                  type="button"
                  onClick={() => setPdfOpen(true)}
                  className="mt-3 flex w-full items-center gap-2 rounded-md bg-emerald-50 p-2 text-left text-xs text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                >
                  <FileText className="h-3 w-3" />
                  Abrir contrato persistido
                </button>
              )}
            </div>

            {lockState === 'loading' && <Skeleton className="h-40 w-full" />}

            {lockState === 'blocked' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
                <Lock className="mx-auto mb-2 h-8 w-8 text-amber-600" />
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Registro Bloqueado
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  Otro operario está gestionando este cliente: <b>{lockedBy}</b>
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Podrás tomarlo cuando el lock expire (2 minutos de inactividad).
                </p>
              </div>
            )}

            {lockState === 'owned' && (
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as TabKey)}
                className="gap-4"
              >
                <TabsList className={cn('w-full', isMora && 'grid grid-cols-4')}>
                  <TabsTrigger value="gestion" className="gap-1.5 text-[11px]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Gestión
                  </TabsTrigger>
                  {isMora && (
                    <TabsTrigger value="seguimiento" className="gap-1.5 text-[11px]">
                      <Clock className="h-3.5 w-3.5" />
                      Seguimiento
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="pagos" className="gap-1.5 text-[11px]">
                    {isMora ? (
                      <>
                        <WalletCards className="h-3.5 w-3.5" />
                        Pagos ({row.unpaid_invoices_count || 0})
                      </>
                    ) : (
                      'Pagos'
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="historial" className="gap-1.5 text-[11px]">
                    {isMora ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reintentos
                      </>
                    ) : (
                      'Historial'
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gestion" className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Estado de Recobro">
                      <Select value={status} onValueChange={(v) => setStatus(v || 'Pendiente')}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Contactado por (Operario)">
                      <Select
                        value={contactedBy}
                        onValueChange={(v) => setContactedBy(!v || v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Nadie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nadie</SelectItem>
                          {operatorOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Comentario Inicial (C1)">
                    <Textarea
                      value={comment1}
                      onChange={(e) => setComment1(e.target.value)}
                      rows={3}
                      placeholder="Qué ha pasado en el primer contacto"
                    />
                  </Field>

                  <Field label="Seguimiento / Comentario 2 (C2)">
                    <Textarea
                      value={comment2}
                      onChange={(e) => setComment2(e.target.value)}
                      rows={3}
                      placeholder="Actualizaciones posteriores"
                    />
                  </Field>

                  <Field label="Próxima acción / Continuar con">
                    <Input
                      value={continueWith}
                      onChange={(e) => setContinueWith(e.target.value)}
                      placeholder="Ej: Llamar lunes 10h"
                      className="border-primary/40 focus-visible:border-primary"
                    />
                  </Field>

                  {isMora && (
                    <Field label="Etiquetas Objeciones">
                      <MultiSelectTags
                        options={objecionesCatalog}
                        selected={tags}
                        onChange={setTags}
                      />
                    </Field>
                  )}

                  <div className="flex items-center gap-2 rounded-md bg-primary/5 p-2 text-xs text-primary">
                    <Lock className="h-3 w-3" />
                    Tienes el bloqueo activo (2 min).
                  </div>
                </TabsContent>

                {isMora && (
                  <TabsContent value="seguimiento">
                    <InteractionHistoryList api={api} subscriptionId={row.subscription_id} />
                  </TabsContent>
                )}

                <TabsContent value="pagos">
                  <FailedPaymentsList
                    api={api}
                    subscriptionId={row.subscription_id}
                    customerId={row.customer_id}
                    platform={row.platform}
                    showChargeAction
                  />
                </TabsContent>

                <TabsContent value="historial">
                  <ActionHistoryList api={api} subscriptionId={row.subscription_id} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-slate-200 bg-background p-4 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {lockState === 'owned' && tab === 'gestion' && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Gestión'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>

      <PdfViewerModal
        open={pdfOpen}
        url={contractUrl}
        title={`Contrato · ${row.customer_name}`}
        description={row.subscription_id}
        onClose={() => setPdfOpen(false)}
      />
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
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
    <div className="flex items-start gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-all text-sm">{value}</p>
      </div>
    </div>
  );
}

function FinancialTile({
  label,
  amount,
  subtitle,
  tone,
}: {
  label: string;
  amount: number | null;
  subtitle?: string;
  tone: 'emerald' | 'rose' | 'slate';
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200',
    slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200',
  }[tone];
  return (
    <div className={cn('rounded-md border p-2.5', tones)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">
        {amount === null ? '—' : formatEuros(amount, { decimals: 2 })}
      </p>
      {subtitle && <p className="text-[10px] opacity-60">{subtitle}</p>}
    </div>
  );
}

// Re-export del RefinanIndicator para acceso conveniente desde /mora y /clientes.
export { RefinanIndicator } from './refinan-indicator';
