import { api } from './api';

const BASE = '/api/v1/conciliacion';

export interface ConciliacionRow {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  platform: string;
  product_name: string;
  purchase_date: string;
  cuota_1_status: string;
  cuota_1_amount: number;
  cuota_2_status: string;
  cuota_2_amount: number;
  cuota_2_date: string | null;
}

export interface ConciliacionResponse {
  results: ConciliacionRow[];
  total_count: number;
  month: number;
  year: number;
}

export const conciliacionApi = {
  list: (month: number, year: number) =>
    api.get<ConciliacionResponse>(`${BASE}/list/?month=${month}&year=${year}`),

  exportUrl: (month: number, year: number) =>
    `${BASE}/export/?month=${month}&year=${year}`,
};
