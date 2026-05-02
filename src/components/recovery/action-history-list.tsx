'use client';

import { useEffect, useState } from 'react';
import type { ActionLogEntry } from '@/lib/clientes-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Info, ChevronDown, ChevronRight, History, AlertTriangle } from 'lucide-react';
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

const ACTION_LABELS: Record<string, string> = {
  RETRY_PAYMENT: 'Intento de cobro',
  UPDATE_TRACKING: 'Actualización gestión',
  GENERATE_CONTRACT: 'Contrato generado',
  MANUAL_RECOVERY: 'Recuperación manual',
  PAYMENT_LINK_GENERATED: 'Link de pago generado',
  PAYMENT_FAILED: 'Cobro fallido',
  NOTE_ADDED: 'Nota añadida',
};

const PANEL_LABELS: Record<string, string> = {
  fullpay: 'Full Pay',
  mora_n1: 'Mora N1',
  mora_n2: 'Mora N2',
  recobros: 'Recobros',
  clientes: 'Clientes',
};

function humanizeAction(type: string): string {
  return ACTION_LABELS[type] || type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function panelLabel(panel: string | undefined): string {
  if (!panel) return '';
  return PANEL_LABELS[panel] || panel;
}

function extractError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const candidates = ['error', 'error_message', 'message', 'failure_reason', 'decline_code'];
  for (const k of candidates) {
    const v = p[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
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
        const isNote = item.action_type === 'NOTE_ADDED';
        const errorMsg =
          item.status.toUpperCase() === 'FAILURE' || item.status.toUpperCase() === 'FAILED'
            ? extractError(item.result_payload)
            : null;
        // Para notas: extraemos panel + content del payload.
        const payload = item.result_payload as Record<string, unknown> | undefined;
        const notePanel = typeof payload?.panel === 'string' ? payload.panel : undefined;
        const noteContent = typeof payload?.content === 'string' ? payload.content : '';
        const noteField = typeof payload?.field === 'string' ? payload.field : '';
        return (
          <li
            key={item.id}
            className={cn(
              'rounded-md border p-3',
              isNote
                ? 'border-cyan-300/60 bg-cyan-50/50 dark:border-cyan-800/60 dark:bg-cyan-950/20'
                : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40',
            )}
          >
            <button
              type="button"
              onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
              className="flex w-full items-start gap-2 text-left"
            >
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', className)} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{humanizeAction(item.action_type)}</span>
                  {notePanel && (
                    <Badge variant="outline" className="text-xs border-cyan-400/40 text-cyan-700 dark:text-cyan-300">
                      {panelLabel(notePanel)}
                    </Badge>
                  )}
                  {item.platform && !isNote && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.platform}
                    </Badge>
                  )}
                  {!isNote && (
                    <Badge variant="outline" className={cn('text-xs', className, 'border-current/30')}>
                      {item.status}
                    </Badge>
                  )}
                </div>
                {isNote && noteContent && (
                  <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200 leading-snug whitespace-pre-wrap">
                    {noteContent}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.created_at).toLocaleString('es-ES')} · {item.performed_by || 'sistema'}
                  {isNote && noteField && <> · campo <code className="text-[10px]">{noteField}</code></>}
                </p>
              </div>
              {!isNote && (isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              ))}
            </button>
            {errorMsg && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}
            {isOpen && !isNote && (
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
