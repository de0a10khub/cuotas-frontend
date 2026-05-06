'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
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

interface UserLite {
  email: string;
  display_name: string;
  /** roles es un array de strings (ej: ['Admin', 'Operario']). */
  roles?: string[];
}

interface Props {
  user: UserLite | null;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Dialog para que un admin resetee el PIN de OTRO admin (recovery).
 * El admin que ejecuta debe reescribir SU propia contraseña de login;
 * NO necesita el PIN viejo del target.
 */
export function ResetAdminPinDialog({ user, onClose, onSaved }: Props) {
  const [loginPassword, setLoginPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setLoginPassword('');
      setNewPin('');
      setConfirmPin('');
    }
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const isTargetAdmin = user.roles?.includes('Admin') ?? false;

  const submit = async () => {
    if (!loginPassword) {
      toast.error('Escribe TU contraseña de login');
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
      await adminPinApi.reset(user.email, newPin, loginPassword);
      toast.success(`PIN reseteado para ${user.display_name}`);
      onSaved?.();
      onClose();
    } catch (err) {
      const e = extractPinError(err);
      toast.error(e.detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Resetear PIN admin
          </DialogTitle>
          <DialogDescription>
            Vas a establecer un nuevo PIN para <b>{user.display_name}</b> ({user.email}).
            <br />
            El usuario podrá usarlo de inmediato. Comunícale el PIN por un canal
            seguro (no por email).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {!isTargetAdmin && (
            <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
              ⚠️ Este usuario NO tiene rol Admin. El backend rechazará el reset.
            </div>
          )}

          <div>
            <Label htmlFor="actor-pwd">TU contraseña de login</Label>
            <Input
              id="actor-pwd"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Verifica que eres tú quien hace el reset.
            </p>
          </div>

          <div>
            <Label htmlFor="new-pin-target">Nuevo PIN para {user.display_name}</Label>
            <Input
              id="new-pin-target"
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
            <Label htmlFor="confirm-pin-target">Confirmar PIN</Label>
            <Input
              id="confirm-pin-target"
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
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting || !isTargetAdmin}>
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className={submitting ? 'ml-2' : ''}>Resetear PIN</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
