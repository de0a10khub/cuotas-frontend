const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// localStorage tokens (legacy compat — backend acepta cookies HttpOnly también).
// Plan a futuro: cuando confirmemos que las cookies funcionan, quitar localStorage.
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
 * Logout server-side: blacklist el refresh token + limpia cookie HttpOnly.
 * El backend lee el refresh de la cookie automáticamente — pero seguimos
 * mandando el body con localStorage por compat con tokens legacy.
 */
export async function serverLogout(): Promise<void> {
  const refresh = getRefreshToken();
  try {
    await fetch(`${API_URL}/api/v1/auth/logout/`, {
      method: 'POST',
      credentials: 'include', // ← envía cookie HttpOnly del refresh
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refresh || '' }),
      keepalive: true,
    });
  } catch {
    // Network blip — al cliente ya se le borran los tokens igualmente.
  }
}

// Single-flight: si N peticiones simultáneas reciben 401, solo una llama a /refresh.
// Las demás esperan al mismo Promise para evitar el race con ROTATE_REFRESH_TOKENS.
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    const refresh = getRefreshToken();

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
        method: 'POST',
        credentials: 'include', // ← envía cookie del refresh si existe
        headers: { 'Content-Type': 'application/json' },
        // Body fallback: si la cookie HttpOnly aún no llegó al browser
        // (primer login post-deploy), sigue funcionando con localStorage.
        body: JSON.stringify({ refresh: refresh || '' }),
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const data = await res.json();
      // Backend setea cookie HttpOnly automáticamente. Además guardamos
      // en localStorage por compat — se irá quitando en próxima fase.
      if (data.access) localStorage.setItem(TOKENS.access, data.access);
      if (data.refresh) localStorage.setItem(TOKENS.refresh, data.refresh);
      return data.access || null;
    } catch {
      return null;
    } finally {
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
    // Authorization header sigue presente para compat — cuando los
    // operarios actualicen su sesión, el backend leerá de cookie también.
    if (auth && token) base.Authorization = `Bearer ${token}`;
    return base;
  };

  let token = auth ? getAccessToken() : null;
  let res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include', // ← cookie HttpOnly viaja con la request
    headers: buildHeaders(token),
  });

  if (res.status === 401 && auth) {
    token = await refreshAccessToken();
    // Reintenta la request original — ahora con la cookie nueva
    // (y el access token nuevo en localStorage si lo hay).
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: buildHeaders(token),
    });
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
  // POST con credentials: 'include' para que el browser acepte la
  // cookie HttpOnly que el backend setea en la response.
  const data = await api.post<{ access: string; refresh: string }>(
    '/api/v1/auth/login/',
    { username, password },
    { auth: false },
  );
  // Backend ya seteó cookie HttpOnly. Guardamos también en localStorage
  // por compat — se irá quitando en próxima fase.
  setTokens(data.access, data.refresh);
  return data;
}
