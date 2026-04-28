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
import { Button } from '@/components/ui/button';
import { Check, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { empleadosApi } from '@/lib/empleados-api';
import type { EmpleadoUser } from '@/lib/empleados-types';

interface Props {
  user: EmpleadoUser | null;
  availableRoles: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditRolesDialog({ user, availableRoles, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Reset al abrir
  useEffect(() => {
    if (user) setSelected(new Set(user.roles));
  }, [user]);

  if (!user) return null;

  const toggle = (role: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const original = new Set(user.roles);
  const dirty =
    selected.size !== original.size || [...selected].some((r) => !original.has(r));

  const submit = async () => {
    if (!dirty) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await empleadosApi.updateUser(user.id, { roles: [...selected] });
      toast.success('Roles actualizados');
      onSaved();
      onClose();
    } catch {
      toast.error('Error actualizando roles');
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
            <Shield className="h-5 w-5 text-cyan-200" />
            Asignar roles
          </DialogTitle>
          <DialogDescription className="text-blue-100/70">
            Editando roles de{' '}
            <b className="text-cyan-300">{user.display_name || user.email}</b>.
            Los cambios se aplican al pulsar Guardar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-1.5">
          {availableRoles.map((r) => {
            const checked = selected.has(r);
            const isAdmin = r === 'Admin';
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggle(r)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm transition-all',
                  checked
                    ? 'border-cyan-400/60 bg-gradient-to-r from-blue-600/30 to-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.20)]'
                    : 'border-blue-500/20 bg-blue-950/30 hover:border-blue-400/40 hover:bg-blue-900/40',
                )}
              >
                <span className="flex items-center gap-2">
                  <Shield
                    className={cn(
                      'h-4 w-4',
                      isAdmin && checked
                        ? 'text-rose-300'
                        : checked
                        ? 'text-cyan-200'
                        : 'text-blue-300/40',
                    )}
                  />
                  <span className={cn(checked ? 'text-cyan-100 font-medium' : 'text-blue-200')}>{r}</span>
                </span>
                {checked && <Check className="h-4 w-4 text-cyan-300" />}
              </button>
            );
          })}
        </div>

        <DialogFooter className="relative">
          {dirty && (
            <span className="mr-auto self-center text-xs text-cyan-300/80">
              Cambios sin guardar
            </span>
          )}
          <Button
            variant="ghost"
            className="border border-blue-500/30 bg-blue-950/40 text-blue-100 hover:bg-blue-900/50 hover:text-white"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !dirty}
            className="border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
