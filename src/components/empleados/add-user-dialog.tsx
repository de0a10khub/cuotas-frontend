'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Lock, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { empleadosApi } from '@/lib/empleados-api';

interface Props {
  availableRoles: string[];
  onCreated: () => void;
}

type Method = 'invitation' | 'password';

export function AddUserDialog({ availableRoles, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>('invitation');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(availableRoles[0] || '');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMethod('invitation');
    setEmail('');
    setDisplayName('');
    setPassword('');
    setRole(availableRoles[0] || '');
  };

  const submit = async () => {
    if (!email.trim()) {
      toast.error('Email requerido');
      return;
    }
    if (method === 'password' && password.length < 6) {
      toast.error('Contraseña mínima 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await empleadosApi.createUser({
        email: email.trim(),
        display_name: displayName.trim(),
        role,
        method,
        password: method === 'password' ? password : undefined,
      });
      toast.success(method === 'invitation' ? 'Invitación enviada' : 'Usuario creado');
      onCreated();
      reset();
      setOpen(false);
    } catch (err) {
      toast.error((err as { data?: { detail?: string } })?.data?.detail || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Crea una cuenta nueva o envía una invitación por email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MethodTile
              icon={Mail}
              label="Invitación"
              hint="Email con enlace"
              active={method === 'invitation'}
              onClick={() => setMethod('invitation')}
            />
            <MethodTile
              icon={Lock}
              label="Contraseña"
              hint="Temporal, cambiable"
              active={method === 'password'}
              onClick={() => setMethod('password')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nombre para mostrar</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Laura Martín"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Correo electrónico <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@acme.com"
              required
            />
          </div>

          {method === 'password' && (
            <div className="space-y-1.5">
              <Label>
                Contraseña temporal <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Rol inicial</Label>
            <Select value={role} onValueChange={(v) => setRole(v || availableRoles[0] || '')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Guardando...' : method === 'invitation' ? 'Enviar invitación' : 'Crear usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodTile({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-slate-500">{hint}</span>
    </button>
  );
}
