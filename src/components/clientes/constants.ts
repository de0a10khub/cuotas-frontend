// Opciones específicas de /clientes (filtros duros).
// Los estilos/mapas comunes viven en `@/components/recovery/styles`.

import type { AgingCategory, Platform } from '@/lib/clientes-types';

export const CATEGORY_OPTIONS: { value: 'all' | AgingCategory; label: string }[] = [
  { value: 'all', label: '🚀 Todos' },
  { value: 'Pago único', label: '💎 Pago único' },
  { value: 'Al día', label: '✅ Al día' },
  { value: 'Abiertas', label: '🟡 Abiertas (≤7d)' },
  { value: 'Vencidas', label: '🟠 Vencidas (8-30d)' },
  { value: 'Crónicas', label: '🔴 Crónicas (31-61d)' },
  { value: 'Incobrable', label: '⚫ Incobrable (+61d)' },
];

export const PLATFORM_OPTIONS: { value: 'all' | Platform; label: string }[] = [
  { value: 'all', label: '🌍 Ambas' },
  { value: 'stripe', label: '💳 Stripe' },
  { value: 'whop', label: '🎮 Whop Nativo' },
  { value: 'whop-erp', label: '📦 Whop ERP' },
];

export const DISPUTE_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: '⚠️ Abiertas' },
  { value: 'won', label: '✅ Ganadas' },
  { value: 'lost', label: '❌ Perdidas' },
] as const;
