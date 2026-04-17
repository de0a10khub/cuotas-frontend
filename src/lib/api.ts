const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const TOKENS = {
  access: 'cuotas_access',
  refresh: 'cuotas_refresh',
} as const;

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKENS.access);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKENS.refresh);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKENS.access, access);
  localStorage.setItem(TOKENS.refresh, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKENS.access);
  localStorage.removeItem(TOKENS.refresh);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = await res.json();
  localStorage.setItem(TOKENS.access, data.access);
  if (data.refresh) localStorage.setItem(TOKENS.refresh, data.refresh);
  return data.access;
}

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(`API error ${status}`);
  }
}

type FetchOptions = RequestInit & { auth?: boolean };

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { auth = true, headers = {}, ...rest } = options;

  const buildHeaders = (token: string | null): HeadersInit => {
    const base: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };
    if (auth && token) base.Authorization = `Bearer ${token}`;
    return base;
  };

  let token = auth ? getAccessToken() : null;
  let res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: buildHeaders(token),
  });

  if (res.status === 401 && auth) {
    token = await refreshAccessToken();
    if (token) {
      res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: buildHeaders(token),
      });
    }
  }

  const body = await res.text();
  const data = body ? JSON.parse(body) : null;

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
};

export async function login(username: string, password: string) {
  const data = await api.post<{ access: string; refresh: string }>(
    '/api/v1/auth/login/',
    { username, password },
    { auth: false },
  );
  setTokens(data.access, data.refresh);
  return data;
}
