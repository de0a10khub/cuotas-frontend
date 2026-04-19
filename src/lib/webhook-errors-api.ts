import { api } from './api';

const BASE = '/api/v1/webhook-errors';

export interface WebhookError {
  id: string;
  type: string;
  platform: string;
  created_at: string;
  processing_error: string;
}

export const webhookErrorsApi = {
  list: () => api.get<{ results: WebhookError[] }>(`${BASE}/list/`),
  payload: (id: string) =>
    api.get<{ id: string; payload: Record<string, unknown> }>(
      `${BASE}/${encodeURIComponent(id)}/payload/`,
    ),
  retry: (id: string) => api.post<{ retried: boolean }>(`${BASE}/retry/`, { id }),
  retryBatch: (ids: string[]) =>
    api.post<{ retried: number }>(`${BASE}/retry-batch/`, { ids }),
};
