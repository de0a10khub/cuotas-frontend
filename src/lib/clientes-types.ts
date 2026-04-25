// Tipos del directorio operativo /clientes.
// NO mezclar con el CRUD legacy de src/lib/types.ts (Customer, CustomerDetail).

export type AgingCategory =
  | 'Pago único'
  | 'Al día'
  | 'Abiertas'
  | 'Vencidas'
  | 'Crónicas'
  | 'Incobrable';

export type Platform = 'stripe' | 'whop' | 'whop-erp';

export type DisputeState = 'open' | 'won' | 'lost';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'drafted';

export type RecoveryStatus =
  | 'Pendiente'
  | 'Contactado'
  | 'Promesa Pago'
  | 'RENEGOCIADO'
  | 'Recuperado'
  | 'PAGOS COMPLETADOS'
  | 'REEMBOLSADO'
  | 'DISPUTA PERDIDA'
  | 'Incobrable';

export interface ObjecionTag {
  id: string;
  name: string;
  bg_color: string;
  text_color: string;
}

export interface ClienteRow {
  subscription_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  platform: Platform;
  subscription_status: SubscriptionStatus | string;
  subscription_created_at: string;
  pause_collection: { resumes_at: string | null } | null;
  days_overdue: number;
  paid_invoices_count: number;
  unpaid_invoices_count: number;
  unpaid_invoices_total: number;
  category: AgingCategory | string;
  open_disputes: number;
  won_disputes: number;
  lost_disputes: number;
  recovery_status: RecoveryStatus | string | null;
  recovery_contacted_by: string;
  recovery_comment_1: string;
  recovery_comment_2: string;
  recovery_continue_with: string;
  recovery_locked_by: string | null;
  recovery_lock_expires_at: string | null;
  retry_count: number;
  last_retry_status: 'SUCCESS' | 'FAILURE' | null;
  is_refinanced: boolean;
  original_subscription_id: string | null;
  refinance_status: string | null;
  total_count: number;

  // Campos enriquecidos por el backend (presentes tanto en /clientes como
  // en /mora aunque /clientes no los pinta todos).
  product_name?: string | null;
  mentor_name?: string | null;
  mentorship_comment?: string;
  paid_count?: number;
  paid_total?: number;
  unpaid_total?: number;
  total_contract_value?: number;
  remaining_contract?: number;
  is_action_needed?: boolean;
  oldest_invoice_date?: string | null;
  recovery_updated_at?: string | null;
  objeciones_tags?: ObjecionTag[];
  dni?: string | null;
  address?: string | null;
  /** En /mora: puede ser 'needs_response' | 'under_review' | null. */
  dispute_kind?: 'needs_response' | 'under_review' | null;
}

export interface ClientesListResponse {
  results: ClienteRow[];
  total_count: number;
  page: number;
  page_size: number;
}

// Vista agrupada (1 fila por persona = unified_customer)
export interface PersonContract {
  subscription_id: string;
  external_customer_id: string | null;
  platform: Platform | string;
  product_name: string | null;
  subscription_status: string;
  subscription_created_at: string | null;
  paid_count: number;
  unpaid_count: number;
  paid_total: number;
  unpaid_total: number;
  total_contract_value: number;
  remaining_contract: number;
  days_overdue: number;
  category: AgingCategory | string;
  oldest_invoice_date: string | null;
  total_installments_all: number | null;
  /** true = fila de "acceso al grupo Whop" espejo de un whop-erp (no es contrato real). */
  is_access_only: boolean;
}

export interface PersonRow {
  person_key: string;
  unified_customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  category: AgingCategory | string;
  platforms: Platform[] | string[];
  n_contracts: number;
  paid_count: number;
  unpaid_count: number;
  paid_total: number;
  unpaid_total: number;
  paid_total_cents: number;
  unpaid_total_cents: number;
  total_contract_value: number;
  remaining_contract: number;
  days_overdue: number;
  open_disputes: number;
  won_disputes: number;
  lost_disputes: number;
  product_name: string | null;
  recovery_status: RecoveryStatus | string | null;
  recovery_contacted_by: string | null;
  recovery_comment_1: string | null;
  recovery_comment_2: string | null;
  recovery_continue_with: string | null;
  recovery_updated_at: string | null;
  objeciones_tags: ObjecionTag[];
  contracts: PersonContract[];
}

export interface PersonListResponse {
  results: PersonRow[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface Operator {
  id: string;
  display_name: string;
  email: string;
}

export interface ActionLogEntry {
  id: string;
  subscription_id: string;
  customer_id: string;
  platform: string;
  action_type: string;
  status: 'SUCCESS' | 'FAILURE' | 'NEUTRAL' | 'PAID' | string;
  performed_by: string;
  result_payload: Record<string, unknown>;
  created_at: string;
}

export interface FailedPayment {
  id: string;
  platform: Platform;
  customer_id: string;
  subscription_id: string;
  due_date: string | null;
  /** Fecha real de cobro (distinta de due_date si hubo past_due + recovery). */
  paid_at?: string | null;
  created_at: string | null;
  amount: number;
  currency: string;
  /**
   * Unificado entre plataformas:
   *  - stripe: 'paid' | 'open' | 'draft' | 'void' | 'uncollectible'
   *  - whop: 'paid' | 'open' | 'refunded' | 'canceled' | ...
   *  - whop-erp: 'paid' | 'pending' | 'failed' | ...
   */
  status: string;
  dispute_status: string | null;
  /**
   * Origen del refund cuando hay reembolso o disputa:
   *  - 'chargeback_lost'    cliente ganó disputa (Stripe forzó refund)
   *  - 'chargeback_won'     ganamos disputa (cliente NO recibió refund)
   *  - 'chargeback_pending' disputa abierta, pendiente
   *  - 'voluntary'          nosotros emitimos refund desde la web
   *  - 'unknown'            Whop refund (origen no rastreado)
   */
  refund_origin?: string | null;
  attempt_count: number;
  assigned_operator_id: string | null;

  // Stripe
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  amount_paid?: number;

  // Whop
  payment_processor?: string | null;

  // Whop-ERP (Checkout)
  installment_number?: number;
  whop_payment_id?: string | null;
  checkout_session_id?: string | null;
}

export interface LockResult {
  locked: boolean;
  locked_by: string | null;
  expires_at: string | null;
}
