import { api } from './api';
import type {
  EmpleadoUser,
  MentorTeam,
  ObjecionTag,
  PermissionsPayload,
} from './empleados-types';

const BASE = '/api/v1/empleados-directorio';

export const empleadosApi = {
  // Users
  listUsers: () => api.get<{ results: EmpleadoUser[] }>(`${BASE}/users/`),
  createUser: (payload: {
    email: string;
    display_name: string;
    role: string;
    method: 'password';
    password: string;
    gender: 'M' | 'F';
  }) => api.post<EmpleadoUser>(`${BASE}/users/`, payload),
  updateUser: (id: string, payload: Partial<{ display_name: string; is_blocked: boolean; roles: string[]; gender: 'M' | 'F' | '' }>) =>
    api.patch<EmpleadoUser>(`${BASE}/users/${encodeURIComponent(id)}/`, payload),
  deleteUser: (id: string) => api.delete(`${BASE}/users/${encodeURIComponent(id)}/`),
  resetPassword: (id: string, password: string) =>
    api.post<{ success: boolean }>(`${BASE}/users/${encodeURIComponent(id)}/reset-password/`, { password }),
  syncProfiles: () =>
    api.post<{ success: boolean; message: string }>(`${BASE}/users/sync-profiles/`),

  // Roles
  listRoles: () => api.get<{ results: string[] }>(`${BASE}/roles/`),
  createRole: (name: string) => api.post<{ name: string }>(`${BASE}/roles/`, { name }),
  deleteRole: (name: string) => api.delete(`${BASE}/roles/${encodeURIComponent(name)}/`),

  // Permissions
  listPermissions: () => api.get<PermissionsPayload>(`${BASE}/role-permissions/`),
  setPermission: (role: string, path: string, allowed: boolean) =>
    api.post<{ role: string; path: string; allowed: boolean }>(`${BASE}/role-permissions/`, {
      role,
      path,
      allowed,
    }),

  // Mentor teams
  listTeams: () => api.get<{ results: MentorTeam[] }>(`${BASE}/mentor-teams/`),
  createTeam: (payload: { name: string; user_ids: string[] }) =>
    api.post<MentorTeam>(`${BASE}/mentor-teams/`, payload),
  updateTeam: (id: string, payload: Partial<{ name: string; user_ids: string[] }>) =>
    api.patch<MentorTeam>(`${BASE}/mentor-teams/${encodeURIComponent(id)}/`, payload),
  deleteTeam: (id: string) => api.delete(`${BASE}/mentor-teams/${encodeURIComponent(id)}/`),

  // Objeciones tags
  listTags: () => api.get<{ results: ObjecionTag[] }>(`${BASE}/objeciones-tags/`),
  createTag: (payload: { name: string; bg_color: string; text_color: string }) =>
    api.post<ObjecionTag>(`${BASE}/objeciones-tags/`, payload),
  updateTag: (
    id: string,
    payload: Partial<{ name: string; bg_color: string; text_color: string }>,
  ) => api.patch<ObjecionTag>(`${BASE}/objeciones-tags/${encodeURIComponent(id)}/`, payload),
  deleteTag: (id: string) => api.delete(`${BASE}/objeciones-tags/${encodeURIComponent(id)}/`),
};
