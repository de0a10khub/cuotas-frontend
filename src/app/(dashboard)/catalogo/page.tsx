'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Check,
  Edit2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { catalogApi, type CatalogProduct } from '@/lib/catalog-api';
import { empleadosApi } from '@/lib/empleados-api';
import type { MentorTeam } from '@/lib/empleados-types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';

const BILLING_OPTIONS = [
  { value: 'financing', label: 'Financiación' },
  { value: 'subscription', label: 'Suscripción' },
  { value: 'one_time', label: 'Pago único' },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n || 0);
}

export default function CatalogoPage() {
  const confirm = useConfirm();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [teams, setTeams] = useState<MentorTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<'all' | 'stripe' | 'whop'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<CatalogProduct>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await catalogApi.list();
      setProducts(r.results);
    } catch {
      toast.error('Error cargando catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    empleadosApi
      .listTeams()
      .then((d) => setTeams(d.results))
      .catch(() => setTeams([]));
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (platform !== 'all' && p.platform !== platform) return false;
      if (q) {
        const hay =
          (p.external_name || '').toLowerCase().includes(q) ||
          (p.external_identifier || '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [products, search, platform]);

  const teamName = useCallback(
    (id: string | null) => teams.find((t) => t.id === id)?.name || 'N/A',
    [teams],
  );

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await catalogApi.syncMissing();
      toast.success(r.message);
      await load();
    } catch {
      toast.error('Error sincronizando');
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (p: CatalogProduct) => {
    setEditingId(p.id);
    setEditDraft({
      total_contract_value: p.total_contract_value,
      product_group: p.product_group,
      mentor_team_id: p.mentor_team_id,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };
  const saveEdit = async (id: string) => {
    try {
      const updated = await catalogApi.update(id, editDraft);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast.success('Producto actualizado');
      cancelEdit();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const toggleFlag = async (
    p: CatalogProduct,
    field: 'has_mentorship' | 'has_refinancing' | 'has_amortization',
  ) => {
    try {
      const updated = await catalogApi.update(p.id, { [field]: !p[field] });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch {
      toast.error('Error actualizando flag');
    }
  };

  const remove = async (p: CatalogProduct) => {
    const ok = await confirm({
      title: 'Eliminar producto',
      description: (
        <>
          Vas a eliminar <b className="text-cyan-300">{p.external_name || p.external_identifier}</b> del
          catálogo.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await catalogApi.remove(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Producto eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
            <RefreshCcw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            Sincronizar Productos
          </Button>
          <AddProductDialog teams={teams} onCreated={load} />
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7"
            />
          </div>
          <Select
            value={platform}
            onValueChange={(v) => setPlatform((v as 'all' | 'stripe' | 'whop') || 'all')}
          >
            <SelectTrigger className="h-8 w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="whop">Whop</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {filtered.length} producto{filtered.length === 1 ? '' : 's'}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Productos registrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plataforma</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Valor Contrato</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Tipo Facturación</TableHead>
                <TableHead className="text-center">Mentoría</TableHead>
                <TableHead>Equipo Mentor</TableHead>
                <TableHead className="text-center">Refin.</TableHead>
                <TableHead className="text-center">Amortiz.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                    Sin productos con esos filtros.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filtered.map((p) => {
                  const isEditing = editingId === p.id;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant={p.platform === 'stripe' ? 'default' : 'secondary'}>
                          {p.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{p.external_name || '—'}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {p.external_identifier}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={editDraft.total_contract_value ?? p.total_contract_value}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  total_contract_value: Number(e.target.value) || 0,
                                })
                              }
                              className="h-7 w-24 text-right"
                            />
                            <Button size="icon-sm" variant="ghost" onClick={() => saveEdit(p.id)}>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button size="icon-sm" variant="ghost" onClick={cancelEdit}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          formatCurrency(p.total_contract_value)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDraft.product_group ?? p.product_group ?? ''}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, product_group: e.target.value || null })
                            }
                            className="h-7"
                          />
                        ) : p.product_group ? (
                          <Badge variant="secondary">{p.product_group}</Badge>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Sin Grupo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {BILLING_OPTIONS.find((o) => o.value === p.billing_type)?.label ||
                            p.billing_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={p.has_mentorship}
                          onChange={() => toggleFlag(p, 'has_mentorship')}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editDraft.mentor_team_id ?? p.mentor_team_id ?? '__none__'}
                            onValueChange={(v) =>
                              setEditDraft({
                                ...editDraft,
                                mentor_team_id: v === '__none__' ? null : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-36" size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sin equipo</SelectItem>
                              {teams.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {teamName(p.mentor_team_id)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={p.has_refinancing}
                          onChange={() => toggleFlag(p, 'has_refinancing')}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={p.has_amortization}
                          onChange={() => toggleFlag(p, 'has_amortization')}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {!isEditing && (
                          <>
                            <Button size="icon-sm" variant="ghost" onClick={() => startEdit(p)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => remove(p)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AddProductDialog({
  teams,
  onCreated,
}: {
  teams: MentorTeam[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<'stripe' | 'whop'>('stripe');
  const [externalId, setExternalId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [totalValue, setTotalValue] = useState<number>(0);
  const [billingType, setBillingType] = useState('one_time');
  const [productGroup, setProductGroup] = useState('');
  const [mentorTeamId, setMentorTeamId] = useState<string | null>(null);
  const [flags, setFlags] = useState({ mentor: false, refin: false, amort: false });
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPlatform('stripe');
    setExternalId('');
    setExternalName('');
    setTotalValue(0);
    setBillingType('one_time');
    setProductGroup('');
    setMentorTeamId(null);
    setFlags({ mentor: false, refin: false, amort: false });
  };

  const submit = async () => {
    if (!externalId.trim()) {
      toast.error('external_identifier requerido');
      return;
    }
    setSaving(true);
    try {
      await catalogApi.create({
        platform,
        external_identifier: externalId.trim(),
        external_name: externalName.trim() || null,
        total_contract_value: totalValue,
        billing_type: billingType as CatalogProduct['billing_type'],
        has_mentorship: flags.mentor,
        has_refinancing: flags.refin,
        has_amortization: flags.amort,
        product_group: productGroup.trim() || null,
        mentor_team_id: mentorTeamId,
      });
      toast.success('Producto creado');
      reset();
      setOpen(false);
      onCreated();
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
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Añadir Producto
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir producto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Plataforma">
              <Select value={platform} onValueChange={(v) => setPlatform((v as 'stripe' | 'whop') || 'stripe')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="whop">Whop</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo facturación">
              <Select value={billingType} onValueChange={(v) => setBillingType(v || 'one_time')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="External ID">
            <Input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="price_XXX / plan_YYY"
            />
          </Field>
          <Field label="Nombre producto">
            <Input
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              placeholder="Ej: Master Trading 2026"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Valor contrato (€)">
              <Input
                type="number"
                value={totalValue}
                onChange={(e) => setTotalValue(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Grupo">
              <Input
                value={productGroup}
                onChange={(e) => setProductGroup(e.target.value)}
                placeholder="Ej: Mentoría"
              />
            </Field>
          </div>
          <Field label="Equipo mentor">
            <Select
              value={mentorTeamId || '__none__'}
              onValueChange={(v) => setMentorTeamId(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin equipo</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex flex-wrap gap-3 rounded-md border border-slate-200 p-2 dark:border-slate-800">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={flags.mentor}
                onChange={(e) => setFlags({ ...flags, mentor: e.target.checked })}
              />
              Tiene mentoría
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={flags.refin}
                onChange={(e) => setFlags({ ...flags, refin: e.target.checked })}
              />
              Refinanciación
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={flags.amort}
                onChange={(e) => setFlags({ ...flags, amort: e.target.checked })}
              />
              Amortización
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creando...' : 'Crear producto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
