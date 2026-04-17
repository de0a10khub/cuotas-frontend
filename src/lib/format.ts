export function formatEuros(value: number | string | null | undefined, opts?: { decimals?: number }) {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: opts?.decimals ?? 0,
  }).format(n || 0);
}

export function formatNumber(value: number | string | null | undefined) {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat('es-ES').format(n || 0);
}

export function formatPercent(value: number | string | null | undefined, decimals = 2) {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return `${n.toFixed(decimals)}%`;
}

/**
 * Devuelve 'positive' | 'negative' | 'neutral' según semántica del valor.
 * - 'positive': ingresos, cash cobrado, ganancias (colorear verde)
 * - 'negative': deudas, exposure, pérdidas, reembolsos (colorear rojo)
 */
export type Sentiment = 'positive' | 'negative' | 'neutral';

export function sentimentFor(kind: 'income' | 'debt' | 'loss' | 'rate' | 'neutral', value: number = 0): Sentiment {
  if (kind === 'income') return value > 0 ? 'positive' : 'neutral';
  if (kind === 'debt' || kind === 'loss') return value > 0 ? 'negative' : 'neutral';
  if (kind === 'rate') return value >= 80 ? 'positive' : value < 50 ? 'negative' : 'neutral';
  return 'neutral';
}
