import { api } from './api';

const BASE = '/api/v1/admin-data';

export interface DuplicateAccount {
  platform: string;
  external_id: string;
  name: string | null;
  phone: string | null;
  source: string;
}

export interface DuplicatePending {
  id: string;
  email: string;
  platforms_found: string[];
  accounts_found: DuplicateAccount[];
  candidate_name: string | null;
  status: 'pending' | 'merged' | 'ignored';
  resolution_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface DuplicatesSummary {
  pending: number;
  merged: number;
  ignored: number;
  total: number;
}

export interface Discrepancy {
  id: number;
  entity_type: string;
  entity_id: string;
  platform: string;
  discrepancy_type: string;
  severity: 'high' | 'medium' | 'low';
  conci_value: string | null;
  source_value: string | null;
  customer_email: string | null;
  customer_id: string | null;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  detected_at: string;
}

export interface DiscrepancySummary {
  totals: {
    total: number;
    high_pending: number;
    resolved: number;
    pending: number;
  };
  by_type: Array<{
    entity_type: string;
    discrepancy_type: string;
    severity: string;
    n: number;
    resolved: number;
    pending: number;
  }>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) s.set(k, String(v));
  }
  return s.toString() ? `?${s.toString()}` : '';
}

export const adminDataApi = {
  duplicatesSummary: () => api.get<DuplicatesSummary>(`${BASE}/duplicates/summary/`),
  listDuplicates: (params: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ results: DuplicatePending[]; total_count: number; page: number; limit: number }>(
      `${BASE}/duplicates/${qs(params)}`,
    ),
  mergeDuplicate: (id: string, note?: string) =>
    api.post<{ ok: boolean; customer_id: string; platform_accounts_created: number }>(
      `${BASE}/duplicates/${id}/merge/`,
      { note },
    ),
  splitDuplicate: (id: string, note?: string) =>
    api.post<{ ok: boolean; customers_created: string[] }>(`${BASE}/duplicates/${id}/split/`, { note }),
  ignoreDuplicate: (id: string, note?: string) =>
    api.post<{ ok: boolean }>(`${BASE}/duplicates/${id}/ignore/`, { note }),

  discrepanciesSummary: () => api.get<DiscrepancySummary>(`${BASE}/discrepancies/summary/`),
  listDiscrepancies: (params: {
    entity_type?: string;
    severity?: string;
    resolved?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ results: Discrepancy[]; total_count: number; page: number; limit: number }>(
      `${BASE}/discrepancies/${qs(params)}`,
    ),
  resolveDiscrepancy: (id: number, note?: string) =>
    api.post<{ ok: boolean }>(`${BASE}/discrepancies/${id}/resolve/`, { note }),
};
