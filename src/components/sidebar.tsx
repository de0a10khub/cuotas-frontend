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
        'hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 transition-all duration-300 ease-in-out md:flex dark:border-slate-800 dark:bg-slate-950/50',
        collapsed ? 'w-16' : 'w-64',
      )}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div
        className={cn(
          'flex h-16 items-center gap-2 border-b border-slate-200 dark:border-slate-800',
          collapsed ? 'justify-center px-0' : 'px-6',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-5 w-5" />
        </div>
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap text-lg font-semibold tracking-tight transition-opacity',
            collapsed ? 'w-0 opacity-0' : 'opacity-100',
          )}
        >
          Cuotas
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <h3
              className={cn(
                'mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-opacity dark:text-slate-500',
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
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/60',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
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
