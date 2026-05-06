'use client';

import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
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
import { adminPinApi, extractPinError } from '@/lib/admin-pin-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** true = no tiene PIN aún (configura por primera vez). false = cambiar el suyo. */
  isFirstTime?: boolean;
  /** Callback al guardar OK. */
  onSaved?: () => void;
}

/**
 * Modal reusable para que un admin configure o cambie SU PROPIO PIN.
 * Pide login_password + PIN nuevo + confirmación.
 */
export function ChangeMyPinDialog({ open, onOpenChange, isFirstTime, onSaved }: Props) {
  const [loginPassword, setLoginPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setLoginPassword('');
    setNewPin('');
    setConfirmPin('');
  };

  const submit = async () => {
    if (!loginPassword) {
      toast.error('Escribe tu contraseña de login');
      return;
    }
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      toast.error('El PIN debe ser exactamente 6 dígitos');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('El PIN y la confirmación no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      await adminPinApi.set(loginPassword, newPin);
      toast.success(isFirstTime ? 'PIN configurado' : 'PIN actualizado');
      reset();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const e = extractPinError(err);
      toast.error(e.detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFirstTime ? (
              <>
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Configura tu PIN
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Cambiar mi PIN
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            El PIN se usa para confirmar acciones críticas (devoluciones,
            cancelaciones). Para configurarlo o cambiarlo necesitas reescribir
            tu contraseña de login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="login-pwd">Tu contraseña de login</Label>
            <Input
              id="login-pwd"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-pin">Nuevo PIN (6 dígitos)</Label>
            <Input
              id="new-pin"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 font-mono text-center tracking-[0.5em]"
            />
          </div>
          <div>
            <Label htmlFor="confirm-pin">Confirmar PIN</Label>
            <Input
              id="confirm-pin"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 font-mono text-center tracking-[0.5em]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className={submitting ? 'ml-2' : ''}>Guardar PIN</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
