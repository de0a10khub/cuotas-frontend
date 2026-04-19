import { api } from './api';
import type { ActivityLogEntry, AuditMetadata } from './audit-types';

const BASE = '/api/v1/audit';

export interface AuditQueryParams {
  module?: string;
  role?: string;
  user_email?: string;
  platform?: string;
  result?: string;
  action_type?: string;
  search?: string;
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

export const auditApi = {
  logs: (p: AuditQueryParams) =>
    api.get<{
      results: ActivityLogEntry[];
      total_count: number;
      page: number;
      page_size: number;
    }>(`${BASE}/logs/${q({ ...p })}`),

  metadata: () => api.get<AuditMetadata>(`${BASE}/metadata/`),
};
