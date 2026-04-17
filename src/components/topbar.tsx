'use client';

import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut, User } from 'lucide-react';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Topbar() {
  const { profile, logout } = useAuth();
  const displayName = profile?.full_name || profile?.user.username || '';
  const email = profile?.user.email || '';
  const mainRole = profile?.roles?.[0]?.name;

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-background/80 px-6 backdrop-blur dark:border-slate-800">
      <div>
        <h1 className="text-sm text-slate-500 dark:text-slate-400">Bienvenida,</h1>
        <p className="text-base font-semibold">{displayName}</p>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2" />}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {mainRole && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{mainRole}</p>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-slate-500">{email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
