export interface ActivityLogEntry {
  id: string;
  fecha: string;
  usuario_email: string;
  usuario_nombre: string;
  usuario_rol: string;
  modulo: string;
  tipo_accion: string;
  cliente_nombre: string;
  cliente_id: string;
  plataforma: string;
  resultado: string;
  detalles: Record<string, unknown> | unknown;
  total_count: number;
}

export interface AuditUser {
  email: string;
  name: string;
  role: string;
}

export interface AuditMetadata {
  modules: string[];
  roles: string[];
  platforms: string[];
  results: string[];
  commonActions: string[];
  users: AuditUser[];
}

export interface AuditFilters {
  module: string;
  role: string;
  user_email: string;
  platform: string;
  result: string;
  action_type: string;
  search: string;
  page: number;
}
