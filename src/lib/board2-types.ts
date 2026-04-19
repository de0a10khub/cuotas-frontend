export type Board2Source = 'invoice' | 'purchase';

export interface Board2CashCollected {
  total_collected_eur: number;
  invoice_count?: number;
  purchase_count?: number;
}

export interface Board2Exposure {
  pending_exposure_eur: number;
  amount_at_risk_eur: number;
  // invoice mode
  open_count?: number;
  overdue_count?: number;
  // purchase mode
  active_purchases?: number;
  overdue_purchases?: number;
}

export interface Board2SuccessRate {
  paid_units: number;
  pending_units: number;
  total_units: number;
  pending_ratio_pct: number;
}

export interface Board2Aging {
  cuotas_0_7_dias: number;
  importe_0_7_dias_eur: number;
  cuotas_8_15_dias: number;
  importe_8_15_dias_eur: number;
  cuotas_16_30_dias: number;
  importe_16_30_dias_eur: number;
  cuotas_mas_30_dias: number;
  importe_mas_30_dias_eur: number;
  total_cuotas_impagadas: number;
  importe_total_impagado_eur: number;
}
