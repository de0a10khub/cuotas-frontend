'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import type { ObjecionTag } from '@/lib/empleados-types';
import { empleadosApi } from '@/lib/empleados-api';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Props {
  tags: ObjecionTag[];
  onChanged: () => void;
}

export function ObjecionesEditor({ tags, onChanged }: Props) {
  const confirm = useConfirm();
  const [newName, setNewName] = useState('');
  const [newBg, setNewBg] = useState('#FEF3C7');
  const [newText, setNewText] = useState('#92400E');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ObjecionTag | null>(null);

  const create = async () => {
    if (!newName.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      await empleadosApi.createTag({ name: newName.trim(), bg_color: newBg, text_color: newText });
      toast.success('Etiqueta creada');
      setNewName('');
      onChanged();
    } catch (err) {
      toast.error((err as { data?: { detail?: string } })?.data?.detail || 'Error creando');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tag: ObjecionTag) => {
    const ok = await confirm({
      title: 'Eliminar etiqueta',
      description: <>Vas a eliminar la etiqueta <b className="text-cyan-300">{tag.name}</b>.</>,
      confirmText: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await empleadosApi.deleteTag(tag.id);
      toast.success('Etiqueta eliminada');
      onChanged();
    } catch {
      toast.error('Error eliminando');
    }
  };

  const saveEdit = async (tag: ObjecionTag, next: Partial<ObjecionTag>) => {
    try {
      await empleadosApi.updateTag(tag.id, next);
      toast.success('Etiqueta actualizada');
      setEditing(null);
      onChanged();
    } catch {
      toast.error('Error actualizando');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr]">
      {/* Form nueva etiqueta */}
      <Card className="border-blue-500/20 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.08)]">
        <CardHeader className="border-b border-blue-500/15">
          <CardTitle className="text-sm text-cyan-200">Nueva etiqueta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label className="text-blue-200">Nombre</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Llamará luego"
              className="border-blue-500/30 bg-blue-950/40 text-blue-50 placeholder:text-blue-300/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-blue-200">Fondo</Label>
              <Input
                type="color"
                value={newBg}
                onChange={(e) => setNewBg(e.target.value)}
                className="h-9 cursor-pointer border-blue-500/30 bg-blue-950/40 p-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-blue-200">Texto</Label>
              <Input
                type="color"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="h-9 cursor-pointer border-blue-500/30 bg-blue-950/40 p-1"
              />
            </div>
          </div>
          <div className="rounded border border-blue-500/20 bg-blue-950/30 p-3 text-center">
            <p className="mb-1 text-xs text-blue-300/60">Preview</p>
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: newBg, color: newText }}
            >
              {newName || 'Etiqueta'}
            </span>
          </div>
          <Button
            onClick={create}
            disabled={saving}
            className="w-full border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Creando...' : 'Crear etiqueta'}
          </Button>
        </CardContent>
      </Card>

      {/* Grid de etiquetas existentes */}
      <Card className="border-blue-500/20 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.08)]">
        <CardHeader className="border-b border-blue-500/15">
          <CardTitle className="text-sm text-cyan-200">
            Catálogo (<span className="text-cyan-300">{tags.length}</span>)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 pt-3 md:grid-cols-2">
          {tags.length === 0 && (
            <p className="text-sm text-blue-300/60">Sin etiquetas.</p>
          )}
          {tags.map((t) =>
            editing?.id === t.id ? (
              <EditableRow
                key={t.id}
                tag={editing}
                onChange={setEditing}
                onSave={(patch) => saveEdit(t, patch)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-md border border-blue-500/15 bg-blue-950/20 p-2 transition-colors hover:bg-blue-950/40"
              >
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: t.bg_color, color: t.text_color }}
                >
                  {t.name}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditing({ ...t })}
                    className="text-blue-200 hover:bg-blue-500/10 hover:text-cyan-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => remove(t)}
                    className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ),
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditableRow({
  tag,
  onChange,
  onSave,
  onCancel,
}: {
  tag: ObjecionTag;
  onChange: (t: ObjecionTag) => void;
  onSave: (patch: Partial<ObjecionTag>) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-2">
      <Input
        value={tag.name}
        onChange={(e) => onChange({ ...tag, name: e.target.value })}
        className="h-7 flex-1 text-xs"
      />
      <Input
        type="color"
        value={tag.bg_color}
        onChange={(e) => onChange({ ...tag, bg_color: e.target.value })}
        className="h-7 w-8 p-0"
      />
      <Input
        type="color"
        value={tag.text_color}
        onChange={(e) => onChange({ ...tag, text_color: e.target.value })}
        className="h-7 w-8 p-0"
      />
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() =>
          onSave({ name: tag.name, bg_color: tag.bg_color, text_color: tag.text_color })
        }
        className="text-emerald-600"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
