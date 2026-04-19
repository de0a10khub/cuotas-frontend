import { api } from './api';

const BASE = '/api/v1/mora-stats';

export interface RecoveryStatusItem {
  recovery_status: string;
  client_count: number;
  total_recovered_payments: number;
}

export interface AgingItem {
  aging_category: string;
  client_count: number;
}

export interface ObjecionItem {
  tag_name: string;
  client_count: number;
}

export const moraStatsApi = {
  recoveryStatus: () =>
    api.get<{ results: RecoveryStatusItem[] }>(`${BASE}/recovery-status/`),
  aging: () => api.get<{ results: AgingItem[] }>(`${BASE}/aging/`),
  objeciones: () => api.get<{ results: ObjecionItem[] }>(`${BASE}/objeciones/`),
};
