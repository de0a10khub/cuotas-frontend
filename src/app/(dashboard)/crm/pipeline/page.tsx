'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { crmApi, type PipelineData } from '@/lib/crm-api';
import { KanbanBoard } from '@/components/crm/pipeline/board';

export default function CrmPipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async (pipelineId?: string) => {
    setLoading(true);
    try {
      const d = await crmApi.pipelineData(pipelineId);
      setData(d);
      setActiveId(d.activePipelineId);
    } catch {
      toast.error('Error cargando pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activePipeline = data?.pipelines.find((p) => p.id === activeId) || null;

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col overflow-hidden">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activePipeline?.name || 'Pipeline de Ventas'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona el flujo de tus oportunidades de venta.
          </p>
        </div>
        {data && data.pipelines.length > 1 && (
          <Select
            value={activeId || ''}
            onValueChange={(v) => {
              if (v) load(v);
            }}
          >
            <SelectTrigger className="h-8 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        {loading && <Skeleton className="h-full w-full" />}
        {!loading && data && (
          <KanbanBoard
            stages={data.stages}
            contacts={data.contacts}
            pipelineColor={activePipeline?.color || '#8b5cf6'}
            onUpdated={() => load(activeId || undefined)}
          />
        )}
      </div>
    </div>
  );
}
