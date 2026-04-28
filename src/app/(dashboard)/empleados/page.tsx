'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Tag, Users, Users2 } from 'lucide-react';

import { empleadosApi } from '@/lib/empleados-api';
import type {
  AvailablePath,
  EmpleadoUser,
  MentorTeam,
  ObjecionTag,
  RolePermission,
} from '@/lib/empleados-types';
import { navigation } from '@/components/nav-config';

import { AddUserDialog } from '@/components/empleados/add-user-dialog';
import { UserTable } from '@/components/empleados/user-table';
import { TeamTable } from '@/components/empleados/team-table';
import { PermissionsEditor } from '@/components/empleados/permissions-editor';
import { ObjecionesEditor } from '@/components/empleados/objeciones-editor';

const TAB_DEFS = [
  { value: 'users', label: 'Lista de Usuarios', icon: Users, hint: 'Cuentas y roles' },
  { value: 'teams', label: 'Equipos de Mentores', icon: Users2, hint: 'Agrupaciones' },
  { value: 'permissions', label: 'Permisos por Rol', icon: ShieldCheck, hint: 'Acceso por rutas' },
  { value: 'tags', label: 'Etiquetas Objeciones', icon: Tag, hint: 'Catálogo' },
];

export default function EmpleadosPage() {
  const [users, setUsers] = useState<EmpleadoUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [teams, setTeams] = useState<MentorTeam[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [tags, setTags] = useState<ObjecionTag[]>([]);

  // availablePaths se deriva DIRECTO del nav-config del sidebar (fuente de
  // verdad). Asi cuando se anade/quita un item del sidebar, los permisos
  // por rol se actualizan automaticamente sin tocar nada en el backend.
  const availablePaths = useMemo<AvailablePath[]>(
    () => navigation.map((n) => ({ label: n.label, path: n.href })),
    [],
  );

  const load = useCallback(async () => {
    try {
      const [u, r, t, p, g] = await Promise.all([
        empleadosApi.listUsers(),
        empleadosApi.listRoles(),
        empleadosApi.listTeams(),
        empleadosApi.listPermissions(),
        empleadosApi.listTags(),
      ]);
      setUsers(u.results);
      setRoles(r.results);
      setTeams(t.results);
      setPermissions(p.results);
      setTags(g.results);
    } catch {
      toast.error('Error cargando empleados');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative mx-auto max-w-[1600px] space-y-5 p-4">
      {/* Orbs ambient */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              👥
            </span>
            <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Empleados y Permisos
            </span>
          </h1>
          <p className="mt-1 ml-12 text-sm text-blue-300/60">
            Gestiona los accesos de tu equipo y configura las opciones del sistema.
          </p>
          <p className="mt-1 ml-12 text-xs text-blue-300/40">
            <b className="text-cyan-300">{users.length}</b> usuarios ·{' '}
            <b className="text-cyan-300">{roles.length}</b> roles ·{' '}
            <b className="text-cyan-300">{teams.length}</b> equipos ·{' '}
            <b className="text-cyan-300">{tags.length}</b> etiquetas
          </p>
        </div>
        <AddUserDialog availableRoles={roles} onCreated={load} />
      </header>

      <Tabs defaultValue="users" className="gap-4">
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628]/80 via-[#0d1f3a]/80 to-[#0a1628]/80 p-1 shadow-[0_0_20px_rgba(59,130,246,0.10)]">
          {TAB_DEFS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-2 rounded-lg px-3 py-1.5 text-blue-100/70 transition-all hover:bg-blue-500/10 hover:text-cyan-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600/40 data-[state=active]:to-cyan-500/40 data-[state=active]:text-cyan-100 data-[state=active]:shadow-[0_0_15px_rgba(34,211,238,0.25)] data-[state=active]:ring-1 data-[state=active]:ring-cyan-400/40"
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_DEFS.map(({ value, label }) => (
          <TabsContent key={value} value={value} className="m-0">
            <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] shadow-[0_0_30px_rgba(59,130,246,0.10)]">
              <div className="flex items-center justify-between border-b border-blue-500/15 bg-gradient-to-r from-blue-950/40 via-blue-900/30 to-blue-950/40 px-4 py-2.5">
                <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                  {label}
                </h2>
              </div>
              <div className="p-4">
                {value === 'users' && (
                  <UserTable users={users} availableRoles={roles} onChanged={load} />
                )}
                {value === 'teams' && (
                  <TeamTable teams={teams} users={users} onChanged={load} />
                )}
                {value === 'permissions' && (
                  <PermissionsEditor
                    roles={roles}
                    permissions={permissions}
                    availablePaths={availablePaths}
                    onChanged={load}
                  />
                )}
                {value === 'tags' && <ObjecionesEditor tags={tags} onChanged={load} />}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
