import { api } from './api';
import type { MoraListResponse, MoraRow } from './mora-types';

const BASE = '/api/v1/recobros-directorio';

export interface RecobrosListParams {
  search?: string;
  platform?: string;
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

export const recobrosApi = {
  list: (p: RecobrosListParams) =>
    api.get<MoraListResponse>(`${BASE}/list/${toQuery({ ...p })}`),

  syncSheets: () =>
    api.post<{ success: boolean; message: string }>(`${BASE}/sync-sheets/`),
};

// Alias para mantener shape `MoraRow` (/recobros usa el mismo modelo que /mora)
export type RecobrosRow = MoraRow;
