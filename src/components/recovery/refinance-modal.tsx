'use client';

// Modal para crear una refinanciación (refactor 2026-05-12).
// Operario captura: cantidad a refinanciar + comisión perdonada + nº cuotas.
// Sistema crea un nuevo product_order en el ERP-checkout via proxy Django.
// Devuelve checkout_url que el operario copia y manda al cliente.

import { useState, useMemo } from 'react';
import { Loader2, Copy, CheckCircle2, ExternalLink, Repeat } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { refinanApi, type CreateRefinancePayload } from '@/lib/refinanciacion-api';
import { formatEuros } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  // Datos del cliente y plan original (vienen del drawer):
  subscriptionId: string;          // original_order_id (po_xxx / sub_xxx / mem_xxx)
  platform: 'whop-erp' | 'stripe' | 'whop' | string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  // Deuda actual:
  debtRemainingEur: number;        // se mostrara y precarga
  onSuccess?: (checkoutUrl: string) => void;
}

export function RefinanceModal({
  open,
  onClose,
  subscriptionId,
  platform,
  customerEmail,
  customerName,
  customerPhone,
  debtRemainingEur,
  onSuccess,
}: Props) {
  // Inputs editables por el operario
  const [amountEur, setAmountEur] = useState<string>(debtRemainingEur.toFixed(2));
  const [installments, setInstallments] = useState<string>('2');
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [submitting, setSubmitting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Cálculos derivados
  const refinanceCents = Math.round(parseFloat(amountEur || '0') * 100);
  const debtCents = Math.round(debtRemainingEur * 100);
  const commissionWaivedCents = Math.max(0, debtCents - refinanceCents);
  const installmentsNum = Math.max(1, parseInt(installments || '1', 10));
  const perInstallmentCents = Math.round(refinanceCents / installmentsNum);

  const platformAllowed: 'whop-erp' | 'stripe' | 'whop' = useMemo(() => {
    const p = (platform || '').toLowerCase();
    if (p === 'whop-erp' || p === 'whop_erp') return 'whop-erp';
    if (p === 'stripe') return 'stripe';
    if (p === 'whop') return 'whop';
    return 'whop-erp'; // fallback
  }, [platform]);

  const validationError = useMemo(() => {
    if (refinanceCents < 100) return 'Cantidad a refinanciar muy baja';
    if (refinanceCents > debtCents) return 'No se puede refinanciar más de la deuda';
    if (installmentsNum < 1 || installmentsNum > 24) return 'Cuotas entre 1 y 24';
    return null;
  }, [refinanceCents, debtCents, installmentsNum]);

  const handleSubmit = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateRefinancePayload = {
        original_order_id: subscriptionId,
        original_platform: platformAllowed,
        client_email: customerEmail,
        client_name: customerName,
        client_phone: customerPhone || undefined,
        debt_remaining_cents: debtCents,
        commission_waived_cents: commissionWaivedCents,
        new_amount_to_pay_cents: refinanceCents,
        new_installments: installmentsNum,
        first_due_date: firstDueDate,
      };
      const r = await refinanApi.create(payload);
      setResultUrl(r.checkout_url);
      toast.success('Refinanciación creada — link generado');
      onSuccess?.(r.checkout_url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error creando refinanciación';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!resultUrl) return;
    navigator.clipboard.writeText(resultUrl).then(
      () => toast.success('Link copiado'),
      () => toast.error('No se pudo copiar'),
    );
  };

  const handleClose = () => {
    setResultUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-indigo-500" />
            Refinanciar cliente
          </DialogTitle>
          <DialogDescription>
            {customerName} · {customerEmail}
          </DialogDescription>
        </DialogHeader>

        {!resultUrl ? (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Deuda pendiente: {formatEuros(debtRemainingEur)}
              </p>
              <p className="mt-1 text-amber-700/80 dark:text-amber-300/80">
                El cliente seguirá cobrándose el plan original hasta que pague la 1ª cuota
                del refinanciado. Al cobrarse, el plan viejo se pausa automáticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Cantidad a refinanciar (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                disabled={submitting}
              />
              <p className="text-[10px] text-slate-500">
                Si pones menos que la deuda, la diferencia se considera comisión perdonada.
              </p>
            </div>

            {commissionWaivedCents > 0 && (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-950/30">
                <span className="text-emerald-700 dark:text-emerald-300">
                  Comisión perdonada: <b>{formatEuros(commissionWaivedCents / 100)}</b>
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="installments">Número de cuotas</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max="24"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                disabled={submitting}
              />
              <p className="text-[10px] text-slate-500">
                Cada cuota: <b>{formatEuros(perInstallmentCents / 100)}</b>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstDate">Fecha primera cuota</Label>
              <Input
                id="firstDate"
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                disabled={submitting}
              />
            </div>

            {validationError && (
              <p className="text-xs text-red-600">{validationError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-emerald-800 dark:text-emerald-200">
                Refinanciación creada. Copia este link y mándalo al cliente:
              </p>
            </div>
            <div className="break-all rounded-md border border-indigo-200 bg-indigo-50 p-2 font-mono text-xs dark:border-indigo-900/50 dark:bg-indigo-950/30">
              {resultUrl}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} size="sm" className="flex-1 gap-1">
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
              >
                <a href={resultUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir
                </a>
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!resultUrl ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !!validationError}
                className="gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Repeat className="h-4 w-4" />
                )}
                Generar refinanciación
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
