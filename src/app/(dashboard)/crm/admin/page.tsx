'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Layers, Tag, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  crmApi,
  type CrmPipelineAdmin,
  type CrmStageAdmin,
  type CrmTag,
} from '@/lib/crm-api';
import { PipelinesSection } from '@/components/crm/admin/pipelines-section';
import { TagsSection } from '@/components/crm/admin/tags-section';

export default function CrmAdminPage() {
  const [pipelines, setPipelines] = useState<CrmPipelineAdmin[]>([]);
  const [stages, setStages] = useState<CrmStageAdmin[]>([]);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([crmApi.adminPipelines(), crmApi.tags()]);
      setPipelines(p.pipelines);
      setStages(p.stages);
      setTags(t);
    } catch {
      toast.error('Error cargando admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Administración CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona pipelines, etiquetas y configuración del CRM.
        </p>
      </header>

      <Tabs defaultValue="pipelines">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="pipelines">
            <Layers className="mr-1 h-3.5 w-3.5" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tag className="mr-1 h-3.5 w-3.5" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-1 h-3.5 w-3.5" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines">
          {loading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <PipelinesSection pipelines={pipelines} stages={stages} onRefresh={load} />
          )}
        </TabsContent>

        <TabsContent value="tags">
          {loading ? (
            <Skeleton className="h-60 w-full" />
          ) : (
            <TagsSection tags={tags} onRefresh={load} />
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Las automatizaciones y reglas de asignación se configurarán aquí en futuras
                versiones.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
