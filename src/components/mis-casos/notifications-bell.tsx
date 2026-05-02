'use client';

// Campana de notificaciones para /mis-casos.
// Muestra:
//   1. Casos que el operario llevaba y han pasado a Mora N2.
//   2. Recaídas: clientes recuperados que han vuelto a caer en Mora N1.
//
// El contador (badge rojo) suma las dos colecciones y se auto-refresca cada 60s.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  RefreshCw,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  misCasosApi,
  type MovedToN2Item,
  type RecaidaItem,
} from '@/lib/mis-casos-api';

interface Props {
  /** Si Admin está impersonando, también filtramos las notifs por ese email. */
  asEmail?: string;
}

const REFRESH_MS = 60_000;

function formatRelative(iso: string | null): string {
  if (!iso) return '';
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

export function NotificationsBell({ asEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movidos, setMovidos] = useState<MovedToN2Item[]>([]);
  const [recaidas, setRecaidas] = useState<RecaidaItem[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        misCasosApi.movidosAN2(asEmail).catch(() => null),
        misCasosApi.recaidas(asEmail).catch(() => null),
      ]);
      setMovidos(a?.results ?? []);
      setRecaidas(b?.results ?? []);
    } finally {
      setLoading(false);
    }
  }, [asEmail]);

  // Carga inicial + auto-refresh.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Cierra al click fuera + ESC.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const total = movidos.length + recaidas.length;

  const moraN2Href = useCallback((email: string) => {
    const q = new URLSearchParams();
    q.set('search', email);
    if (asEmail) q.set('as', asEmail);
    return `/mora-n2?${q.toString()}`;
  }, [asEmail]);

  const moraN1Href = useCallback((email: string) => {
    const q = new URLSearchParams();
    q.set('search', email);
    if (asEmail) q.set('as', asEmail);
    return `/mora?${q.toString()}`;
  }, [asEmail]);

  const showBadge = total > 0;
  const badgeText = useMemo(() => (total > 99 ? '99+' : String(total)), [total]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones (${total})`}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-950/40 text-blue-100 transition-colors hover:bg-blue-500/15',
          open && 'bg-blue-500/20',
        )}
      >
        <Bell className="h-4 w-4" />
        {showBadge && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_8px_rgba(244,63,94,0.6)] ring-2 ring-[#0a1628]">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] max-w-[92vw] overflow-hidden rounded-xl border border-blue-400/20 bg-[#0a1628]/95 shadow-2xl backdrop-blur-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-blue-400/20 bg-blue-950/40 px-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200">
              <Bell className="h-3.5 w-3.5" />
              Notificaciones
              {total > 0 && (
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-200 ring-1 ring-rose-400/40">
                  {total}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={refresh}
                aria-label="Refrescar"
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-md text-blue-300/70 transition-colors hover:bg-blue-500/15 hover:text-blue-100',
                  loading && 'animate-spin',
                )}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-blue-300/70 transition-colors hover:bg-blue-500/15 hover:text-blue-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {total === 0 && !loading && (
              <div className="flex flex-col items-center gap-1.5 py-8 text-center text-blue-300/60">
                <Bell className="h-7 w-7 opacity-50" />
                <p className="text-xs">Todo en orden — sin novedades.</p>
              </div>
            )}

            {/* Sección: Movidos a N2 */}
            {movidos.length > 0 && (
              <Section
                icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-300" />}
                title="Movidos a Mora N2"
                count={movidos.length}
                tone="amber"
              >
                {movidos.map((it) => (
                  <Link
                    key={`n2-${it.subscription_id}`}
                    href={moraN2Href(it.customer_email)}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-amber-500/10"
                  >
                    <p className="truncate text-xs font-semibold text-amber-100">
                      {it.customer_name || it.customer_email}
                    </p>
                    <p className="truncate text-[11px] text-amber-200/70">
                      {formatRelative(it.moved_at)}
                      {it.current_contacted_by && (
                        <>
                          {' · '}
                          <span className="text-amber-100/90">
                            {it.current_contacted_by} lo lleva ahora
                          </span>
                        </>
                      )}
                    </p>
                  </Link>
                ))}
              </Section>
            )}

            {/* Sección: Recaídas */}
            {recaidas.length > 0 && (
              <Section
                icon={<RefreshCw className="h-3.5 w-3.5 text-cyan-300" />}
                title="Recaídas"
                count={recaidas.length}
                tone="cyan"
              >
                {recaidas.map((it) => (
                  <Link
                    key={`re-${it.subscription_id}`}
                    href={moraN1Href(it.customer_email || it.customer_name)}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-cyan-500/10"
                  >
                    <p className="truncate text-xs font-semibold text-cyan-100">
                      {it.customer_name || it.customer_email || 'Cliente'}
                    </p>
                    <p className="truncate text-[11px] text-cyan-200/70">
                      {it.previous_recovered_at ? (
                        <>recuperado {formatRelative(it.previous_recovered_at)} · </>
                      ) : null}
                      <span className="text-cyan-100/90">volvió a {it.now_status}</span>
                    </p>
                  </Link>
                ))}
              </Section>
            )}

            {loading && total === 0 && (
              <div className="flex items-center justify-center py-6 text-xs text-blue-300/60">
                Cargando…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  tone: 'amber' | 'cyan';
  children: React.ReactNode;
}) {
  const tones = {
    amber: 'text-amber-200',
    cyan: 'text-cyan-200',
  }[tone];
  return (
    <div className="mb-2 last:mb-0">
      <div className={cn('flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider', tones)}>
        {icon}
        <span>{title}</span>
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
          {count}
        </span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
