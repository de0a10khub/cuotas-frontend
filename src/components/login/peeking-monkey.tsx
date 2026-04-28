'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Cuando el usuario esta tipeando en la password, el mono se tapa los ojos. */
  hideEyes: boolean;
  /** Tamano del mono en px. Por defecto 180. */
  size?: number;
  className?: string;
}

/**
 * Mono que sigue el cursor con los ojos por toda la pantalla.
 * Cuando hideEyes=true, las manos suben y le tapan los ojos.
 */
export function PeekingMonkey({ hideEyes, size = 180, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Centros de los OJOS en coords de pantalla (los ojos estan en (78,95) y (122,95) del viewBox 200x200).
      const scale = r.width / 200;
      const leftEyeCx = r.left + 78 * scale;
      const leftEyeCy = r.top + 95 * scale;
      const rightEyeCx = r.left + 122 * scale;
      const rightEyeCy = r.top + 95 * scale;

      const calc = (cx: number, cy: number) => {
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return { x: 0, y: 0 };
        // Pupila se mueve max 5 unidades del viewBox dentro del ojo (radio 14).
        const max = 5;
        const k = Math.min(dist, 1) > 0 ? max / Math.max(dist, max * 4) : 0;
        return { x: dx * k, y: dy * k };
      };

      const l = calc(leftEyeCx, leftEyeCy);
      const r2 = calc(rightEyeCx, rightEyeCy);
      setPupilOffset({ lx: l.x, ly: l.y, rx: r2.x, ry: r2.y });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <radialGradient id="m_face_grad" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#E8C9A0" />
            <stop offset="100%" stopColor="#B8956F" />
          </radialGradient>
          <radialGradient id="m_head_grad" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#A87850" />
            <stop offset="100%" stopColor="#704028" />
          </radialGradient>
          <radialGradient id="m_glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
        </defs>

        {/* Glow de fondo */}
        <circle cx="100" cy="100" r="95" fill="url(#m_glow)" />

        {/* Orejas (atras) */}
        <g>
          <circle cx="38" cy="78" r="22" fill="url(#m_head_grad)" />
          <circle cx="38" cy="78" r="13" fill="#D4A574" />
          <circle cx="162" cy="78" r="22" fill="url(#m_head_grad)" />
          <circle cx="162" cy="78" r="13" fill="#D4A574" />
        </g>

        {/* Cabeza */}
        <ellipse cx="100" cy="100" rx="62" ry="58" fill="url(#m_head_grad)" />

        {/* Cara (mas clara) */}
        <ellipse cx="100" cy="113" rx="48" ry="40" fill="url(#m_face_grad)" />

        {/* Frente / parte top */}
        <path
          d="M 55 75 Q 100 50 145 75 Q 145 95 100 88 Q 55 95 55 75 Z"
          fill="url(#m_head_grad)"
          opacity="0.7"
        />

        {/* Ojos: sclera blanca */}
        <g>
          <circle cx="78" cy="95" r="13" fill="white" />
          <circle cx="122" cy="95" r="13" fill="white" />
        </g>

        {/* Pupilas (siguen al cursor) */}
        <g style={{ transition: hideEyes ? 'opacity 0.2s' : 'none', opacity: hideEyes ? 0 : 1 }}>
          <circle
            cx={78 + pupilOffset.lx}
            cy={95 + pupilOffset.ly}
            r="5.5"
            fill="#1a1a1a"
          />
          <circle
            cx={78 + pupilOffset.lx + 1.5}
            cy={95 + pupilOffset.ly - 1.5}
            r="1.5"
            fill="white"
            opacity="0.8"
          />
          <circle
            cx={122 + pupilOffset.rx}
            cy={95 + pupilOffset.ry}
            r="5.5"
            fill="#1a1a1a"
          />
          <circle
            cx={122 + pupilOffset.rx + 1.5}
            cy={95 + pupilOffset.ry - 1.5}
            r="1.5"
            fill="white"
            opacity="0.8"
          />
        </g>

        {/* Cejas */}
        <path d="M 65 80 Q 78 75 91 80" stroke="#5C3520" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 109 80 Q 122 75 135 80" stroke="#5C3520" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Nariz */}
        <ellipse cx="93" cy="118" rx="2" ry="2.5" fill="#5C3520" />
        <ellipse cx="107" cy="118" rx="2" ry="2.5" fill="#5C3520" />

        {/* Sonrisa */}
        <path
          d="M 85 132 Q 100 142 115 132"
          stroke="#5C3520"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Manos que tapan los ojos cuando hideEyes=true */}
        <g
          style={{
            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s',
            transform: hideEyes ? 'translateY(0)' : 'translateY(60px)',
            opacity: hideEyes ? 1 : 0,
          }}
        >
          {/* Mano izquierda */}
          <ellipse cx="78" cy="95" rx="19" ry="20" fill="url(#m_head_grad)" />
          <ellipse cx="78" cy="98" rx="13" ry="14" fill="#D4A574" />
          {/* Dedos izquierda */}
          <circle cx="68" cy="83" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="74" cy="79" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="81" cy="78" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="88" cy="80" r="3.5" fill="url(#m_head_grad)" />

          {/* Mano derecha */}
          <ellipse cx="122" cy="95" rx="19" ry="20" fill="url(#m_head_grad)" />
          <ellipse cx="122" cy="98" rx="13" ry="14" fill="#D4A574" />
          {/* Dedos derecha */}
          <circle cx="112" cy="80" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="119" cy="78" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="126" cy="79" r="3.5" fill="url(#m_head_grad)" />
          <circle cx="132" cy="83" r="3.5" fill="url(#m_head_grad)" />
        </g>
      </svg>
    </div>
  );
}
