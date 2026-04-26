'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigation, groupBySection } from './nav-config';
import { Wallet } from 'lucide-react';

// Sidebar colapsable por hover (mismo feel que la web vieja de Conciliación).
// Default colapsada a w-16 (solo iconos), expande a w-64 al pasar el raton.
export function Sidebar() {
  const pathname = usePathname();
  const grouped = groupBySection(navigation);
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 flex-col border-r border-blue-500/20 bg-gradient-to-b from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] shadow-[8px_0_40px_rgba(59,130,246,0.08)] transition-all duration-300 ease-in-out md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* Subtle glow orbs */}
      <div className="pointer-events-none absolute -left-20 top-1/4 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-1/4 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" />

      <div
        className={cn(
          'relative flex h-16 items-center gap-2 border-b border-blue-400/15',
          collapsed ? 'justify-center px-0' : 'px-6',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 text-white shadow-[0_0_20px_rgba(56,189,248,0.5)]">
          <Wallet className="h-5 w-5" />
        </div>
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap text-lg font-semibold tracking-tight text-white transition-opacity',
            collapsed ? 'w-0 opacity-0' : 'opacity-100',
          )}
        >
          Cuotas
        </span>
      </div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-thumb-blue-500/20">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <h3
              className={cn(
                'mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300/50 transition-opacity',
                collapsed ? 'opacity-0' : 'opacity-100',
              )}
            >
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
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        active
                          ? 'bg-gradient-to-r from-blue-500/30 via-blue-500/20 to-transparent text-white shadow-[0_0_15px_rgba(59,130,246,0.25)] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-r-full before:bg-gradient-to-b before:from-cyan-400 before:to-blue-500 before:shadow-[0_0_10px_rgba(34,211,238,0.6)]'
                          : 'text-blue-200/70 hover:bg-blue-500/10 hover:text-white',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-cyan-300' : 'text-blue-300/70 group-hover:text-cyan-300',
                        )}
                      />
                      <span
                        className={cn(
                          'overflow-hidden whitespace-nowrap transition-opacity',
                          collapsed ? 'w-0 opacity-0' : 'opacity-100',
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
