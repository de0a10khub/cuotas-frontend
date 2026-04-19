export type FullPayStatus =
  | 'CONTACTADO'
  | 'NO_RESPONDE'
  | 'FULL_PAY'
  | '2_CUOTAS'
  | '3_CUOTAS'
  | '6_CUOTAS'
  | 'FOLLOW_UP'
  | 'NUMERO_EQUIVOCADO'
  | 'DEBE_CUOTAS';

export interface FullPayLead {
  subscription_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  platform: 'stripe' | 'whop' | 'whop-erp';
  product_name: string | null;
  paid_count: number;
  paid_total: number;
  alta_date: string;
  days_since_alta: number;
  open_disputes: number;
  won_disputes: number;
  lost_disputes: number;
  recovery_status: FullPayStatus | string | null;
  recovery_operator: string | null;
  recovery_comment: string | null;
  recovery_payment_proof: string | null;
  recovery_locked_by: string | null;
  recovery_lock_expires_at: string | null;
  total_count: number;
}

export interface FullPayListResponse {
  results: FullPayLead[];
  total_count: number;
  page: number;
  page_size: number;
}
