'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ApiKey, Paginated, WebhookEndpoint } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Key, Webhook, CheckCircle2, XCircle } from 'lucide-react';

export default function IntegracionesPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<ApiKey>>('/api/v1/api-keys/').catch(() => null),
      api.get<Paginated<WebhookEndpoint>>('/api/v1/webhook-endpoints/').catch(() => null),
    ])
      .then(([k, e]) => {
        if (k) setApiKeys(k.results);
        if (e) setEndpoints(e.results);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Integraciones</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          API keys, webhooks y conexiones externas
        </p>
      </header>

      <Tabs defaultValue="api-keys">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-1.5" />
            API Keys ({apiKeys.length})
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-1.5" />
            Webhooks ({endpoints.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Creada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && apiKeys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Key className="h-10 w-10" />
                        <p>Sin API keys</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {apiKeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono dark:bg-slate-800">
                        {k.key_prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {k.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactiva
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString('es-ES') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(k.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {loading && (
              <>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            )}
            {!loading && endpoints.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="flex flex-col items-center gap-2 py-16 text-slate-500">
                  <Webhook className="h-10 w-10" />
                  <p>Sin webhooks configurados</p>
                </CardContent>
              </Card>
            )}
            {endpoints.map((w) => (
              <Card key={w.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">{w.name}</CardTitle>
                    {w.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      URL
                    </p>
                    <code className="block truncate rounded bg-slate-100 px-2 py-1 text-xs font-mono dark:bg-slate-800">
                      {w.url}
                    </code>
                  </div>
                  {w.events.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Eventos
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {w.events.map((e) => (
                          <Badge key={e} variant="outline" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
