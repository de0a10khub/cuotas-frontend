'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Cuando true, los brazos suben y le tapan los ojos. */
  hideEyes: boolean;
  /** Punto al que tienen que mirar los ojos (coords de pantalla). Si null, sigue al mouse. */
  lookTarget?: { x: number; y: number } | null;
  /** Tamano del mono en px. */
  size?: number;
  className?: string;
}

const VB_W = 220;
const VB_H = 260;

/**
 * Mono peek-a-boo. Cara + cuerpo hasta los hombros con brazos visibles.
 * Pupilas siguen al cursor (o a lookTarget si se pasa).
 * Cuando hideEyes=true, los brazos rotan desde el hombro y se tapa los ojos.
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
    // Centros de ojos en viewBox: (78, 90) y (142, 90)
    const leftEyeCx = r.left + 78 * scale;
    const leftEyeCy = r.top + 90 * scale;
    const rightEyeCx = r.left + 142 * scale;
    const rightEyeCy = r.top + 90 * scale;

    const calc = (cx: number, cy: number) => {
      const dx = target.x - cx;
      const dy = target.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return { x: 0, y: 0 };
      const max = 5;
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
          <radialGradient id="m_face_grad" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#E8C9A0" />
            <stop offset="100%" stopColor="#B8956F" />
          </radialGradient>
          <radialGradient id="m_head_grad" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#A87850" />
            <stop offset="100%" stopColor="#704028" />
          </radialGradient>
          <radialGradient id="m_body_grad" cx="50%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#8B5E3C" />
            <stop offset="100%" stopColor="#5C3520" />
          </radialGradient>
          <radialGradient id="m_glow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.30)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
        </defs>

        {/* Glow de fondo */}
        <ellipse cx="110" cy="120" rx="105" ry="120" fill="url(#m_glow)" />

        {/* ===== CUERPO (hombros + torso) ===== */}
        <g>
          {/* Torso */}
          <path
            d="M 60 200 Q 110 180 160 200 L 175 260 L 45 260 Z"
            fill="url(#m_body_grad)"
          />
          {/* Pecho mas claro */}
          <path
            d="M 80 215 Q 110 200 140 215 L 145 260 L 75 260 Z"
            fill="url(#m_face_grad)"
            opacity="0.5"
          />
        </g>

        {/* ===== BRAZOS ABAJO (visibles cuando hideEyes=false) ===== */}
        <g
          style={{
            transition: 'opacity 0.25s',
            opacity: hideEyes ? 0 : 1,
          }}
        >
          {/* Brazo izquierdo colgando */}
          <ellipse cx="55" cy="225" rx="14" ry="32" fill="url(#m_head_grad)" />
          <circle cx="55" cy="252" r="14" fill="url(#m_head_grad)" />
          <circle cx="55" cy="252" r="9" fill="#D4A574" opacity="0.6" />
          {/* Brazo derecho colgando */}
          <ellipse cx="165" cy="225" rx="14" ry="32" fill="url(#m_head_grad)" />
          <circle cx="165" cy="252" r="14" fill="url(#m_head_grad)" />
          <circle cx="165" cy="252" r="9" fill="#D4A574" opacity="0.6" />
        </g>

        {/* ===== CABEZA ===== */}
        {/* Orejas (atras) */}
        <g>
          <circle cx="48" cy="78" r="22" fill="url(#m_head_grad)" />
          <circle cx="48" cy="78" r="13" fill="#D4A574" />
          <circle cx="172" cy="78" r="22" fill="url(#m_head_grad)" />
          <circle cx="172" cy="78" r="13" fill="#D4A574" />
        </g>

        {/* Cabeza */}
        <ellipse cx="110" cy="100" rx="65" ry="62" fill="url(#m_head_grad)" />

        {/* Cara mas clara */}
        <ellipse cx="110" cy="115" rx="50" ry="42" fill="url(#m_face_grad)" />

        {/* Frente */}
        <path
          d="M 60 75 Q 110 48 160 75 Q 160 95 110 88 Q 60 95 60 75 Z"
          fill="url(#m_head_grad)"
          opacity="0.7"
        />

        {/* Ojos sclera */}
        <g>
          <circle cx="78" cy="90" r="13" fill="white" />
          <circle cx="142" cy="90" r="13" fill="white" />
        </g>

        {/* Pupilas */}
        <g style={{ transition: 'opacity 0.18s', opacity: hideEyes ? 0 : 1 }}>
          <circle cx={78 + pupilOffset.lx} cy={90 + pupilOffset.ly} r="5.5" fill="#1a1a1a" />
          <circle
            cx={78 + pupilOffset.lx + 1.5}
            cy={90 + pupilOffset.ly - 1.5}
            r="1.5"
            fill="white"
            opacity="0.85"
          />
          <circle cx={142 + pupilOffset.rx} cy={90 + pupilOffset.ry} r="5.5" fill="#1a1a1a" />
          <circle
            cx={142 + pupilOffset.rx + 1.5}
            cy={90 + pupilOffset.ry - 1.5}
            r="1.5"
            fill="white"
            opacity="0.85"
          />
        </g>

        {/* Cejas */}
        <path d="M 65 76 Q 78 71 91 76" stroke="#5C3520" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 129 76 Q 142 71 155 76" stroke="#5C3520" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Nariz */}
        <ellipse cx="103" cy="118" rx="2" ry="2.5" fill="#5C3520" />
        <ellipse cx="117" cy="118" rx="2" ry="2.5" fill="#5C3520" />

        {/* Sonrisa */}
        <path
          d="M 95 132 Q 110 142 125 132"
          stroke="#5C3520"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* ===== BRAZOS ARRIBA TAPANDO LOS OJOS (visibles cuando hideEyes=true) ===== */}
        <g
          style={{
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s',
            transform: hideEyes ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.85)',
            transformOrigin: '110px 200px',
            opacity: hideEyes ? 1 : 0,
          }}
        >
          {/* Brazo izquierdo levantado: del hombro (60,195) sube a la cara */}
          <path
            d="M 60 200
               Q 50 160 70 120
               Q 75 105 95 95
               L 100 105
               Q 80 115 75 125
               Q 65 165 75 200 Z"
            fill="url(#m_head_grad)"
          />
          {/* Mano izquierda */}
          <ellipse cx="83" cy="92" rx="18" ry="17" fill="url(#m_head_grad)" />
          <ellipse cx="83" cy="94" rx="13" ry="13" fill="#D4A574" />
          {/* Dedos izq */}
          <circle cx="72" cy="79" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="78" cy="76" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="85" cy="75" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="92" cy="77" r="3.5" fill="url(#m_head_grad)" />

          {/* Brazo derecho levantado */}
          <path
            d="M 160 200
               Q 170 160 150 120
               Q 145 105 125 95
               L 120 105
               Q 140 115 145 125
               Q 155 165 145 200 Z"
            fill="url(#m_head_grad)"
          />
          {/* Mano derecha */}
          <ellipse cx="137" cy="92" rx="18" ry="17" fill="url(#m_head_grad)" />
          <ellipse cx="137" cy="94" rx="13" ry="13" fill="#D4A574" />
          {/* Dedos der */}
          <circle cx="128" cy="77" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="135" cy="75" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="142" cy="76" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="148" cy="79" r="3.5" fill="url(#m_head_grad)" />
        </g>
      </svg>
    </div>
  );
}
