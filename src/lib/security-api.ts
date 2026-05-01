import { api } from './api';

const BASE = '/api/v1/security';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type EventType =
  | 'login_failed'
  | 'login_locked'
  | 'rate_limit'
  | 'unauthorized'
  | 'forbidden'
  | 'suspicious_path'
  | 'server_error'
  | 'other';

export interface SecurityEvent {
  id: number;
  event_type: EventType;
  severity: Severity;
  source_ip: string | null;
  user_agent: string;
  path: string;
  method: string;
  status_code: number | null;
  user_email: string;
  payload: Record<string, unknown>;
  notified_telegram: boolean;
  created_at: string;
}

export interface SecurityListResponse {
  results: SecurityEvent[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface SecurityStats {
  total_24h: number;
  unique_ips_24h: number;
  critical_24h: number;
  high_24h: number;
  top_ips_7d: { source_ip: string; count: number }[];
  by_type_24h: { event_type: EventType; count: number }[];
  by_hour_24h: { hour: string; count: number }[];
}

export interface SecurityListParams {
  severity?: 'all' | Severity;
  type?: 'all' | EventType;
  ip?: string;
  days?: number;
  page?: number;
}

function toQuery(p: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === '' || v === 'all') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const securityApi = {
  list: (p: SecurityListParams = {}) =>
    api.get<SecurityListResponse>(`${BASE}/events/${toQuery({ ...p })}`),

  stats: () => api.get<SecurityStats>(`${BASE}/stats/`),
};
