import { api } from './api';

const BASE = '/api/v1/crm';

export interface CrmStats {
  totalContacts: number;
  pipelineValue: number;
  pendingTasks: number;
  meetingsToday: number;
}

export interface CrmActivity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  created_at: string;
  details: Record<string, unknown>;
  profiles: { full_name: string; avatar_url: string | null } | null;
  crm_contacts: { full_name: string } | null;
}

export interface CrmPipeline {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  allowed_roles: string[] | null;
}

export interface CrmStage {
  id: string;
  pipeline_id: string;
  name: string;
  display_order: number;
  color?: string;
}

export interface CrmContact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  company: string | null;
  status: string;
  current_pipeline_id: string | null;
  current_stage_id: string | null;
  owner_id: string | null;
  source: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PipelineData {
  stages: CrmStage[];
  contacts: CrmContact[];
  pipelines: CrmPipeline[];
  activePipelineId: string | null;
}

export interface CrmTask {
  id: string;
  title: string;
  description: string;
  assigned_to: string | null;
  contact_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  profiles: { full_name: string; avatar_url: string | null } | null;
  crm_contacts: { id: string; full_name: string } | null;
}

export interface CrmMeeting {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  outcome: string;
  crm_contacts: { id: string; first_name: string; last_name: string; email: string } | null;
  assigned: { id: string; full_name: string } | null;
}

export interface CrmNotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  entity_type: string;
  entity_id: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CrmCalendlyLog {
  id: string;
  event_id: string;
  event_type: string;
  processed: boolean;
  error: string | null;
  retry_count: number;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CrmTag {
  id: string;
  name: string;
  color: string;
  category: string;
}

export interface CrmNote {
  id: string;
  contact_id: string;
  content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface ContactDetailsBundle {
  contact: CrmContact;
  notes: CrmNote[];
  tasks: CrmTask[];
  activities: CrmActivity[];
}

export interface CrmPipelineAdmin extends CrmPipeline {
  description?: string;
}

export interface CrmStageAdmin extends CrmStage {
  slug: string;
  is_terminal: boolean;
  terminal_type: 'won' | 'lost' | 'archived' | null;
  sla_hours: number | null;
}

export const crmApi = {
  stats: () => api.get<CrmStats>(`${BASE}/stats/`),
  recentActivity: (limit = 10) =>
    api.get<CrmActivity[]>(`${BASE}/recent-activity/?limit=${limit}`),

  pipelineData: (pipelineId?: string) => {
    const q = pipelineId ? `?pipelineId=${encodeURIComponent(pipelineId)}` : '';
    return api.get<PipelineData>(`${BASE}/pipeline-data/${q}`);
  },
  moveStage: (contactId: string, stageId: string) =>
    api.post<CrmContact>(`${BASE}/contacts/${contactId}/move-stage/`, { stage_id: stageId }),

  contacts: (params: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '' || v === null) continue;
      q.set(k, String(v));
    }
    const s = q.toString();
    return api.get<{ data: CrmContact[]; count: number }>(
      `${BASE}/contacts/${s ? `?${s}` : ''}`,
    );
  },
  contact: (id: string) => api.get<CrmContact>(`${BASE}/contacts/${id}/`),
  createContact: (body: Partial<CrmContact>) =>
    api.post<CrmContact>(`${BASE}/contacts/`, body),
  updateContact: (id: string, body: Partial<CrmContact>) =>
    api.put<CrmContact>(`${BASE}/contacts/${id}/`, body),
  deleteContact: (id: string) => api.delete<void>(`${BASE}/contacts/${id}/`),

  tasks: (params: {
    assigned_to?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === '' || v === null) continue;
      q.set(k, String(v));
    }
    const s = q.toString();
    return api.get<{ data: CrmTask[]; count: number }>(
      `${BASE}/tasks/${s ? `?${s}` : ''}`,
    );
  },
  createTask: (body: Partial<CrmTask>) => api.post<CrmTask>(`${BASE}/tasks/`, body),
  updateTaskStatus: (id: string, status: CrmTask['status']) =>
    api.patch<CrmTask>(`${BASE}/tasks/${id}/status/`, { status }),
  deleteTask: (id: string) => api.delete<void>(`${BASE}/tasks/${id}/`),

  meetings: () => api.get<CrmMeeting[]>(`${BASE}/meetings/`),

  notifications: (userId?: string) => {
    const q = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return api.get<CrmNotification[]>(`${BASE}/notifications/${q}`);
  },
  markNotificationRead: (id: string) =>
    api.patch<{ ok: boolean }>(`${BASE}/notifications/${id}/read/`),
  markAllNotificationsRead: () =>
    api.post<{ updated: number }>(`${BASE}/notifications/read-all/`),

  calendlyLogs: () => api.get<CrmCalendlyLog[]>(`${BASE}/calendly-logs/`),
  activityLog: (limit = 200) =>
    api.get<CrmActivity[]>(`${BASE}/activity-log/?limit=${limit}`),

  adminPipelines: () =>
    api.get<{ pipelines: CrmPipelineAdmin[]; stages: CrmStageAdmin[] }>(
      `${BASE}/admin/pipelines/`,
    ),
  createPipeline: (body: Partial<CrmPipelineAdmin>) =>
    api.post<CrmPipelineAdmin>(`${BASE}/admin/pipelines/`, body),
  updatePipeline: (id: string, body: Partial<CrmPipelineAdmin>) =>
    api.patch<CrmPipelineAdmin>(`${BASE}/admin/pipelines/${id}/`, body),
  deletePipeline: (id: string) => api.delete<void>(`${BASE}/admin/pipelines/${id}/`),

  createStage: (body: Partial<CrmStageAdmin>) =>
    api.post<CrmStageAdmin>(`${BASE}/admin/stages/`, body),
  updateStage: (id: string, body: Partial<CrmStageAdmin>) =>
    api.patch<CrmStageAdmin>(`${BASE}/admin/stages/${id}/`, body),
  deleteStage: (id: string) => api.delete<void>(`${BASE}/admin/stages/${id}/`),

  tags: () => api.get<CrmTag[]>(`${BASE}/admin/tags/`),
  createTag: (body: Partial<CrmTag>) => api.post<CrmTag>(`${BASE}/admin/tags/`, body),
  deleteTag: (id: string) => api.delete<void>(`${BASE}/admin/tags/${id}/`),

  contactDetails: (id: string) =>
    api.get<ContactDetailsBundle>(`${BASE}/contacts/${id}/details/`),
  createNote: (contactId: string, content: string) =>
    api.post<CrmNote>(`${BASE}/notes/`, { contact_id: contactId, content }),
  deleteNote: (id: string) => api.delete<void>(`${BASE}/notes/${id}/`),
};
