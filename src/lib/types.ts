export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

export interface RolePermission {
  id: string;
  allowed_path: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: RolePermission[];
  created_at: string;
}

export interface Profile {
  id: string;
  user: User;
  supabase_user_id: string | null;
  full_name: string;
  phone: string;
  avatar_url: string;
  roles: Role[];
  is_active: boolean;
  allowed_paths: string[];
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  platform: 'stripe' | 'whop' | 'manual';
  currency: string;
  created_at: string;
}

export interface InvoiceStats {
  cash_collected_30d: number;
  exposure: number;
  success_rate: number;
  total_invoices: number;
  paid_invoices: number;
}

export interface AgingBuckets {
  al_dia: number;
  recuperame: number;
  critico: number;
  incobrable: number;
}

export interface Invoice {
  id: string;
  customer: string;
  customer_name: string;
  customer_email: string;
  subscription: string | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amount_due: string;
  amount_paid: string;
  amount_remaining: string;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  aging_days: number | null;
  aging_bucket: string;
  created_at: string;
}

export interface MoraInteraction {
  id: string;
  tracking: string;
  channel: 'email' | 'phone' | 'whatsapp' | 'chatwoot' | 'note';
  summary: string;
  outcome: string;
  created_by_name: string | null;
  created_at: string;
}

export interface MoraActionLog {
  id: string;
  tracking: string | null;
  customer: string;
  action_type: string;
  platform: 'stripe' | 'whop' | 'manual';
  status: 'success' | 'failed' | 'pending';
  performed_by_name: string | null;
  created_at: string;
}

export interface MoraTracking {
  id: string;
  customer: string;
  customer_name: string;
  customer_email: string;
  subscription: string | null;
  status: string;
  contacted_by: string | null;
  contacted_by_name: string | null;
  comment_1: string;
  comment_2: string;
  continue_with: string;
  locked_by: string | null;
  locked_by_name: string | null;
  locked_at: string | null;
  is_locked: boolean;
  interactions: MoraInteraction[];
  recent_actions: MoraActionLog[];
  created_at: string;
  updated_at: string;
}

export const MORA_STATUSES = [
  'Al Dia',
  'Recuperame',
  'Critico',
  'Incobrable',
  'Recuperado',
  'Renegociado',
  'Reembolsado',
  'Pagos completados',
  'Disputa perdida',
] as const;
export type MoraStatus = (typeof MORA_STATUSES)[number];

export interface CustomerDetail extends Customer {
  stripe_customer_id: string;
  whop_customer_id: string;
  metadata: Record<string, unknown>;
  objeciones: { id: string; tag: { id: string; nombre: string; color: string } }[];
  total_invoices: number;
  total_paid: string | number;
  total_remaining: string | number;
  updated_at: string;
}

export interface Subscription {
  id: string;
  customer: string;
  customer_email: string;
  customer_name: string;
  status: 'active' | 'paused' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  amount: string | null;
  currency: string;
  stripe_subscription_id: string;
  whop_subscription_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  started_at: string | null;
}

export interface Departamento {
  id: string;
  nombre: string;
  descripcion: string;
  empleados_count: number;
  created_at: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  dni: string;
  departamento: string | null;
  departamento_nombre: string | null;
  puesto: string;
  jefe_directo: string | null;
  jefe_directo_nombre: string | null;
  tipo_contrato: string;
  fecha_alta: string | null;
  fecha_baja: string | null;
  salario_bruto_anual: string | null;
  moneda: string;
  estado: string;
  notas: string;
  profile: string | null;
}

export const TIPO_CONTRATO = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'autonomo', label: 'Autónomo' },
  { value: 'practicas', label: 'Prácticas' },
] as const;

export interface ProductCatalog {
  id: string;
  nombre: string;
  platform: 'stripe' | 'whop';
  external_id: string;
  billing_type: 'one_time' | 'recurring' | 'installments';
  total_contract_value: string;
  currency: string;
  activo: boolean;
  mentor_team: string | null;
  mentor_team_nombre: string | null;
}

export interface MentorTeam {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export const ESTADO_EMPLEADO = [
  { value: 'activo', label: 'Activo' },
  { value: 'baja_temporal', label: 'Baja temporal' },
  { value: 'inactivo', label: 'Inactivo' },
] as const;
