import { api } from './api';
import type { DatosEntitiesResponse, DatosListResponse } from './datos-types';

const BASE = '/api/v1/datos';

export interface DatosQueryParams {
  from?: string;
  to?: string;
  limit?: number;
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

export const datosApi = {
  entities: () => api.get<DatosEntitiesResponse>(`${BASE}/entities/`),

  listEntity: (entity: string, params: DatosQueryParams = {}) =>
    api.get<DatosListResponse>(
      `${BASE}/entity/${encodeURIComponent(entity)}/${q({ ...params })}`,
    ),

  exportEntityUrl: (entity: string, params: DatosQueryParams = {}) =>
    `${BASE}/entity/${encodeURIComponent(entity)}/export/${q({ ...params })}`,
};
