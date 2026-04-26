import type { ClienteRow, FailedPayment, LockResult, ObjecionTag, Operator } from '@/lib/clientes-types';
import type { ActionLogEntry } from '@/lib/clientes-types';
import type { InteractionSnapshot } from '@/lib/mora-types';

export type RecoveryRow = ClienteRow;

// Mínima interfaz que el drawer necesita del cliente HTTP.
// Ambos `clientesApi` y `moraApi` la satisfacen (duck typing).
export interface RecoveryDrawerApi {
  lockAcquire: (
    subscription_id: string,
    customer_id: string,
    user_email: string,
  ) => Promise<LockResult>;
  lockRelease: (
    subscription_id: string,
    user_email: string,
  ) => Promise<{ released: boolean }>;
  upsertTracking: (payload: {
    subscription_id: string;
    customer_id: string;
    status?: string;
    contacted_by?: string;
    comment_1?: string;
    continue_with?: string;
    comment_2?: string;
    tags?: string[];
  }) => Promise<RecoveryRow>;
  contract: (subscription_id: string) => Promise<{ url: string | null }>;
  generateContract: (payload: {
    subscription_id: string;
    customer_id: string;
    customer_email: string;
    platform: string;
  }) => Promise<{ url: string }>;
  paymentUpdateLink: (payload: {
    subscription_id: string;
    customer_id: string;
    platform: string;
  }) => Promise<{ url: string }>;
  failedPayments: (subscription_id: string) => Promise<{ results: FailedPayment[] }>;
  retryPayment: (payload: {
    subscription_id: string;
    customer_id: string;
    item_id: string;
    platform: string;
  }) => Promise<{ success: boolean; item_id: string }>;
  assignPaymentOperator?: (payload: {
    platform: string;
    item_id: string;
    operator_id: string | null;
  }) => Promise<{ ok: boolean; assigned_operator_id: string | null }>;
  paymentNote?: (payload: {
    platform: string;
    payment_id: string;
    note: string;
  }) => Promise<{ ok: boolean; note: string | null; updated_at?: string }>;
  history: (subscription_id: string) => Promise<{ results: ActionLogEntry[] }>;
  // Opcionales: solo /mora los implementa.
  interactions?: (subscription_id: string) => Promise<{ results: InteractionSnapshot[] }>;
  objecionesTags?: () => Promise<{ results: ObjecionTag[] }>;
}

export type DrawerMode = 'clientes' | 'mora';
