'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import type { ObjecionTag } from '@/lib/clientes-types';
import { cn } from '@/lib/utils';
import { Check, Search, Tags, X } from 'lucide-react';

interface Props {
  options: ObjecionTag[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

// Multi-select con chips para asignar tags de objeciones al cliente.
// Réplica funcional del `MultiSelect` de la web vieja. Sin creación libre.
export function MultiSelectTags({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar etiquetas...',
  emptyText = 'No se encontraron etiquetas.',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedTags = useMemo(
    () => options.filter((t) => selected.includes(t.id)),
    [options, selected],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((t) => t.name.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {selectedTags.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selectedTags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: t.bg_color, color: t.text_color }}
            >
              {t.name}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(t.id);
                }}
                className="cursor-pointer rounded-full p-0.5 hover:bg-black/10"
                aria-label={`Quitar ${t.name}`}
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ))
        )}
        <Tags className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-slate-200 bg-popover p-2 shadow-lg dark:border-slate-800">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Buscar etiqueta..."
                autoFocus
                className="h-8 w-full rounded-md border border-input bg-transparent pl-7 pr-2 text-xs outline-none focus:border-ring"
              />
            </div>
            <ul className="max-h-64 space-y-0.5 overflow-y-auto">
              {filtered.length === 0 && (
                <li className="py-3 text-center text-xs text-muted-foreground">{emptyText}</li>
              )}
              {filtered.map((t) => {
                const isSel = selected.includes(t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => toggle(t.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                        isSel && 'bg-muted/70',
                      )}
                    >
                      <span
                        className="flex h-5 items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: t.bg_color, color: t.text_color }}
                      >
                        {t.name}
                      </span>
                      {isSel && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
