/**
 * Cliente de API para /api/v1/direccion/ — Cuadro de Mando.
 *
 * Acceso restringido: solo Carlos, Paula, Flor. El endpoint /me/ es
 * el único público (a autenticados) para saber si pintar el link.
 */
import { api } from './api';

const BASE = '/api/v1/direccion';

export interface DireccionMe {
  is_direccion: boolean;
  email: string;
}

export interface CohorteCuota {
  n_cuota: number;
  pct_impago: number | null;
  n_impagos: number;
  n_evaluables: number;
  maduro: boolean;
  razon_no_maduro?: string;
  nota?: string;
}

export interface Cohorte {
  mes: string;                    // 'YYYY-MM'
  n_altas: number;
  primera_alta: string | null;    // 'YYYY-MM-DD'
  cuotas: CohorteCuota[];
}

export interface CohortesResponse {
  inicio_plataforma: string;
  desde: string;
  hasta: string;
  hoy: string;
  cohortes: Cohorte[];
}

export interface DocenteMorosidad {
  display_name: string;
  email: string;
  rol: 'coach_onboarding' | 'docente';
  n_alumnos: number;
  n_morosos: number;
  pct_morosidad: number;
}

export interface MorosidadDocentesResponse {
  hoy: string;
  docentes: DocenteMorosidad[];
  global: {
    n_alumnos_asignados: number;
    n_morosos: number;
    pct_morosidad_global: number;
  };
}

export interface KpiResultado {
  objetivo_max_pct?: number;
  objetivo_min_pct?: number;
  valor_actual_pct: number | null;
  estado: 'cumple' | 'no_cumple' | 'insuficientes_datos';
  nota_maduracion?: string;
  cohortes_maduras?: number;
  n_evaluables?: number;
  n_impagos?: number;
  n_cuotas_emitidas?: number;
  n_cobradas?: number;
  n_recuperables_dia_1?: number;
  n_reactivados?: number;
  snapshot_fecha?: string;
  nota_snapshot?: string;
}

export interface KpisResponse {
  periodo: { desde: string; hasta: string };
  kpi_1_mora_cohorte: KpiResultado;
  kpi_2_cobro_continuidad: KpiResultado;
  kpi_3_reactivacion: KpiResultado;
}

export function getDireccionMe(): Promise<DireccionMe> {
  return api.get<DireccionMe>(`${BASE}/me/`);
}

export function getCohortes(desde: string, hasta: string): Promise<CohortesResponse> {
  return api.get<CohortesResponse>(`${BASE}/cohortes/?desde=${desde}&hasta=${hasta}`);
}

export function getMorosidadDocentes(): Promise<MorosidadDocentesResponse> {
  return api.get<MorosidadDocentesResponse>(`${BASE}/morosidad-docentes/`);
}

export function getKpis(desde: string, hasta: string): Promise<KpisResponse> {
  return api.get<KpisResponse>(`${BASE}/kpis/?desde=${desde}&hasta=${hasta}`);
}

// === Evolución mes a mes ===

export interface EvolucionMes {
  n: number;
  inicio: string;
  fin: string;
  estado_general: 'futuro' | 'en_curso' | 'cerrado';
  morosidad: {
    estado: 'sin_datos' | 'en_curso' | 'maduro';
    pct: number | null;
    evaluables: number;
    impagos: number;
  };
  retencion_pct: number | null;
  clientes_unicos: number;
  crecimiento_pct: number | null;
}

export interface EvolucionResponse {
  inicio: string;
  hoy: string;
  n_meses: number;
  meses: EvolucionMes[];
}

export function getEvolucion(inicio: string, nMeses: number): Promise<EvolucionResponse> {
  return api.get<EvolucionResponse>(`${BASE}/evolucion/?inicio=${inicio}&n_meses=${nMeses}`);
}

// === Onboarding Lucila ===

export interface OnboardingLucila {
  display_name: string;
  nivel_onboarding: number | null;
  contacto_24h_pct: number | null;
  dias_hasta_docente_mediana: number | null;
  asisten_reunion_1_pct: number | null;
  total_alumnos_ventana?: number;
  nota?: string;
}

export function getOnboardingLucila(): Promise<OnboardingLucila> {
  return api.get<OnboardingLucila>(`${BASE}/onboarding-lucila/`);
}
