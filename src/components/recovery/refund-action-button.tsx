'use client';

import { useState } from 'react';
import { Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdminPinDialog } from '@/components/admin-pin-dialog';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';

interface Props {
  paymentId: string;
  platform: string;          // 'stripe' | 'whop' | 'whop-erp'
  amount: number;            // euros (lo recibimos parsed del item)
  customerName?: string;
  /** Llamado tras refund exitoso — el padre puede recargar la lista. */
  onRefunded?: () => void;
}

/**
 * Botón "Devolución" visible solo a admins. Flujo:
 *   1) Click → modal de detalles (importe editable, razón).
 *   2) Confirmar → AdminPinDialog (PIN 6 dígitos, scope=refund).
 *   3) PIN OK → POST /refunds/create con admin_pin_token.
 */
export function RefundActionButton({ paymentId, platform, amount, customerName, onRefunded }: Props) {
  const { profile } = useAuth();
  const isAdmin = profile?.roles?.some((r) => r.name === 'Admin') ?? false;
  if (!isAdmin) return null;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amountInput, setAmountInput] = useState(amount.toFixed(2));
  const [reason, setReason] = useState('');

  const openConfirm = () => {
    setAmountInput(amount.toFixed(2));
    setReason('');
    setConfirmOpen(true);
  };

  const proceedToPin = () => {
    const a = parseFloat(amountInput.replace(',', '.'));
    if (!Number.isFinite(a) || a <= 0) {
      toast.error('Importe inválido');
      return;
    }
    if (a > amount + 0.001) {
      toast.error(`Importe no puede ser mayor que ${amount.toFixed(2)}€`);
      return;
    }
    if (!reason.trim()) {
      toast.error('Indica un motivo para la devolución');
      return;
    }
    setConfirmOpen(false);
    setPinOpen(true);
  };

  const executeRefund = async (token: string) => {
    setPinOpen(false);
    setSubmitting(true);
    try {
      const a = parseFloat(amountInput.replace(',', '.'));
      const cents = Math.round(a * 100);
      await api.post('/api/v1/refunds/create/', {
        payment_id: paymentId,
        platform,
        amount_cents: cents,
        reason: reason.trim(),
        admin_pin_token: token,
      });
      toast.success(`Reembolso de ${a.toFixed(2)}€ ejecutado`);
      onRefunded?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { detail?: string } | null;
        toast.error(data?.detail || `Error ${err.status}`);
      } else {
        toast.error('Error de red');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={openConfirm}
        disabled={submitting}
        className="gap-1.5 border-rose-400/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
      >
        {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
        Devolución
      </Button>

      {/* Modal: detalles de la devolución */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolución de pago</DialogTitle>
            <DialogDescription>
              Reembolsará el importe indicado de este pago únicamente. <b>NO cancela
              la suscripción</b> ni afecta a otras cuotas. Esta acción es
              irreversible una vez ejecutada por la pasarela.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {customerName && (
              <div className="rounded-md bg-muted/40 p-2 text-xs">
                Cliente: <b>{customerName}</b>
              </div>
            )}
            <div>
              <Label htmlFor="refund-amount">Importe a reembolsar (€)</Label>
              <Input
                id="refund-amount"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={amount.toFixed(2)}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Máximo cobrado: {amount.toFixed(2)}€. Puedes reembolsar parcial.
              </p>
            </div>
            <div>
              <Label htmlFor="refund-reason">Motivo (obligatorio)</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Cliente solicitó devolución, error de cobro, etc."
                className="mt-1"
              />
            </div>
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-300">
              Tras confirmar se te pedirá tu PIN admin de 6 dígitos.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={proceedToPin} className="bg-rose-600 hover:bg-rose-700">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminPinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        scope="refund"
        description={`Reembolso de ${parseFloat(amountInput.replace(',', '.')).toFixed(2)}€ — ${customerName || 'Cliente'}`}
        onVerified={executeRefund}
      />
    </>
  );
}
