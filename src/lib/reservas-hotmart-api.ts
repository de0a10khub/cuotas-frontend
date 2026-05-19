import { api } from './api';

export interface HotmartReservation {
  transaction: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  product_name: string | null;
  price_cents: number | null;
  currency: string | null;
  reservation_status: 'pending' | 'converted' | 'refunded' | null;
  order_date: string | null;
  approved_date: string | null;
  refunded_date: string | null;
  sales_for_email: number;
}

export type ReservaFilter = 'pending' | 'converted' | 'refunded' | 'all';

export async function listReservas(filter: ReservaFilter = 'pending') {
  return api.get<{ results: HotmartReservation[] }>(
    `/api/v1/hotmart/admin/reservations/?filter=${filter}`,
  );
}
