'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paginated, Profile, Role } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Users, Lock } from 'lucide-react';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<Profile>>('/api/v1/profiles/'),
      api.get<Paginated<Role>>('/api/v1/roles/'),
    ])
      .then(([p, r]) => {
        setProfiles(p.results);
        setRoles(r.results);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios y permisos</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gestión de perfiles, roles y rutas permitidas
        </p>
      </header>

      <Tabs defaultValue="profiles">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profiles">
            <Users className="h-4 w-4 mr-1.5" />
            Usuarios ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-1.5" />
            Roles ({roles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-6">
          <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                      Sin usuarios
                    </TableCell>
                  </TableRow>
                )}
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {initials(p.full_name || p.user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{p.full_name || p.user.username}</div>
                          <div className="text-xs text-slate-500">@{p.user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {p.user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.roles.length === 0 && (
                          <span className="text-xs text-slate-400">sin rol</span>
                        )}
                        {p.roles.map((r) => (
                          <Badge key={r.id} variant="secondary">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {loading && (
              <>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            )}
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Shield className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">{role.name}</CardTitle>
                  </div>
                  {role.description && (
                    <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Lock className="h-3 w-3" />
                    Rutas permitidas ({role.permissions.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((p) => (
                      <code
                        key={p.id}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {p.allowed_path}
                      </code>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
