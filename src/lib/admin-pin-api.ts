/** Cliente API para el subsistema de PIN admin. */
import { api, ApiError } from '@/lib/api';

export type PinScope = 'refund' | 'cancel_subscription' | 'change_pin';

export interface PinError {
  detail: string;
  code: string;
  status: number;
}

export const adminPinApi = {
  status: () => api.get<{ has_pin: boolean }>('/api/v1/admin/pin/status/'),

  verify: (pin: string, scope: PinScope) =>
    api.post<{ token: string }>('/api/v1/admin/pin/verify/', { pin, scope }),

  set: (login_password: string, new_pin: string) =>
    api.post<{ ok: true }>('/api/v1/admin/pin/set/', { login_password, new_pin }),

  reset: (target_email: string, new_pin: string, login_password: string) =>
    api.post<{ ok: true }>('/api/v1/admin/pin/reset/', {
      target_email,
      new_pin,
      login_password,
    }),
};

/** Helper para extraer detail/code de un ApiError típico del PIN backend. */
export function extractPinError(err: unknown): PinError {
  if (err instanceof ApiError) {
    const data = err.data as { detail?: string; code?: string } | null;
    return {
      detail: data?.detail || 'Error',
      code: data?.code || 'unknown',
      status: err.status,
    };
  }
  return { detail: 'Error de red', code: 'network', status: 0 };
}
