'use client';

/**
 * MultiContactList — gestión de N emails o N teléfonos por cliente.
 * Cada item muestra:
 *  - valor (copyable)
 *  - badge con la fuente (Whop, Checkout, Manual, etc.)
 *  - icono ⭐ si es is_primary (donde está el cobro real)
 *  - icono 📝 destacado si tiene notas
 *  - botón × para borrar (solo manuales)
 *
 * Permite añadir nuevos manuales y editar/borrar notas inline.
 */
import { useEffect, useState } from 'react';
import { LucideIcon, Plus, X, StickyNote, Star, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Copyable } from '@/components/data/copyable';
import { cn } from '@/lib/utils';

type Kind = 'email' | 'phone';

interface ContactItem {
  id: string;
  email?: string;
  phone?: string;
  source: string;
  is_primary: boolean;
  notes?: string | null;
  created_at?: string;
}

interface Props {
  subscriptionId: string;
  kind: Kind;
  label: string;
  icon: LucideIcon;
  initialPrimary?: string | null; // valor del row si la API aún no respondió
}

const SOURCE_BADGES: Record<string, { label: string; className: string }> = {
  unified_customers_email: { label: 'Principal', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  'unified_customers.email': { label: 'Principal', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  primary: { label: 'Principal', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  whop_payment: { label: '⚡ Compra Whop', className: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300' },
  whop_membership: { label: 'Whop', className: 'border-violet-300 bg-violet-50 text-violet-700' },
  checkout: { label: 'Checkout', className: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300' },
  'unified_customers.phone': { label: 'Principal', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  manual: { label: '✋ Manual', className: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300' },
};

export function MultiContactList({ subscriptionId, kind, label, icon: Icon, initialPrimary }: Props) {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const path = kind === 'email' ? 'emails' : 'phones';

  const fallbackItem = (): ContactItem[] => {
    if (!initialPrimary) return [];
    return [{
      id: 'fallback', source: 'primary', is_primary: true,
      [kind]: initialPrimary,
    } as ContactItem];
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ results: ContactItem[] }>(`/api/v1/clientes-directorio/${path}/${subscriptionId}/`);
      // Si la API responde OK pero vacío (cliente Whop nativo sin platform_account),
      // usamos el email/phone primario del row para que no se vea "Sin emails".
      setItems(r.results.length === 0 ? fallbackItem() : r.results);
    } catch {
      setItems(fallbackItem());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId, kind]);

  const onAdd = async () => {
    const v = newValue.trim();
    if (!v) return;
    try {
      await api.post(`/api/v1/clientes-directorio/${path}/${subscriptionId}/`, { [kind]: v });
      setNewValue('');
      setAdding(false);
      toast.success(`${label} añadido`);
      await load();
    } catch (e) {
      toast.error(`No se pudo añadir`, { description: e instanceof Error ? e.message : '' });
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(`¿Borrar este ${label.toLowerCase()}? Solo se permite borrar los manuales.`)) return;
    try {
      await api.delete(`/api/v1/clientes-directorio/${path}/${subscriptionId}/${id}/`);
      toast.success('Borrado');
      await load();
    } catch (e) {
      toast.error('No se pudo borrar', { description: e instanceof Error ? e.message : '' });
    }
  };

  const startEditNote = (item: ContactItem) => {
    setEditingNoteFor(item.id);
    setNoteDraft(item.notes || '');
  };

  const saveNote = async (id: string) => {
    setSavingNoteFor(id);
    try {
      await api.patch(`/api/v1/clientes-directorio/contact-note/${kind}/${id}/`, {
        notes: noteDraft.trim() || null,
      });
      setEditingNoteFor(null);
      await load();
    } catch (e) {
      toast.error('No se pudo guardar la nota', { description: e instanceof Error ? e.message : '' });
    } finally {
      setSavingNoteFor(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          <Icon className="h-3.5 w-3.5" />
          {label}
          {items.length > 1 && (
            <Badge variant="outline" className="ml-1 text-[10px]">
              {items.length}
            </Badge>
          )}
        </div>
        {!adding && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" />
            Añadir
          </Button>
        )}
      </div>

      {/* Form añadir */}
      {adding && (
        <div className="mb-2 flex gap-1">
          <Input
            autoFocus
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={kind === 'email' ? 'nuevo@email.com' : '+34 600 000 000'}
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') { setAdding(false); setNewValue(''); } }}
          />
          <Button size="sm" onClick={onAdd}>Añadir</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewValue(''); }}>
            Cancelar
          </Button>
        </div>
      )}

      {loading && <p className="text-xs text-slate-500">Cargando...</p>}

      {!loading && items.length === 0 && (
        <p className="text-xs text-slate-500 italic">Sin {label.toLowerCase()}.</p>
      )}

      <div className="space-y-1.5">
        {items.map((item) => {
          const value = item[kind] || '';
          const badge = SOURCE_BADGES[item.source] || { label: item.source, className: 'border-slate-300 bg-slate-50 text-slate-700' };
          const hasNote = !!item.notes && item.notes.trim().length > 0;
          const isEditing = editingNoteFor === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                'rounded border bg-slate-50/40 px-2.5 py-2 dark:bg-slate-900/40',
                item.is_primary
                  ? 'border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {item.is_primary && (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" aria-label="Principal" />
                )}
                <Copyable value={value} className="flex-1 truncate font-mono text-sm" />
                <Badge variant="outline" className={cn('text-[10px]', badge.className)}>
                  {badge.label}
                </Badge>
                <button
                  type="button"
                  onClick={() => (isEditing ? setEditingNoteFor(null) : startEditNote(item))}
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded transition-colors',
                    hasNote
                      ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-200'
                      : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800',
                  )}
                  title={hasNote ? `Nota: ${item.notes}` : 'Añadir nota'}
                >
                  <StickyNote className="h-3.5 w-3.5" />
                </button>
                {item.source === 'manual' && !item.is_primary && (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                    title="Borrar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Nota: mostrar siempre si hay, o editor si está editando */}
              {(hasNote || isEditing) && (
                <div className="mt-1.5">
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Input
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Añade una nota..."
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveNote(item.id); if (e.key === 'Escape') setEditingNoteFor(null); }}
                      />
                      <Button size="sm" className="h-7 px-2" disabled={savingNoteFor === item.id} onClick={() => saveNote(item.id)}>
                        {savingNoteFor === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                    </div>
                  ) : (
                    <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      📝 {item.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
