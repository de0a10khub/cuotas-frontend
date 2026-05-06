'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { adminPinApi } from '@/lib/admin-pin-api';
import { ChangeMyPinDialog } from './change-my-pin-dialog';

/**
 * Banner que avisa al admin si NO tiene PIN configurado todavía.
 * Click en "Configurar PIN" abre ChangeMyPinDialog en modo first-time.
 */
export function AdminPinBanner() {
  const { profile } = useAuth();
  const isAdmin = profile?.roles?.some((r) => r.name === 'Admin') ?? false;

  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    adminPinApi
      .status()
      .then((d) => setHasPin(d.has_pin))
      .catch(() => setHasPin(null));
  }, [isAdmin]);

  if (!isAdmin || hasPin === null || hasPin) return null;

  return (
    <>
      <div className="border-b border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>
              Tu cuenta es Admin pero no tiene PIN configurado. Necesitas un PIN para
              ejecutar devoluciones y cancelaciones.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            <KeyRound className="h-3 w-3" />
            Configurar PIN
          </Button>
        </div>
      </div>
      <ChangeMyPinDialog
        open={open}
        onOpenChange={setOpen}
        isFirstTime
        onSaved={() => setHasPin(true)}
      />
    </>
  );
}
