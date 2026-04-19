'use client';

import { useCallback, useEffect, useState } from 'react';
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

import { AddUserDialog } from '@/components/empleados/add-user-dialog';
import { UserTable } from '@/components/empleados/user-table';
import { TeamTable } from '@/components/empleados/team-table';
import { PermissionsEditor } from '@/components/empleados/permissions-editor';
import { ObjecionesEditor } from '@/components/empleados/objeciones-editor';

export default function EmpleadosPage() {
  const [users, setUsers] = useState<EmpleadoUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [teams, setTeams] = useState<MentorTeam[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [availablePaths, setAvailablePaths] = useState<AvailablePath[]>([]);
  const [tags, setTags] = useState<ObjecionTag[]>([]);

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
      setAvailablePaths(p.available_paths);
      setTags(g.results);
    } catch {
      toast.error('Error cargando empleados');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados y Permisos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gestiona los accesos de tu equipo y configura las opciones del sistema.
          </p>
        </div>
        <AddUserDialog availableRoles={roles} onCreated={load} />
      </header>

      <Tabs defaultValue="users" className="gap-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Lista de Usuarios
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Users2 className="h-4 w-4" />
            Equipos de Mentores
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Permisos por Rol
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tag className="h-4 w-4" />
            Etiquetas Objeciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserTable users={users} availableRoles={roles} onChanged={load} />
        </TabsContent>

        <TabsContent value="teams">
          <TeamTable teams={teams} users={users} onChanged={load} />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsEditor
            roles={roles}
            permissions={permissions}
            availablePaths={availablePaths}
            onChanged={load}
          />
        </TabsContent>

        <TabsContent value="tags">
          <ObjecionesEditor tags={tags} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
