'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/format';
import {
  ESTADO_EMPLEADO,
  TIPO_CONTRATO,
  type Departamento,
  type Empleado,
  type Paginated,
} from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UsersRound, Plus } from 'lucide-react';
import { EmpleadoDialog } from './empleado-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ESTADO_TONE: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  baja_temporal: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  inactivo: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function EmpleadosPage() {
  const [data, setData] = useState<Paginated<Empleado> | null>(null);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [estado, setEstado] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [editing, setEditing] = useState<Empleado | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api
      .get<Paginated<Departamento>>('/api/v1/departamentos/')
      .then((d) => setDepartamentos(d.results));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced) params.set('search', debounced);
    if (estado !== 'all') params.set('estado', estado);
    if (deptFilter !== 'all') params.set('departamento', deptFilter);
    setLoading(true);
    api
      .get<Paginated<Empleado>>(`/api/v1/empleados/?${params}`)
      .then(setData)
      .catch(() => toast.error('Error cargando empleados'))
      .finally(() => setLoading(false));
  }, [debounced, estado, deptFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.count} empleados en la empresa` : 'Cargando...'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, DNI..."
            className="pl-9"
          />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v || 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADO_EMPLEADO.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v || 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departamentos.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Salario</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data && (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {data?.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <UsersRound className="h-10 w-10" />
                    <p>No hay empleados con esos filtros</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {data?.results.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => setEditing(e)}>
                <TableCell>
                  <div className="font-medium">{e.nombre_completo}</div>
                  <div className="text-xs text-slate-500">{e.email}</div>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {e.departamento_nombre || '—'}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {e.puesto || '—'}
                </TableCell>
                <TableCell>
                  {e.tipo_contrato ? (
                    <Badge variant="outline">
                      {TIPO_CONTRATO.find((t) => t.value === e.tipo_contrato)?.label ||
                        e.tipo_contrato}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                  {e.salario_bruto_anual ? formatEuros(e.salario_bruto_anual) : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={cn('font-medium', ESTADO_TONE[e.estado])}>
                    {ESTADO_EMPLEADO.find((s) => s.value === e.estado)?.label || e.estado}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EmpleadoDialog
        empleado={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        departamentos={departamentos}
        empleados={data?.results || []}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <EmpleadoDialog
        empleado={null}
        open={creating}
        onClose={() => setCreating(false)}
        departamentos={departamentos}
        empleados={data?.results || []}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
    </div>
  );
}
