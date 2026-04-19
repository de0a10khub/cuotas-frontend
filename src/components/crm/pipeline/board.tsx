'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Phone, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { crmApi, type CrmStage, type CrmContact } from '@/lib/crm-api';

function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '') || '??').toUpperCase();
}

export function KanbanBoard({
  stages,
  contacts,
  pipelineColor,
  onUpdated,
}: {
  stages: CrmStage[];
  contacts: CrmContact[];
  pipelineColor: string;
  onUpdated: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const byStage = stages.reduce<Record<string, CrmContact[]>>((acc, s) => {
    acc[s.id] = contacts.filter((c) => c.current_stage_id === s.id);
    return acc;
  }, {});

  const handleDrop = async (stageId: string) => {
    setOverStage(null);
    if (!dragId) return;
    const contact = contacts.find((c) => c.id === dragId);
    if (!contact || contact.current_stage_id === stageId) {
      setDragId(null);
      return;
    }
    setSaving(true);
    try {
      await crmApi.moveStage(dragId, stageId);
      toast.success('Contacto movido');
      onUpdated();
    } catch {
      toast.error('Error moviendo contacto');
    } finally {
      setDragId(null);
      setSaving(false);
    }
  };

  if (stages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          No hay etapas configuradas. Configúralas en{' '}
          <a href="/crm/admin" className="underline">
            Administración
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-2">
      {stages.map((stage) => {
        const items = byStage[stage.id] || [];
        const isOver = overStage === stage.id;
        return (
          <div
            key={stage.id}
            className={`flex min-w-[260px] flex-col rounded-lg bg-muted/30 p-2 transition ${
              isOver ? 'bg-muted/70 ring-2' : ''
            }`}
            style={isOver ? { boxShadow: `0 0 0 2px ${pipelineColor}` } : undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage.id);
            }}
            onDragLeave={() => setOverStage((cur) => (cur === stage.id ? null : cur))}
            onDrop={() => handleDrop(stage.id)}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: stage.color || pipelineColor }}
                />
                <span className="text-sm font-medium">{stage.name}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {items.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {items.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Vacío
                </p>
              )}
              {items.map((c) => (
                <div
                  key={c.id}
                  draggable={!saving}
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`group cursor-grab rounded-md border bg-background p-2.5 text-sm shadow-sm transition hover:shadow active:cursor-grabbing ${
                    dragId === c.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {initials(c.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.full_name}</p>
                      {c.company && (
                        <p className="truncate text-xs text-muted-foreground">{c.company}</p>
                      )}
                    </div>
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="max-w-[140px] truncate">{c.email}</span>
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                  {c.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
