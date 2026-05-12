'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefinanTable } from '@/components/refinanciacion/refinan-table';
import { DetectButton } from '@/components/refinanciacion/detect-button';
import { refinanApi, type RefinanOperation } from '@/lib/refinanciacion-api';

export default function RefinanciacionPage() {
  const [rows, setRows] = useState<RefinanOperation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    refinanApi
      .list()
      .then((r) => setRows(r.results))
      .catch(() => toast.error('Error cargando refinanciaciones'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-200 via-violet-100 to-indigo-200 bg-clip-text text-2xl md:text-4xl font-bold tracking-tight text-transparent">
            Refinanciaciones
          </h1>
          <p className="mt-1 text-sm text-indigo-300/60">
            Operaciones detectadas automaticamente y refinanciaciones manuales generadas desde el drawer.
          </p>
        </div>
        <DetectButton onDetected={load} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <RefinanTable rows={rows} onUpdated={load} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
