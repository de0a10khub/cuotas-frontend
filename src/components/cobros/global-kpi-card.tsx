import { cn } from '@/lib/utils';

export interface KpiSubIndicator {
  label: string;
  value: string;
  color?: string;
}

interface Props {
  title: string;
  icon: string;
  mainValue: string;
  mainLabel?: string;
  colorClass?: string;
  dotColor?: string;
  subIndicators?: KpiSubIndicator[];
}

// Mapeo dotColor → glow color para el shadow del card
const glowByDot: Record<string, string> = {
  'bg-blue-500': 'shadow-[0_0_30px_rgba(59,130,246,0.18)]',
  'bg-emerald-500': 'shadow-[0_0_30px_rgba(16,185,129,0.18)]',
  'bg-amber-500': 'shadow-[0_0_30px_rgba(245,158,11,0.18)]',
  'bg-red-500': 'shadow-[0_0_30px_rgba(239,68,68,0.20)]',
  'bg-orange-500': 'shadow-[0_0_30px_rgba(249,115,22,0.18)]',
};

export function GlobalKpiCard({
  title,
  icon,
  mainValue,
  mainLabel,
  colorClass = 'text-white',
  dotColor,
  subIndicators,
}: Props) {
  const glow = (dotColor && glowByDot[dotColor]) || 'shadow-[0_0_25px_rgba(59,130,246,0.12)]';
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-4 transition-all',
        'hover:border-blue-400/40 hover:shadow-[0_0_40px_rgba(59,130,246,0.25)]',
        glow,
      )}
    >
      {/* Glow orb en esquina */}
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-30 transition-opacity group-hover:opacity-50',
          dotColor ? dotColor.replace('bg-', 'bg-').concat('/30') : 'bg-blue-500/30',
        )}
      />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-300/70">
            <span aria-hidden className="text-base">{icon}</span>
            <span>{title}</span>
          </div>
          {dotColor && (
            <span
              className={cn(
                'h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]',
                dotColor,
              )}
            />
          )}
        </div>
        <p
          className={cn(
            'text-3xl font-bold tabular-nums tracking-tight',
            colorClass.replace('text-', 'text-').replace('-600', '-300').replace('-700', '-300'),
          )}
        >
          {mainValue}
        </p>
        {mainLabel && (
          <p className="mt-1 text-xs text-blue-200/60">{mainLabel}</p>
        )}
        {subIndicators && subIndicators.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-blue-500/15 pt-2.5 text-xs">
            {subIndicators.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-2">
                <span className="text-blue-200/50">{s.label}</span>
                <span
                  className={cn(
                    'tabular-nums font-medium',
                    s.color
                      ? s.color
                          .replace('-500', '-300')
                          .replace('-600', '-300')
                          .replace('-700', '-300')
                          .replace('-900', '-100')
                          .replace('text-slate-500', 'text-blue-200/60')
                      : 'text-blue-100',
                  )}
                >
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
