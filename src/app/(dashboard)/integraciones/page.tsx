'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  ArrowLeftRight,
  CalendarCheck2,
  ClipboardList,
  Copy,
  KeyRound,
  LayoutGrid,
  Plus,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  integrationsApi,
  type ApiEndpointCatalogItem,
  type ApiKey,
  type CalendlyEvent,
  type CalendlyRule,
  type InboundLog,
  type OutboundLog,
  type SyncLog,
  type WebhookEndpointItem,
} from '@/lib/integrations-api';

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusClass(status: number): string {
  if (status >= 500) return 'bg-red-100 text-red-700';
  if (status >= 400) return 'bg-orange-100 text-orange-700';
  if (status >= 200) return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
}

export default function IntegracionesPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Integraciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona las credenciales de acceso para servicios externos y configura webhooks
          para enviar notificaciones a otras plataformas.
        </p>
      </header>

      <Tabs defaultValue="api-keys" className="gap-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="api-keys" className="gap-2">
            <KeyRound className="h-3.5 w-3.5" />
            API Keys (Entrada)
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-3.5 w-3.5" />
            Webhooks (Salida)
          </TabsTrigger>
          <TabsTrigger value="sync-logs" className="gap-2">
            <ClipboardList className="h-3.5 w-3.5" />
            Sincronización
          </TabsTrigger>
          <TabsTrigger value="inbound-logs" className="gap-2">
            <Activity className="h-3.5 w-3.5" />
            Logs Entrada
          </TabsTrigger>
          <TabsTrigger value="outbound-logs" className="gap-2">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Logs Salida
          </TabsTrigger>
          <TabsTrigger value="calendly" className="gap-2">
            <CalendarCheck2 className="h-3.5 w-3.5" />
            Calendly
          </TabsTrigger>
          <TabsTrigger value="api-catalog" className="gap-2">
            <LayoutGrid className="h-3.5 w-3.5" />
            Catálogo API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="sync-logs">
          <SyncLogsTab />
        </TabsContent>
        <TabsContent value="inbound-logs">
          <InboundLogsTab />
        </TabsContent>
        <TabsContent value="outbound-logs">
          <OutboundLogsTab />
        </TabsContent>
        <TabsContent value="calendly">
          <CalendlyTab />
        </TabsContent>
        <TabsContent value="api-catalog">
          <ApiCatalogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 · API Keys
// ---------------------------------------------------------------------------

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [justCreated, setJustCreated] = useState<ApiKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await integrationsApi.listApiKeys();
      setKeys(r.results);
    } catch {
      toast.error('Error cargando API Keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (ak: ApiKey) => {
    try {
      const updated = await integrationsApi.toggleApiKey(ak.id);
      setKeys((prev) => prev.map((k) => (k.id === ak.id ? updated : k)));
      toast.success(`API key ${updated.status === 'active' ? 'activada' : 'revocada'}`);
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <NewApiKeyDialog
          onCreated={(ak) => {
            setJustCreated(ak);
            load();
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Endpoints</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading &&
                keys.map((ak) => (
                  <TableRow key={ak.id}>
                    <TableCell className="font-medium">{ak.name}</TableCell>
                    <TableCell className="font-mono text-xs">{ak.api_key}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ak.allowed_endpoints.slice(0, 3).map((e) => (
                          <Badge key={e} variant="secondary" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                        {ak.allowed_endpoints.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{ak.allowed_endpoints.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          ak.status === 'active'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-500 text-white',
                        )}
                      >
                        {ak.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {fmtDate(ak.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => toggle(ak)}>
                        {ak.status === 'active' ? 'Revocar' : 'Reactivar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!justCreated} onOpenChange={(v) => !v && setJustCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key creada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copia esta key ahora — no se volverá a mostrar.
          </p>
          <div className="flex items-center gap-2 rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-50">
            <span className="flex-1 break-all">{justCreated?.api_key_raw || justCreated?.api_key}</span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                if (justCreated) {
                  navigator.clipboard.writeText(justCreated.api_key_raw || justCreated.api_key);
                  toast.success('Copiada');
                }
              }}
            >
              <Copy className="h-3.5 w-3.5 text-slate-50" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewApiKeyDialog({ onCreated }: { onCreated: (ak: ApiKey) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [endpoints, setEndpoints] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      const eps = endpoints
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const ak = await integrationsApi.createApiKey(name.trim(), eps);
      toast.success('API key creada');
      onCreated(ak);
      setName('');
      setEndpoints('');
      setOpen(false);
    } catch {
      toast.error('Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nueva API Key
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nombre</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Partner Acme"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Endpoints permitidos (separados por coma)
            </label>
            <Input
              value={endpoints}
              onChange={(e) => setEndpoints(e.target.value)}
              placeholder="/api/v1/customers, /api/v1/invoices"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creando...' : 'Crear key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 · Webhook endpoints
// ---------------------------------------------------------------------------

function WebhooksTab() {
  const [list, setList] = useState<WebhookEndpointItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await integrationsApi.listWebhookEndpoints();
      setList(r.results);
    } catch {
      toast.error('Error cargando webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (wh: WebhookEndpointItem) => {
    try {
      const updated = await integrationsApi.toggleWebhookEndpoint(wh.id);
      setList((prev) => prev.map((x) => (x.id === wh.id ? updated : x)));
      toast.success(`Webhook ${updated.status === 'active' ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <NewWebhookDialog onCreated={load} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading &&
                list.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">{wh.name}</TableCell>
                    <TableCell className="max-w-sm truncate font-mono text-xs" title={wh.url}>
                      {wh.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((e) => (
                          <Badge key={e} variant="secondary" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          wh.status === 'active'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-500 text-white',
                        )}
                      >
                        {wh.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => toggle(wh)}>
                        {wh.status === 'active' ? 'Desactivar' : 'Activar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NewWebhookDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error('Nombre y URL requeridos');
      return;
    }
    setSaving(true);
    try {
      await integrationsApi.createWebhookEndpoint(
        name.trim(),
        url.trim(),
        events.split(',').map((s) => s.trim()).filter(Boolean),
      );
      toast.success('Webhook endpoint creado');
      onCreated();
      setName('');
      setUrl('');
      setEvents('');
      setOpen(false);
    } catch {
      toast.error('Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nuevo Webhook
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Webhook Endpoint</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          <Input
            value={events}
            onChange={(e) => setEvents(e.target.value)}
            placeholder="Eventos (separados por coma)"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creando...' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 · Sync logs
// ---------------------------------------------------------------------------

function SyncLogsTab() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    integrationsApi
      .syncLogs(100)
      .then((r) => setLogs(r.results))
      .catch(() => toast.error('Error cargando sync logs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Integración</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Triggered by</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.integration}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{l.sync_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        l.status === 'completed' && 'bg-emerald-600 text-white',
                        l.status === 'failed' && 'bg-rose-600 text-white',
                        l.status === 'requested' && 'bg-blue-600 text-white',
                      )}
                    >
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.triggered_by}</TableCell>
                  <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {fmtDate(l.created_at)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 4 · Inbound logs
// ---------------------------------------------------------------------------

function InboundLogsTab() {
  const [logs, setLogs] = useState<InboundLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    integrationsApi
      .inboundLogs(100)
      .then((r) => setLogs(r.results))
      .catch(() => toast.error('Error cargando logs inbound'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duración</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.endpoint}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {l.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.api_key_name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono font-bold',
                        statusClass(l.response_status),
                      )}
                    >
                      {l.response_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {l.response_time_ms}ms
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-rose-600">
                    {l.error_message || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {fmtDate(l.created_at)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 5 · Outbound logs
// ---------------------------------------------------------------------------

function OutboundLogsTab() {
  const [logs, setLogs] = useState<OutboundLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    integrationsApi
      .outboundLogs(100)
      .then((r) => setLogs(r.results))
      .catch(() => toast.error('Error cargando logs outbound'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Webhook</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Intentos</TableHead>
              <TableHead className="text-right">Duración</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.webhook_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {l.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs" title={l.url}>
                    {l.url}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono font-bold',
                        statusClass(l.response_status),
                      )}
                    >
                      {l.response_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.attempts}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {l.response_time_ms}ms
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {fmtDate(l.created_at)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 6 · Calendly (rules + events)
// ---------------------------------------------------------------------------

function CalendlyTab() {
  const [rules, setRules] = useState<CalendlyRule[]>([]);
  const [events, setEvents] = useState<CalendlyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([integrationsApi.calendlyRules(), integrationsApi.calendlyEvents()])
      .then(([r, e]) => {
        setRules(r.results);
        setEvents(e.results);
      })
      .catch(() => toast.error('Error cargando Calendly'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reglas de enrutamiento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event type</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Activa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.event_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.target_team}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.action}</TableCell>
                    <TableCell>
                      <Badge className={r.active ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}>
                        {r.active ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Eventos recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invitado</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Agendado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.invitee_name}</div>
                      <div className="text-xs text-muted-foreground">{e.invitee_email}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.event_type}</TableCell>
                    <TableCell className="text-xs" suppressHydrationWarning>
                      {fmtDate(e.scheduled_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 7 · API Catalog
// ---------------------------------------------------------------------------

function ApiCatalogTab() {
  const [eps, setEps] = useState<ApiEndpointCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    integrationsApi
      .listApiCatalog()
      .then((r) => setEps(r.results))
      .catch(() => toast.error('Error cargando catálogo'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eps;
    return eps.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q),
    );
  }, [eps, search]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Endpoints expuestos</CardTitle>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar..."
          className="h-8 max-w-xs"
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              filtered.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {ep.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{ep.description}</TableCell>
                  <TableCell>
                    <Badge
                      className={ep.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}
                    >
                      {ep.is_active ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
