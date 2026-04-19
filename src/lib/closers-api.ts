import { api } from './api';

const BASE = '/api/v1';

export interface CloserStats {
  total_meetings: number;
  attended: number;
  sales: number;
  conversion_pct: number;
}

export interface Closer {
  id: string;
  email: string;
  full_name: string;
  role: 'closer' | 'closers_manager';
  is_active: boolean;
  avatar_url: string | null;
  pin_locked_until: string | null;
  stats: CloserStats;
}

export interface PendingOrganizer {
  organizer_email: string;
  meeting_count: number;
  first_meeting_at: string;
}

export interface CrmContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface Meeting {
  id: string;
  title: string;
  event_type_name: string;
  scheduled_at: string;
  actual_date: string | null;
  duration_minutes: number;
  status: string;
  attendance: 'attended' | 'no_show' | null;
  sale_status: 'yes' | 'no' | null;
  loss_reason: string | null;
  closer_comment: string | null;
  contacted_by_role: string | null;
  is_repeat: boolean;
  previous_meeting_id: string | null;
  organizer_email: string;
  assigned_to: string;
  crm_contacts: CrmContact;
}

export interface CloserLoginItem {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

export const closersAdminApi = {
  list: () => api.get<{ results: Closer[] }>(`${BASE}/closers/list/`),
  pending: () =>
    api.get<{ results: PendingOrganizer[] }>(`${BASE}/closers/pending-organizers/`),
  create: (payload: {
    full_name: string;
    email: string;
    pin: string;
    role: 'closer' | 'closers_manager';
  }) => api.post<{ id: string; email: string; full_name: string; role: string; meetings_assigned: number }>(
    `${BASE}/closers/create/`,
    payload,
  ),
  resetPin: (closer_id: string, pin: string) =>
    api.post<{ success: boolean }>(
      `${BASE}/closers/${encodeURIComponent(closer_id)}/reset-pin/`,
      { pin },
    ),
  delete: (closer_id: string) =>
    api.delete(`${BASE}/closers/${encodeURIComponent(closer_id)}/`),
};

// Portal API — usa localStorage para session_token (no JWT del dashboard)
const CLOSER_SESSION_KEY = 'closer_session_token';

export function getCloserSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CLOSER_SESSION_KEY);
}

export function setCloserSessionToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(CLOSER_SESSION_KEY, token);
  else localStorage.removeItem(CLOSER_SESSION_KEY);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function portalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getCloserSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['X-Closer-Session'] = token;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw { status: res.status, data };
  return data as T;
}

export const closerPortalApi = {
  listForLogin: () =>
    portalFetch<{ results: CloserLoginItem[] }>(`${BASE}/closer-portal/login-list/`),
  login: (closer_id: string, pin: string) =>
    portalFetch<{
      success: boolean;
      session_token: string;
      closer_id: string;
      role: string;
      full_name: string;
      error?: string;
    }>(`${BASE}/closer-portal/login/`, {
      method: 'POST',
      body: JSON.stringify({ closer_id, pin }),
    }),
  logout: () =>
    portalFetch<{ success: boolean }>(`${BASE}/closer-portal/logout/`, { method: 'POST' }),
  session: () =>
    portalFetch<{
      closer_id: string;
      role: string;
      full_name: string;
      expires_at: string;
    }>(`${BASE}/closer-portal/session/`),
  myMeetings: () =>
    portalFetch<{ results: Meeting[] }>(`${BASE}/closer-portal/my-meetings/`),
  meeting: (id: string) =>
    portalFetch<Meeting>(`${BASE}/closer-portal/meeting/${encodeURIComponent(id)}/`),
  fillMeeting: (
    id: string,
    payload: {
      attendance?: 'attended' | 'no_show';
      sale_status?: 'yes' | 'no';
      loss_reason?: string;
      closer_comment?: string;
    },
  ) =>
    portalFetch<Meeting>(`${BASE}/closer-portal/meeting/${encodeURIComponent(id)}/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
