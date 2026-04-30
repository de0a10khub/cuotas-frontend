'use client';

/**
 * Botón "Pago externo" + modal para registrar transferencia bancaria
 * (u otro pago hecho por fuera de Whop/Stripe). Sube el comprobante a Drive
 * vía n8n y marca las cuotas pendientes como pagadas.
 */
import { useState, useEffect } from 'react';
import { Wallet, Upload, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getAccessToken } from '@/lib/api';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/format';

interface ExternalPayment {
  id: string;
  amount_eur: number;
  currency: string;
  method: string;
  proof_url: string;
  payment_date: string;
  notes?: string;
  performed_by: string;
  created_at: string;
}

interface Props {
  subscriptionId: string;
  defaultAmountEur?: number;
  onRegistered?: () => void;
}

export function ExternalPaymentButton({ subscriptionId, defaultAmountEur, onRegistered }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState<string>(defaultAmountEur ? defaultAmountEur.toFixed(2) : '');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existing, setExisting] = useState<ExternalPayment[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadExisting = async () => {
    setLoadingList(true);
    try {
      const r = await api.get<{ results: ExternalPayment[] }>(
        `/api/v1/clientes-directorio/external-payment/${subscriptionId}/`,
      );
      setExisting(r.results);
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  useEffect(() => {
    if (defaultAmountEur && !amount) setAmount(defaultAmountEur.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAmountEur]);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Importe inválido');
      return;
    }
    if (!file) {
      toast.error('Falta comprobante');
      return;
    }
    if (!paymentDate) {
      toast.error('Falta fecha de pago');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('amount_eur', String(amt));
      formData.append('payment_date', paymentDate);
      formData.append('method', 'transferencia');
      if (notes.trim()) formData.append('notes', notes.trim());

      // Llamada multipart manual (api.post no soporta FormData nativo)
      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(
        `${apiUrl}/api/v1/clientes-directorio/external-payment/${subscriptionId}/`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al registrar');

      toast.success('✅ Pago externo registrado', {
        description: `${data.updated_installments} cuota(s) marcadas como pagadas`,
      });
      setOpen(false);
      setFile(null);
      setNotes('');
      await loadExisting();
      onRegistered?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      toast.error('No se pudo registrar', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
      >
        <Wallet className="h-4 w-4" />
        Pago externo
      </Button>

      {/* Cartel de pagos externos ya registrados */}
      {existing.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-800 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-emerald-800 dark:text-emerald-200">
            Pagado por {existing[0].method}: {formatEuros(existing[0].amount_eur, { decimals: 2 })} ({existing[0].payment_date})
          </span>
          <a
            href={existing[0].proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Ver comprobante <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && !submitting && setOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Registrar pago externo
            </DialogTitle>
            <DialogDescription>
              Para clientes que pagaron por <strong>transferencia bancaria</strong> u otro
              método fuera de Whop. Sube el comprobante; las cuotas pendientes se marcarán
              como pagadas y dejará constancia en /log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="ep-amount">Importe (€)</Label>
              <Input
                id="ep-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="200.00"
              />
              {defaultAmountEur ? (
                <p className="mt-1 text-xs text-slate-500">
                  Deuda restante actual: {formatEuros(defaultAmountEur, { decimals: 2 })}
                  {' '}(ajusta si llevó descuento por comisión)
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="ep-date">Fecha del pago</Label>
              <Input
                id="ep-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="ep-file">Comprobante (imagen o PDF)</Label>
              <input
                id="ep-file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-emerald-100 file:px-2 file:py-1 file:text-emerald-800 hover:file:bg-emerald-200 dark:file:bg-emerald-900/40 dark:file:text-emerald-200"
              />
              {file && (
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                  <Upload className="h-3 w-3" /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="ep-notes">Notas (opcional)</Label>
              <Textarea
                id="ep-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Concepto, referencia bancaria, etc."
                rows={2}
              />
            </div>

            {existing.length > 0 && !loadingList && (
              <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs dark:border-amber-800 dark:bg-amber-950/40">
                ⚠️ Este cliente ya tiene {existing.length} pago(s) externo(s) registrado(s).
                Solo registra uno nuevo si es un pago adicional distinto.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || !file || !amount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Registrar pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
