'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { crmApi, type CrmPipelineAdmin, type CrmStageAdmin } from '@/lib/crm-api';

const COLOR_PRESETS = [
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#F59E0B', '#10B981', '#14B8A6', '#6B7280',
];

const TERMINAL_OPTS: { value: string; label: string }[] = [
  { value: '', label: '— ninguno —' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
  { value: 'archived', label: 'Archivado' },
];

export function PipelinesSection({
  pipelines,
  stages,
  onRefresh,
}: {
  pipelines: CrmPipelineAdmin[];
  stages: CrmStageAdmin[];
  onRefresh: () => void;
}) {
  const [activeId, setActiveId] = useState(pipelines[0]?.id || '');
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineColor, setNewPipelineColor] = useState(COLOR_PRESETS[0]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(COLOR_PRESETS[0]);
  const [newStageTerminal, setNewStageTerminal] = useState('');

  const activePipeline = pipelines.find((p) => p.id === activeId) || pipelines[0];
  const activeStages = stages
    .filter((s) => s.pipeline_id === activeId)
    .sort((a, b) => a.display_order - b.display_order);

  const createPipeline = async () => {
    if (!newPipelineName.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    try {
      await crmApi.createPipeline({ name: newPipelineName.trim(), color: newPipelineColor });
      setNewPipelineName('');
      toast.success('Pipeline creado');
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  const deletePipeline = async (id: string) => {
    if (!confirm('¿Eliminar este pipeline y todas sus etapas?')) return;
    try {
      await crmApi.deletePipeline(id);
      toast.success('Eliminado');
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  const createStage = async () => {
    if (!newStageName.trim() || !activeId) return;
    try {
      await crmApi.createStage({
        pipeline_id: activeId,
        name: newStageName.trim(),
        color: newStageColor,
        display_order: activeStages.length + 1,
        is_terminal: !!newStageTerminal,
        terminal_type: (newStageTerminal || null) as 'won' | 'lost' | 'archived' | null,
      });
      setNewStageName('');
      setNewStageTerminal('');
      toast.success('Etapa creada');
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  const deleteStage = async (id: string) => {
    if (!confirm('¿Eliminar esta etapa?')) return;
    try {
      await crmApi.deleteStage(id);
      toast.success('Eliminada');
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  const toggleActive = async (p: CrmPipelineAdmin) => {
    try {
      await crmApi.updatePipeline(p.id, { is_active: !p.is_active });
      onRefresh();
    } catch {
      toast.error('Error');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pipelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={`flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-sm ${
                activeId === p.id ? 'border-primary bg-muted' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.color }}
                />
                <span>{p.name}</span>
                {!p.is_active && (
                  <Badge variant="outline" className="text-[9px]">
                    Inactivo
                  </Badge>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePipeline(p.id);
                }}
                className="opacity-40 hover:opacity-100"
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </button>
          ))}

          <div className="border-t pt-2">
            <Label className="text-[11px]">Crear pipeline</Label>
            <Input
              placeholder="Nombre"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              className="mt-1 h-8"
            />
            <ColorPresetRow
              selected={newPipelineColor}
              onChange={setNewPipelineColor}
              className="mt-2"
            />
            <Button size="sm" className="mt-2 w-full h-8" onClick={createPipeline}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Añadir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">
            Etapas de {activePipeline?.name || '—'}
          </CardTitle>
          {activePipeline && (
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => toggleActive(activePipeline)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              {activePipeline.is_active ? 'Desactivar' : 'Activar'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {activeStages.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="font-medium">{s.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  orden {s.display_order}
                </Badge>
                {s.is_terminal && (
                  <Badge variant="outline" className="text-[10px]">
                    terminal: {s.terminal_type}
                  </Badge>
                )}
                {s.sla_hours && (
                  <Badge variant="outline" className="text-[10px]">
                    SLA {s.sla_hours}h
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6"
                onClick={() => deleteStage(s.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="grid gap-2 rounded-md border border-dashed p-3">
            <Label className="text-xs">Nueva etapa</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="h-8 flex-1"
              />
              <Select
                value={newStageTerminal}
                onValueChange={(v) => setNewStageTerminal(v || '')}
              >
                <SelectTrigger className="h-8 w-40">
                  <SelectValue placeholder="Terminal" />
                </SelectTrigger>
                <SelectContent>
                  {TERMINAL_OPTS.map((o) => (
                    <SelectItem key={o.value || 'none'} value={o.value || 'none'}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ColorPresetRow selected={newStageColor} onChange={setNewStageColor} />
            <Button size="sm" className="h-8" onClick={createStage}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Añadir etapa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ColorPresetRow({
  selected,
  onChange,
  className,
}: {
  selected: string;
  onChange: (c: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1 ${className || ''}`}>
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`h-5 w-5 rounded-full border-2 transition ${
            selected === c ? 'ring-2 ring-primary' : ''
          }`}
          style={{ background: c, borderColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}
