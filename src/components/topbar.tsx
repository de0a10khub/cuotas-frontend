'use client';

import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  const gender = profile?.gender;
  const greeting = gender === 'M' ? 'Bienvenido,' : gender === 'F' ? 'Bienvenida,' : 'Hola,';

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-background/80 px-6 backdrop-blur dark:border-slate-800">
      <div>
        <h1 className="text-sm text-slate-500 dark:text-slate-400">{greeting}</h1>
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
        <DropdownMenuContent
          align="end"
          className="w-64 border border-cyan-400/30 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] p-1 text-blue-100 shadow-[0_0_30px_rgba(34,211,238,0.20)]"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5 px-1 py-1">
                <span className="text-sm font-semibold text-cyan-100">{displayName}</span>
                <span className="text-xs text-blue-300/60">{email}</span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-blue-500/20" />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled className="text-blue-300/40">
              <User className="mr-2 h-4 w-4" />
              Mi perfil
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-blue-500/20" />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={logout}
              className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
