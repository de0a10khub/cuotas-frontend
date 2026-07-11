/**
 * Tipos TypeScript del módulo CRM Docentes.
 *
 * Deben coincidir con los serializers de apps/crm_docentes/serializers.py
 * del backend. Cuando cambies el backend, actualiza estos tipos.
 */

// ============================================================================
// ENUMS (deben coincidir con TextChoices de Django)
// ============================================================================

export type Fase =
  | 'onboarding_1'
  | 'docente_primera_reunion'
  | 'onboarding_2_control'
  | 'docente_seguimiento'
  | 'perdido'
  // Legacy (por si aparecen en histórico)
  | 'nuevo' | 'onboarding' | 'docente';
export type Estado = 'activo' | 'riesgo' | 'perdido';
export type PagosVisibilidad = 'visibles' | 'externos';

export type InteractionTipo =
  | 'llamada_1'
  | 'reunion_1'
  | 'control_dia_4'
  | 'reunion_2'
  | 'reunion_3'
  | 'reunion_4'
  | 'quincenal'
  | 'micro'
  | 'sin_respuesta'
  | 'mensaje' | 'email' | 'correccion'
  // Legacy — historial anterior a la migración 0005
  | 'primera_reunion' | 'seguimiento'
  | 'llamada_2' | 'llamada_3' | 'llamada_4';

export type InteractionResultado = 'asistio' | 'no_asistio' | 'reagendada' | 'na';

export type TaskTipo =
  | 'llamada_1'
  | 'reunion_1'
  | 'control_dia_4'
  | 'reunion_2'
  | 'reunion_3'
  | 'reunion_4'
  | 'quincenal'
  | 'reintentar_contacto'
  | 'alerta_24h'
  // Legacy
  | 'primera_reunion' | 'seguimiento'
  | 'llamada_2' | 'llamada_3' | 'llamada_4';

export type TaskEstado = 'pendiente' | 'hecha' | 'vencida' | 'cancelada';

export type Tier = 'ELITE' | 'PRO' | 'MEDIO' | 'EN_RIESGO' | 'SIN_CARTERA' | 'EN_ARRANQUE';

// ============================================================================
// DTOs de la API
// ============================================================================

export interface Interaction {
  id: string;
  tipo: InteractionTipo;
  fecha: string;             // ISO 8601
  enlace_grabacion: string;
  resultado: InteractionResultado;
  notas: string;
  metadata: Record<string, unknown>;
  autor: string | null;
  autor_nombre: string;
  created_at: string;
}

export interface WorkProof {
  id: string;
  descripcion: string;
  enlace: string;
  fecha: string;
  subida_por: string | null;
  subida_por_nombre: string;
  created_at: string;
}

export interface Comentario {
  id: string;
  texto: string;
  autor: string | null;
  autor_nombre: string;
  autor_sistema: string;
  created_at: string;
}

export interface CaseTask {
  id: string;
  tipo: TaskTipo;
  tipo_display: string;
  vence: string;             // YYYY-MM-DD
  estado: TaskEstado;
  completada_en: string | null;
  created_at: string;
  esta_vencida: boolean;
  esta_urgente: boolean;
  dias_para_vencer: number;
  color_estado: 'verde' | 'ambar' | 'rojo' | 'gris' | 'ambar_historico';
  registrada_fuera_de_plazo: boolean;
  agendada: boolean;
  cita_fecha_hora: string | null;
  agendada_en: string | null;
  // Datos del alumno (solo se rellenan en /mi-agenda/)
  case_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface NotaHistorialItem {
  id: string;
  nota_anterior: number | null;
  nota_nueva: number;
  razon: string;
  autor: string | null;
  autor_nombre: string;
  fecha: string;
}

export interface OnboardingCaseList {
  id: string;
  customer: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  producto_nombre: string;
  ticket_total_cents: number | null;
  fase: Fase;
  estado: Estado;
  pagos_visibilidad: PagosVisibilidad;
  nota_implicacion: number | null;
  /** Nota de implicación puesta durante ONBOARDING_1 por Lucila. Queda
   * en el histórico aunque `nota_implicacion` se resetee al traspaso. */
  nota_lucila: number | null;
  /** Nombre del autor de nota_implicacion vigente (vacío si sin valorar). */
  nota_vigente_autor: string;
  proxima_llamada_vence: string | null;
  es_vencido: boolean;
  es_urgente_24h: boolean;
  /** 🚨 Docente asignado hace >24h sin registrar primer toque. */
  es_urgente_primer_toque_24h: boolean;
  /** 📨 Contacto enviado sin respuesta (chip visual, sigue penalizando). */
  esperando_respuesta: boolean;
  esperando_respuesta_desde: string | null;
  total_llamadas_hechas: number;
  total_pruebas: number;
  docente_nombre: string;
  coach_nombre: string;
  created_at: string;
}

export type CrmRole = 'admin' | 'coach_onboarding' | 'docente' | null;

export interface WhoAmI {
  crm_role: CrmRole;
  email: string;
  profile_id: string | null;
  display_name: string;
}

export interface OnboardingCaseDetail extends OnboardingCaseList {
  motivo_baja: string;
  motivo_categoria: 'abandono_alumno' | 'falta_seguimiento' | 'otro' | '';
  metadata: Record<string, unknown>;
  updated_at: string;
  interacciones: Interaction[];
  pruebas: WorkProof[];
  comentarios: Comentario[];
  tareas: CaseTask[];
  nota_historial: NotaHistorialItem[];
  /** Tipo de interacción sugerido según el punto del playbook en el que
   * está el alumno (backend calcula esto). Preseleccionado en el
   * desplegable del formulario "Registrar interacción". */
  next_expected_tipo: InteractionTipo | null;
}

export type Tendencia = 'sube' | 'baja' | 'igual' | 'debut';

export interface DesgloseOnboarding {
  contacto_24h_pts: number;
  velocidad_embudo_pts: number;
  expediente_completo_pts: number;
  control_dia_4_pts: number;
  activacion_reunion_1_pts: number;
  pct_contactados_24h: number;
  mediana_dias_traspaso: number | null;
  pct_expediente_completo: number;
  pct_control_d4_efectivo: number;
  pct_activacion_r1: number;
  total_alumnos_ventana: number;
}

export interface DocenteScore {
  docente_id: string | null;
  total_alumnos: number;
  alumnos_con_pagos_visibles: number;
  morosos: number;
  morosidad_pct: number;
  nota_media: number;
  pct_llamadas_al_dia: number;
  pct_alumnos_con_pruebas: number;
  s_pagos: number;
  s_nota: number;
  s_llamadas: number;
  s_pruebas: number;
  score: number;
  tier: Tier;
  en_riesgo: boolean;
  tareas_vencidas: number;
  tareas_fuera_plazo?: number;
  en_arranque?: boolean;
  tareas_pendientes: number;
  tareas_agendadas: number;
  pct_agendadas: number;
  // Ranking unico (2026-07-09)
  nivel: number;
  posicion: number;
  total_ranking: number;
  tendencia: Tendencia;
  posicion_anterior: number | null;
  nivel_anterior: number | null;
  mensaje_vestuario: string;
  desglose: DesgloseOnboarding | Record<string, unknown>;
  // Solo devuelto por /docentes/scores/ (no por calcular_score directo)
  display_name?: string;
  email?: string;
  rol?: 'coach_onboarding' | 'docente';
}

export interface KPIs {
  activos: number;
  morosidad_pct: number;
  nuevos_sin_primera_llamada: number;
  urgentes_24h: number;
  llamadas_vencidas: number;
  en_riesgo: number;
  nota_media: number | null;
}

// ============================================================================
// Bodies de creación
// ============================================================================

export interface InteractionCreateBody {
  tipo: InteractionTipo;
  resultado: InteractionResultado;
  enlace_grabacion?: string;
  notas?: string;
  metadata?: Record<string, unknown>;
  /** ISO 8601 (regla de oro: agendar la siguiente antes de colgar la actual). */
  siguiente_cita_fecha_hora?: string;
}

export interface WorkProofCreateBody {
  descripcion: string;
  enlace: string;
  fecha?: string;
}

export interface ComentarioCreateBody {
  texto: string;
}

export interface NotaChangeBody {
  nota_nueva: number;
  razon?: string;
}
