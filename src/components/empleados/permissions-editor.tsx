'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Check, Plus, Save, Search, Shield, Trash2, Undo2, X } from 'lucide-react';
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

/**
 * Matriz de permisos: paths como filas, roles como columnas, checkboxes en
 * cada celda. Los toggles se almacenan localmente y se envian al backend
 * solo al pulsar "Guardar cambios" (batch).
 */
export function PermissionsEditor({ roles, permissions, availablePaths, onChanged }: Props) {
  const confirm = useConfirm();

  // Estado SERVIDOR (de permissions prop)
  const serverIndex = useMemo(() => {
    const s = new Set<string>();
    for (const p of permissions) s.add(`${p.role}::${p.allowed_path}`);
    return s;
  }, [permissions]);

  // Estado LOCAL (lo que el usuario ha cambiado pero aun no guardado)
  const [draftIndex, setDraftIndex] = useState<Set<string>>(new Set(serverIndex));
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  // Sync cuando llega nueva data del servidor (tras guardar o reload)
  useEffect(() => {
    setDraftIndex(new Set(serverIndex));
  }, [serverIndex]);

  const toggle = (role: string, path: string) => {
    const key = `${role}::${path}`;
    setDraftIndex((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllPath = (path: string) => {
    // Si todos los roles tienen esta path activa, la quito de todos.
    // Si no, la activo en todos.
    const allHave = roles.every((r) => draftIndex.has(`${r}::${path}`));
    setDraftIndex((prev) => {
      const next = new Set(prev);
      for (const r of roles) {
        const key = `${r}::${path}`;
        if (allHave) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const toggleAllRole = (role: string) => {
    const allHave = availablePaths.every((p) => draftIndex.has(`${role}::${p.path}`));
    setDraftIndex((prev) => {
      const next = new Set(prev);
      for (const p of availablePaths) {
        const key = `${role}::${p.path}`;
        if (allHave) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  // Diff: cambios pendientes por aplicar
  const pendingChanges = useMemo(() => {
    const adds: { role: string; path: string }[] = [];
    const removes: { role: string; path: string }[] = [];
    for (const k of draftIndex) {
      if (!serverIndex.has(k)) {
        const [role, path] = k.split('::');
        adds.push({ role, path });
      }
    }
    for (const k of serverIndex) {
      if (!draftIndex.has(k)) {
        const [role, path] = k.split('::');
        removes.push({ role, path });
      }
    }
    return { adds, removes, total: adds.length + removes.length };
  }, [draftIndex, serverIndex]);

  const discard = () => setDraftIndex(new Set(serverIndex));

  const save = async () => {
    if (pendingChanges.total === 0) return;
    setSaving(true);
    try {
      // Aplica cambios en paralelo. Si alguno falla, se reporta.
      const ops = [
        ...pendingChanges.adds.map((c) => empleadosApi.setPermission(c.role, c.path, true)),
        ...pendingChanges.removes.map((c) => empleadosApi.setPermission(c.role, c.path, false)),
      ];
      const results = await Promise.allSettled(ops);
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) {
        toast.success(`${pendingChanges.total} cambio${pendingChanges.total > 1 ? 's' : ''} guardado${pendingChanges.total > 1 ? 's' : ''}`);
      } else {
        toast.error(`${failed} de ${pendingChanges.total} cambios fallaron`);
      }
      onChanged();
    } catch {
      toast.error('Error guardando cambios');
    } finally {
      setSaving(false);
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

  // Filtrado de paths por búsqueda
  const visiblePaths = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return availablePaths;
    return availablePaths.filter(
      (p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
    );
  }, [availablePaths, filter]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/60" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por path o nombre..."
            className="pl-9 pr-9 border-blue-500/30 bg-blue-950/40 text-cyan-50 placeholder:text-blue-300/40 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-cyan-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <NewRoleDialog onCreated={onChanged} />
      </div>

      {/* Banner de cambios pendientes (sticky en la parte superior) */}
      {pendingChanges.total > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border border-amber-400/40 bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-amber-950/60 px-4 py-2.5 shadow-[0_0_20px_rgba(251,191,36,0.20)] backdrop-blur">
          <span className="text-sm text-amber-100">
            <b className="text-amber-300">{pendingChanges.total}</b> cambio
            {pendingChanges.total > 1 ? 's' : ''} pendiente
            {pendingChanges.total > 1 ? 's' : ''} de guardar
            <span className="ml-2 text-xs text-amber-200/60">
              ({pendingChanges.adds.length} +, {pendingChanges.removes.length} −)
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={discard}
              disabled={saving}
              className="border border-blue-500/30 bg-blue-950/40 text-blue-100 hover:bg-blue-900/50 hover:text-white"
            >
              <Undo2 className="mr-1 h-4 w-4" />
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving}
              className="border-0 bg-gradient-to-r from-emerald-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-emerald-500 hover:to-cyan-400 disabled:opacity-50"
            >
              <Save className="mr-1 h-4 w-4" />
              {saving ? 'Guardando...' : `Guardar ${pendingChanges.total} cambio${pendingChanges.total > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}

      {/* Matriz */}
      <div className="overflow-x-auto rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628]/60 via-[#0d1f3a]/40 to-[#0a1628]/60">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-blue-500/30 bg-gradient-to-r from-blue-950/60 via-blue-900/40 to-blue-950/60">
              <th className="sticky left-0 z-10 min-w-[280px] bg-gradient-to-r from-blue-950/90 to-blue-950/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-300">
                Ruta
              </th>
              {roles.map((r) => {
                const allOn = availablePaths.every((p) => draftIndex.has(`${r}::${p.path}`));
                return (
                  <th key={r} className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleAllRole(r)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                          r === 'Admin'
                            ? 'text-rose-300 hover:bg-rose-500/10'
                            : 'text-cyan-300 hover:bg-cyan-500/10',
                        )}
                        title={allOn ? 'Quitar todos los permisos' : 'Activar todos'}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {r}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRole(r)}
                        className="text-rose-400/40 transition-colors hover:text-rose-300"
                        title="Eliminar rol"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visiblePaths.length === 0 && (
              <tr>
                <td colSpan={roles.length + 1} className="py-10 text-center text-sm text-blue-300/60">
                  No hay rutas que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {visiblePaths.map((p, idx) => {
              const allOn = roles.every((r) => draftIndex.has(`${r}::${p.path}`));
              return (
                <tr
                  key={p.path}
                  className={cn(
                    'border-b border-blue-500/10 transition-colors hover:bg-blue-500/5',
                    idx % 2 === 0 ? 'bg-blue-950/10' : 'bg-transparent',
                  )}
                >
                  <td className="sticky left-0 z-[1] bg-gradient-to-r from-[#0a1628]/95 to-[#0a1628]/70 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => toggleAllPath(p.path)}
                      className="group flex w-full items-center gap-2 text-left"
                      title={allOn ? 'Quitar a todos los roles' : 'Dar a todos los roles'}
                    >
                      <span className="font-mono text-[10px] text-blue-300/50 group-hover:text-cyan-300">
                        {p.path}
                      </span>
                      <span className="text-xs font-medium text-blue-100 group-hover:text-cyan-200">
                        {p.label}
                      </span>
                    </button>
                  </td>
                  {roles.map((r) => {
                    const key = `${r}::${p.path}`;
                    const allowed = draftIndex.has(key);
                    const wasAllowed = serverIndex.has(key);
                    const dirty = allowed !== wasAllowed;
                    return (
                      <td key={r} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(r, p.path)}
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all',
                            allowed
                              ? 'border-emerald-400/50 bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.30)] hover:bg-emerald-500/30'
                              : 'border-blue-500/20 bg-blue-950/40 hover:border-blue-400/40 hover:bg-blue-900/40',
                            dirty && 'ring-2 ring-amber-400/60 ring-offset-1 ring-offset-[#0a1628]',
                          )}
                          aria-label={`${allowed ? 'Quitar' : 'Dar'} permiso ${p.path} a ${r}`}
                        >
                          {allowed && <Check className="h-4 w-4 text-emerald-300" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 px-1 text-xs text-blue-300/60">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-emerald-400/50 bg-emerald-500/20">
            <Check className="h-3 w-3 text-emerald-300" />
          </span>
          Permitido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 rounded border border-blue-500/20 bg-blue-950/40" />
          Denegado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 rounded ring-2 ring-amber-400/60 ring-offset-1 ring-offset-[#0a1628]" />
          Cambio pendiente
        </span>
        <span className="ml-auto text-blue-300/40">
          Click en path/rol para alternar todos. Click en celda para alternar uno.
        </span>
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
