import { api } from './api';
import type { MoraListResponse } from './mora-types';

const BASE = '/api/v1/mora-directorio';

export interface MoraN2ListParams {
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

export const moraN2Api = {
  list: (p: MoraN2ListParams) =>
    api.get<MoraListResponse>(`${BASE}/n2/list/${toQuery({ ...p })}`),
};
