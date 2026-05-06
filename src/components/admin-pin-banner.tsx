'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, KeyRound } from 'lucide-react';
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
import { useAuth } from '@/lib/auth-context';
import { adminPinApi, extractPinError } from '@/lib/admin-pin-api';

/**
 * Banner para admins. Muestra:
 *   - Si NO tienen PIN: alerta amarilla "Configura tu PIN" + botón.
 *   - Botón flotante para cambiar el PIN (siempre, si es admin).
 *
 * Para crear/cambiar el PIN siempre se pide la contraseña de login del
 * propio admin (anti-hijack si alguien tiene la sesión abierta).
 */
export function AdminPinBanner() {
  const { profile } = useAuth();
  const isAdmin = profile?.roles?.some((r) => r.name === 'Admin') ?? false;

  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    adminPinApi
      .status()
      .then((d) => setHasPin(d.has_pin))
      .catch(() => setHasPin(null));
  }, [isAdmin]);

  if (!isAdmin || hasPin === null) return null;

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
      toast.success(hasPin ? 'PIN actualizado' : 'PIN configurado');
      setHasPin(true);
      setOpen(false);
      setLoginPassword('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      const e = extractPinError(err);
      toast.error(e.detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Banner solo si NO tiene PIN */}
      {!hasPin && (
        <div className="border-b border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>
                Tu cuenta es Admin pero no tiene PIN configurado. Necesitas un PIN para
                ejecutar devoluciones y cancelaciones.
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <KeyRound className="h-3 w-3" />
              Configurar PIN
            </Button>
          </div>
        </div>
      )}

      {/* Modal para set / change PIN */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {hasPin ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Cambiar mi PIN
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Configura tu PIN
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
                className="mt-1 font-mono tracking-[0.5em] text-center"
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
                className="mt-1 font-mono tracking-[0.5em] text-center"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className={submitting ? 'ml-2' : ''}>Guardar PIN</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
