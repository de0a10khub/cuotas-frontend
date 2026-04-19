// Utilidades de formato específicas de /cobros.
// Fieles a la web vieja: días/meses hardcoded en castellano,
// currency con espacio antes del símbolo €.

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** Ej: "Lun 15/04" — nombre día (3 letras, capitalizado) + dd/MM. */
export function formatDayLabel(isoDate: string): string {
  if (!isoDate) return '';
  // Usamos el constructor con UTC para evitar desvíos por zona horaria
  // (la fecha viene solo como YYYY-MM-DD).
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayName = DAY_NAMES[date.getUTCDay()];
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dayName} ${dd}/${mm}`;
}

/** Ej: "Ene 26" — 3 letras mes + 2 dígitos año. */
export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  if (!year || !month) return ym;
  return `${MONTH_NAMES[month - 1]} ${String(year).slice(2)}`;
}

/** Ej: "18.450,00 €" — es-ES + símbolo al final con espacio. */
export function formatEurExact(value: number): string {
  const n = typeof value === 'number' ? value : Number(value) || 0;
  return (
    n.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  );
}

/** Ej: "18.5k €" o "890 €" — abreviatura para ejes Y y labels. */
export function formatEurShort(value: number): string {
  const n = typeof value === 'number' ? value : Number(value) || 0;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k €`;
  return `${n.toFixed(0)} €`;
}
