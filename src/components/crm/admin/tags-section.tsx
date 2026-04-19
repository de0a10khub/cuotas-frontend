'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { crmApi, type CrmTag } from '@/lib/crm-api';

const COLOR_PRESETS = [
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#F59E0B', '#10B981', '#14B8A6', '#6B7280',
];

const CATEGORIES = ['contact', 'deal', 'meeting'];

export function TagsSection({ tags, onRefresh }: { tags: CrmTag[]; onRefresh: () => void }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [newCategory, setNewCategory] = useState('contact');

  const add = async () => {
    if (!newName.trim()) return;
    try {
      await crmApi.createTag({
        name: newName.trim(),
        color: newColor,
        category: newCategory,
      });
      setNewName('');
      toast.success('Tag creado');
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar tag?')) return;
    try {
      await crmApi.deleteTag(id);
      toast.success('Eliminado');
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Catálogo de Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: t.color, color: t.color }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: t.color }}
              />
              {t.name}
              <span className="text-muted-foreground">({t.category})</span>
              <button
                onClick={() => remove(t.id)}
                className="opacity-50 hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="grid gap-1">
            <Label className="text-xs">Nombre</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Categoría</Label>
            <Select value={newCategory} onValueChange={(v) => setNewCategory(v || 'contact')}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`h-5 w-5 rounded-full border-2 ${
                    newColor === c ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{ background: c, borderColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <Button size="sm" className="h-8" onClick={add}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Añadir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
