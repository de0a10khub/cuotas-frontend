'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Cuando true, las patas suben y le tapan los ojos. */
  hideEyes: boolean;
  /** Punto al que tienen que mirar los ojos (coords de pantalla). Si null, sigue al mouse. */
  lookTarget?: { x: number; y: number } | null;
  /** Tamano del personaje en px. */
  size?: number;
  className?: string;
}

const VB_W = 220;
const VB_H = 240;

/**
 * Gato kawaii peek-a-boo. Cara redonda blanca con orejas, ojos grandes,
 * bigotes y patitas rosadas que se levantan para tapar los ojos.
 * Mas cute y limpio que el monkey anterior.
 */
export function PeekingMonkey({ hideEyes, lookTarget, size = 200, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const target = lookTarget ?? mouse;
    if (!target) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const scale = r.width / VB_W;
    // Centros de ojos en viewBox: (82, 110) y (138, 110)
    const leftEyeCx = r.left + 82 * scale;
    const leftEyeCy = r.top + 110 * scale;
    const rightEyeCx = r.left + 138 * scale;
    const rightEyeCy = r.top + 110 * scale;

    const calc = (cx: number, cy: number) => {
      const dx = target.x - cx;
      const dy = target.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return { x: 0, y: 0 };
      const max = 4.5;
      const k = max / Math.max(dist, max * 4);
      return { x: dx * k, y: dy * k };
    };

    const l = calc(leftEyeCx, leftEyeCy);
    const r2 = calc(rightEyeCx, rightEyeCy);
    setPupilOffset({ lx: l.x, ly: l.y, rx: r2.x, ry: r2.y });
  }, [mouse, lookTarget]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size * (VB_H / VB_W) }}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={size} height={size * (VB_H / VB_W)}>
        <defs>
          <radialGradient id="cat_face" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E8F5" />
          </radialGradient>
          <radialGradient id="cat_glow" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.40)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
          <linearGradient id="cat_paw" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E8F5" />
          </linearGradient>
          <radialGradient id="cat_pad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB5C5" />
            <stop offset="100%" stopColor="#FF8FAA" />
          </radialGradient>
        </defs>

        {/* Glow de fondo */}
        <ellipse cx="110" cy="125" rx="110" ry="115" fill="url(#cat_glow)" />

        {/* ===== OREJAS (atras) ===== */}
        <g>
          {/* Oreja izq */}
          <path
            d="M 50 90 L 30 35 L 75 70 Z"
            fill="url(#cat_face)"
            stroke="#0a1628"
            strokeWidth="2"
          />
          <path d="M 50 80 L 38 50 L 62 68 Z" fill="#FFB5C5" opacity="0.7" />
          {/* Oreja der */}
          <path
            d="M 170 90 L 190 35 L 145 70 Z"
            fill="url(#cat_face)"
            stroke="#0a1628"
            strokeWidth="2"
          />
          <path d="M 170 80 L 182 50 L 158 68 Z" fill="#FFB5C5" opacity="0.7" />
        </g>

        {/* ===== CABEZA (cara redonda) ===== */}
        <ellipse
          cx="110"
          cy="115"
          rx="78"
          ry="72"
          fill="url(#cat_face)"
          stroke="#0a1628"
          strokeWidth="2.5"
        />

        {/* ===== OJOS ===== */}
        {/* Sclera (forma de almendra) */}
        <g>
          <ellipse cx="82" cy="110" rx="14" ry="16" fill="#0a1628" />
          <ellipse cx="138" cy="110" rx="14" ry="16" fill="#0a1628" />
        </g>

        {/* Pupilas grandes que siguen al cursor */}
        <g style={{ transition: 'opacity 0.18s', opacity: hideEyes ? 0 : 1 }}>
          {/* Iris cyan */}
          <ellipse
            cx={82 + pupilOffset.lx}
            cy={110 + pupilOffset.ly}
            rx="9"
            ry="11"
            fill="#22d3ee"
          />
          <ellipse
            cx={138 + pupilOffset.rx}
            cy={110 + pupilOffset.ry}
            rx="9"
            ry="11"
            fill="#22d3ee"
          />
          {/* Pupila vertical estilo gato */}
          <ellipse
            cx={82 + pupilOffset.lx}
            cy={110 + pupilOffset.ly}
            rx="2.5"
            ry="9"
            fill="#0a1628"
          />
          <ellipse
            cx={138 + pupilOffset.rx}
            cy={110 + pupilOffset.ry}
            rx="2.5"
            ry="9"
            fill="#0a1628"
          />
          {/* Brillo */}
          <circle
            cx={82 + pupilOffset.lx + 3}
            cy={110 + pupilOffset.ly - 4}
            r="2"
            fill="white"
          />
          <circle
            cx={138 + pupilOffset.rx + 3}
            cy={110 + pupilOffset.ry - 4}
            r="2"
            fill="white"
          />
        </g>

        {/* Cejitas sutiles (puntos arriba de los ojos) */}
        <circle cx="82" cy="86" r="1.5" fill="#0a1628" opacity="0.4" />
        <circle cx="138" cy="86" r="1.5" fill="#0a1628" opacity="0.4" />

        {/* Mejillas rosadas */}
        <ellipse cx="58" cy="135" rx="10" ry="6" fill="#FFB5C5" opacity="0.6" />
        <ellipse cx="162" cy="135" rx="10" ry="6" fill="#FFB5C5" opacity="0.6" />

        {/* Nariz triangular */}
        <path
          d="M 105 132 L 115 132 L 110 140 Z"
          fill="#FF8FAA"
          stroke="#0a1628"
          strokeWidth="1"
        />

        {/* Boca: w shape (uwu) */}
        <path
          d="M 110 140 L 110 145 M 110 145 Q 102 152 96 148 M 110 145 Q 118 152 124 148"
          stroke="#0a1628"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Bigotes */}
        <g stroke="#0a1628" strokeWidth="1.3" strokeLinecap="round" opacity="0.8">
          <line x1="40" y1="135" x2="65" y2="138" />
          <line x1="40" y1="145" x2="65" y2="143" />
          <line x1="180" y1="135" x2="155" y2="138" />
          <line x1="180" y1="145" x2="155" y2="143" />
        </g>

        {/* ===== PATITAS LEVANTADAS (visibles cuando hideEyes=true) ===== */}
        <g
          style={{
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s',
            transform: hideEyes ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.7)',
            transformOrigin: '110px 200px',
            opacity: hideEyes ? 1 : 0,
          }}
        >
          {/* Patita izquierda tapando ojo izq */}
          <ellipse
            cx="82"
            cy="110"
            rx="22"
            ry="20"
            fill="url(#cat_paw)"
            stroke="#0a1628"
            strokeWidth="2"
          />
          {/* Almohadilla rosada */}
          <ellipse cx="82" cy="113" rx="10" ry="8" fill="url(#cat_pad)" />
          {/* Deditos */}
          <circle cx="68" cy="103" r="3.5" fill="url(#cat_pad)" />
          <circle cx="76" cy="98" r="3.5" fill="url(#cat_pad)" />
          <circle cx="85" cy="98" r="3.5" fill="url(#cat_pad)" />
          <circle cx="93" cy="103" r="3.5" fill="url(#cat_pad)" />

          {/* Patita derecha tapando ojo der */}
          <ellipse
            cx="138"
            cy="110"
            rx="22"
            ry="20"
            fill="url(#cat_paw)"
            stroke="#0a1628"
            strokeWidth="2"
          />
          <ellipse cx="138" cy="113" rx="10" ry="8" fill="url(#cat_pad)" />
          <circle cx="127" cy="103" r="3.5" fill="url(#cat_pad)" />
          <circle cx="135" cy="98" r="3.5" fill="url(#cat_pad)" />
          <circle cx="144" cy="98" r="3.5" fill="url(#cat_pad)" />
          <circle cx="152" cy="103" r="3.5" fill="url(#cat_pad)" />
        </g>
      </svg>
    </div>
  );
}
