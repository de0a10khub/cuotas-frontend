'use client';

// Timeline cronológico de un cliente (tab "Mora" en el drawer).
// Pinta los eventos /api/v1/mora-history/<sub_id>/ en orden inverso (más reciente arriba)
// con icono + color por tipo, hora relativa y línea vertical conectora.

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  CircleDot,
  CreditCard,
  History,
  MessageSquare,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  misCasosApi,
  type MoraHistoryResponse,
  type TimelineEvent,
  type TimelineEventType,
} from '@/lib/mis-casos-api';

interface Props {
  subscriptionId: string;
}

// ─── Estilos por tipo de evento ──────────────────────────────────────────────

interface TypeStyle {
  Icon: React.ComponentType<{ className?: string }>;
  /** Color principal del icono y la línea conectora. */
  ring: string;
  bg: string;
  fg: string;
  label: string;
}

const TYPE_STYLES: Record<TimelineEventType, TypeStyle> = {
  entered_mora: {
    Icon: AlertCircle,
    ring: 'ring-rose-300 dark:ring-rose-800/60',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    fg: 'text-rose-600 dark:text-rose-300',
    label: 'Entró en Mora',
  },
  assigned_owner: {
    Icon: UserPlus,
    ring: 'ring-indigo-300 dark:ring-indigo-800/60',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    fg: 'text-indigo-600 dark:text-indigo-300',
    label: 'Asignado',
  },
  note: {
    Icon: MessageSquare,
    ring: 'ring-sky-300 dark:ring-sky-800/60',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    fg: 'text-sky-600 dark:text-sky-300',
    label: 'Nota',
  },
  payment_attempt: {
    Icon: CreditCard,
    ring: 'ring-violet-300 dark:ring-violet-800/60',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    fg: 'text-violet-600 dark:text-violet-300',
    label: 'Intento de cobro',
  },
  status_changed: {
    Icon: CircleDot,
    ring: 'ring-slate-300 dark:ring-slate-700',
    bg: 'bg-slate-50 dark:bg-slate-900',
    fg: 'text-slate-600 dark:text-slate-300',
    label: 'Estado',
  },
  recovered: {
    Icon: CheckCircle2,
    ring: 'ring-emerald-300 dark:ring-emerald-800/60',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    fg: 'text-emerald-600 dark:text-emerald-300',
    label: 'Recuperado',
  },
  moved_to_n2: {
    Icon: ArrowDownCircle,
    ring: 'ring-amber-300 dark:ring-amber-800/60',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    fg: 'text-amber-600 dark:text-amber-300',
    label: 'Pasó a Mora N2',
  },
  moved_to_n1: {
    Icon: ArrowUpCircle,
    ring: 'ring-cyan-300 dark:ring-cyan-800/60',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    fg: 'text-cyan-600 dark:text-cyan-300',
    label: 'Volvió a Mora N1',
  },
};

const FALLBACK_STYLE: TypeStyle = {
  Icon: CircleDot,
  ring: 'ring-slate-300 dark:ring-slate-700',
  bg: 'bg-slate-50 dark:bg-slate-900',
  fg: 'text-slate-600 dark:text-slate-300',
  label: 'Evento',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return '';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return 'hace unos segundos';
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `hace ${day} día${day === 1 ? '' : 's'}`;
  const week = Math.round(day / 7);
  if (week < 5) return `hace ${week} sem`;
  const month = Math.round(day / 30);
  if (month < 12) return `hace ${month} mes${month === 1 ? '' : 'es'}`;
  const year = Math.round(day / 365);
  return `hace ${year} año${year === 1 ? '' : 's'}`;
}

function formatFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function MoraTimeline({ subscriptionId }: Props) {
  const [data, setData] = useState<MoraHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(false);
    misCasosApi
      .history(subscriptionId)
      .then((r) => {
        if (cancel) return;
        setData(r);
      })
      .catch(() => {
        if (cancel) return;
        setError(true);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [subscriptionId]);

  // Aseguramos orden cronológico inverso (más reciente arriba) por si el backend
  // no lo devuelve garantizado. Se reordena en cada render — la lista es pequeña.
  const orderedEvents: TimelineEvent[] = data?.events
    ? [...data.events].sort(
        (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
      )
    : [];

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/60 py-10 text-center text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
        <AlertCircle className="h-8 w-8" />
        <p className="font-medium">No se pudo cargar el historial</p>
        <p className="text-xs opacity-80">Inténtalo más tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card resumen: owner actual + estado actual */}
      <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 text-xs shadow-sm dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-slate-500 dark:text-slate-400">
            Owner actual:{' '}
            <b className="text-slate-900 dark:text-slate-100">
              {data?.current_owner_display || data?.current_owner_email || (
                <span className="italic text-slate-400">sin asignar</span>
              )}
            </b>
          </span>
        </div>
      </div>

      {orderedEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          <History className="h-8 w-8 opacity-60" />
          <p className="font-medium">Aún no hay actividad de mora</p>
          <p className="text-xs">
            Cuando el cliente entre en mora o se registren gestiones, aparecerán aquí.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-4 pl-6">
          {/* Línea vertical conectora */}
          <span
            aria-hidden
            className="absolute left-[11px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-slate-200 via-slate-200/70 to-transparent dark:from-slate-800 dark:via-slate-800/70"
          />
          {orderedEvents.map((ev, idx) => (
            <TimelineRow key={`${ev.ts}-${idx}-${ev.type}`} event={ev} />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const style = TYPE_STYLES[event.type] ?? FALLBACK_STYLE;
  const Icon = style.Icon;
  const noteText = extractNoteText(event);

  return (
    <li className="relative">
      {/* Punto/icono sobre la línea */}
      <span
        className={cn(
          'absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-2',
          style.bg,
          style.ring,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', style.fg)} />
      </span>

      <div className="rounded-lg border border-slate-200 bg-background p-3 shadow-sm dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1',
              style.bg,
              style.fg,
              style.ring,
            )}
          >
            {style.label}
          </span>
          <span
            className="text-slate-500 dark:text-slate-400"
            title={formatFull(event.ts)}
          >
            {formatRelative(event.ts)}
          </span>
          <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
            {event.actor_display || (
              <span className="italic text-slate-400">sistema</span>
            )}
          </span>
        </div>

        <p className="mt-1.5 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
          {event.summary || style.label}
        </p>

        {noteText && (
          <blockquote className="mt-1.5 border-l-2 border-slate-300 pl-2 text-xs italic leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400">
            “{noteText}”
          </blockquote>
        )}

        <p
          className="mt-1 text-[10px] text-slate-400 dark:text-slate-500"
          title={event.ts}
        >
          {formatFull(event.ts)}
        </p>
      </div>
    </li>
  );
}

// Heurística suave: si en `details` viene un texto reconocible (note, comment,
// reason, …) lo mostramos como cita. No fuerza nada — el backend manda el resumen
// en `summary` y este es solo "decoración" extra.
function extractNoteText(event: TimelineEvent): string | null {
  const d = event.details;
  if (!d || typeof d !== 'object') return null;
  const candidates = [
    'note',
    'comment',
    'comment_1',
    'comment_2',
    'continue_with',
    'reason',
    'message',
  ];
  for (const k of candidates) {
    const v = (d as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

// Re-export para que sea fácil consumir desde el drawer.
export { TYPE_STYLES };
// Silencia `unused` si en el futuro queremos usar RefreshCw para "reload" manual.
void RefreshCw;
