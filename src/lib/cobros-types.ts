// Tipos del dashboard /cobros.

export interface CobrosKpis {
  contract_value_eur: number;
  contract_value_count: number;
  cash_collected_eur: number;
  cash_collected_count: number;
  paid_invoices_eur: number;
  paid_invoices_count: number;
  direct_payments_eur: number;
  direct_payments_count: number;
  pending_eur: number;
  pending_count: number;
  abiertas_eur: number;
  abiertas_count: number;
  vencidas_eur: number;
  vencidas_count: number;
  cronicas_eur: number;
  cronicas_count: number;
  incobrable_eur: number;
  incobrable_count: number;
  ratio_pending_pct: number;
}

export interface DailyCycleRow {
  invoice_date: string; // YYYY-MM-DD
  paid_eur: number;
  paid_count: number;
  paid_invoices_eur: number;
  paid_invoices_count: number;
  direct_payments_eur: number;
  direct_payments_count: number;
  open_eur: number;
  open_count: number;
  real_open_eur: number;
  real_open_count: number;
  draft_eur: number;
  draft_count: number;
  past_due_eur: number;
  past_due_count: number;
  uncollectible_eur: number;
  uncollectible_count: number;
  bad_debt_eur: number;
  bad_debt_count: number;
  total_eur: number;
  total_count: number;
  ratio_unpaid_pct: number;
  contract_value_eur: number;
}

export interface SubscriptionMonthRow {
  invoice_date: string;
  subscription_month: string; // YYYY-MM
  amount_eur: number;
  invoice_count: number;
}

export interface GlobalRange {
  from: string | null;
  to: string | null;
}

export type CobrosPlatform = 'all' | 'stripe' | 'whop';

export type CobrosPeriod =
  | 'today'
  | '7d'
  | '30d'
  | 'last_month'
  | '90d'
  | 'mtd'
  | 'qtd'
  | 'ytd'
  | 'all'
  | 'custom';

export type CycleDays = 7 | 14 | 21 | 28;
