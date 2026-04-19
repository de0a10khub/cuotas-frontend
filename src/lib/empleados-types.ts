import type { ObjecionTag } from './clientes-types';

export interface EmpleadoUser {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface MentorTeam {
  id: string;
  name: string;
  user_ids: string[];
  created_at: string;
}

export interface RolePermission {
  role: string;
  allowed_path: string;
}

export interface AvailablePath {
  label: string;
  path: string;
}

export interface PermissionsPayload {
  results: RolePermission[];
  available_paths: AvailablePath[];
}

export type { ObjecionTag };
