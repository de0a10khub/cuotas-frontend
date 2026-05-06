'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
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
import { adminPinApi, extractPinError, type PinScope } from '@/lib/admin-pin-api';

interface Props {
  open: boolean;
  onClose: () => void;
  scope: PinScope;
  /** Texto contextual ("Para reembolsar 200€ de Pepito"). */
  description?: string;
  /** Callback con el token cuando el PIN es correcto. */
  onVerified: (token: string) => void;
}

/**
 * Modal reusable que pide PIN de 6 dígitos al admin y devuelve un token
 * efímero (60s) firmado para el scope dado. El token se pasa al endpoint
 * sensible (refund/cancel/etc).
 *
 * Maneja rate limit: si el backend devuelve 429, muestra countdown y
 * deshabilita el input hasta que se acabe el bloqueo.
 */
export function AdminPinDialog({ open, onClose, scope, description, onVerified }: Props) {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedSeconds, setBlockedSeconds] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setPin('');
      setError(null);
      setBlockedSeconds(0);
      // focus al input
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Countdown del bloqueo
  useEffect(() => {
    if (blockedSeconds <= 0) return;
    const t = setInterval(() => {
      setBlockedSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [blockedSeconds]);

  const submit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('El PIN debe ser exactamente 6 dígitos');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await adminPinApi.verify(pin, scope);
      onVerified(r.token);
    } catch (err) {
      const e = extractPinError(err);
      if (e.code === 'rate_limited') {
        // Extraer segundos del mensaje "intenta de nuevo en Xs"
        const m = e.detail.match(/(\d+)s/);
        const secs = m ? parseInt(m[1], 10) : 5 * 60;
        setBlockedSeconds(secs);
      } else if (e.code === 'no_pin_set') {
        setError('No tienes PIN configurado. Pide a un admin que te establezca uno.');
      } else {
        setError(e.detail);
      }
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const isBlocked = blockedSeconds > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Verificación de PIN admin
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="••••••"
            value={pin}
            disabled={submitting || isBlocked}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pin.length === 6) submit();
            }}
            className="text-center text-2xl font-mono tracking-[0.5em]"
          />

          {isBlocked && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
              Demasiados intentos fallidos. Espera{' '}
              <b>{Math.floor(blockedSeconds / 60)}:{String(blockedSeconds % 60).padStart(2, '0')}</b>{' '}
              antes de volver a intentarlo.
            </div>
          )}

          {error && !isBlocked && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            5 intentos fallidos bloquean tu acceso 5 minutos.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting || isBlocked || pin.length !== 6}>
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className={submitting ? 'ml-2' : ''}>Verificar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
