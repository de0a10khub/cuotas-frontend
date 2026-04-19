import { api } from './api';
import type {
  CobrosKpis,
  DailyCycleRow,
  GlobalRange,
  SubscriptionMonthRow,
} from './cobros-types';

const BASE = '/api/v1/cobros';

export interface RangeParams {
  from: string; // YYYY-MM-DD
  to: string;
  platform?: string;
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

export const cobrosApi = {
  globalKpis: (platform?: string) =>
    api.get<CobrosKpis>(`${BASE}/global-kpis/${q({ platform })}`),

  rangeKpis: (p: RangeParams) =>
    api.get<CobrosKpis>(`${BASE}/range-kpis/${q({ ...p })}`),

  dailyCycles: (p: RangeParams) =>
    api.get<{ results: DailyCycleRow[] }>(`${BASE}/daily-cycles/${q({ ...p })}`),

  bySubscriptionMonth: (p: RangeParams) =>
    api.get<{ results: SubscriptionMonthRow[] }>(
      `${BASE}/by-subscription-month/${q({ ...p })}`,
    ),

  globalRange: () => api.get<GlobalRange>(`${BASE}/global-range/`),

  exportCiclosUrl: (p: RangeParams) => `${BASE}/export/ciclos/${q({ ...p })}`,
};
