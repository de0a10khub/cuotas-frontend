'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { crmApi, type ContactDetailsBundle } from '@/lib/crm-api';
import { ContactHeader } from '@/components/crm/contact-detail/header';
import { OverviewTab } from '@/components/crm/contact-detail/overview-tab';
import { NotesTab } from '@/components/crm/contact-detail/notes-tab';
import { TasksTab } from '@/components/crm/contact-detail/tasks-tab';
import { TimelineTab } from '@/components/crm/contact-detail/timeline-tab';

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bundle, setBundle] = useState<ContactDetailsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await crmApi.contactDetails(id);
      setBundle(data);
    } catch {
      setMissing(true);
      toast.error('Contacto no encontrado');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) notFound();

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <div>
        <Link href="/crm/contacts">
          <Button variant="ghost" size="sm" className="h-7">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Volver a Contactos
          </Button>
        </Link>
      </div>

      {loading || !bundle ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <ContactHeader contact={bundle.contact} onRefresh={load} />
            </CardContent>
          </Card>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Vista General</TabsTrigger>
              <TabsTrigger value="notes">Notas ({bundle.notes.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tareas ({bundle.tasks.length})</TabsTrigger>
              <TabsTrigger value="timeline">Actividad</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab
                contact={bundle.contact}
                activities={bundle.activities}
                tasks={bundle.tasks}
                notes={bundle.notes}
              />
            </TabsContent>
            <TabsContent value="notes">
              <NotesTab contactId={bundle.contact.id} notes={bundle.notes} onRefresh={load} />
            </TabsContent>
            <TabsContent value="tasks">
              <TasksTab tasks={bundle.tasks} />
            </TabsContent>
            <TabsContent value="timeline">
              <TimelineTab activities={bundle.activities} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
