// Cliente para los endpoints "Mis Casos / Casos por Operario".
// Backend lo expone en /api/v1/mis-casos/ y /api/v1/casos-por-operario/.
//
// - list: panel filtrado (mora_n1, mora_n2, recobros, full_pay, clientes) por operario.
//   Si el caller es Admin, puede pasar `as_email` para impersonar otro operario.
// - summary: KPIs por operario (admin/manager).
// - operatorDetail: detalle de un operario concreto (no usado en MVP, queda preparado).

import { api } from './api';

export type MisCasosPanel =
  | 'mora_n1'
  | 'mora_n2'
  | 'recobros'
  | 'full_pay'
  | 'clientes';

export interface MisCasosListParams {
  search?: string;
  platform?: string;
  page?: number;
  page_size?: number;
  /** Si lo manda un admin, ve los casos de ese operario en vez de los suyos. */
  as_email?: string;
}

export interface MisCasosRow {
  subscription_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  platform: string;
  /** Estado del panel correspondiente (mora status, recovery status, …). */
  status: string | null;
  /** display_name del operario asignado. */
  assigned_operator: string | null;
  assigned_operator_email: string | null;
  days_overdue: number;
  unpaid_total: number;
  /** El backend marca a qué panel pertenece la fila para la columna "Panel". */
  panel?: MisCasosPanel;
}

export interface MisCasosListResponse {
  results: MisCasosRow[];
  total_count: number;
  /** Email del operario cuya vista se está mostrando (el caller o el impersonado). */
  as_email?: string;
  as_display_name?: string;
  /** true si el caller es admin viendo los casos de otro. */
  is_admin_acting_as?: boolean;
  /** Counters para los tabs (uno por panel). El backend los calcula sobre el operario activo. */
  counts?: Record<MisCasosPanel, number>;
  /** Deuda total agregada del operario activo (todos los paneles). */
  deuda_total_eur?: number;
}

export interface OperatorWithKPIs {
  id: string;
  email: string;
  display_name: string;
  n_casos_mora_n1: number;
  n_casos_mora_n2: number;
  n_casos_recobros: number;
  n_casos_full_pay?: number;
  n_casos_clientes: number;
  total_casos: number;
  deuda_total_eur: number;
}

export interface OperatorsSummaryResponse {
  results: OperatorWithKPIs[];
  /** Totales del equipo (suma de operarios). */
  team_total_casos?: number;
  team_total_deuda_eur?: number;
}

export interface OperatorDetailResponse {
  operator: OperatorWithKPIs;
  /** Filas por panel para drill-down (opcional). */
  rows_by_panel?: Record<MisCasosPanel, MisCasosRow[]>;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === 'all') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const misCasosApi = {
  list: (panel: MisCasosPanel, params: MisCasosListParams = {}) =>
    api.get<MisCasosListResponse>(
      `/api/v1/mis-casos/list/${toQuery({
        panel,
        search: params.search,
        platform: params.platform,
        page: params.page,
        page_size: params.page_size,
        as_email: params.as_email,
      })}`,
    ),

  summary: () =>
    api.get<OperatorsSummaryResponse>('/api/v1/casos-por-operario/summary/'),

  operatorDetail: (email: string) =>
    api.get<OperatorDetailResponse>(
      `/api/v1/casos-por-operario/operator/${encodeURIComponent(email)}/`,
    ),
};
