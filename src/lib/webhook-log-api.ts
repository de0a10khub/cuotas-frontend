import { api } from './api';

const BASE = '/api/v1/webhook-log';

export interface LogEvent {
  id: string;
  source: 'stripe' | 'whop' | 'whop-erp';
  event_type: string;
  created_at: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  currency: string;
  is_success: boolean;
  failure_reason: string | null;
}

export interface ChargeDetail {
  id: string;
  created: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  failure_code: string | null;
  failure_code_es: string | null;
  failure_message: string | null;
  outcome_type: string | null;
  outcome_reason: string | null;
  outcome_reason_es: string | null;
  outcome_seller_message: string | null;
  outcome_network_status: string | null;
  card_brand: string;
  card_last4: string;
  card_exp: string;
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

export const logApi = {
  events: (params: {
    source?: string;
    filter?: string;
    search?: string;
    since?: string;
    limit?: number;
  }) => api.get<{ results: LogEvent[] }>(`${BASE}/events/${q({ ...params })}`),

  charges: (customer_id: string) =>
    api.get<{ results: ChargeDetail[] }>(`${BASE}/charges/?customer_id=${encodeURIComponent(customer_id)}`),
};
