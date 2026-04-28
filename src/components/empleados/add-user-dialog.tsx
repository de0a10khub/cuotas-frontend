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
import { Copy, Eye, EyeOff, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { empleadosApi } from '@/lib/empleados-api';
import { generatePassword } from '@/lib/password-generator';

interface Props {
  availableRoles: string[];
  onCreated: () => void;
}

export function AddUserDialog({ availableRoles, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [role, setRole] = useState(availableRoles[0] || '');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEmail('');
    setDisplayName('');
    setPassword('');
    setShowPassword(true);
    setRole(availableRoles[0] || '');
    setGender('');
  };

  const regen = () => {
    setPassword(generatePassword(16));
    setShowPassword(true);
  };

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Contraseña copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const submit = async () => {
    if (!email.trim()) {
      toast.error('Email requerido');
      return;
    }
    if (password.length < 8) {
      toast.error('Contraseña mínima 8 caracteres');
      return;
    }
    if (!gender) {
      toast.error('Selecciona si es Hombre o Mujer');
      return;
    }
    setSaving(true);
    try {
      await empleadosApi.createUser({
        email: email.trim(),
        display_name: displayName.trim(),
        role,
        method: 'password',
        password,
        gender,
      });
      toast.success('Usuario creado — pasa la contraseña al empleado');
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md border border-cyan-400/30 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] text-blue-100 shadow-[0_0_50px_rgba(34,211,238,0.25)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />

        <DialogHeader className="relative">
          <DialogTitle className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            Nuevo Usuario
          </DialogTitle>
          <DialogDescription className="text-blue-100/70">
            Crea una cuenta y entrégale la contraseña al empleado.
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-3">
          <div className="space-y-1.5">
            <Label className="text-blue-200">Nombre para mostrar</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Laura Martín"
              className="border-blue-500/30 bg-blue-950/40 text-blue-50 placeholder:text-blue-300/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-blue-200">
              Correo electrónico <span className="text-rose-400">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@acme.com"
              className="border-blue-500/30 bg-blue-950/40 text-blue-50 placeholder:text-blue-300/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-blue-200">
                Contraseña <span className="text-rose-400">*</span>
              </Label>
              <span className="text-[10px] uppercase tracking-wider text-cyan-300/60">
                16 caracteres · mayús + minús + nº + signos
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Pulsa Generar o escribe una"
                  className="pr-9 font-mono border-blue-500/30 bg-blue-950/40 text-cyan-100 placeholder:text-blue-300/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center text-blue-300/60 hover:text-cyan-200"
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={copy}
                disabled={!password}
                className="border border-blue-500/30 bg-blue-950/40 text-blue-100 hover:bg-blue-900/50 hover:text-white"
                title="Copiar contraseña"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={regen}
                className="border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Generar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-blue-200">
                Género <span className="text-rose-400">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { v: 'M', l: 'Hombre' },
                  { v: 'F', l: 'Mujer' },
                ] as const).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGender(v)}
                    className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      gender === v
                        ? 'border-cyan-400/60 bg-gradient-to-r from-blue-600/40 to-cyan-500/40 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                        : 'border-blue-500/30 bg-blue-950/40 text-blue-200 hover:bg-blue-900/50'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-blue-200">Rol inicial</Label>
              <Select value={role} onValueChange={(v) => setRole(v || availableRoles[0] || '')}>
                <SelectTrigger className="w-full border-blue-500/30 bg-blue-950/40 text-blue-50 focus:border-cyan-400/60">
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
        </div>

        <DialogFooter className="relative">
          <Button
            variant="ghost"
            className="border border-blue-500/30 bg-blue-950/40 text-blue-100 hover:bg-blue-900/50 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
