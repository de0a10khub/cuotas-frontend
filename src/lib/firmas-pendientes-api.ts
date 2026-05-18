import { api } from './api';

export interface PendingSignature {
  id: string;
  email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_vat: string | null;
  matched_transaction: string | null;
  matched_at: string | null;
  matched_by: string | null;
  notes: string | null;
  signed_at: string;
  client_data: Record<string, unknown>;
}

export type FirmaFilter = 'pending' | 'matched' | 'all';

export async function listPendingSignatures(filter: FirmaFilter = 'pending') {
  return api.get<{ results: PendingSignature[] }>(
    `/api/v1/hotmart/admin/signatures/?filter=${filter}`
  );
}

export async function matchSignature(
  signatureId: string,
  transaction: string,
  notes?: string,
) {
  return api.post<{ ok: boolean; matched_transaction: string }>(
    `/api/v1/hotmart/admin/signatures/${signatureId}/match/`,
    { transaction, notes: notes || null },
  );
}
