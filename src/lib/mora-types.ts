import type {
  ActionLogEntry,
  ClienteRow,
  FailedPayment,
  ObjecionTag,
  Operator,
} from './clientes-types';

// /mora reutiliza el mismo shape de fila que /clientes; añadimos alias por claridad.
export type MoraRow = ClienteRow;

export type { ActionLogEntry, FailedPayment, ObjecionTag, Operator };

export interface InteractionSnapshot {
  id: string;
  subscription_id: string;
  customer_id: string;
  status: string;
  contacted_by: string;
  comment_1: string;
  continue_with: string;
  comment_2: string;
  created_at: string;
}

export interface MoraListResponse {
  results: MoraRow[];
  total_count: number;
  page: number;
  page_size: number;
}

export type MoraAgingCategory = 'Abiertas' | 'Vencidas' | 'Crónicas';
export type MoraDisputeState = 'needs_response' | 'under_review' | 'won' | 'lost';
