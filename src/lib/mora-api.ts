import { api } from './api';
import type {
  ActionLogEntry,
  FailedPayment,
  InteractionSnapshot,
  MoraListResponse,
  MoraRow,
  ObjecionTag,
  Operator,
} from './mora-types';
import type { LockResult } from './clientes-types';

const BASE = '/api/v1/mora-directorio';

export interface MoraListParams {
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

export const moraApi = {
  list: (p: MoraListParams) =>
    api.get<MoraListResponse>(`${BASE}/list/${toQuery({ ...p })}`),

  operators: () => api.get<{ results: Operator[] }>(`${BASE}/operators/`),

  objecionesTags: () =>
    api.get<{ results: ObjecionTag[] }>(`${BASE}/objeciones-tags/`),

  detail: (subscriptionId: string) =>
    api.get<MoraRow>(`${BASE}/row/${encodeURIComponent(subscriptionId)}/`),

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
  }) => api.post<MoraRow>(`${BASE}/tracking/upsert/`, payload),

  history: (subscriptionId: string) =>
    api.get<{ results: ActionLogEntry[] }>(
      `${BASE}/history/${encodeURIComponent(subscriptionId)}/`,
    ),

  interactions: (subscriptionId: string) =>
    api.get<{ results: InteractionSnapshot[] }>(
      `${BASE}/interactions/${encodeURIComponent(subscriptionId)}/`,
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
      `/api/v1/clientes-directorio/assign-payment-operator/`,
      payload,
    ),

  // Notas en pagos: reutilizamos el endpoint de clientes-directorio (es genérico
  // por platform + payment_id, no depende de la zona). Sin esto, FailedPaymentsList
  // ocultaba el botón de notas en /mora, /mora-n2 y /recobros.
  paymentNote: (payload: { platform: string; payment_id: string; note: string }) =>
    api.post<{ ok: boolean; note: string | null; updated_at?: string }>(
      `/api/v1/clientes-directorio/payment-note/`,
      payload,
    ),

  paymentUpdateLink: (payload: {
    subscription_id: string;
    customer_id: string;
    platform: string;
    /** installment_id (poi_*) — necesario para Whop ERP. */
    item_id?: string;
  }) => api.post<{ url: string; platform: string }>(`${BASE}/payment-update-link/`, payload),

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

  syncSheets: () =>
    api.post<{ success: boolean; message: string }>(`${BASE}/sync-sheets/`),

  exportCsvUrl: (
    p: MoraListParams & {
      operator?: string;
      status?: string;
      action_needed?: string;
      tags?: string;
    },
  ) => `${BASE}/export/${toQuery({ ...p })}`,
};
