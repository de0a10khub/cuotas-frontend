'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmOptions {
  title?: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpen(false);
  };

  const isDestructive = opts.variant === 'destructive';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) settle(false); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            className="fixed inset-0 z-50 bg-blue-950/40 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          />
          <DialogPrimitive.Popup
            className={cn(
              'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
              'overflow-hidden rounded-xl border border-cyan-400/30 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628]',
              'shadow-[0_0_50px_rgba(34,211,238,0.25)] outline-none',
              'duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />

            <div className="relative space-y-4 p-6">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
                    isDestructive
                      ? 'bg-gradient-to-br from-rose-500/30 to-orange-400/30 ring-rose-400/40'
                      : 'bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-cyan-400/40',
                  )}
                >
                  <AlertTriangle className={cn('h-5 w-5', isDestructive ? 'text-rose-200' : 'text-cyan-200')} />
                </span>
                <div className="flex-1 space-y-1">
                  <DialogPrimitive.Title
                    className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-lg font-bold tracking-tight text-transparent"
                  >
                    {opts.title || '¿Confirmar acción?'}
                  </DialogPrimitive.Title>
                  {opts.description && (
                    <DialogPrimitive.Description className="text-sm text-blue-100/70">
                      {opts.description}
                    </DialogPrimitive.Description>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  className="border border-blue-500/30 bg-blue-950/40 text-blue-100 hover:bg-blue-900/50 hover:text-white"
                  onClick={() => settle(false)}
                >
                  {opts.cancelText || 'Cancelar'}
                </Button>
                <Button
                  className={cn(
                    'border-0 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]',
                    isDestructive
                      ? 'bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
                  )}
                  onClick={() => settle(true)}
                >
                  {opts.confirmText || 'Confirmar'}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
