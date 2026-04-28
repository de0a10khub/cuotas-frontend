'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Check, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { AvailablePath, RolePermission } from '@/lib/empleados-types';
import { empleadosApi } from '@/lib/empleados-api';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Props {
  roles: string[];
  permissions: RolePermission[];
  availablePaths: AvailablePath[];
  onChanged: () => void;
}

export function PermissionsEditor({ roles, permissions, availablePaths, onChanged }: Props) {
  const confirm = useConfirm();
  const [savingPair, setSavingPair] = useState<string | null>(null);

  const permIndex = useMemo(() => {
    const s = new Set<string>();
    for (const p of permissions) s.add(`${p.role}::${p.allowed_path}`);
    return s;
  }, [permissions]);

  const toggle = async (role: string, path: string) => {
    const key = `${role}::${path}`;
    const next = !permIndex.has(key);
    setSavingPair(key);
    try {
      await empleadosApi.setPermission(role, path, next);
      onChanged();
    } catch {
      toast.error('Error actualizando permiso');
    } finally {
      setSavingPair(null);
    }
  };

  const removeRole = async (role: string) => {
    const ok = await confirm({
      title: 'Eliminar rol',
      description: (
        <>
          Vas a eliminar el rol <b className="text-cyan-300">{role}</b>. Se revocarán
          todos sus permisos y asignaciones.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await empleadosApi.deleteRole(role);
      toast.success('Rol eliminado');
      onChanged();
    } catch {
      toast.error('Error eliminando rol');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewRoleDialog onCreated={onChanged} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card
            key={r}
            className="border-blue-500/20 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.08)]"
          >
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b border-blue-500/15">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-cyan-300" />
                <span className="text-cyan-100">{r}</span>
              </CardTitle>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => removeRole(r)}
                className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="max-h-72 space-y-0.5 overflow-y-auto pt-3">
              {availablePaths.map((p) => {
                const key = `${r}::${p.path}`;
                const allowed = permIndex.has(key);
                const isSaving = savingPair === key;
                return (
                  <button
                    key={p.path}
                    type="button"
                    disabled={isSaving}
                    onClick={() => toggle(r, p.path)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                      allowed
                        ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        : 'text-blue-200/60 hover:bg-blue-500/10 hover:text-blue-100',
                    )}
                  >
                    <span className="truncate">
                      <span className="font-mono text-[10px] text-blue-300/40">{p.path}</span>
                      <br />
                      {p.label}
                    </span>
                    {allowed ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewRoleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      await empleadosApi.createRole(name.trim());
      toast.success('Rol creado');
      onCreated();
      setName('');
      setOpen(false);
    } catch (err) {
      toast.error((err as { data?: { detail?: string } })?.data?.detail || 'Error creando rol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Nuevo Rol
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo rol</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Nombre del rol</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Supervisor"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creando...' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
