'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
  ArrowRightCircle,
  CreditCard,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Save,
  WalletCards,
  Link as LinkIcon,
  Copy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fullpayApi } from '@/lib/fullpay-api';
import { moraApi } from '@/lib/mora-api';
import type { FullPayLead } from '@/lib/fullpay-types';
import { PdfViewerModal } from '@/components/data/pdf-viewer-modal';
import { FailedPaymentsList } from '@/components/recovery/failed-payments-list';
import { STATUS_OPTIONS } from './constants';

interface Props {
  row: FullPayLead | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (row: FullPayLead) => void;
}

type Tab = 'gestion' | 'pagos';

export function FullPayDrawer({ row, open, onClose, onUpdated }: Props) {
  const { profile } = useAuth();
  const userEmail = profile?.user.email || profile?.user.username || 'anon@cuotas.local';

  const [lockState, setLockState] = useState<'loading' | 'owned' | 'blocked'>('loading');
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('gestion');
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState('CONTACTADO');
  const [operator, setOperator] = useState('');
  const [proof, setProof] = useState('');
  const [comment, setComment] = useState('');

  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  // Sync form a la fila al cambiar.
  useEffect(() => {
    if (!row) return;
    setStatus(row.recovery_status || 'CONTACTADO');
    setOperator(row.recovery_operator || '');
    setProof(row.recovery_payment_proof || '');
    setComment(row.recovery_comment || '');
    setPaymentLink(null);
    setContractUrl(null);
    setTab('gestion');
  }, [row?.subscription_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adquiere lock al abrir + libera al cerrar.
  useEffect(() => {
    if (!open || !row) return;
    setLockState('loading');
    setLockedBy(null);
    fullpayApi
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
        setLockedBy(data?.locked_by ?? 'otro operador');
      });

    return () => {
      fullpayApi.lockRelease(row.subscription_id, userEmail).catch(() => {});
    };
  }, [open, row?.subscription_id, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!row) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await fullpayApi.upsertTracking({
        subscription_id: row.subscription_id,
        customer_id: row.customer_id,
        status,
        operator,
        comment,
        payment_proof: proof,
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
    setGeneratingLink(true);
    try {
      const r = await moraApi.paymentUpdateLink({
        subscription_id: row.subscription_id,
        customer_id: row.customer_id,
        platform: row.platform,
      });
      setPaymentLink(r.url);
      await navigator.clipboard.writeText(r.url).catch(() => {});
      toast.success('Link copiado al portapapeles');
    } catch (e: unknown) {
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

  const handleContract = async () => {
    if (contractUrl) {
      setPdfOpen(true);
      return;
    }
    setGeneratingContract(true);
    try {
      const r = await moraApi.generateContract({
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

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5 text-primary" />
            <SheetTitle className="text-lg font-black uppercase italic tracking-tighter text-primary">
              Venta Full Pay
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-slate-500">
            Gestión de llamada · lock 2 min
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-slate-200 bg-background p-3 dark:border-slate-800">
              <h3 className="truncate text-base font-semibold">{row.customer_name}</h3>
              <p className="font-mono text-[11px] text-slate-500">{row.subscription_id}</p>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePaymentLink}
                  disabled={generatingLink}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Cambio Tarjeta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleContract}
                  disabled={generatingContract}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Contrato
                </Button>
              </div>

              {paymentLink && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-900">
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

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-slate-500">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{row.customer_email}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{row.customer_phone || '—'}</span>
                </div>
              </div>
            </div>

            {lockState === 'loading' && <Skeleton className="h-40 w-full" />}

            {lockState === 'blocked' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
                <Lock className="mx-auto mb-2 h-8 w-8 text-amber-600" />
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Lead bloqueado
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  Lo gestiona <b>{lockedBy}</b>
                </p>
              </div>
            )}

            {lockState === 'owned' && (
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gestion" className="gap-1.5 text-[11px]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Gestión
                  </TabsTrigger>
                  <TabsTrigger value="pagos" className="gap-1.5 text-[11px]">
                    <WalletCards className="h-3.5 w-3.5" />
                    Pagos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gestion" className="space-y-3">
                  <Field label="Estado de la Llamada">
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v || 'CONTACTADO')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter((o) => o.value !== 'PENDIENTE').map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.emoji} {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Operario">
                    <Input
                      value={operator}
                      onChange={(e) => setOperator(e.target.value.toUpperCase())}
                      placeholder="Ej: LAURA M"
                      className="uppercase"
                    />
                  </Field>

                  <Field label="Comprobante de Pago (URL)">
                    <div className="relative">
                      <FileText className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={proof}
                        onChange={(e) => setProof(e.target.value)}
                        placeholder="https://..."
                        className="pl-7"
                      />
                    </div>
                  </Field>

                  <Field label="Comentario / Notas de Venta">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-28 italic"
                      placeholder="Resumen de la llamada..."
                    />
                  </Field>

                  <div className="flex items-center gap-2 rounded-md bg-primary/5 p-2 text-xs text-primary">
                    <Lock className="h-3 w-3" />
                    Tienes el bloqueo activo (2 min).
                  </div>
                </TabsContent>

                <TabsContent value="pagos">
                  <FailedPaymentsList
                    api={moraApi}
                    subscriptionId={row.subscription_id}
                    customerId={row.customer_id}
                    platform={row.platform}
                    showChargeAction={false}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {lockState === 'owned' && tab === 'gestion' && (
          <SheetFooter className="border-t border-slate-200 bg-background p-3 dark:border-slate-800">
            <Button
              onClick={handleSave}
              disabled={saving}
              className={cn('h-12 w-full font-bold uppercase tracking-wider shadow-lg shadow-primary/20')}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'GUARDAR GESTIÓN'}
            </Button>
          </SheetFooter>
        )}
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
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
