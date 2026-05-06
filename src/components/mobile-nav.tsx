'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Wallet, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { navigation, groupBySection } from './nav-config';
import { useAuth } from '@/lib/auth-context';
import { useNotificationsCount } from '@/lib/use-notifications-count';

/**
 * Navegación móvil. Sheet a pantalla completa que se abre con un botón
 * hamburger desde el Topbar. Sólo aparece en pantallas <md (768px); en
 * desktop se sigue usando el Sidebar lateral existente, sin tocarlo.
 *
 * Reusa nav-config y la lógica de roles/permisos del Sidebar (allowed_paths,
 * isAdmin) para mostrar exactamente los mismos enlaces visibles.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [open, setOpen] = React.useState(false);
  const notifTotal = useNotificationsCount();

  const isAdmin = React.useMemo(
    () => profile?.roles?.some((r) => r.name === 'Admin') ?? false,
    [profile?.roles],
  );
  const allowedPaths = React.useMemo(
    () => new Set(profile?.allowed_paths ?? []),
    [profile?.allowed_paths],
  );
  const visibleNav = React.useMemo(
    () => (isAdmin ? navigation : navigation.filter((n) => allowedPaths.has(n.href))),
    [isAdmin, allowedPaths],
  );
  const grouped = groupBySection(visibleNav);

  // Cierra el sheet al navegar (el pathname cambia → cerramos).
  const lastPath = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Abrir menú"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-blue-300 hover:bg-blue-500/10 hover:text-cyan-300"
          >
            <Menu className="h-5 w-5" />
          </button>
        }
      />
      <SheetContent
        side="left"
        className="w-72 max-w-[85vw] border-r border-blue-500/20 bg-gradient-to-b from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-0 text-blue-100"
      >
        <div className="flex h-16 items-center justify-between border-b border-blue-400/15 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 text-white shadow-[0_0_20px_rgba(56,189,248,0.5)]">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">Cuotas</span>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-300 hover:bg-blue-500/10 hover:text-cyan-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-blue-500/20">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300/50">
                {section}
              </h3>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          active
                            ? 'bg-gradient-to-r from-blue-500/30 via-blue-500/20 to-transparent text-white shadow-[0_0_15px_rgba(59,130,246,0.25)] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-r-full before:bg-gradient-to-b before:from-cyan-400 before:to-blue-500'
                            : 'text-blue-200/70 hover:bg-blue-500/10 hover:text-white',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            active ? 'text-cyan-300' : 'text-blue-300/70 group-hover:text-cyan-300',
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {item.href === '/notificaciones' && notifTotal > 0 && (
                          <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                            {notifTotal > 99 ? '99+' : notifTotal}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
