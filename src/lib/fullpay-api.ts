import { api } from './api';
import type { FullPayLead, FullPayListResponse } from './fullpay-types';
import type { LockResult } from './clientes-types';

const BASE = '/api/v1/fullpay';

export interface FullPayListParams {
  platform?: string;
  status?: string;
  operator?: string;
  page?: number;
  page_size?: number;
}

function q(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === 'all') continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export const fullpayApi = {
  list: (p: FullPayListParams) =>
    api.get<FullPayListResponse>(`${BASE}/leads/${q({ ...p })}`),

  operators: () => api.get<{ results: string[] }>(`${BASE}/operators/`),

  lockAcquire: (subscription_id: string, customer_id: string, user_email: string) =>
    api.post<LockResult>(`${BASE}/lock/acquire/`, {
      subscription_id,
      customer_id,
      user_email,
    }),

  lockRelease: (subscription_id: string, user_email: string) =>
    api.post<{ released: boolean }>(`${BASE}/lock/release/`, {
      subscription_id,
      user_email,
    }),

  upsertTracking: (payload: {
    subscription_id: string;
    customer_id: string;
    status?: string;
    operator?: string;
    comment?: string;
    payment_proof?: string;
  }) => api.post<FullPayLead>(`${BASE}/tracking/upsert/`, payload),

  detail: (subscription_id: string) =>
    api.get<FullPayLead>(`${BASE}/tracking/${encodeURIComponent(subscription_id)}/`),
};
