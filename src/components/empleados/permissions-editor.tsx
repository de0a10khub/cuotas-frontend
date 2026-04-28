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
import { navigation, groupBySection, type NavItem } from '@/components/nav-config';

interface Props {
  roles: string[];
  permissions: RolePermission[];
  availablePaths: AvailablePath[];
  onChanged: () => void;
}

// Color por rol — diferencia visual cada columna
const ROLE_ACCENTS: Record<string, { ring: string; bg: string; text: string; bar: string }> = {
  Admin: {
    ring: 'ring-rose-400/60',
    bg: 'from-rose-600/30 to-rose-500/10',
    text: 'text-rose-200',
    bar: 'from-rose-500 to-pink-400',
  },
  Manager: {
    ring: 'ring-amber-400/60',
    bg: 'from-amber-600/30 to-amber-500/10',
    text: 'text-amber-200',
    bar: 'from-amber-500 to-orange-400',
  },
  'Operario Full Pay': {
    ring: 'ring-cyan-400/60',
    bg: 'from-cyan-600/30 to-cyan-500/10',
    text: 'text-cyan-200',
    bar: 'from-cyan-500 to-blue-400',
  },
  Operario: {
    ring: 'ring-blue-400/60',
    bg: 'from-blue-600/30 to-blue-500/10',
    text: 'text-blue-200',
    bar: 'from-blue-500 to-indigo-400',
  },
  Mentor: {
    ring: 'ring-violet-400/60',
    bg: 'from-violet-600/30 to-violet-500/10',
    text: 'text-violet-200',
    bar: 'from-violet-500 to-fuchsia-400',
  },
  Auditor: {
    ring: 'ring-emerald-400/60',
    bg: 'from-emerald-600/30 to-emerald-500/10',
    text: 'text-emerald-200',
    bar: 'from-emerald-500 to-teal-400',
  },
};
const DEFAULT_ACCENT = {
  ring: 'ring-slate-400/60',
  bg: 'from-slate-600/30 to-slate-500/10',
  text: 'text-slate-200',
  bar: 'from-slate-500 to-zinc-400',
};

const accent = (role: string) => ROLE_ACCENTS[role] ?? DEFAULT_ACCENT;

/**
 * Matriz de permisos con vibe: hero cards por rol arriba con barra de
 * progreso, matriz agrupada por seccion del sidebar con iconos,
 * cross-hairs en hover, banner sticky de cambios pendientes.
 */
export function PermissionsEditor({ roles, permissions, onChanged }: Props) {
  const confirm = useConfirm();

  // Estado SERVIDOR
  const serverIndex = useMemo(() => {
    const s = new Set<string>();
    for (const p of permissions) s.add(`${p.role}::${p.allowed_path}`);
    return s;
  }, [permissions]);

  const [draftIndex, setDraftIndex] = useState<Set<string>>(new Set(serverIndex));
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    setDraftIndex(new Set(serverIndex));
  }, [serverIndex]);

  // Paths agrupados por seccion del sidebar
  const sectionsGrouped = useMemo(() => groupBySection(navigation), []);
  const totalPaths = navigation.length;

  // Filtrado por busqueda — afecta solo a las filas visibles
  const filteredSections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sectionsGrouped;
    const result: Record<string, NavItem[]> = {};
    for (const [sec, items] of Object.entries(sectionsGrouped)) {
      const filtered = items.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.href.toLowerCase().includes(q) ||
          sec.toLowerCase().includes(q),
      );
      if (filtered.length > 0) result[sec] = filtered;
    }
    return result;
  }, [sectionsGrouped, filter]);

  const visiblePathCount = useMemo(
    () => Object.values(filteredSections).reduce((acc, items) => acc + items.length, 0),
    [filteredSections],
  );

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
    const allHave = navigation.every((n) => draftIndex.has(`${role}::${n.href}`));
    setDraftIndex((prev) => {
      const next = new Set(prev);
      for (const n of navigation) {
        const key = `${role}::${n.href}`;
        if (allHave) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const toggleAllSection = (section: string) => {
    const items = sectionsGrouped[section] || [];
    const allKeys: string[] = [];
    for (const n of items) for (const r of roles) allKeys.push(`${r}::${n.href}`);
    const allHave = allKeys.every((k) => draftIndex.has(k));
    setDraftIndex((prev) => {
      const next = new Set(prev);
      for (const k of allKeys) {
        if (allHave) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  };

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

  // Stats por rol para los hero cards
  const roleStats = useMemo(
    () =>
      roles.map((r) => {
        const granted = navigation.filter((n) => draftIndex.has(`${r}::${n.href}`)).length;
        const dirty = navigation.filter((n) => {
          const k = `${r}::${n.href}`;
          return draftIndex.has(k) !== serverIndex.has(k);
        }).length;
        return { role: r, granted, total: totalPaths, dirty };
      }),
    [roles, draftIndex, serverIndex, totalPaths],
  );

  return (
    <div className="space-y-4">
      {/* Hero cards: una por rol con progreso visual (informativo, no clickable) */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {roleStats.map(({ role, granted, total, dirty }) => {
          const a = accent(role);
          const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
          return (
            <div
              key={role}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-3',
                'border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628]',
              )}
            >
              <div className={cn('pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br opacity-50 blur-2xl', a.bg)} />
              <div className="relative flex items-center justify-between gap-2">
                <Shield className={cn('h-4 w-4', a.text)} />
                {dirty > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/40">
                    {dirty}
                  </span>
                )}
              </div>
              <div className={cn('relative mt-1 text-sm font-bold tracking-tight', a.text)}>{role}</div>
              <div className="relative mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold text-cyan-100">{granted}</span>
                <span className="text-xs text-blue-300/50">/ {total}</span>
                <span className="ml-auto text-[10px] font-medium text-blue-300/60">{pct}%</span>
              </div>
              <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-blue-950/60">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r transition-all', a.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/60" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por path, nombre o sección..."
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
        <span className="text-xs text-blue-300/50">
          {visiblePathCount} ruta{visiblePathCount !== 1 ? 's' : ''} visible{visiblePathCount !== 1 ? 's' : ''}
        </span>
        <div className="ml-auto">
          <NewRoleDialog onCreated={onChanged} />
        </div>
      </div>

      {/* Banner sticky con cambios pendientes */}
      {pendingChanges.total > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 rounded-lg border border-amber-400/40 bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-amber-950/70 px-4 py-2.5 shadow-[0_0_20px_rgba(251,191,36,0.20)] backdrop-blur">
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
            <tr className="border-b border-blue-500/30 bg-gradient-to-r from-blue-950/80 via-blue-900/60 to-blue-950/80">
              <th className="sticky left-0 z-10 min-w-[280px] bg-gradient-to-r from-blue-950/95 to-blue-950/75 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-300">
                Ruta / Sección
              </th>
              {roles.map((r) => {
                const a = accent(r);
                const allOn = navigation.every((n) => draftIndex.has(`${r}::${n.href}`));
                const isHovered = hoveredCol === r;
                return (
                  <th
                    key={r}
                    onMouseEnter={() => setHoveredCol(r)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={cn(
                      'px-2 py-3 text-center transition-colors',
                      isHovered && 'bg-cyan-500/5',
                    )}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      {/* Badge informativo, NO clicable */}
                      <div
                        className={cn(
                          'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider ring-1',
                          a.text,
                          'bg-gradient-to-br',
                          a.bg,
                          allOn ? a.ring : 'ring-blue-500/20',
                        )}
                      >
                        <Shield className="h-3 w-3" />
                        {r}
                      </div>
                      {/* Acciones secundarias muy discretas: marcar/desmarcar todos + borrar rol */}
                      <div className="flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => toggleAllRole(r)}
                          className="text-blue-300/60 transition-colors hover:text-cyan-300"
                          title={allOn ? `Desmarcar todos los permisos de ${r}` : `Marcar todos los permisos para ${r}`}
                        >
                          {allOn ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRole(r)}
                          className="text-rose-400/60 transition-colors hover:text-rose-300"
                          title="Eliminar rol"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(filteredSections).length === 0 && (
              <tr>
                <td colSpan={roles.length + 1} className="py-10 text-center text-sm text-blue-300/60">
                  No hay rutas que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {Object.entries(filteredSections).map(([section, items]) => (
              <FragmentSection
                key={section}
                section={section}
                items={items}
                roles={roles}
                draftIndex={draftIndex}
                serverIndex={serverIndex}
                hoveredCol={hoveredCol}
                hoveredRow={hoveredRow}
                onToggle={toggle}
                onToggleAllPath={toggleAllPath}
                onToggleAllSection={toggleAllSection}
                onHoverCol={setHoveredCol}
                onHoverRow={setHoveredRow}
              />
            ))}
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
          Click en path/rol/sección para alternar todos. Click en celda para alternar uno.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface FragmentSectionProps {
  section: string;
  items: NavItem[];
  roles: string[];
  draftIndex: Set<string>;
  serverIndex: Set<string>;
  hoveredCol: string | null;
  hoveredRow: string | null;
  onToggle: (role: string, path: string) => void;
  onToggleAllPath: (path: string) => void;
  onToggleAllSection: (section: string) => void;
  onHoverCol: (r: string | null) => void;
  onHoverRow: (p: string | null) => void;
}

function FragmentSection({
  section,
  items,
  roles,
  draftIndex,
  serverIndex,
  hoveredCol,
  hoveredRow,
  onToggle,
  onToggleAllPath,
  onToggleAllSection,
  onHoverCol,
  onHoverRow,
}: FragmentSectionProps) {
  const sectionAllOn = items.every((n) => roles.every((r) => draftIndex.has(`${r}::${n.href}`)));
  return (
    <>
      {/* Section header row */}
      <tr className="border-b border-blue-500/20 bg-gradient-to-r from-blue-900/50 via-cyan-900/20 to-blue-900/50">
        <td
          colSpan={roles.length + 1}
          className="sticky left-0 z-[1] px-4 py-1.5"
        >
          <button
            type="button"
            onClick={() => onToggleAllSection(section)}
            className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300/80 hover:text-cyan-200"
            title={sectionAllOn ? `Quitar a todos en ${section}` : `Activar todos en ${section}`}
          >
            <span className="h-px w-4 bg-cyan-400/40 group-hover:bg-cyan-300" />
            {section}
            <span className="text-blue-300/40">({items.length})</span>
          </button>
        </td>
      </tr>
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isHoveredRow = hoveredRow === item.href;
        return (
          <tr
            key={item.href}
            onMouseEnter={() => onHoverRow(item.href)}
            onMouseLeave={() => onHoverRow(null)}
            className={cn(
              'border-b border-blue-500/10 transition-colors',
              idx % 2 === 0 ? 'bg-blue-950/10' : 'bg-transparent',
              isHoveredRow && 'bg-cyan-500/5',
            )}
          >
            <td className="sticky left-0 z-[1] bg-gradient-to-r from-[#0a1628]/95 to-[#0a1628]/70 px-4 py-2">
              <button
                type="button"
                onClick={() => onToggleAllPath(item.href)}
                className="group flex w-full items-center gap-2 text-left"
                title="Toggle a todos los roles"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-blue-300/60 group-hover:text-cyan-300" />
                <span className="font-mono text-[10px] text-blue-300/50 group-hover:text-cyan-300">
                  {item.href}
                </span>
                <span className="text-xs font-medium text-blue-100 group-hover:text-cyan-200">
                  {item.label}
                </span>
              </button>
            </td>
            {roles.map((r) => {
              const key = `${r}::${item.href}`;
              const allowed = draftIndex.has(key);
              const wasAllowed = serverIndex.has(key);
              const dirty = allowed !== wasAllowed;
              const isHoveredCol = hoveredCol === r;
              return (
                <td
                  key={r}
                  onMouseEnter={() => onHoverCol(r)}
                  className={cn(
                    'px-2 py-1.5 text-center transition-colors',
                    (isHoveredCol || isHoveredRow) && 'bg-cyan-500/[0.04]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggle(r, item.href)}
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all',
                      allowed
                        ? 'border-emerald-400/50 bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.30)] hover:scale-110 hover:bg-emerald-500/30'
                        : 'border-blue-500/20 bg-blue-950/40 hover:scale-110 hover:border-blue-400/40 hover:bg-blue-900/40',
                      dirty && 'ring-2 ring-amber-400/70 ring-offset-1 ring-offset-[#0a1628]',
                    )}
                    aria-label={`${allowed ? 'Quitar' : 'Dar'} permiso ${item.href} a ${r}`}
                  >
                    {allowed && <Check className="h-4 w-4 text-emerald-300" />}
                  </button>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------

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
