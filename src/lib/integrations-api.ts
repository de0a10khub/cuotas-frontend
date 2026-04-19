import { api } from './api';

const BASE = '/api/v1/integrations';

export interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  allowed_endpoints: string[];
  status: 'active' | 'revoked';
  created_at: string;
  api_key_raw?: string;
}

export interface WebhookEndpointItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ApiEndpointCatalogItem {
  id: string;
  path: string;
  method: string;
  description: string;
  functional_definition: Record<string, unknown>;
  is_active: boolean;
}

export interface SyncLog {
  id: string;
  integration: string;
  sync_type: string;
  status: string;
  triggered_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InboundLog {
  id: string;
  endpoint: string;
  method: string;
  response_status: number;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
  api_key_id: string;
  api_key_name: string;
}

export interface OutboundLog {
  id: string;
  webhook_endpoint_id: string;
  webhook_name: string;
  url: string;
  event_type: string;
  response_status: number;
  response_time_ms: number;
  error_message: string | null;
  attempts: number;
  created_at: string;
}

export interface CalendlyRule {
  id: string;
  event_type: string;
  target_team: string;
  action: string;
  active: boolean;
}

export interface CalendlyEvent {
  id: string;
  event_type: string;
  invitee_name: string;
  invitee_email: string;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export const integrationsApi = {
  // API keys
  listApiKeys: () => api.get<{ results: ApiKey[] }>(`${BASE}/api-keys/`),
  createApiKey: (name: string, allowed_endpoints: string[]) =>
    api.post<ApiKey>(`${BASE}/api-keys/`, { name, allowed_endpoints }),
  toggleApiKey: (id: string) =>
    api.patch<ApiKey>(`${BASE}/api-keys/${encodeURIComponent(id)}/`, {}),
  updateApiKeyPermissions: (id: string, allowed_endpoints: string[]) =>
    api.patch<ApiKey>(`${BASE}/api-keys/${encodeURIComponent(id)}/`, { allowed_endpoints }),

  // Webhook endpoints
  listWebhookEndpoints: () =>
    api.get<{ results: WebhookEndpointItem[] }>(`${BASE}/webhook-endpoints/`),
  createWebhookEndpoint: (name: string, url: string, events: string[]) =>
    api.post<WebhookEndpointItem>(`${BASE}/webhook-endpoints/`, { name, url, events }),
  toggleWebhookEndpoint: (id: string) =>
    api.patch<WebhookEndpointItem>(`${BASE}/webhook-endpoints/${encodeURIComponent(id)}/`, {}),

  // API catalog
  listApiCatalog: () =>
    api.get<{ results: ApiEndpointCatalogItem[] }>(`${BASE}/api-catalog/`),
  upsertApiEndpoint: (payload: Partial<ApiEndpointCatalogItem>) =>
    api.post<ApiEndpointCatalogItem>(`${BASE}/api-catalog/`, payload),

  // Logs
  syncLogs: (limit = 100) =>
    api.get<{ results: SyncLog[] }>(`${BASE}/sync-logs/?limit=${limit}`),
  inboundLogs: (limit = 100) =>
    api.get<{ results: InboundLog[] }>(`${BASE}/inbound-logs/?limit=${limit}`),
  outboundLogs: (limit = 100) =>
    api.get<{ results: OutboundLog[] }>(`${BASE}/outbound-logs/?limit=${limit}`),

  // Calendly
  calendlyRules: () => api.get<{ results: CalendlyRule[] }>(`${BASE}/calendly/rules/`),
  calendlyEvents: () => api.get<{ results: CalendlyEvent[] }>(`${BASE}/calendly/events/`),
};
