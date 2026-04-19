'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { EmpleadoUser, MentorTeam } from '@/lib/empleados-types';
import { empleadosApi } from '@/lib/empleados-api';

interface Props {
  open: boolean;
  team: MentorTeam | null;
  users: EmpleadoUser[];
  onClose: () => void;
  onSaved: () => void;
}

export function TeamModal({ open, team, users, onClose, onSaved }: Props) {
  const [name, setName] = useState(team?.name || '');
  const [selected, setSelected] = useState<string[]>(team?.user_ids || []);
  const [saving, setSaving] = useState(false);

  const toggleUser = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      if (team) {
        await empleadosApi.updateTeam(team.id, { name: name.trim(), user_ids: selected });
      } else {
        await empleadosApi.createTeam({ name: name.trim(), user_ids: selected });
      }
      toast.success(team ? 'Equipo actualizado' : 'Equipo creado');
      onSaved();
    } catch {
      toast.error('Error guardando equipo');
    } finally {
      setSaving(false);
    }
  };

  // Los candidatos a mentor son los usuarios activos con rol Mentor
  // (relajado: si ninguno, cualquier activo).
  const mentorUsers = users.filter((u) => !u.is_blocked && u.roles.includes('Mentor'));
  const candidates = mentorUsers.length > 0 ? mentorUsers : users.filter((u) => !u.is_blocked);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre del equipo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mentores Alpha"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Miembros</Label>
            <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
              {candidates.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">
                  No hay usuarios con rol Mentor disponibles.
                </p>
              ) : (
                candidates.map((u) => {
                  const isSel = selected.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-left text-sm transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
                        isSel && 'bg-primary/5',
                      )}
                    >
                      <div>
                        <p className="font-medium">{u.display_name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      {isSel && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs text-slate-500">{selected.length} miembro(s) seleccionado(s)</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
