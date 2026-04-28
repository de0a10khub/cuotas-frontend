'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Trash2, Users2 } from 'lucide-react';
import { toast } from 'sonner';

import type { EmpleadoUser, MentorTeam } from '@/lib/empleados-types';
import { empleadosApi } from '@/lib/empleados-api';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { TeamModal } from './team-modal';

interface Props {
  teams: MentorTeam[];
  users: EmpleadoUser[];
  onChanged: () => void;
}

export function TeamTable({ teams, users, onChanged }: Props) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<MentorTeam | null>(null);
  const [creating, setCreating] = useState(false);

  const remove = async (team: MentorTeam) => {
    const ok = await confirm({
      title: 'Eliminar equipo',
      description: <>Vas a eliminar el equipo <b className="text-cyan-300">{team.name}</b>.</>,
      confirmText: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await empleadosApi.deleteTeam(team.id);
      toast.success('Equipo eliminado');
      onChanged();
    } catch {
      toast.error('Error eliminando');
    }
  };

  const userName = (id: string) => users.find((u) => u.id === id)?.display_name || id;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Equipo
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Miembros</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-slate-500">
                  Sin equipos. Crea el primero.
                </TableCell>
              </TableRow>
            )}
            {teams.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <Users2 className="h-4 w-4 text-primary" />
                    {t.name}
                  </div>
                </TableCell>
                <TableCell>
                  {t.user_ids.length === 0 ? (
                    <span className="text-sm text-slate-400">Sin miembros</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {t.user_ids.map((id) => (
                        <Badge key={id} variant="secondary">
                          {userName(id)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => remove(t)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(creating || editing) && (
        <TeamModal
          open
          team={editing}
          users={users}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            onChanged();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
