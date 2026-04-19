'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { crmApi, type CrmNote } from '@/lib/crm-api';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotesTab({
  contactId,
  notes,
  onRefresh,
}: {
  contactId: string;
  notes: CrmNote[];
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await crmApi.createNote(contactId, draft.trim());
      setDraft('');
      toast.success('Nota añadida');
      onRefresh();
    } catch {
      toast.error('Error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar nota?')) return;
    try {
      await crmApi.deleteNote(id);
      toast.success('Eliminada');
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-2 p-4">
          <Textarea
            placeholder="Añade una nueva nota..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={saving || !draft.trim()}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Añadir nota
            </Button>
          </div>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin notas aún.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.created_by_name} · {formatDateTime(n.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 shrink-0"
                onClick={() => remove(n.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
