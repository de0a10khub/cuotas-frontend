import { api } from './api';

const BASE = '/api/v1/disputes';

export interface DisputesKpis {
  disputas_abiertas: number;
  disputas_ganadas: number;
  disputas_perdidas: number;
  importe_en_disputa_eur: number;
  importe_ganadas_eur: number;
  importe_perdidas_eur: number;
  win_rate_pct: number;
}

export interface RefundsKpis {
  total_refunds: number;
  importe_reembolsado_eur: number;
  suscripciones_canceladas: number;
}

export interface DisputeRow {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  platform: string;
  dispute_id: string;
  dispute_status: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  invoice_id: string;
  total_count: number;
}

interface ListParams {
  from?: string;
  to?: string;
  platform?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function q(p: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === '' || v === 'all') continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export const disputesApi = {
  kpis: (p: { from?: string; to?: string; platform?: string }) =>
    api.get<DisputesKpis>(`${BASE}/kpis/${q({ ...p })}`),
  refundsKpis: (p: { from?: string; to?: string; platform?: string }) =>
    api.get<RefundsKpis>(`${BASE}/refunds-kpis/${q({ ...p })}`),
  list: (p: ListParams) =>
    api.get<{
      results: DisputeRow[];
      total_count: number;
      page: number;
      page_size: number;
    }>(`${BASE}/list/${q({ ...p })}`),
};
