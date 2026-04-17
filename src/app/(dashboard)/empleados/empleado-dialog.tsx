'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ESTADO_EMPLEADO,
  TIPO_CONTRATO,
  type Departamento,
  type Empleado,
} from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  empleado: Empleado | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  departamentos: Departamento[];
  empleados: Empleado[];
}

type FormData = {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  dni: string;
  departamento: string;
  puesto: string;
  jefe_directo: string;
  tipo_contrato: string;
  fecha_alta: string;
  fecha_baja: string;
  salario_bruto_anual: string;
  moneda: string;
  estado: string;
  notas: string;
};

const empty: FormData = {
  nombre: '',
  apellidos: '',
  email: '',
  telefono: '',
  dni: '',
  departamento: '',
  puesto: '',
  jefe_directo: '',
  tipo_contrato: '',
  fecha_alta: '',
  fecha_baja: '',
  salario_bruto_anual: '',
  moneda: 'EUR',
  estado: 'activo',
  notas: '',
};

export function EmpleadoDialog({
  empleado,
  open,
  onClose,
  onSaved,
  departamentos,
  empleados,
}: Props) {
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editing = !!empleado;

  useEffect(() => {
    if (empleado) {
      setForm({
        nombre: empleado.nombre || '',
        apellidos: empleado.apellidos || '',
        email: empleado.email || '',
        telefono: empleado.telefono || '',
        dni: empleado.dni || '',
        departamento: empleado.departamento || '',
        puesto: empleado.puesto || '',
        jefe_directo: empleado.jefe_directo || '',
        tipo_contrato: empleado.tipo_contrato || '',
        fecha_alta: empleado.fecha_alta || '',
        fecha_baja: empleado.fecha_baja || '',
        salario_bruto_anual: empleado.salario_bruto_anual || '',
        moneda: empleado.moneda || 'EUR',
        estado: empleado.estado || 'activo',
        notas: empleado.notas || '',
      });
    } else {
      setForm(empty);
    }
  }, [empleado, open]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = { ...form };
    // Normaliza strings vacíos a null para FK/fechas/decimales
    ['departamento', 'jefe_directo', 'fecha_alta', 'fecha_baja', 'salario_bruto_anual', 'tipo_contrato'].forEach(
      (k) => {
        if (!payload[k]) payload[k] = null;
      },
    );
    try {
      if (editing) {
        await api.patch(`/api/v1/empleados/${empleado.id}/`, payload);
        toast.success('Empleado actualizado');
      } else {
        await api.post('/api/v1/empleados/', payload);
        toast.success('Empleado creado');
      }
      onSaved();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!empleado) return;
    if (!confirm(`¿Eliminar a ${empleado.nombre_completo}?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/empleados/${empleado.id}/`);
      toast.success('Empleado eliminado');
      onSaved();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Actualiza los datos del empleado' : 'Añade un nuevo empleado al equipo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Identidad
              </h3>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input
                id="apellidos"
                value={form.apellidos}
                onChange={(e) => update('apellidos', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => update('telefono', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={form.dni}
                onChange={(e) => update('dni', e.target.value)}
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Organización
              </h3>
            </div>
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select
                value={form.departamento || 'none'}
                onValueChange={(v) => update('departamento', !v || v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="puesto">Puesto</Label>
              <Input
                id="puesto"
                value={form.puesto}
                onChange={(e) => update('puesto', e.target.value)}
                placeholder="ej. Jefa de Cobros"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Jefe directo</Label>
              <Select
                value={form.jefe_directo || 'none'}
                onValueChange={(v) => update('jefe_directo', !v || v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin jefe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin jefe</SelectItem>
                  {empleados
                    .filter((e) => e.id !== empleado?.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre_completo}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contrato y compensación
              </h3>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de contrato</Label>
              <Select
                value={form.tipo_contrato || 'none'}
                onValueChange={(v) => update('tipo_contrato', !v || v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {TIPO_CONTRATO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salario">Salario bruto anual (€)</Label>
              <Input
                id="salario"
                type="number"
                step="0.01"
                value={form.salario_bruto_anual}
                onChange={(e) => update('salario_bruto_anual', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha_alta">Fecha alta</Label>
              <Input
                id="fecha_alta"
                type="date"
                value={form.fecha_alta}
                onChange={(e) => update('fecha_alta', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha_baja">Fecha baja</Label>
              <Input
                id="fecha_baja"
                type="date"
                value={form.fecha_baja}
                onChange={(e) => update('fecha_baja', e.target.value)}
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Estado
              </h3>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => v && update('estado', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_EMPLEADO.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={form.notas}
                onChange={(e) => update('notas', e.target.value)}
                rows={2}
              />
            </div>
          </section>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={remove}
                disabled={deleting || saving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Guardar cambios' : 'Crear empleado'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
