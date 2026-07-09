'use client';

/**
 * Anillo SVG con el score del docente (0-100).
 *
 * Replica el look del prototipo: círculo gris de fondo + arco de progreso,
 * texto grande centrado con "NIVEL" abajo.
 */
export function ScoreRing({
  score,
  color = '#22d3ee',
  size = 110,
}: {
  score: number;
  color?: string;
  size?: number;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const scale = size / 110;

  return (
    <svg width={size} height={size} viewBox="0 0 110 110" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <circle
        cx={55}
        cy={55}
        r={radius}
        fill="none"
        stroke="rgba(148,163,184,0.15)"
        strokeWidth={9}
      />
      <circle
        cx={55}
        cy={55}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 55 55)"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text
        x={55} y={52}
        textAnchor="middle"
        fontSize={26}
        fontWeight={800}
        fill="currentColor"
      >
        {score}
      </text>
      <text
        x={55} y={70}
        textAnchor="middle"
        fontSize={9}
        fill="rgb(148 163 184)"
        letterSpacing="1"
      >
        NIVEL
      </text>
    </svg>
  );
}

export function tierColor(tier: string): string {
  if (tier === 'ELITE') return '#22d3ee';
  if (tier === 'PRO') return '#22c55e';
  if (tier === 'MEDIO') return '#f59e0b';
  if (tier === 'EN_RIESGO') return '#ef4444';
  if (tier === 'EN_ARRANQUE') return '#94a3b8';
  return '#94a3b8'; // SIN_CARTERA
}

export function tierIcon(tier: string): string {
  if (tier === 'ELITE') return '💎';
  if (tier === 'PRO') return '🔥';
  if (tier === 'MEDIO') return '⚡';
  if (tier === 'EN_RIESGO') return '🚨';
  if (tier === 'EN_ARRANQUE') return '⏳';
  return '—';
}

export function tierLabel(tier: string): string {
  if (tier === 'SIN_CARTERA') return 'SIN CARTERA';
  if (tier === 'EN_RIESGO') return 'EN RIESGO';
  if (tier === 'EN_ARRANQUE') return 'EN ARRANQUE';
  return tier;
}
