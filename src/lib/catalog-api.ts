import { api } from './api';

const BASE = '/api/v1/catalog';

export interface CatalogProduct {
  id: string;
  platform: 'stripe' | 'whop';
  external_identifier: string;
  external_name: string | null;
  total_contract_value: number;
  billing_type: 'financing' | 'subscription' | 'one_time';
  has_mentorship: boolean;
  has_refinancing: boolean;
  has_amortization: boolean;
  product_group: string | null;
  mentor_team_id: string | null;
  updated_at: string;
}

export const catalogApi = {
  list: () => api.get<{ results: CatalogProduct[] }>(`${BASE}/products/`),
  create: (payload: Partial<CatalogProduct>) =>
    api.post<CatalogProduct>(`${BASE}/products/`, payload),
  update: (id: string, patch: Partial<CatalogProduct>) =>
    api.patch<CatalogProduct>(`${BASE}/products/${encodeURIComponent(id)}/`, patch),
  remove: (id: string) => api.delete(`${BASE}/products/${encodeURIComponent(id)}/`),
  syncMissing: () =>
    api.post<{ success: boolean; added: number; message: string }>(`${BASE}/sync-missing/`),
};
