'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/format';
import type { MentorTeam, Paginated, ProductCatalog } from '@/lib/types';
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
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Package, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const BILLING_LABELS = {
  one_time: 'Pago único',
  recurring: 'Recurrente',
  installments: 'Cuotas',
} as const;

const PLATFORM_COLOR: Record<string, string> = {
  stripe: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  whop: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

type FormData = {
  nombre: string;
  platform: 'stripe' | 'whop';
  external_id: string;
  billing_type: 'one_time' | 'recurring' | 'installments';
  total_contract_value: string;
  currency: string;
  mentor_team: string;
  activo: boolean;
};

const emptyForm: FormData = {
  nombre: '',
  platform: 'stripe',
  external_id: '',
  billing_type: 'installments',
  total_contract_value: '',
  currency: 'EUR',
  mentor_team: '',
  activo: true,
};

export default function CatalogoPage() {
  const [data, setData] = useState<Paginated<ProductCatalog> | null>(null);
  const [teams, setTeams] = useState<MentorTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [platform, setPlatform] = useState('all');
  const [editing, setEditing] = useState<ProductCatalog | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api.get<Paginated<MentorTeam>>('/api/v1/mentor-teams/').then((d) => setTeams(d.results));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced) params.set('search', debounced);
    if (platform !== 'all') params.set('platform', platform);
    setLoading(true);
    api
      .get<Paginated<ProductCatalog>>(`/api/v1/productos/?${params}`)
      .then(setData)
      .catch(() => toast.error('Error cargando catálogo'))
      .finally(() => setLoading(false));
  }, [debounced, platform]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de productos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.count} productos configurados` : 'Cargando...'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o external ID..."
            className="pl-9"
          />
        </div>
        <Select value={platform} onValueChange={(v) => setPlatform(v || 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las plataformas</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="whop">Whop</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Facturación</TableHead>
              <TableHead className="text-right">Contrato total</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            )}
            {data?.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Package className="h-10 w-10" />
                    <p>Sin productos</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {data?.results.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setEditing(p)}>
                <TableCell>
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-slate-500 font-mono">{p.external_id}</div>
                </TableCell>
                <TableCell>
                  <Badge className={cn('font-medium', PLATFORM_COLOR[p.platform])}>
                    {p.platform}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{BILLING_LABELS[p.billing_type]}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                  {formatEuros(p.total_contract_value)}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {p.mentor_team_nombre || '—'}
                </TableCell>
                <TableCell>
                  {p.activo ? (
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

      <ProductoDialog
        producto={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
        teams={teams}
      />

      <ProductoDialog
        producto={null}
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
        teams={teams}
      />
    </div>
  );
}

function ProductoDialog({
  producto,
  open,
  onClose,
  onSaved,
  teams,
}: {
  producto: ProductCatalog | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  teams: MentorTeam[];
}) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editing = !!producto;

  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre,
        platform: producto.platform,
        external_id: producto.external_id,
        billing_type: producto.billing_type,
        total_contract_value: producto.total_contract_value,
        currency: producto.currency,
        mentor_team: producto.mentor_team || '',
        activo: producto.activo,
      });
    } else {
      setForm(emptyForm);
    }
  }, [producto, open]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...form,
      mentor_team: form.mentor_team || null,
    };
    try {
      if (editing) {
        await api.patch(`/api/v1/productos/${producto.id}/`, payload);
        toast.success('Producto actualizado');
      } else {
        await api.post('/api/v1/productos/', payload);
        toast.success('Producto creado');
      }
      onSaved();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!producto) return;
    if (!confirm(`¿Eliminar producto "${producto.nombre}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/productos/${producto.id}/`);
      toast.success('Producto eliminado');
      onSaved();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Plataforma *</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => v && update('platform', v as 'stripe' | 'whop')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="whop">Whop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="external_id">External ID *</Label>
              <Input
                id="external_id"
                value={form.external_id}
                onChange={(e) => update('external_id', e.target.value)}
                placeholder="prod_xxx / whop_xxx"
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Facturación</Label>
              <Select
                value={form.billing_type}
                onValueChange={(v) =>
                  v && update('billing_type', v as FormData['billing_type'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Pago único</SelectItem>
                  <SelectItem value="recurring">Recurrente</SelectItem>
                  <SelectItem value="installments">Cuotas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">Valor contrato (€)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={form.total_contract_value}
                onChange={(e) => update('total_contract_value', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Equipo mentor</Label>
            <Select
              value={form.mentor_team || 'none'}
              onValueChange={(v) => update('mentor_team', !v || v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={remove}
                disabled={deleting || saving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
