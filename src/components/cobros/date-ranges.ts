// Utilidades para resolver un preset a un par de fechas {from, to}.

import type { CobrosPeriod } from '@/lib/cobros-types';

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolveRange(
  period: CobrosPeriod,
  custom: { from?: string; to?: string } | undefined,
  anchor: Date = new Date(),
): { from: string; to: string } {
  const now = new Date(anchor);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const addDays = (base: Date, days: number): Date =>
    new Date(base.getTime() + days * 86400000);

  switch (period) {
    case 'today':
      return { from: toIso(today), to: toIso(today) };
    case '7d':
      return { from: toIso(addDays(today, -6)), to: toIso(today) };
    case '30d':
      return { from: toIso(addDays(today, -29)), to: toIso(today) };
    case '90d':
      return { from: toIso(addDays(today, -89)), to: toIso(today) };
    case 'last_month': {
      const firstPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastPrev = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toIso(firstPrev), to: toIso(lastPrev) };
    }
    case 'mtd': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toIso(first), to: toIso(today) };
    }
    case 'qtd': {
      const q = Math.floor(today.getMonth() / 3);
      const first = new Date(today.getFullYear(), q * 3, 1);
      return { from: toIso(first), to: toIso(today) };
    }
    case 'ytd': {
      const first = new Date(today.getFullYear(), 0, 1);
      return { from: toIso(first), to: toIso(today) };
    }
    case 'all':
      return { from: '2025-01-01', to: toIso(today) };
    case 'custom':
      return {
        from: custom?.from || toIso(addDays(today, -6)),
        to: custom?.to || toIso(today),
      };
  }
}
