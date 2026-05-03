// Contrato individual del cliente (sub Stripe / mem Whop / order ERP).
// Devuelto por GET /api/v1/clientes-directorio/contracts/<sub_id>/.
export interface Contract {
  contract_id: string;
  platform: 'stripe' | 'whop' | 'whop-erp';
  status: string;
  paid_count: number;
  pending_count: number;
  failed_count?: number;
  paid_eur: number;
  debt_eur: number;
  first_paid_at: string | null;
  label: string;
  is_current: boolean;
}
