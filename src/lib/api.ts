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

/**
 * Logout server-side: blacklist el refresh token en el backend para que no
 * pueda usarse aunque alguien lo robe. Es best-effort — si falla la red,
 * limpiamos local igualmente para no atrapar al usuario.
 */
export async function serverLogout(): Promise<void> {
  const refresh = getRefreshToken();
  if (!refresh) return;
  try {
    await fetch(`${API_URL}/api/v1/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization opcional pero ayuda si el endpoint lo pide en el futuro.
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ refresh }),
      // No bloqueamos navegación si el endpoint tarda.
      keepalive: true,
    });
  } catch {
    // Network blip — al cliente ya se le borran los tokens igualmente.
  }
}

// Single-flight: si N peticiones simultáneas reciben 401, solo una llama a /refresh.
// Las demás esperan al mismo Promise para evitar el race con ROTATE_REFRESH_TOKENS
// (donde el refresh token viejo queda blacklisteado tras la primera rotación).
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    try {
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
    } catch {
      // Network/abort — no borramos tokens (puede ser un blip), mantenemos sesión
      return null;
    } finally {
      // Pequeño delay antes de liberar el lock para que requests muy juntas
      // que reentren al while no salten la cache de localStorage que acabamos de escribir
      setTimeout(() => { inflightRefresh = null; }, 50);
    }
  })();

  return inflightRefresh;
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
