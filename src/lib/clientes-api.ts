import { api } from './api';
import type {
  ActionLogEntry,
  ClientesListResponse,
  ClienteRow,
  FailedPayment,
  LockResult,
  Operator,
  PersonListResponse,
} from './clientes-types';

const BASE = '/api/v1/clientes-directorio';

export interface ListParams {
  search?: string;
  platform?: string;
  category?: string;
  dispute_state?: string;
  page?: number;
  page_size?: number;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === 'all') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const clientesApi = {
  list: (p: ListParams) =>
    api.get<ClientesListResponse>(`${BASE}/list/${toQuery({ ...p })}`),

  listGrouped: (p: ListParams) =>
    api.get<PersonListResponse>(`${BASE}/list-grouped/${toQuery({ ...p })}`),

  operators: () => api.get<{ results: Operator[] }>(`${BASE}/operators/`),

  detail: (subscriptionId: string) =>
    api.get<ClienteRow>(`${BASE}/row/${encodeURIComponent(subscriptionId)}/`),

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
    contacted_by?: string;
    comment_1?: string;
    continue_with?: string;
    comment_2?: string;
    tags?: string[];
  }) => api.post<ClienteRow>(`${BASE}/tracking/upsert/`, payload),

  history: (subscriptionId: string) =>
    api.get<{ results: ActionLogEntry[] }>(
      `${BASE}/history/${encodeURIComponent(subscriptionId)}/`,
    ),

  failedPayments: (subscriptionId: string) =>
    api.get<{ results: FailedPayment[] }>(
      `${BASE}/failed-payments/${encodeURIComponent(subscriptionId)}/`,
    ),

  retryPayment: (payload: {
    subscription_id: string;
    customer_id: string;
    item_id: string;
    platform: string;
  }) =>
    api.post<{ success: boolean; item_id: string; error?: string; status?: string }>(
      `${BASE}/retry-payment/`,
      payload,
    ),

  assignPaymentOperator: (payload: {
    platform: string;
    item_id: string;
    operator_id: string | null;
  }) =>
    api.post<{ ok: boolean; assigned_operator_id: string | null }>(
      `${BASE}/assign-payment-operator/`,
      payload,
    ),

  paymentNote: (payload: { platform: string; payment_id: string; note: string }) =>
    api.post<{ ok: boolean; note: string | null; updated_at?: string }>(
      `${BASE}/payment-note/`,
      payload,
    ),

  paymentUpdateLink: (payload: {
    subscription_id: string;
    customer_id: string;
    platform: string;
  }) => api.post<{ url: string }>(`${BASE}/payment-update-link/`, payload),

  generateContract: (payload: {
    subscription_id: string;
    customer_id: string;
    customer_email: string;
    platform: string;
  }) => api.post<{ url: string }>(`${BASE}/generate-contract/`, payload),

  contract: (subscriptionId: string) =>
    api.get<{ url: string | null }>(
      `${BASE}/contract/${encodeURIComponent(subscriptionId)}/`,
    ),

  exportCsvUrl: (p: ListParams & { operator?: string; status?: string; sub_status?: string }) =>
    `${BASE}/export/${toQuery({ ...p })}`,
};
