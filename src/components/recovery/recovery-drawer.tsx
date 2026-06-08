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
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  RotateCcw,
  Save,
  WalletCards,
  Link as LinkIcon,
  Copy,
  Repeat,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { formatEuros } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import type { ObjecionTag, Operator } from '@/lib/clientes-types';
import { PdfViewerModal } from '@/components/data/pdf-viewer-modal';
import { ActionHistoryList } from './action-history-list';
import { FailedPaymentsList } from './failed-payments-list';
import { InteractionHistoryList } from './interaction-history-list';
import { InstallmentsList } from './installments-list';
import { MoraTimeline } from './mora-timeline';
import { MultiSelectTags } from './multi-select-tags';
import { MultiContactList } from './multi-contact-list';
import { ExternalPaymentButton } from './external-payment-button';
import { RefinanceModal } from './refinance-modal';
import { MembershipPausePanel } from './membership-pause-panel';
import type { DrawerMode, RecoveryDrawerApi, RecoveryRow } from './types';

interface Props {
  mode: DrawerMode;
  api: RecoveryDrawerApi;
  operators: Operator[];
  statusOptions: string[];
  row: RecoveryRow | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (row: RecoveryRow) => void;
  /** Identifica el panel donde está el operario (mora_n1, mora_n2, fullpay,
   *  clientes, recobros). Se persiste en tracking_notes.panel para que el
   *  tab Seguimiento muestre el origen correcto de cada nota. */
  panel?: string;
}

type TabKey = 'gestion' | 'seguimiento' | 'pagos' | 'cuotas' | 'historial' | 'mora';

export function RecoveryDrawer({
  mode,
  api,
  operators,
  statusOptions,
  row,
  open,
  onClose,
  onUpdated,
  panel,
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
  const [refinanceOpen, setRefinanceOpen] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  // REFACTOR 2026-06-08: owner sticky UNICO (recovery_owner_email).
  // Antes habia dos columnas separadas — N1 (recovery_owner_email) y recobros
  // (recovery_owner_email_recobrame). Ahora un cliente tiene un solo operario
  // asignado que lo lleva entre paneles sin cambio automatico.
  const stickyOwnerEmail = useMemo(() => {
    if (!row) return null;
    return row.recovery_owner_email || null;
  }, [row]);

  // Mapeo email sticky → display_name del operario para preseleccionar
  // el Select de "Operario asignado".
  const stickyDisplayName = useMemo(() => {
    if (!stickyOwnerEmail) return '';
    const op = operators.find(
      (o) => o.email?.toLowerCase() === stickyOwnerEmail.toLowerCase(),
    );
    return op?.display_name || '';
  }, [stickyOwnerEmail, operators]);

  const operatorOptions = useMemo(() => {
    const base = operators.map((o) => ({ value: o.display_name, label: o.display_name }));
    // Si el sticky owner es alguien que ya no está en la lista de operarios
    // activos (rotación de personal), lo añadimos manualmente para que no
    // desaparezca del Select.
    if (stickyDisplayName && !base.some((o) => o.value === stickyDisplayName)) {
      base.push({ value: stickyDisplayName, label: `${stickyDisplayName} (anterior)` });
    }
    // Fallback legacy: si no hay sticky pero sí "último que tocó", también
    // lo añadimos como anterior.
    const current = (row?.recovery_contacted_by || '').trim();
    if (current && !base.some((o) => o.value === current)) {
      base.push({ value: current, label: `${current} (anterior)` });
    }
    return base;
  }, [operators, stickyDisplayName, row?.recovery_contacted_by]);

  // Sincroniza form cuando cambia la fila.
  // OJO: solo dependemos de subscription_id, NO de stickyDisplayName.
  // Antes incluía stickyDisplayName como dep — si la lista de operarios
  // tardaba en cargar, stickyDisplayName cambiaba de '' a 'X' después de
  // abrir el drawer, este effect se re-ejecutaba y RESETEABA el form,
  // borrando lo que el operario acababa de elegir en el dropdown.
  // Si el sticky aún no está resuelto al abrir, caemos a recovery_contacted_by
  // (que el backend ya popula con el sticky cuando existe).
  useEffect(() => {
    if (!row) return;
    setStatus(row.recovery_status || 'Pendiente');
    setContactedBy(stickyDisplayName || row.recovery_contacted_by || '');
    setComment1(row.recovery_comment_1 || '');
    setContinueWith(row.recovery_continue_with || '');
    setComment2(row.recovery_comment_2 || '');
    setTags((row.objeciones_tags || []).map((t) => t.id));
    setPaymentLink(null);
    setContractUrl(null);
    setTab('gestion');
  }, [row?.subscription_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cuando la lista de operarios termina de cargar y resuelve el sticky,
  // pre-rellenamos contactedBy SOLO si el operario aún no eligió nada.
  // Si ya cambió el dropdown a algo distinto, no lo pisamos.
  useEffect(() => {
    if (!row) return;
    if (!stickyDisplayName) return;
    setContactedBy((prev) => {
      const prevTrim = (prev || '').trim();
      const fallback = (row.recovery_contacted_by || '').trim();
      // Solo rellenar si el campo está vacío o coincide con el fallback
      // anterior (= el usuario NO ha tocado el dropdown todavía).
      if (!prevTrim || prevTrim === fallback) return stickyDisplayName;
      return prev;
    });
  }, [stickyDisplayName, row?.subscription_id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Contador de notas en Seguimiento para pintar el badge en el tab.
  const [interactionsCount, setInteractionsCount] = useState(0);
  useEffect(() => {
    if (!isMora || !row?.subscription_id || !api.interactions) {
      setInteractionsCount(0);
      return;
    }
    let cancel = false;
    api
      .interactions(row.subscription_id)
      .then((r) => !cancel && setInteractionsCount((r.results || []).length))
      .catch(() => !cancel && setInteractionsCount(0));
    return () => {
      cancel = true;
    };
  }, [isMora, row?.subscription_id, api]);

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
        panel: panel || (mode === 'mora' ? 'mora_n1' : 'clientes'),
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
    } catch (e: unknown) {
      // El backend devuelve { detail: "<mensaje en español>" }. Sacamos
      // el detail si lo tenemos, si no caemos a un mensaje genérico.
      const detail =
        (e as { response?: { data?: { detail?: string } }; data?: { detail?: string }; detail?: string } | null)
          ?.response?.data?.detail ??
        (e as { data?: { detail?: string } } | null)?.data?.detail ??
        (e as { detail?: string } | null)?.detail ??
        null;
      toast.error('No se pudo generar el link', detail ? { description: detail } : undefined);
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
  const displayName = row.customer_name?.trim() || row.customer_email || row.subscription_id;
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:w-1/3 sm:min-w-[560px] sm:max-w-none">
        {/* HERO: gradiente sutil + avatar + nombre + badges */}
        <SheetHeader className="relative border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-6 py-5 dark:border-slate-800 dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="break-words text-xl font-bold leading-tight">
                {displayName}
              </SheetTitle>
              {isMora && row.product_name && (
                <p className="mt-0.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  {row.product_name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                    row.platform === 'stripe' &&
                      'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-800/50',
                    row.platform === 'whop' &&
                      'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800/50',
                    row.platform === 'whop-erp' &&
                      'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800/50',
                  )}
                >
                  {row.platform === 'stripe' && '💳 Stripe'}
                  {row.platform === 'whop' && '⚡ Whop'}
                  {row.platform === 'whop-erp' && '📦 Whop-ERP'}
                </span>
                {row.recovery_status && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    {row.recovery_status}
                  </span>
                )}
                {row.category && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                      row.category === 'Al día' &&
                        'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50',
                      row.category !== 'Al día' &&
                        'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800/50',
                    )}
                  >
                    {row.category}
                  </span>
                )}
              </div>
              <p className="mt-2 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                {row.subscription_id}
              </p>
            </div>
          </div>
          <SheetDescription className="sr-only">Lock exclusivo 2 min</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-6">
            {/* Multi-email + multi-phone con notas */}
            <div className="space-y-2">
              <MultiContactList
                subscriptionId={row.subscription_id}
                kind="email"
                label="Emails"
                icon={Mail}
                initialPrimary={row.customer_email}
              />
              <MultiContactList
                subscriptionId={row.subscription_id}
                kind="phone"
                label="Teléfonos"
                icon={Phone}
                initialPrimary={row.customer_phone}
              />
            </div>

            {/* Acciones rápidas */}
            <div className="flex flex-wrap gap-2">
              {/* Hotmart: no se aplican cambio de tarjeta / refinanciacion /
                  pago externo porque el flujo de cobros lo gestiona Hotmart
                  (Sequra incluido). Solo dejamos contrato. */}
              {row.platform !== 'hotmart' && (
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
              )}
              {row.platform !== 'hotmart' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRefinanceOpen(true)}
                  title="Crear plan refinanciado con cuotas y descuento custom"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                >
                  <Repeat className="h-4 w-4" />
                  Refinanciar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateContract}
                disabled={generatingContract}
              >
                <FileText className="h-4 w-4" />
                Contrato
              </Button>
              {(row.n_contracts ?? 0) > 1 && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  <Layers className="h-3.5 w-3.5" />
                  {row.n_contracts} contratos
                </span>
              )}
              {contractUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPdfOpen(true)}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  <FileText className="h-4 w-4" />
                  Abrir contrato
                </Button>
              )}
              {row.platform !== 'hotmart' && (
                <ExternalPaymentButton
                  subscriptionId={row.subscription_id}
                  defaultAmountEur={Number(row.unpaid_invoices_total) || 0}
                />
              )}
            </div>

            {(row.n_contracts ?? 0) > 1 && (
              <div className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50/70 p-2.5 text-xs dark:border-amber-800/60 dark:bg-amber-950/30">
                <p className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-200">
                  <Layers className="h-3.5 w-3.5" />
                  Este cliente tiene {row.n_contracts} contratos
                </p>
                {row.contracts && row.contracts.filter((c) => !c.is_access_only).length > 0 && (
                  <ul className="space-y-0.5 font-mono text-[11px] text-amber-900 dark:text-amber-200/90">
                    {row.contracts
                      .filter((c) => !c.is_access_only)
                      .map((c) => (
                        <li key={c.subscription_id}>
                          • {c.platform} · {c.product_name || 's/ producto'} · {c.subscription_id}
                        </li>
                      ))}
                  </ul>
                )}
                <p className="text-amber-700 dark:text-amber-300/90">
                  Se generan 2 contratos al pagar por 2 vías distintas. Si necesitas enviarle el
                  contrato al cliente, <strong>contacta a JP</strong> para que te diga cuál es el
                  correcto antes de enviarlo.
                </p>
              </div>
            )}

            {paymentLink && (
              <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5 text-xs dark:border-indigo-900/50 dark:bg-indigo-950/30">
                <LinkIcon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <span className="flex-1 truncate font-mono text-indigo-900 dark:text-indigo-200">
                  {paymentLink}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentLink);
                    toast.success('Copiado');
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setPaymentLink(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* KPIs financieros — visibles en clientes, mora, mora-n2 y recobrame */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <FinancialTile
                label="Pagado"
                amount={Number(row.paid_total) || 0}
                subtitle={`${row.paid_count ?? 0} cuotas`}
                tone="emerald"
              />
              <FinancialTile
                label="Deuda"
                amount={Number(row.unpaid_total) || 0}
                subtitle={`${row.unpaid_invoices_count ?? 0} cuotas`}
                tone="rose"
              />
              <FinancialTile
                label="A Pagar"
                amount={tcv > 0 ? Number(row.remaining_contract) || 0 : null}
                subtitle={tcv > 0 ? `de ${formatEuros(tcv, { decimals: 0 })}` : undefined}
                tone="slate"
              />
            </div>

            {/* Alerts destacados */}
            {showActionNeeded && (
              <div className="flex gap-2.5 rounded-lg border-l-4 border-l-rose-500 bg-rose-50 p-3 text-xs text-rose-900 shadow-sm dark:bg-rose-950/40 dark:text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <p className="leading-relaxed">
                  <span className="font-semibold">Acción necesaria:</span> facturas impagadas
                  {row.oldest_invoice_date && (
                    <>
                      {' '}desde el{' '}
                      <b>{new Date(row.oldest_invoice_date).toLocaleDateString('es-ES')}</b>
                    </>
                  )}{' '}
                  posteriores a la última gestión. Actualiza el estado.
                </p>
              </div>
            )}

            {showMentorship && (
              <div className="rounded-lg border-l-4 border-l-indigo-500 bg-indigo-50/60 p-3 dark:bg-indigo-950/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                  <GraduationCap className="h-4 w-4" />
                  Contexto de Mentoría · {row.mentor_name}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-indigo-700/90 dark:text-indigo-300/90">
                  {row.mentorship_comment || 'El mentor no ha dejado comentarios todavía.'}
                </p>
              </div>
            )}

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
                <TabsList
                  className={cn(
                    'h-auto w-full gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900',
                    'grid grid-cols-2',
                    // Cuenta dinámicamente las columnas: base 4 (gestión, seguimiento,
                    // pagos, historial) + 1 si whop-erp (cuotas) + 1 si isMora (mora).
                    (() => {
                      const cols =
                        4 +
                        (row.platform === 'whop-erp' ? 1 : 0) +
                        (isMora ? 1 : 0);
                      return {
                        4: 'sm:grid-cols-4',
                        5: 'sm:grid-cols-5',
                        6: 'sm:grid-cols-6',
                      }[cols];
                    })(),
                  )}
                >
                  <TabsTrigger
                    value="gestion"
                    className="gap-1.5 rounded-md py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Gestión
                  </TabsTrigger>
                  <TabsTrigger
                    value="seguimiento"
                    className="relative gap-1.5 rounded-md py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Seguimiento
                    {interactionsCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-white dark:ring-slate-900">
                        {interactionsCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="pagos"
                    className="gap-1.5 rounded-md py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                  >
                    <WalletCards className="h-3.5 w-3.5" />
                    {isMora
                      ? `Pagos (${(row.paid_invoices_count || 0) + (row.unpaid_invoices_count || 0)})`
                      : 'Pagos'}
                  </TabsTrigger>
                  {row.platform === 'whop-erp' && (
                    <TabsTrigger
                      value="cuotas"
                      className="gap-1.5 rounded-md py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Cuotas
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="historial"
                    className="gap-1.5 rounded-md py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {isMora ? 'Reintentos' : 'Historial'}
                  </TabsTrigger>
                  {isMora && (
                    <TabsTrigger
                      value="mora"
                      className="gap-1.5 rounded-md py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                    >
                      <History className="h-3.5 w-3.5" />
                      Mora
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="gestion" className="space-y-4">
                  {/* Pausa / banner de pausa activa. Componente autocontenido */}
                  <MembershipPausePanel subscriptionId={row.subscription_id} />

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

                <TabsContent value="seguimiento">
                  <InteractionHistoryList api={api} subscriptionId={row.subscription_id} />
                </TabsContent>

                <TabsContent value="pagos">
                  <FailedPaymentsList
                    api={api}
                    subscriptionId={row.subscription_id}
                    customerId={row.customer_id}
                    platform={row.platform}
                    operators={operators}
                    showChargeAction
                  />
                </TabsContent>

                {row.platform === 'whop-erp' && (
                  <TabsContent value="cuotas">
                    <InstallmentsList
                      subscriptionId={row.subscription_id}
                      platform={row.platform}
                    />
                  </TabsContent>
                )}

                <TabsContent value="historial">
                  <ActionHistoryList api={api} subscriptionId={row.subscription_id} />
                </TabsContent>

                {isMora && (
                  <TabsContent value="mora">
                    <MoraTimeline subscriptionId={row.subscription_id} />
                  </TabsContent>
                )}
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

      <RefinanceModal
        open={refinanceOpen}
        onClose={() => setRefinanceOpen(false)}
        subscriptionId={row.subscription_id}
        platform={row.platform}
        customerEmail={row.customer_email}
        customerName={row.customer_name || ''}
        customerPhone={row.customer_phone}
        debtRemainingEur={Number(row.remaining_contract ?? row.unpaid_invoices_total ?? 0)}
        onSuccess={() => {
          // Refresh tras crear refinanciacion. Pasamos la row actual sin
          // cambios — el reload de la tabla padre lo dispara igual aunque el
          // shape no haya cambiado.
          if (row) onUpdated?.(row);
        }}
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

function FinancialTile({
  label,
  amount,
  subtitle,
  tone,
  beta,
}: {
  label: string;
  amount: number | null;
  subtitle?: string;
  tone: 'emerald' | 'rose' | 'slate';
  beta?: boolean;
}) {
  const tones = {
    emerald:
      'border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white text-emerald-800 dark:border-emerald-900/50 dark:from-emerald-950/50 dark:to-slate-950 dark:text-emerald-200',
    rose: 'border-rose-200/70 bg-gradient-to-br from-rose-50 to-white text-rose-800 dark:border-rose-900/50 dark:from-rose-950/50 dark:to-slate-950 dark:text-rose-200',
    slate:
      'border-slate-200/70 bg-gradient-to-br from-slate-50 to-white text-slate-800 dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950 dark:text-slate-200',
  }[tone];
  return (
    <div className={cn('relative rounded-lg border p-3 shadow-sm', tones)}>
      {beta && (
        <span
          className="absolute right-1.5 top-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60"
          title="Este valor se calcula a partir del metadata de Stripe/ThriveCart. En algunos clientes puede no ser exacto."
        >
          Beta
        </span>
      )}
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums">
        {amount === null ? '—' : formatEuros(amount, { decimals: 2 })}
      </p>
      {subtitle && <p className="mt-0.5 text-[11px] opacity-60">{subtitle}</p>}
    </div>
  );
}

function QuickContactTile({
  icon: Icon,
  label,
  value,
  copyable,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border border-slate-200 bg-background p-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="break-all text-sm font-medium text-slate-900 dark:text-slate-100">
          {value || <span className="text-slate-400">—</span>}
        </p>
      </div>
      {copyable && value && (
        <button
          type="button"
          onClick={copy}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          title={`Copiar ${label.toLowerCase()}`}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
          )}
        </button>
      )}
    </div>
  );
}

// Re-export del RefinanIndicator para acceso conveniente desde /mora y /clientes.
export { RefinanIndicator } from './refinan-indicator';
