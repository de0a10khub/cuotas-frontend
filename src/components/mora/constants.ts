// Opciones específicas de /mora (filtros duros).

import type { Platform } from '@/lib/clientes-types';
import type { MoraAgingCategory, MoraDisputeState } from '@/lib/mora-types';

// /mora solo contempla los tramos activos, no Pago único / Al día / Incobrable
// (estos últimos se derivan a /recobros).
export const MORA_CATEGORY_OPTIONS: { value: 'all' | MoraAgingCategory; label: string }[] = [
  { value: 'all', label: '🚀 Todos los Tramos' },
  { value: 'Abiertas', label: '🟡 Abiertas (≤7d)' },
  { value: 'Vencidas', label: '🟠 Vencidas (8-30d)' },
  { value: 'Crónicas', label: '🔴 Crónicas (31-61d)' },
];

export const MORA_PLATFORM_OPTIONS: { value: 'all' | Platform; label: string }[] = [
  { value: 'all', label: '🌍 Ambas' },
  { value: 'stripe', label: '💳 Stripe' },
  { value: 'whop', label: '🎮 Whop Nativo' },
  { value: 'whop-erp', label: '📦 Whop ERP' },
];

export const MORA_DISPUTE_OPTIONS: { value: 'all' | MoraDisputeState; label: string }[] = [
  { value: 'all', label: '🔍 Todas las Disputas' },
  { value: 'needs_response', label: '⚠️ Requiere Acción' },
  { value: 'under_review', label: '⏳ En Revisión' },
  { value: 'won', label: '✅ Ganadas' },
  { value: 'lost', label: '❌ Perdidas' },
];

export const ACTION_NEEDED_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'needed', label: '🚨 Requiere acción' },
  { value: 'not_needed', label: '✓ Atendidas' },
] as const;
