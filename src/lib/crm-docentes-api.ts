/**
 * Cliente de API para /api/v1/crm-docentes/.
 *
 * Usa el `api` client base (src/lib/api.ts) que maneja JWT + refresh.
 */

import { api } from './api';
import type {
  ComentarioCreateBody,
  DocenteScore,
  Interaction,
  InteractionCreateBody,
  KPIs,
  NotaChangeBody,
  OnboardingCaseDetail,
  OnboardingCaseList,
  WorkProof,
  WorkProofCreateBody,
} from './crm-docentes-types';

const BASE = '/api/v1/crm-docentes';

// ============================================================================
// LIST / DETAIL
// ============================================================================

export interface ListCasesParams {
  fase?: string;
  estado?: string;
  pagos_visibilidad?: string;
}

interface Paginated<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

function isPaginated<T>(v: unknown): v is Paginated<T> {
  return typeof v === 'object' && v !== null && Array.isArray((v as { results?: unknown }).results);
}

export async function listCases(params: ListCasesParams = {}): Promise<OnboardingCaseList[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const path = `${BASE}/cases/${qs.toString() ? `?${qs.toString()}` : ''}`;
  const data = await api.get<OnboardingCaseList[] | Paginated<OnboardingCaseList>>(path);
  return isPaginated<OnboardingCaseList>(data) ? data.results : data;
}

export function getCase(id: string): Promise<OnboardingCaseDetail> {
  return api.get<OnboardingCaseDetail>(`${BASE}/cases/${id}/`);
}

// ============================================================================
// INTERACCIONES (append-only)
// ============================================================================

export function createInteraction(caseId: string, body: InteractionCreateBody): Promise<Interaction> {
  return api.post<Interaction>(`${BASE}/cases/${caseId}/interactions/`, body);
}

// ============================================================================
// PRUEBAS
// ============================================================================

export function createProof(caseId: string, body: WorkProofCreateBody): Promise<WorkProof> {
  return api.post<WorkProof>(`${BASE}/cases/${caseId}/proofs/`, body);
}

// ============================================================================
// COMENTARIOS
// ============================================================================

export function createComment(caseId: string, body: ComentarioCreateBody) {
  return api.post(`${BASE}/cases/${caseId}/comments/`, body);
}

// ============================================================================
// NOTA IMPLICACIÓN
// ============================================================================

export function setNota(caseId: string, body: NotaChangeBody): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/nota/`, body);
}

// ============================================================================
// ESTADOS
// ============================================================================

export function marcarPerdido(caseId: string, motivo: string): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/marcar-perdido/`, { motivo });
}

export function marcarRiesgo(caseId: string): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/marcar-riesgo/`, {});
}

export function quitarRiesgo(caseId: string): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/quitar-riesgo/`, {});
}

export function recuperar(caseId: string): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/recuperar/`, {});
}

// ============================================================================
// DOCENTES + KPIs
// ============================================================================

export function getDocenteScores(): Promise<{ docentes: DocenteScore[] }> {
  return api.get<{ docentes: DocenteScore[] }>(`${BASE}/docentes/scores/`);
}

export function getKpis(): Promise<KPIs> {
  return api.get<KPIs>(`${BASE}/kpis/`);
}
