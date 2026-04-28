// Estilos y mapas compartidos por /clientes y /mora.
// La web vieja también comparte estos mapas (los importa desde el módulo de mora).

import type {
  AgingCategory,
  Platform,
  RecoveryStatus,
  SubscriptionStatus,
} from '@/lib/clientes-types';

// 9 estados base (/clientes). /mora añade 3 al final.
export const RECOVERY_STATUS_OPTIONS_BASE: RecoveryStatus[] = [
  'Pendiente',
  'Contactado',
  'Promesa Pago',
  'RENEGOCIADO',
  'Recuperado',
  'PAGOS COMPLETADOS',
  'REEMBOLSADO',
  'DISPUTA PERDIDA',
  'Incobrable',
];

export const RECOVERY_STATUS_OPTIONS_MORA: string[] = [
  ...RECOVERY_STATUS_OPTIONS_BASE,
  'No responde',
  'Abogado',
  'Seguimiento',
  'Recobrame',
];

export const CATEGORY_STYLES: Record<string, { className: string; label: string }> = {
  'Pago único': {
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200',
    label: '💎 PAGO ÚNICO',
  },
  'Al día': {
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    label: '✅ AL DÍA',
  },
  Abiertas: {
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    label: 'ABIERTA',
  },
  Vencidas: {
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
    label: 'VENCIDA',
  },
  Crónicas: {
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
    label: 'CRÓNICA',
  },
  Incobrable: {
    className: 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100',
    label: 'INCOBRABLE',
  },
};

export const RECOVERY_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  Pendiente: {
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 opacity-80',
    label: 'Pendiente',
  },
  Contactado: {
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    label: '📞 Contactado',
  },
  'Promesa Pago': {
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    label: '🤝 Promesa Pago',
  },
  RENEGOCIADO: {
    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    label: '🔄 RENEGOCIADO',
  },
  Recuperado: {
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    label: '✅ Recuperado',
  },
  'PAGOS COMPLETADOS': {
    className: 'bg-emerald-600 text-white dark:bg-emerald-700 dark:text-white',
    label: '🎉 PAGOS COMPLETADOS',
  },
  REEMBOLSADO: {
    className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    label: '💸 REEMBOLSADO',
  },
  'DISPUTA PERDIDA': {
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
    label: '🚫 DISPUTA PERDIDA',
  },
  Incobrable: {
    className: 'bg-red-600 text-white dark:bg-red-700 dark:text-white',
    label: '❌ Incobrable',
  },
  'No responde': {
    className: 'bg-slate-500 text-white dark:bg-slate-600 dark:text-white',
    label: '📵 No responde',
  },
  Abogado: {
    className: 'bg-amber-700 text-white dark:bg-amber-800 dark:text-white',
    label: '⚖️ Abogado',
  },
  Seguimiento: {
    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200',
    label: '🔍 Seguimiento',
  },
  Recobrame: {
    className: 'bg-fuchsia-600 text-white dark:bg-fuchsia-700 dark:text-white',
    label: '⚖️ Recobrame',
  },
};

export const SUBSCRIPTION_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  active: {
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    label: 'ACTIVA',
  },
  past_due: {
    className: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-200',
    label: 'DEUDA',
  },
  canceled: {
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
    label: 'CANCELADA',
  },
  trialing: {
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200',
    label: 'PRUEBA',
  },
  drafted: {
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    label: 'BORRADOR',
  },
  paused: {
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    label: 'PAUSADA',
  },
};

export const PLATFORM_STYLES: Record<string, { className: string; label: string }> = {
  stripe: {
    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    label: 'Stripe',
  },
  whop: {
    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200',
    label: 'Whop',
  },
  'whop-erp': {
    className: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-200',
    label: 'Whop ERP',
  },
};

export function categoryFromDays(days: number | null | undefined): AgingCategory {
  if (!days || days <= 0) return 'Al día';
  if (days <= 7) return 'Abiertas';
  if (days <= 30) return 'Vencidas';
  if (days <= 61) return 'Crónicas';
  return 'Incobrable';
}

export function subStatusKey(
  status: SubscriptionStatus | string,
  pauseCollection: { resumes_at: string | null } | null,
): string {
  if (pauseCollection && !pauseCollection.resumes_at) return 'paused';
  return status;
}

export const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000];

// Platform badge options reutilizables (import explícito)
export type { Platform };
