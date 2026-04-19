import { api } from './api';

const V1 = '/api/v1';

// --- Home ---
export interface HomeSummary {
  kpis: {
    total_customers: number;
    total_debt_eur: number;
    open_disputes: number;
    cash_collected_eur: number;
  };
  recent_activity: {
    id: string;
    fecha: string;
    modulo: string;
    tipo_accion: string;
    usuario_nombre: string;
    cliente_nombre: string;
    resultado: string;
  }[];
}

// --- Riesgos ---
export interface RiesgosExposure {
  pending_exposure_eur: number;
  amount_at_risk_eur: number;
  dispute_risk_eur: number;
  refunded_this_period_eur: number;
  overdue_count: number;
}

export interface RiesgosAging {
  cuotas_abiertas: number;
  importe_abiertas_eur: number;
  cuotas_vencidas: number;
  importe_vencidas_eur: number;
  cuotas_cronicas: number;
  importe_cronicas_eur: number;
  cuotas_incobrables: number;
  importe_incobrables_eur: number;
  total_cuotas_impagadas: number;
  importe_total_impagado_eur: number;
}

export interface StatusDistributionItem {
  status: string;
  cantidad: number;
  importe_total_eur: number;
}

export interface ChurnRiskItem {
  risk_level: string;
  subscription_count: number;
  total_amount_eur: number;
}

// --- Operaciones ---
export interface OperationalKpis {
  refinanciaciones_30d: number;
  ratio_refinanciacion_pct: number;
  duplicados_30d: number;
  duplicados_total: number;
  bonuses_30d: number;
}

export interface CohortDefaultRow {
  cohorte_mes: string;
  compras_total: number;
  compras_overdue: number;
  default_rate_pct: number;
}

// --- Proyecciones ---
export interface Hypothesis {
  id: string;
  name: string;
  churn: number;
  growth: number;
  created_at: string;
}

export interface HistoricalRates {
  avg_monthly_churn: number;
  avg_monthly_growth: number;
}

export interface ProjectionChartData {
  snapshots: Record<string, { date: string; value: number }[]>;
  real_data: { date: string; value: number }[];
}

export interface JournalEntry {
  id: string;
  date: string;
  action: string;
  user: string;
  notes: string;
}

export const dashboardsApi = {
  home: () => api.get<HomeSummary>(`${V1}/home/summary/`),
  riesgos: {
    exposure: (params: { from?: string; to?: string; platform?: string }) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params))
        if (v && v !== 'all') q.set(k, v);
      return api.get<RiesgosExposure>(
        `${V1}/riesgos-panel/exposure/${q.toString() ? `?${q}` : ''}`,
      );
    },
    aging: (params: { from?: string; to?: string; platform?: string }) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params))
        if (v && v !== 'all') q.set(k, v);
      return api.get<RiesgosAging>(
        `${V1}/riesgos-panel/aging/${q.toString() ? `?${q}` : ''}`,
      );
    },
    statusDistribution: (params: { from?: string; to?: string; platform?: string }) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params))
        if (v && v !== 'all') q.set(k, v);
      return api.get<{ results: StatusDistributionItem[] }>(
        `${V1}/riesgos-panel/status-distribution/${q.toString() ? `?${q}` : ''}`,
      );
    },
    churnRisk: () => api.get<{ results: ChurnRiskItem[] }>(`${V1}/riesgos-panel/churn-risk/`),
  },
  operaciones: {
    kpis: () => api.get<OperationalKpis>(`${V1}/operaciones-panel/kpis/`),
    cohorts: () => api.get<{ results: CohortDefaultRow[] }>(`${V1}/operaciones-panel/cohort-default/`),
  },
  proyecciones: {
    hypotheses: () => api.get<{ results: Hypothesis[] }>(`${V1}/proyecciones/hypotheses/`),
    createHypothesis: (payload: { name: string; churn: number; growth: number }) =>
      api.post<Hypothesis>(`${V1}/proyecciones/hypotheses/`, payload),
    historicalRates: () => api.get<HistoricalRates>(`${V1}/proyecciones/historical-rates/`),
    chart: (hypothesisIds: string[]) =>
      api.get<ProjectionChartData>(
        `${V1}/proyecciones/chart/?hypothesis_ids=${encodeURIComponent(
          hypothesisIds.join(','),
        )}`,
      ),
    refreshBase: () =>
      api.post<{ success: boolean; refreshed_at: string }>(`${V1}/proyecciones/refresh-base/`),
    journal: () => api.get<{ results: JournalEntry[] }>(`${V1}/proyecciones/journal/`),
  },
};
