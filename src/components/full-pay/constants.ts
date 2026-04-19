import type { FullPayStatus } from '@/lib/fullpay-types';

export const STATUS_OPTIONS: { value: FullPayStatus | 'PENDIENTE' | 'all'; label: string; emoji: string }[] = [
  { value: 'PENDIENTE', label: 'PENDIENTE', emoji: '⏸️' },
  { value: 'CONTACTADO', label: 'CONTACTADO', emoji: '📞' },
  { value: 'NO_RESPONDE', label: 'NO RESPONDE', emoji: '📵' },
  { value: 'FULL_PAY', label: 'FULL PAY', emoji: '💎' },
  { value: '2_CUOTAS', label: '2 CUOTAS', emoji: '✌️' },
  { value: '3_CUOTAS', label: '3 CUOTAS', emoji: '🤟' },
  { value: '6_CUOTAS', label: '6 CUOTAS', emoji: '🖐️' },
  { value: 'FOLLOW_UP', label: 'FOLLOW UP', emoji: '⏳' },
  { value: 'NUMERO_EQUIVOCADO', label: 'NÚMERO EQUIVOCADO', emoji: '🚫' },
  { value: 'DEBE_CUOTAS', label: 'DEBE CUOTAS', emoji: '⚠️' },
];

export const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDIENTE: 'bg-slate-500 text-white',
  CONTACTADO: 'bg-blue-600 text-white',
  FULL_PAY: 'bg-emerald-600 text-white',
  NO_RESPONDE: 'bg-amber-500 text-white',
  FOLLOW_UP: 'bg-purple-600 text-white',
  DEBE_CUOTAS: 'bg-rose-600 text-white',
  NUMERO_EQUIVOCADO: 'bg-slate-600 text-white',
  '2_CUOTAS': 'bg-indigo-600 text-white',
  '3_CUOTAS': 'bg-indigo-600 text-white',
  '6_CUOTAS': 'bg-indigo-600 text-white',
};

export function statusBadgeClass(status: string | null | undefined): string {
  const key = status && status !== '' ? status : 'PENDIENTE';
  if (STATUS_BADGE_CLASS[key]) return STATUS_BADGE_CLASS[key];
  // Regex: cualquier X_CUOTAS sin DEBE → indigo
  if (key.includes('CUOTAS') && !key.includes('DEBE')) return 'bg-indigo-600 text-white';
  return 'bg-slate-500 text-white';
}

export const PLATFORM_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'whop', label: 'Whop' },
  { value: 'whop-erp', label: 'Whop ERP' },
];

export const PAGE_SIZE_OPTIONS = [50, 100, 250, 500];
