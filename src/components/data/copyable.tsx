'use client';

import { useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';

interface CopyableProps {
  value: string;
  display?: string;
  className?: string;
  emptyPlaceholder?: string;
  stopPropagation?: boolean;
}

// Click copia el valor al portapapeles. No hace nada si el valor es vacío o "—/-".
export function Copyable({
  value,
  display,
  className,
  emptyPlaceholder = '—',
  stopPropagation = true,
}: CopyableProps) {
  const [copied, setCopied] = useState(false);
  const trimmed = (value ?? '').trim();
  const isEmpty = !trimmed || trimmed === '-' || trimmed === '—';

  if (isEmpty) {
    return <span className={cn('text-slate-400', className)}>{emptyPlaceholder}</span>;
  }

  const handle = async (e: MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={cn(
        'group inline-flex max-w-full items-center gap-1.5 truncate text-left hover:text-emerald-600 dark:hover:text-emerald-400',
        className,
      )}
      title={`Copiar: ${trimmed}`}
    >
      <span className="truncate">{display ?? trimmed}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      )}
    </button>
  );
}
