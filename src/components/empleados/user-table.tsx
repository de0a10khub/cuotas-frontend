'use client';

import { useState, type KeyboardEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { EmpleadoUser } from '@/lib/empleados-types';
import { empleadosApi } from '@/lib/empleados-api';

interface Props {
  users: EmpleadoUser[];
  availableRoles: string[];
  onChanged: () => void;
}

export function UserTable({ users, availableRoles, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [syncing, setSyncing] = useState(false);

  const startEdit = (u: EmpleadoUser) => {
    setEditingId(u.id);
    setDraft(u.display_name || '');
  };

  const saveEdit = async (u: EmpleadoUser) => {
    if (draft.trim() === (u.display_name || '').trim()) {
      setEditingId(null);
      return;
    }
    try {
      await empleadosApi.updateUser(u.id, { display_name: draft.trim() });
      toast.success('Nombre actualizado');
      onChanged();
    } catch {
      toast.error('Error actualizando nombre');
    } finally {
      setEditingId(null);
    }
  };

  const toggleRole = async (u: EmpleadoUser, role: string) => {
    const nextRoles = u.roles.includes(role)
      ? u.roles.filter((r) => r !== role)
      : [...u.roles, role];
    try {
      await empleadosApi.updateUser(u.id, { roles: nextRoles });
      toast.success('Roles actualizados');
      onChanged();
    } catch {
      toast.error('Error actualizando roles');
    }
  };

  const toggleBlock = async (u: EmpleadoUser) => {
    try {
      await empleadosApi.updateUser(u.id, { is_blocked: !u.is_blocked });
      toast.success(u.is_blocked ? 'Acceso desbloqueado' : 'Acceso bloqueado');
      onChanged();
    } catch {
      toast.error('Error actualizando estado');
    }
  };

  const remove = async (u: EmpleadoUser) => {
    if (
      !confirm(
        '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    try {
      await empleadosApi.deleteUser(u.id);
      toast.success('Usuario eliminado');
      onChanged();
    } catch {
      toast.error('Error eliminando usuario');
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await empleadosApi.syncProfiles();
      toast.success(r.message);
      onChanged();
    } catch {
      toast.error('Error sincronizando perfiles');
    } finally {
      setSyncing(false);
    }
  };

  const onNameKey = (e: KeyboardEvent<HTMLInputElement>, u: EmpleadoUser) => {
    if (e.key === 'Enter') saveEdit(u);
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          Sincronizar Perfiles
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de registro</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  Sin usuarios registrados.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const isEditing = editingId === u.id;
              return (
                <TableRow key={u.id} className={cn(u.is_blocked && 'opacity-50')}>
                  <TableCell className="max-w-[220px]">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => saveEdit(u)}
                          onKeyDown={(e) => onNameKey(e, u)}
                          className="h-7"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        className="group inline-flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {u.display_name ? (
                          <span className="font-medium">{u.display_name}</span>
                        ) : (
                          <span className="italic text-muted-foreground">Sin nombre</span>
                        )}
                        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    {u.roles.length === 0 ? (
                      <Badge variant="outline">Sin Rol</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge
                            key={r}
                            variant={r === 'Admin' ? 'destructive' : 'secondary'}
                            className={cn(
                              r === 'Manager' &&
                                'bg-blue-600 text-white hover:bg-blue-700',
                            )}
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.is_blocked ? (
                      <Badge variant="outline" className="border-red-300 text-red-600">
                        Bloqueado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-600">
                        Activo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell suppressHydrationWarning className="text-sm text-slate-600 dark:text-slate-400">
                    {(() => {
                      try {
                        return format(parseISO(u.created_at), 'dd MMM yyyy', { locale: es });
                      } catch {
                        return '—';
                      }
                    })()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Asignar roles</DropdownMenuLabel>
                        {availableRoles.map((r) => {
                          const has = u.roles.includes(r);
                          return (
                            <DropdownMenuItem
                              key={r}
                              onClick={(e) => {
                                e.preventDefault();
                                toggleRole(u, r);
                              }}
                            >
                              <Shield
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  r === 'Admin' ? 'text-destructive' : 'text-primary',
                                )}
                              />
                              <span className="flex-1">{r}</span>
                              {has && <Check className="h-3 w-3" />}
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Gestión de usuario</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => toggleBlock(u)}
                          className={u.is_blocked ? 'text-emerald-600' : 'text-orange-600'}
                        >
                          {u.is_blocked ? (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Desbloquear
                            </>
                          ) : (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Bloquear Acceso
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => remove(u)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar Permanentemente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
