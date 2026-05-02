'use client';

// Página "Mis Casos" — vista personal del operario con sus casos agrupados por panel.
// Si la URL trae ?as=email_otro y el user es Admin, impersona a ese operario
// (banner ámbar + botón "Volver a mis casos").
//
// Cada tab pinta una tabla compacta de los clientes asignados al operario en ese panel.
// El click en "Abrir" navega al panel original con ?search=email para que el operario
// localice rápido al cliente y abra el drawer (los paneles aún no aceptan deep-link
// por subscription_id).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Search,
  User as UserIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { formatEuros } from '@/lib/format';
import {
  misCasosApi,
  type MisCasosListResponse,
  type MisCasosPanel,
  type MisCasosRow,
} from '@/lib/mis-casos-api';
import { cn } from '@/lib/utils';

// Configuración de los tabs. El orden visual es el del flujo natural del operario.
const TABS: ReadonlyArray<{
  id: MisCasosPanel;
  label: string;
  /** Ruta del panel original donde abrir el cliente. */
  panelHref: string;
  /** Color de acento para el tab activo. */
  accent: string;
}> = [
  { id: 'mora_n1', label: 'Mora N1', panelHref: '/mora', accent: 'cyan' },
  { id: 'mora_n2', label: 'Mora N2', panelHref: '/mora-n2', accent: 'orange' },
  { id: 'recobros', label: 'Recobrame', panelHref: '/recobros', accent: 'violet' },
] as const;

/** Tab sintético "Notificaciones" — siempre visible, pinta movidos-a-N2 + recaídas
 *  como una vista más (no es un panel real ni se filtra por panels_visible). */
const NOTIF_TAB_ID = '__notif__' as const;
type TabId = MisCasosPanel | typeof NOTIF_TAB_ID;

const PAGE_SIZE = 25;

function initials(nameOrEmail: string): string {
  const s = nameOrEmail.trim();
  if (!s) return '?';
  const parts = s.split(/[ ._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function platformBadgeColor(p: string): { bg: string; fg: string; ring: string } {
  switch (p) {
    case 'stripe':
      return { bg: 'bg-violet-500/15', fg: 'text-violet-200', ring: 'ring-violet-400/30' };
    case 'whop':
      return { bg: 'bg-teal-500/15', fg: 'text-teal-200', ring: 'ring-teal-400/30' };
    case 'whop-erp':
      return { bg: 'bg-cyan-500/15', fg: 'text-cyan-200', ring: 'ring-cyan-400/30' };
    default:
      return { bg: 'bg-slate-500/15', fg: 'text-slate-200', ring: 'ring-slate-400/30' };
  }
}

export default function MisCasosPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { profile } = useAuth();

  const isAdmin = useMemo(
    () => profile?.roles?.some((r) => r.name === 'Admin') ?? false,
    [profile?.roles],
  );

  const asEmail = sp.get('as') || undefined;
  const isImpersonating = isAdmin && !!asEmail;

  // Tabs visibles según el rol del operario impersonado/propio.
  // Se hidrata desde la respuesta del backend (panels_visible). Default: solo Mora N1
  // hasta que llegue la primera respuesta — evita parpadeo.
  const [panelsVisible, setPanelsVisible] = useState<MisCasosPanel[]>(['mora_n1']);
  const visibleTabs = useMemo(
    () => TABS.filter((t) => panelsVisible.includes(t.id)),
    [panelsVisible],
  );

  // Tab activo desde URL para que sea linkeable / refrescable.
  // Si la URL pide un tab que el rol no puede ver, fallback al primer disponible.
  const requestedTab = sp.get('tab') as TabId | null;
  const isValidTab = (id: string | null): id is TabId =>
    id === NOTIF_TAB_ID || (id != null && visibleTabs.some((t) => t.id === id));
  const activeTab: TabId =
    isValidTab(requestedTab)
      ? requestedTab
      : (visibleTabs[0]?.id ?? 'mora_n1');
  const isNotifTab = activeTab === NOTIF_TAB_ID;

  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  // Page se resetea de forma síncrona en el setTab y en el reset de búsqueda
  // (debouncer abajo). Al cambiar de operario impersonado el remount del
  // efecto de carga refleja la URL: el page de useState arranca en 1 igualmente.
  const [page, setPage] = useState(1);

  // Debounce búsqueda (300ms).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(pendingSearch.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [pendingSearch]);

  // Estado de la lista del tab activo.
  const [data, setData] = useState<MisCasosListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isNotifTab) {
      // El tab Notif no necesita load() — se renderiza con su propio estado.
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await misCasosApi.list(activeTab as MisCasosPanel, {
        search,
        page,
        page_size: PAGE_SIZE,
        as_email: asEmail,
      });
      setData(r);
      if (r.panels_visible && r.panels_visible.length > 0) {
        setPanelsVisible(r.panels_visible);
      }
    } catch {
      toast.error('Error cargando casos');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isNotifTab, search, page, asEmail]);

  useEffect(() => {
    load();
  }, [load]);

  // Notificaciones: estado independiente que se carga al montar y al cambiar de operario.
  const [notif, setNotif] = useState<{
    movidos: import('@/lib/mis-casos-api').MovedToN2Item[];
    recaidas: import('@/lib/mis-casos-api').RecaidaItem[];
  }>({ movidos: [], recaidas: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [a, b] = await Promise.all([
        misCasosApi.movidosAN2(asEmail).catch(() => null),
        misCasosApi.recaidas(asEmail).catch(() => null),
      ]);
      if (cancelled) return;
      setNotif({
        movidos: a?.results ?? [],
        recaidas: b?.results ?? [],
      });
    })();
    return () => { cancelled = true; };
  }, [asEmail]);

  const notifTotal = notif.movidos.length + notif.recaidas.length;

  // Cargamos counts de TODOS los tabs en una llamada paralela (1ª vez y al cambiar
  // de impersonación). Si el backend ya devuelve `counts` en cada list, lo usamos —
  // pero como el cliente cambia el tab y no queremos refetch innecesario, mantenemos
  // counts en estado separado.
  const [tabCounts, setTabCounts] = useState<Record<MisCasosPanel, number>>({
    mora_n1: 0,
    mora_n2: 0,
    recobros: 0,
    full_pay: 0,
    clientes: 0,
  });
  const [headerKpis, setHeaderKpis] = useState<{
    deuda_total_eur: number;
    total_casos: number;
    display_name: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Solo pedimos los tabs visibles (según rol del operario).
        const tabsToFetch = visibleTabs.length > 0 ? visibleTabs : TABS;
        const all = await Promise.all(
          tabsToFetch.map((t) =>
            misCasosApi
              .list(t.id, { page: 1, page_size: 1, as_email: asEmail })
              .catch(() => null),
          ),
        );
        if (cancelled) return;

        const next: Record<MisCasosPanel, number> = {
          mora_n1: 0,
          mora_n2: 0,
          recobros: 0,
          full_pay: 0,
          clientes: 0,
        };
        let total = 0;
        let deuda = 0;
        let displayName = '';
        tabsToFetch.forEach((t, i) => {
          const r = all[i];
          if (!r) return;
          next[t.id] = r.total_count || 0;
          total += r.total_count || 0;
          if (r.deuda_total_eur != null) deuda = r.deuda_total_eur;
          if (r.as_display_name) displayName = r.as_display_name;
        });
        setTabCounts(next);
        setHeaderKpis({
          deuda_total_eur: deuda,
          total_casos: total,
          display_name:
            displayName ||
            profile?.full_name ||
            profile?.user?.email ||
            'Operario',
        });
      } catch {
        // silent — la cabecera se renderiza con fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asEmail, profile?.full_name, profile?.user?.email, visibleTabs]);

  const setTab = (id: TabId) => {
    const q = new URLSearchParams(sp.toString());
    q.set('tab', id);
    router.replace(`/mis-casos?${q.toString()}`);
    setPage(1);
    setPendingSearch('');
    setSearch('');
  };

  const exitImpersonation = () => {
    router.push('/mis-casos');
  };

  const rows = data?.results ?? [];
  const total = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const headerName =
    data?.as_display_name ||
    headerKpis?.display_name ||
    profile?.full_name ||
    profile?.user?.email ||
    'Operario';

  return (
    <div className="relative mx-auto max-w-[1500px] space-y-5 p-4">
      {/* Ambient orbs (mismo patrón que /mora) */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      {/* Banner impersonación */}
      {isImpersonating && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-amber-300" />
            <span>
              Estás viendo los casos de{' '}
              <b className="text-amber-200">{headerName}</b>{' '}
              <span className="text-amber-300/70">(modo admin)</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exitImpersonation}
            className="border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a mis casos
          </Button>
        </div>
      )}

      {/* HERO header */}
      <header className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-5 shadow-[0_0_60px_rgba(59,130,246,0.15)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 text-base font-bold text-white shadow-[0_0_30px_rgba(56,189,248,0.5)]">
              {initials(headerName)}
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                {isImpersonating ? `Casos de ${headerName}` : 'Mis Casos'}
              </h1>
              <p className="mt-0.5 text-xs text-blue-200/70">
                Llevas{' '}
                <b className="text-cyan-300">
                  {headerKpis?.total_casos ?? '—'}
                </b>{' '}
                casos ·{' '}
                <b className="text-cyan-300">
                  {headerKpis?.deuda_total_eur != null
                    ? formatEuros(headerKpis.deuda_total_eur)
                    : '—'}
                </b>{' '}
                en deuda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-xs sm:w-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/60" />
              <Input
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Buscar cliente, email..."
                className="h-9 border-blue-400/20 bg-blue-950/30 pl-8 text-blue-100 placeholder:text-blue-300/40 focus-visible:border-blue-400/60"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs (Notificaciones es un tab más, no popover) */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0d1f3a]/80 to-[#1a2c52]/60 p-1.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1">
          {visibleTabs.map((t) => {
            const active = activeTab === t.id;
            const count = tabCounts[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'group relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all',
                  active
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                    : 'text-blue-200/70 hover:bg-blue-500/10 hover:text-white',
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    'inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-950/60 text-blue-300/80 ring-1 ring-blue-400/20',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {/* Tab "Notificaciones" — siempre visible, mismo estilo que los demás */}
          <button
            type="button"
            onClick={() => setTab(NOTIF_TAB_ID)}
            className={cn(
              'group relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all',
              isNotifTab
                ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'text-rose-200/70 hover:bg-rose-500/10 hover:text-white',
            )}
          >
            <span>Notificaciones</span>
            <span
              className={cn(
                'inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                isNotifTab
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-950/40 text-rose-300/80 ring-1 ring-rose-400/30',
              )}
            >
              {notifTotal}
            </span>
          </button>
        </div>
      </div>

      {/* Contenido del tab activo: tabla normal o panel de Notificaciones */}
      {isNotifTab ? (
        <NotifPanel asEmail={asEmail} movidos={notif.movidos} recaidas={notif.recaidas} />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-[#0a1628]">
        {/* Header — sin columna Operario ni Estado (en /mis-casos todos son del mismo owner) */}
        <div className="grid grid-cols-[minmax(0,2fr)_100px_80px_120px_80px] items-center gap-3 border-b border-blue-400/20 bg-blue-950/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/60">
          <span>Cliente</span>
          <span>Plataforma</span>
          <span className="text-right">Días</span>
          <span className="text-right">Deuda</span>
          <span className="text-right">Acción</span>
        </div>

        <div className="max-h-[68vh] overflow-y-auto">
          {loading && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="border-b border-blue-400/10 px-4 py-3"
                >
                  <Skeleton className="h-6 w-full bg-blue-900/30" />
                </div>
              ))}
            </>
          )}

          {!loading && rows.length === 0 && (
            <EmptyState panel={activeTab as MisCasosPanel} hasSearch={!!search} />
          )}

          {!loading &&
            rows.map((row) => {
              const tab = TABS.find((t) => t.id === activeTab)!;
              return (
                <CaseRow
                  key={`${row.subscription_id}-${row.customer_id}`}
                  row={row}
                  panelHref={tab.panelHref}
                />
              );
            })}
        </div>

        {/* Pagination compacta */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-blue-400/15 bg-blue-950/40 px-4 py-2.5 text-xs text-blue-200/70">
            <span>
              Página <b className="text-cyan-300">{page}</b> de{' '}
              <b className="text-cyan-300">{totalPages}</b> ·{' '}
              <b className="text-cyan-300">{total}</b> casos
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border-blue-400/30 bg-blue-950/40 text-blue-100 hover:bg-blue-500/20"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border-blue-400/30 bg-blue-950/40 text-blue-100 hover:bg-blue-500/20"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────────────────

/** Panel de Notificaciones — se renderiza cuando el tab "Notificaciones" está activo. */
function NotifPanel({
  asEmail,
  movidos,
  recaidas,
}: {
  asEmail?: string;
  movidos: import('@/lib/mis-casos-api').MovedToN2Item[];
  recaidas: import('@/lib/mis-casos-api').RecaidaItem[];
}) {
  const total = movidos.length + recaidas.length;
  const buildHref = (panel: 'mora' | 'mora-n2', email: string) => {
    const q = new URLSearchParams();
    q.set('search', email);
    if (asEmail) q.set('as', asEmail);
    return `/${panel}?${q.toString()}`;
  };

  if (total === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-[#0a1628] p-12 text-center">
        <p className="text-sm text-blue-200/70">Todo en orden — sin novedades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movidos.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0a1628]">
          <div className="border-b border-amber-400/20 bg-amber-950/30 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
            Movidos a Mora N2 · {movidos.length}
          </div>
          <div className="divide-y divide-amber-400/10">
            {movidos.map((it) => (
              <Link
                key={`n2-${it.subscription_id}`}
                href={buildHref('mora-n2', it.customer_email)}
                className="block px-4 py-3 transition-colors hover:bg-amber-500/5"
              >
                <p className="font-medium text-amber-100">
                  {it.customer_name || it.customer_email}
                </p>
                <p className="mt-0.5 text-xs text-amber-200/60">
                  {it.customer_email}
                  {it.current_contacted_by && (
                    <> · ahora lo lleva <b>{it.current_contacted_by}</b></>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recaidas.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0a1628]">
          <div className="border-b border-cyan-400/20 bg-cyan-950/30 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            Recaídas · {recaidas.length}
          </div>
          <div className="divide-y divide-cyan-400/10">
            {recaidas.map((it) => (
              <Link
                key={`re-${it.subscription_id}`}
                href={buildHref('mora', it.customer_email ?? it.customer_name ?? '')}
                className="block px-4 py-3 transition-colors hover:bg-cyan-500/5"
              >
                <p className="font-medium text-cyan-100">
                  {it.customer_name || it.customer_email || 'Cliente'}
                </p>
                <p className="mt-0.5 text-xs text-cyan-200/60">
                  {it.customer_email}
                  {it.now_status && (
                    <> · volvió a entrar en mora · <b>{it.now_status}</b></>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CaseRow({
  row,
  panelHref,
}: {
  row: MisCasosRow;
  panelHref: string;
}) {
  const platform = platformBadgeColor(row.platform);
  // El "Abrir" enlaza al panel original con ?search=email para localizar al cliente.
  const openHref = `${panelHref}?search=${encodeURIComponent(
    row.customer_email || row.customer_name || '',
  )}`;

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_100px_80px_120px_80px] items-center gap-3 border-b border-blue-400/10 px-4 py-2.5 text-sm transition-colors hover:bg-blue-500/5">
      {/* Cliente: avatar + nombre + email */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-400/30 text-[10px] font-bold text-cyan-200 ring-1 ring-cyan-400/30">
          {initials(row.customer_name || row.customer_email)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {row.customer_name || row.customer_email || 'Cliente'}
          </p>
          <p className="truncate text-[11px] text-blue-300/60">
            {row.customer_email || '—'}
          </p>
        </div>
      </div>

      {/* Plataforma */}
      <span
        className={cn(
          'inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1',
          platform.bg,
          platform.fg,
          platform.ring,
        )}
      >
        {row.platform}
      </span>

      {/* Días mora */}
      <span
        className={cn(
          'text-right text-xs font-mono tabular-nums',
          (row.days_overdue ?? 0) > 30
            ? 'text-orange-300'
            : (row.days_overdue ?? 0) > 0
              ? 'text-amber-300'
              : 'text-blue-300/50',
        )}
      >
        {row.days_overdue != null ? row.days_overdue : '—'}
      </span>

      {/* Deuda */}
      <span className="text-right text-sm font-bold tabular-nums text-cyan-300">
        {formatEuros(row.unpaid_total ?? 0)}
      </span>

      {/* Acción */}
      <div className="flex justify-end">
        <Link
          href={openHref}
          className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 transition-colors hover:bg-cyan-500/20"
        >
          <ExternalLink className="h-3 w-3" />
          Abrir
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  panel,
  hasSearch,
}: {
  panel: MisCasosPanel;
  hasSearch: boolean;
}) {
  const label = TABS.find((t) => t.id === panel)?.label ?? panel;
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-blue-300/60">
      <UserIcon className="h-10 w-10 text-blue-500/30" />
      <p className="text-sm">
        {hasSearch
          ? `Sin resultados en ${label} para esa búsqueda.`
          : `No tienes casos asignados en ${label}.`}
      </p>
    </div>
  );
}
