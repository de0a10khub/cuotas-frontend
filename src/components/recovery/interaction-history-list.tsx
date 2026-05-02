'use client';

import { useEffect, useState } from 'react';
import type { InteractionSnapshot } from '@/lib/mora-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { StatusPill } from '@/components/data/status-pill';
import { RECOVERY_STATUS_STYLES } from './styles';
import type { RecoveryDrawerApi } from './types';

interface Props {
  api: RecoveryDrawerApi;
  subscriptionId: string;
}

const PANEL_LABELS: Record<string, string> = {
  fullpay: 'Full Pay',
  mora_n1: 'Mora N1',
  mora_n2: 'Mora N2',
  recobros: 'Recobros',
  clientes: 'Clientes',
};

const PANEL_TONE: Record<string, string> = {
  fullpay: 'border-emerald-400/40 text-emerald-700 dark:text-emerald-300',
  mora_n1: 'border-amber-400/40 text-amber-700 dark:text-amber-300',
  mora_n2: 'border-orange-400/40 text-orange-700 dark:text-orange-300',
  recobros: 'border-rose-400/40 text-rose-700 dark:text-rose-300',
  clientes: 'border-cyan-400/40 text-cyan-700 dark:text-cyan-300',
};

// Snapshots históricos de cada "Guardar Gestión". Append-only.
// Solo /mora lo muestra (a través del tab "Seguimiento").
export function InteractionHistoryList({ api, subscriptionId }: Props) {
  const [items, setItems] = useState<InteractionSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.interactions) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    api
      .interactions(subscriptionId)
      .then((d) => !cancel && setItems(d.results))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [api, subscriptionId]);

  if (loading) return <Skeleton className="h-24 w-full" />;

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
        <Clock className="h-8 w-8" />
        <p>Sin gestiones registradas</p>
        <p className="text-xs">Cada &quot;Guardar Gestión&quot; crea una entrada aquí.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="flex flex-wrap items-center gap-2">
            {item.panel && (
              <Badge
                variant="outline"
                className={`text-xs ${PANEL_TONE[item.panel] || 'border-slate-400/40'}`}
                title="Panel desde el que se escribió"
              >
                {PANEL_LABELS[item.panel] || item.panel}
              </Badge>
            )}
            {item.status && <StatusPill value={item.status} styles={RECOVERY_STATUS_STYLES} />}
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <User className="h-3 w-3" />
              {item.contacted_by || 'Sin asignar'}
            </span>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {new Date(item.created_at).toLocaleString('es-ES')}
            </span>
          </div>
          {(item.comment_1 || item.comment_2 || item.continue_with) && (
            <div className="mt-2 space-y-1.5 text-xs">
              {item.comment_1 && (
                <Snippet label="C1" value={item.comment_1} />
              )}
              {item.continue_with && (
                <Snippet label="Siguiente" value={item.continue_with} highlight />
              )}
              {item.comment_2 && (
                <Snippet label="C2" value={item.comment_2} />
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Snippet({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={highlight ? 'font-medium text-primary' : 'text-slate-600 dark:text-slate-300'}>
        {value}
      </span>
    </div>
  );
}
