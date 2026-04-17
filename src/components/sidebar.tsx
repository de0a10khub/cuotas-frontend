'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigation, groupBySection } from './nav-config';
import { Wallet } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const grouped = groupBySection(navigation);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6 dark:border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Cuotas</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/60',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
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
