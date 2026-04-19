'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { closersAdminApi, type Closer, type PendingOrganizer } from '@/lib/closers-api';

export default function ClosersAdminPage() {
  const [closers, setClosers] = useState<Closer[]>([]);
  const [pending, setPending] = useState<PendingOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<Closer | null>(null);
  const [prefillEmail, setPrefillEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, p] = await Promise.all([
        closersAdminApi.list(),
        closersAdminApi.pending(),
      ]);
      setClosers(l.results);
      setPending(p.results);
    } catch {
      toast.error('Error cargando closers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (c: Closer) => {
    if (!confirm(`¿Eliminar al closer ${c.full_name}?`)) return;
    try {
      await closersAdminApi.delete(c.id);
      toast.success('Closer eliminado');
      await load();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Equipo Closers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión del equipo comercial y asignación de PINs.
        </p>
      </header>

      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Organizers de Calendly sin closer asignado ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {pending.map((p) => (
                <li
                  key={p.organizer_email}
                  className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-white p-2 dark:border-amber-900 dark:bg-slate-900"
                >
                  <span>
                    <b>{p.organizer_email}</b> — {p.meeting_count} meetings
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPrefillEmail(p.organizer_email)}
                  >
                    Crear closer
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear nuevo closer</CardTitle>
        </CardHeader>
        <CardContent>
          <NewCloserForm prefillEmail={prefillEmail} onCreated={() => { setPrefillEmail(''); load(); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Closers activos</CardTitle>
          <span className="text-xs text-muted-foreground">{closers.length} miembros</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Meetings</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Conversión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading &&
                closers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-xs">{c.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          c.role === 'closers_manager'
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-500 text-white',
                        )}
                      >
                        {c.role === 'closers_manager' ? 'Jefa' : 'Closer'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {c.stats.total_meetings}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600">
                      {c.stats.sales}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {c.stats.conversion_pct}%
                    </TableCell>
                    <TableCell>
                      {c.pin_locked_until ? (
                        <Badge className="bg-rose-600 text-white">Bloqueado</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon-sm" variant="ghost" onClick={() => setResetting(c)}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => remove(c)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ResetPinDialog
        closer={resetting}
        onClose={() => setResetting(null)}
        onDone={load}
      />
    </div>
  );
}

function NewCloserForm({
  prefillEmail,
  onCreated,
}: {
  prefillEmail: string;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'closer' | 'closers_manager'>('closer');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  const submit = async () => {
    if (!fullName.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Email inválido');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error('PIN debe ser 6 dígitos');
      return;
    }
    setSaving(true);
    try {
      const r = await closersAdminApi.create({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        pin,
        role,
      });
      toast.success(
        r.meetings_assigned > 0
          ? `Closer creado. ${r.meetings_assigned} meetings asignados automáticamente.`
          : 'Closer creado',
      );
      setFullName('');
      setEmail('');
      setPin('');
      onCreated();
    } catch (err) {
      toast.error((err as { data?: { detail?: string } })?.data?.detail || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="space-y-1">
        <Label>Nombre completo</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="closer@acme.com"
        />
      </div>
      <div className="space-y-1">
        <Label>PIN (6 dígitos)</Label>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
        />
      </div>
      <div className="space-y-1">
        <Label>Rol</Label>
        <Select value={role} onValueChange={(v) => setRole((v as typeof role) || 'closer')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="closer">Closer</SelectItem>
            <SelectItem value="closers_manager">Jefa (closers_manager)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-4">
        <Button onClick={submit} disabled={saving}>
          <UserPlus className="h-4 w-4" />
          {saving ? 'Creando...' : 'Crear closer'}
        </Button>
      </div>
    </div>
  );
}

function ResetPinDialog({
  closer,
  onClose,
  onDone,
}: {
  closer: Closer | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!closer) setPin('');
  }, [closer]);

  const submit = async () => {
    if (!closer) return;
    if (!/^\d{6}$/.test(pin)) {
      toast.error('PIN debe ser 6 dígitos');
      return;
    }
    setSaving(true);
    try {
      await closersAdminApi.resetPin(closer.id, pin);
      toast.success('PIN actualizado');
      onDone();
      onClose();
    } catch {
      toast.error('Error al cambiar PIN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!closer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resetear PIN de {closer?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Label>Nuevo PIN (6 dígitos)</Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Guardando...' : 'Actualizar PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
