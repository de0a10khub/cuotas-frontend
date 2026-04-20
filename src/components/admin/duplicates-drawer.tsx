'use client';

import { X, User, CreditCard, Phone, Hash, Database } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DuplicatePending } from '@/lib/admin-data-api';

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

interface Props {
  duplicate: DuplicatePending | null;
  open: boolean;
  onClose: () => void;
}

export function DuplicatesDrawer({ duplicate, open, onClose }: Props) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
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
                  {duplicate?.accounts_found?.length || 0} cuentas detectadas
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
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
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
            {(duplicate?.accounts_found || []).map((acc, idx) => {
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
            {(!duplicate || !duplicate.accounts_found?.length) && (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Sin cuentas detectadas en este registro.
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-dashed bg-muted/30">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Acciones disponibles</h4>
                <Badge variant="outline" className="text-[10px]">Próximamente</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cuando estén listas, verás aquí 3 botones: <strong>🔗 Unificar mismo contrato</strong>,{' '}
                <strong>🔄 Marcar como refinanciación</strong> y <strong>✕ No es lo mismo</strong>.
                Las descripciones de cada una están arriba, en la cabecera de la página.
              </p>
            </CardContent>
          </Card>

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
