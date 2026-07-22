/**
 * Cliente de API para /api/v1/crm-docentes/.
 *
 * Usa el `api` client base (src/lib/api.ts) que maneja JWT + refresh.
 */

import { api, getAccessToken } from './api';
import type {
  BuscarAlumnoResponse,
  Captura,
  CaseTask,
  ComentarioCreateBody,
  DocenteScore,
  Interaction,
  InteractionCreateBody,
  KPIs,
  NotaChangeBody,
  OnboardingCaseDetail,
  OnboardingCaseList,
  WhoAmI,
  WorkProof,
  WorkProofCreateBody,
} from './crm-docentes-types';

const BASE = '/api/v1/crm-docentes';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Sube una captura (imagen) directa vía multipart/form-data.
 * tipo: 'contacto_agendar' | 'intento_no_asistio' | 'prueba'
 */
export async function subirCaptura(
  caseId: string,
  file: File,
  tipo: string,
  taskId?: string,
): Promise<Captura> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('tipo', tipo);
  if (taskId) fd.append('task_id', taskId);

  const token = getAccessToken();
  const res = await fetch(`${API_URL}${BASE}/cases/${caseId}/capturas/`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd, // sin Content-Type: el navegador pone el boundary
  });
  const body = await res.text();
  const data = body ? JSON.parse(body) : null;
  if (!res.ok) {
    const msg = (data && (data.detail || data.captura_id || JSON.stringify(data))) || 'Error al subir';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as Captura;
}

/** Devuelve el data_url de una captura almacenada en BD (fallback). */
export function getCapturaData(capturaId: string): Promise<{ content_type: string; data_url?: string; url?: string }> {
  return api.get(`${BASE}/capturas/${capturaId}/`);
}

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

export type MotivoCategoria = 'abandono_alumno' | 'falta_seguimiento' | 'otro';

export function marcarPerdido(
  caseId: string,
  motivo: string,
  motivo_categoria: MotivoCategoria = 'falta_seguimiento',
): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/marcar-perdido/`, {
    motivo, motivo_categoria,
  });
}

export function marcarRiesgo(caseId: string): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/marcar-riesgo/`, {});
}

export function quitarRiesgo(caseId: string): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/quitar-riesgo/`, {});
}

export function sinRespuesta(caseId: string, notas: string = ''): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/sin-respuesta/`, { notas });
}

// ============================================================================
// AGENDA
// ============================================================================

export interface AgendaResponse {
  profile_id: string;
  vencidas: import('./crm-docentes-types').CaseTask[];
  hoy: import('./crm-docentes-types').CaseTask[];
  manana?: import('./crm-docentes-types').CaseTask[];
  en_2_3_dias?: import('./crm-docentes-types').CaseTask[];
  esta_semana: import('./crm-docentes-types').CaseTask[];
  despues?: import('./crm-docentes-types').CaseTask[];
  /** Alias legacy de despues. */
  proximas: import('./crm-docentes-types').CaseTask[];
  total: number;
}

/** profileId puede ser un id concreto, o 'all' (solo admin) para ver las
 *  colas de todos los docentes/coaches juntas. */
export function getMiAgenda(profileId?: string): Promise<AgendaResponse> {
  const qs = profileId ? `?profile_id=${profileId}` : '';
  return api.get<AgendaResponse>(`${BASE}/mi-agenda/${qs}`);
}

export function agendarTarea(caseId: string, taskId: string, citaFechaHora: string) {
  return api.post(`${BASE}/cases/${caseId}/tasks/${taskId}/agendar/`, {
    cita_fecha_hora: citaFechaHora,
  });
}

/** Marca una tarea como 'contactado' con 1 click, sin captura (opcional). */
export function marcarContactado(caseId: string, taskId: string) {
  return api.post(`${BASE}/cases/${caseId}/tasks/${taskId}/contactado/`, {});
}

/**
 * Marca "No asistió" con 1 click (sin nota ni enlace). El alumno vuelve al
 * flujo de reagendar: ámbar 'en gestión' 48h → rojo 'Pendiente de llamada'.
 */
export function marcarNoAsistio(caseId: string, taskId: string): Promise<CaseTask> {
  return api.post<CaseTask>(`${BASE}/cases/${caseId}/tasks/${taskId}/no-asistio/`, {});
}

export function recuperar(caseId: string): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/recuperar/`, {});
}

// ============================================================================
// ADMIN: corregir datos del alumno / mover de docente (solo admin)
// ============================================================================

export function editarDatosAlumno(
  caseId: string,
  datos: { customer_name?: string; customer_phone?: string },
): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/editar-datos/`, datos);
}

export function reasignarAlumno(
  caseId: string,
  rol: 'docente' | 'coach',
  profileId: string | null,
): Promise<OnboardingCaseDetail> {
  return api.post<OnboardingCaseDetail>(`${BASE}/cases/${caseId}/reasignar/`, {
    rol,
    profile_id: profileId,
  });
}

// ============================================================================
// Localizador de alumnos — busca en TODAS las carteras (cualquier docente)
// ============================================================================

export function buscarAlumno(q: string): Promise<BuscarAlumnoResponse> {
  return api.get<BuscarAlumnoResponse>(`${BASE}/buscar/?q=${encodeURIComponent(q)}`);
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

export function getMe(): Promise<WhoAmI> {
  return api.get<WhoAmI>(`${BASE}/me/`);
}
