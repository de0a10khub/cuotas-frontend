'use client';

import { useEffect, useState } from 'react';
import type { ActionLogEntry } from '@/lib/clientes-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Info, ChevronDown, ChevronRight, History } from 'lucide-react';
import type { RecoveryDrawerApi } from './types';

interface Props {
  api: RecoveryDrawerApi;
  subscriptionId: string;
}

function statusTone(status: string) {
  const up = status.toUpperCase();
  if (up === 'SUCCESS' || up === 'PAID') {
    return { Icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (up === 'FAILURE' || up === 'FAILED') {
    return { Icon: XCircle, className: 'text-red-600 dark:text-red-400' };
  }
  return { Icon: Info, className: 'text-slate-500' };
}

export function ActionHistoryList({ api, subscriptionId }: Props) {
  const [items, setItems] = useState<ActionLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api
      .history(subscriptionId)
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
        <History className="h-8 w-8" />
        <p>Sin acciones registradas</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const { Icon, className } = statusTone(item.status);
        const isOpen = expanded[item.id];
        return (
          <li
            key={item.id}
            className="rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <button
              type="button"
              onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
              className="flex w-full items-start gap-2 text-left"
            >
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', className)} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{item.action_type}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.platform}
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs', className, 'border-current/30')}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.created_at).toLocaleString('es-ES')} · {item.performed_by || 'sistema'}
                </p>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>
            {isOpen && (
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-background p-2 text-xs text-slate-600 dark:text-slate-300">
                {JSON.stringify(item.result_payload, null, 2)}
              </pre>
            )}
          </li>
        );
      })}
    </ul>
  );
}
