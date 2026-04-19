import { api } from './api';
import type {
  Board2Aging,
  Board2CashCollected,
  Board2Exposure,
  Board2Source,
  Board2SuccessRate,
} from './board2-types';

const BASE = '/api/v1/board2';

export interface Board2Params {
  from: string;
  to: string;
  platform?: string;
  source: Board2Source;
}

function q(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === 'all') continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export const board2Api = {
  cashCollected: (p: Board2Params) =>
    api.get<Board2CashCollected>(`${BASE}/cash-collected/${q({ ...p })}`),
  exposure: (p: Board2Params) => api.get<Board2Exposure>(`${BASE}/exposure/${q({ ...p })}`),
  successRate: (p: Board2Params) =>
    api.get<Board2SuccessRate>(`${BASE}/success-rate/${q({ ...p })}`),
  aging: (p: Board2Params) => api.get<Board2Aging>(`${BASE}/aging/${q({ ...p })}`),
};
