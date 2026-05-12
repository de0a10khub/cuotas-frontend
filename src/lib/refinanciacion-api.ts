import { api } from './api';

const BASE = '/api/v1/refinanciacion';

export interface RefinanOperation {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  operation_type: 'refinanciacion' | 'amortizacion_anticipada';
  original_sub_id: string;
  product_name: string;
  product_group: string | null;
  original_start_date: string;
  original_installments: number;
  original_installments_paid: number;
  new_sub_id: string;
  new_product_name: string;
  refinance_date: string;
  new_installments: number;
  installments_reduced: number;
  amount_saved: number; // céntimos
  new_amount: number; // céntimos
  refinance_status: string;
  platform: string;
}

export interface OrphanSale {
  id: string;
  customer_name: string;
  customer_email: string;
  platform: string;
  product_name: string;
  external_identifier: string;
  sale_date: string;
  amount: number; // céntimos
}

export interface CreateRefinancePayload {
  original_order_id: string;
  original_platform: 'whop-erp' | 'stripe' | 'whop';
  client_email: string;
  client_name: string;
  client_phone?: string;
  client_lastname?: string;
  client_company?: string;
  client_address?: string;
  client_city?: string;
  client_zip?: string;
  client_country?: string;
  client_state?: string;
  client_vat?: string;
  debt_remaining_cents: number;
  commission_waived_cents: number;
  new_amount_to_pay_cents: number;
  new_installments: number;
  first_due_date?: string;  // YYYY-MM-DD
}

export interface CreateRefinanceResponse {
  success: boolean;
  new_order_id: string;
  checkout_url: string;
  installments: number;
  first_due_date: string;
}

export const refinanApi = {
  list: () => api.get<{ results: RefinanOperation[] }>(`${BASE}/list/`),
  orphans: () => api.get<{ results: OrphanSale[] }>(`${BASE}/orphans/`),
  detect: () =>
    api.post<{ success: boolean; detected_count: number; message: string }>(
      `${BASE}/detect/`,
    ),
  overrideStatus: (id: string, status: string) =>
    api.post<RefinanOperation>(`${BASE}/status-override/`, { id, status }),
  pair: (orphan_id: string, original_sub_id: string) =>
    api.post<{ paired: boolean }>(`${BASE}/manual-pair/`, { orphan_id, original_sub_id }),
  exportUrl: () => `${BASE}/export/`,
  /** Crea una nueva refinanciación: proxy al backend Rust del ERP-checkout. */
  create: (payload: CreateRefinancePayload) =>
    api.post<CreateRefinanceResponse>(`/api/v1/admin/refinance/`, payload),
};
