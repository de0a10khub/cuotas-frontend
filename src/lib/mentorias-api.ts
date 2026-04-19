import { api } from './api';

const BASE = '/api/v1/mentorias';

export interface MentorshipKpi {
  mentor_name: string;
  total_students: number;
  active_percentage: number;
  unpaid_percentage: number;
}

export interface MentorshipStudent {
  subscription_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  platform: string;
  product_name: string | null;
  mentor_name: string;
  recovery_status: string;
  days_overdue: number;
  unpaid_total: number;
  paid_count: number;
}

export const mentoriasApi = {
  kpis: () => api.get<{ results: MentorshipKpi[] }>(`${BASE}/kpis/`),
  customers: (params: {
    search?: string;
    mentor?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '' || v === 'all') continue;
      q.set(k, String(v));
    }
    const s = q.toString();
    return api.get<{
      results: MentorshipStudent[];
      total_count: number;
      page: number;
      page_size: number;
    }>(`${BASE}/customers/${s ? `?${s}` : ''}`);
  },
  filterOptions: () =>
    api.get<{ mentors: string[]; statuses: string[] }>(`${BASE}/filter-options/`),
};
