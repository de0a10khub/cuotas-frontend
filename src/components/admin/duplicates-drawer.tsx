'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, User, CreditCard, Phone, Hash, Database, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminDataApi, type DuplicateAccount, type DuplicatePending } from '@/lib/admin-data-api';

const PLATFORM_STYLES: Record<string, { label: string; badge: string; bar: string; icon: string }> = {
  stripe: {
    label: 'Stripe',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    bar: 'border-l-indigo-500',
    icon: '💳',
  },
  whop_native: {
    label: 'Whop nativo',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    bar: 'border-l-purple-500',
    icon: '⚡',
  },
  whop_erp: {
    label: 'Whop-ERP (Checkout)',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    bar: 'border-l-orange-500',
    icon: '📦',
  },
};

function styleFor(platform: string) {
  return PLATFORM_STYLES[platform] ?? {
    label: platform,
    badge: 'bg-slate-100 text-slate-700',
    bar: 'border-l-slate-400',
    icon: '❓',
  };
}

function accountKey(a: DuplicateAccount): string {
  return `${a.platform}::${a.external_id}`;
}

interface Props {
  duplicate: DuplicatePending | null;
  open: boolean;
  onClose: () => void;
  onResolved?: () => void;
}

type ActionMode = 'idle' | 'unify' | 'refi' | 'ignore';

export function DuplicatesDrawer({ duplicate, open, onClose, onResolved }: Props) {
  const [mode, setMode] = useState<ActionMode>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');

  const [originalKey, setOriginalKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [opType, setOpType] = useState<'refinanciacion' | 'amortizacion_anticipada'>('refinanciacion');

  useEffect(() => {
    if (!duplicate) return;
    setMode('idle');
    setComment('');
    setOpType('refinanciacion');
    const accs = duplicate.accounts_found || [];
    if (accs.length >= 2) {
      setOriginalKey(accountKey(accs[0]));
      setNewKey(accountKey(accs[1]));
    } else {
      setOriginalKey('');
      setNewKey('');
    }
  }, [duplicate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const accounts = duplicate?.accounts_found || [];
  const isPending = duplicate?.status === 'pending';

  async function runUnify() {
    if (!duplicate) return;
    setSubmitting(true);
    try {
      await adminDataApi.mergeDuplicate(
        duplicate.id,
        comment || 'Unificado - mismo contrato, distintas plataformas',
      );
      toast.success('Cuentas unificadas');
      onResolved?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error unificando';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function runIgnore() {
    if (!duplicate) return;
    setSubmitting(true);
    try {
      await adminDataApi.ignoreDuplicate(
        duplicate.id,
        comment || 'No es el mismo contrato, 2 compras distintas',
      );
      toast.success('Marcado como compras distintas');
      onResolved?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error marcando';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function runRefi() {
    if (!duplicate) return;
    const orig = accounts.find((a) => accountKey(a) === originalKey);
    const next = accounts.find((a) => accountKey(a) === newKey);
    if (!orig || !next) {
      toast.error('Selecciona cuenta original y cuenta nueva');
      return;
    }
    if (accountKey(orig) === accountKey(next)) {
      toast.error('Original y nueva no pueden ser la misma cuenta');
      return;
    }
    setSubmitting(true);
    try {
      await adminDataApi.refinanceDuplicate(duplicate.id, {
        original: { platform: orig.platform, external_id: orig.external_id },
        new: { platform: next.platform, external_id: next.external_id },
        operation_type: opType,
        comment: comment || undefined,
      });
      toast.success('Refinanciación registrada');
      onResolved?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error registrando refinanciación';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 z-10 border-b bg-background p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg">
                {duplicate?.candidate_name || 'Cliente duplicado'}
              </SheetTitle>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{duplicate?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {accounts.length} cuentas detectadas
                </Badge>
                {duplicate?.status === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pendiente</Badge>
                )}
                {duplicate?.status === 'merged' && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Fusionado</Badge>
                )}
                {duplicate?.status === 'ignored' && (
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200">Ignorado</Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={submitting} aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 p-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Cuentas detectadas para este email</h3>
            <p className="text-xs text-muted-foreground">
              Cada tarjeta es un registro separado en una plataforma. Compáralas y decide la acción.
            </p>
          </div>

          <div className="space-y-3">
            {accounts.map((acc, idx) => {
              const s = styleFor(acc.platform);
              return (
                <Card key={`${acc.platform}-${acc.external_id}-${idx}`} className={`border-l-4 ${s.bar}`}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{s.icon}</span>
                      <Badge variant="outline" className={s.badge}>
                        {s.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Cuenta {idx + 1}</span>
                    </div>
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <Field icon={<Hash className="h-3.5 w-3.5" />} label="ID externo" value={acc.external_id} mono />
                      <Field icon={<User className="h-3.5 w-3.5" />} label="Nombre" value={acc.name} />
                      <Field icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono" value={acc.phone} />
                      <Field icon={<Database className="h-3.5 w-3.5" />} label="Fuente" value={acc.source} />
                    </dl>
                  </CardContent>
                </Card>
              );
            })}
            {accounts.length === 0 && (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Sin cuentas detectadas en este registro.
                </CardContent>
              </Card>
            )}
          </div>

          {isPending && mode === 'idle' && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Elige acción</h4>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    className="justify-start border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => setMode('unify')}
                    disabled={submitting}
                  >
                    🔗 Unificar
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    onClick={() => setMode('refi')}
                    disabled={submitting || accounts.length < 2}
                  >
                    🔄 Refinanciación
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-slate-400/50 hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => setMode('ignore')}
                    disabled={submitting}
                  >
                    ✕ No es lo mismo
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Las descripciones detalladas están en la cabecera de la página /admin/duplicados.
                </p>
              </CardContent>
            </Card>
          )}

          {isPending && mode === 'unify' && (
            <Card className="border-emerald-500/50">
              <CardContent className="space-y-3 p-4">
                <div>
                  <h4 className="text-sm font-semibold">🔗 Unificar mismo contrato</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mismo contrato, solo cambió la plataforma de cobro. Las cuentas quedan enlazadas al mismo cliente.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nota (opcional)</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ej.: cliente pagó 2 cuotas por Stripe, resto por Whop-ERP"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setMode('idle')} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={runUnify}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Confirmar unificar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isPending && mode === 'refi' && (
            <Card className="border-indigo-500/50">
              <CardContent className="space-y-3 p-4">
                <div>
                  <h4 className="text-sm font-semibold">🔄 Marcar como refinanciación</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    El plan viejo se canceló y se creó uno nuevo (con precio o cuotas distintas). Selecciona cuál es el original y cuál el nuevo.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cuenta original (vieja)</Label>
                    <Select value={originalKey} onValueChange={setOriginalKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={`orig-${accountKey(a)}`} value={accountKey(a)}>
                            {styleFor(a.platform).icon} {styleFor(a.platform).label} · {a.external_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cuenta nueva (actual)</Label>
                    <Select value={newKey} onValueChange={setNewKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={`new-${accountKey(a)}`} value={accountKey(a)}>
                            {styleFor(a.platform).icon} {styleFor(a.platform).label} · {a.external_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de operación</Label>
                  <Select value={opType} onValueChange={(v) => setOpType(v as typeof opType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refinanciacion">Refinanciación (nuevo plan con cuotas)</SelectItem>
                      <SelectItem value="amortizacion_anticipada">Amortización anticipada (pago único)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Comentario (opcional)</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ej.: cliente no podía pagar 500/mes, pasó a 250/mes en 10 cuotas"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setMode('idle')} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={runRefi}
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Registrar refinanciación
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isPending && mode === 'ignore' && (
            <Card className="border-slate-400/50">
              <CardContent className="space-y-3 p-4">
                <div>
                  <h4 className="text-sm font-semibold">✕ No es lo mismo</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Son compras distintas del mismo cliente. El registro se marca como ignorado y cada cuenta sigue su camino.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo (opcional)</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ej.: son 2 cursos distintos del mismo cliente"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setMode('idle')} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={runIgnore} disabled={submitting} variant="secondary">
                    {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Confirmar ignorar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {duplicate?.resolution_note && (
            <Card>
              <CardContent className="space-y-1 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nota de resolución
                </h4>
                <p className="text-sm">{duplicate.resolution_note}</p>
                {duplicate.reviewed_by && (
                  <p className="text-[11px] text-muted-foreground">
                    por {duplicate.reviewed_by}
                    {duplicate.reviewed_at
                      ? ` · ${new Date(duplicate.reviewed_at).toLocaleDateString('es-ES')}`
                      : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`truncate ${mono ? 'font-mono text-xs' : 'text-sm'}`} title={value || undefined}>
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
