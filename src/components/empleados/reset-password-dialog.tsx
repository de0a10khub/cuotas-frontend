'use client';

import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { empleadosApi } from '@/lib/empleados-api';
import { generatePassword } from '@/lib/password-generator';
import type { EmpleadoUser } from '@/lib/empleados-types';

interface Props {
  user: EmpleadoUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ResetPasswordDialog({ user, onClose, onSaved }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPassword(generatePassword(16));
      setShowPassword(true);
    }
  }, [user]);

  const regen = () => {
    setPassword(generatePassword(16));
    setShowPassword(true);
  };

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Contraseña copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const submit = async () => {
    if (!user) return;
    if (password.length < 8) {
      toast.error('Contraseña mínima 8 caracteres');
      return;
    }
    setSaving(true);
    try {
      await empleadosApi.resetPassword(user.id, password);
      toast.success('Contraseña actualizada — pasala al empleado');
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { data?: { detail?: string } })?.data?.detail || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md border border-cyan-400/30 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] text-blue-100 shadow-[0_0_50px_rgba(34,211,238,0.25)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />

        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2 bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            <KeyRound className="h-5 w-5 text-cyan-200" />
            Cambiar contraseña
          </DialogTitle>
          <DialogDescription className="text-blue-100/70">
            Generando nueva contraseña para{' '}
            <b className="text-cyan-300">{user?.display_name || user?.email}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-blue-200">Nueva contraseña</Label>
            <span className="text-[10px] uppercase tracking-wider text-cyan-300/60">
              16 caracteres · mayús + minús + nº + signos
            </span>
          </div>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9 font-mono border-blue-500/30 bg-blue-950/40 text-cyan-100 placeholder:text-blue-300/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-2 flex items-center text-blue-300/60 hover:text-cyan-200"
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={copy}
              disabled={!password}
              className="border border-blue-500/30 bg-blue-950/40 text-blue-100 hover:bg-blue-900/50 hover:text-white"
              title="Copiar contraseña"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={regen}
              className="border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400"
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Generar
            </Button>
          </div>
        </div>

        <DialogFooter className="relative">
          <Button
            variant="ghost"
            className="border border-blue-500/30 bg-blue-950/40 text-blue-100 hover:bg-blue-900/50 hover:text-white"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Aplicar contraseña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
