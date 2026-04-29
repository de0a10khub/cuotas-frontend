'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Cuando true, el visor del casco se oscurece (no se ven los ojos). */
  hideEyes: boolean;
  /** Punto al que tienen que mirar los ojos (coords de pantalla). Si null, sigue al mouse. */
  lookTarget?: { x: number; y: number } | null;
  /** Tamano del personaje en px. */
  size?: number;
  className?: string;
}

const VB_W = 240;
const VB_H = 260;

/**
 * Mini astronauta flotando. Ojos dentro del visor siguen el cursor.
 * Cuando hideEyes=true, el visor se oscurece y los ojos quedan tapados.
 * Animacion de bobbing (sube/baja flotando) + antena parpadeante.
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
    // Centros ojos en viewBox: (98, 75) y (142, 75)
    const leftEyeCx = r.left + 98 * scale;
    const leftEyeCy = r.top + 75 * scale;
    const rightEyeCx = r.left + 142 * scale;
    const rightEyeCy = r.top + 75 * scale;
    const calc = (cx: number, cy: number) => {
      const dx = target.x - cx;
      const dy = target.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return { x: 0, y: 0 };
      const max = 4;
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
      className={`${className} astronaut-float`}
      style={{ width: size, height: size * (VB_H / VB_W) }}
    >
      <style jsx>{`
        .astronaut-float {
          animation: astrofloat 5s ease-in-out infinite;
        }
        @keyframes astrofloat {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
      `}</style>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={size} height={size * (VB_H / VB_W)}>
        <defs>
          <radialGradient id="ast_helmet" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E0E8F5" />
            <stop offset="100%" stopColor="#9AAEC8" />
          </radialGradient>
          <radialGradient id="ast_visor_clear" cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor="rgba(186,230,253,0.95)" />
            <stop offset="50%" stopColor="rgba(34,211,238,0.45)" />
            <stop offset="100%" stopColor="rgba(8,47,73,0.85)" />
          </radialGradient>
          <radialGradient id="ast_visor_dark" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="60%" stopColor="#050b1a" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          <linearGradient id="ast_suit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F5F8FC" />
            <stop offset="55%" stopColor="#D8E1ED" />
            <stop offset="100%" stopColor="#9AAEC8" />
          </linearGradient>
          <linearGradient id="ast_arm" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8EFF7" />
            <stop offset="100%" stopColor="#A8B8CC" />
          </linearGradient>
          <radialGradient id="ast_glow" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.30)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
        </defs>

        {/* Glow de fondo cyan */}
        <ellipse cx="120" cy="130" rx="115" ry="125" fill="url(#ast_glow)" />

        {/* === MOCHILA / BACKPACK === */}
        <rect x="60" y="155" width="120" height="80" rx="14" fill="#5C6E8A" />
        <rect x="64" y="158" width="112" height="74" rx="11" fill="#465670" />
        {/* Tubitos de O2 */}
        <rect x="72" y="148" width="6" height="14" rx="2" fill="#3B475D" />
        <rect x="162" y="148" width="6" height="14" rx="2" fill="#3B475D" />
        {/* Indicador LED en mochila */}
        <circle cx="120" cy="195" r="5" fill="#22d3ee">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* === BRAZO IZQ === */}
        <ellipse cx="50" cy="190" rx="14" ry="36" fill="url(#ast_arm)" stroke="#0a1628" strokeWidth="1.5" />
        {/* Guante izq */}
        <ellipse cx="50" cy="220" rx="14" ry="13" fill="#5C6E8A" stroke="#0a1628" strokeWidth="1.5" />

        {/* === BRAZO DER === */}
        <ellipse cx="190" cy="190" rx="14" ry="36" fill="url(#ast_arm)" stroke="#0a1628" strokeWidth="1.5" />
        <ellipse cx="190" cy="220" rx="14" ry="13" fill="#5C6E8A" stroke="#0a1628" strokeWidth="1.5" />

        {/* === CUERPO === */}
        <path
          d="M 70 155 Q 70 140 90 140 L 150 140 Q 170 140 170 155 L 170 250 L 70 250 Z"
          fill="url(#ast_suit)"
          stroke="#0a1628"
          strokeWidth="1.5"
        />
        {/* Panel pectoral */}
        <rect x="98" y="172" width="44" height="30" rx="4" fill="#0a1628" stroke="#22d3ee" strokeWidth="0.8" />
        {/* LEDs en panel */}
        <circle cx="106" cy="182" r="2" fill="#22d3ee">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="120" cy="182" r="2" fill="#10b981">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="134" cy="182" r="2" fill="#f59e0b">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
        {/* Linea inferior del panel */}
        <rect x="105" y="190" width="30" height="2" rx="1" fill="#22d3ee" opacity="0.5" />
        <rect x="105" y="195" width="20" height="2" rx="1" fill="#10b981" opacity="0.5" />

        {/* Logo en el pecho */}
        <text x="120" y="225" textAnchor="middle" fill="#0a1628" fontSize="9" fontWeight="bold" fontFamily="monospace">
          NASA-26
        </text>

        {/* === CASCO === */}
        {/* Aro/anillo del cuello */}
        <ellipse cx="120" cy="138" rx="44" ry="9" fill="#9AAEC8" stroke="#0a1628" strokeWidth="1.5" />

        {/* Cabeza/casco esfera */}
        <circle cx="120" cy="80" r="58" fill="url(#ast_helmet)" stroke="#0a1628" strokeWidth="2" />

        {/* Visor — siempre dibuja el clear, encima va el dark si hideEyes */}
        <ellipse cx="120" cy="78" rx="46" ry="40" fill="url(#ast_visor_clear)" stroke="#0a1628" strokeWidth="1.5" />

        {/* Reflejo del visor (highlight blanco) */}
        <ellipse cx="100" cy="62" rx="14" ry="10" fill="white" opacity="0.55" />
        <ellipse cx="135" cy="92" rx="6" ry="3" fill="white" opacity="0.35" />

        {/* === OJOS dentro del visor (siguen el cursor, ocultos cuando visor oscuro) === */}
        <g style={{ transition: 'opacity 0.25s', opacity: hideEyes ? 0 : 1 }}>
          {/* Sclera blanca */}
          <ellipse cx="98" cy="75" rx="9" ry="11" fill="white" />
          <ellipse cx="142" cy="75" rx="9" ry="11" fill="white" />
          {/* Pupilas que siguen el cursor */}
          <circle cx={98 + pupilOffset.lx} cy={75 + pupilOffset.ly} r="5" fill="#0a1628" />
          <circle cx={142 + pupilOffset.rx} cy={75 + pupilOffset.ry} r="5" fill="#0a1628" />
          {/* Brillo del ojo */}
          <circle cx={98 + pupilOffset.lx + 1.5} cy={75 + pupilOffset.ly - 2} r="1.5" fill="white" />
          <circle cx={142 + pupilOffset.rx + 1.5} cy={75 + pupilOffset.ry - 2} r="1.5" fill="white" />
          {/* Sonrisa */}
          <path
            d="M 108 100 Q 120 108 132 100"
            stroke="#0a1628"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* === VISOR OSCURO (overlay cuando hideEyes) === */}
        <g
          style={{
            transition: 'opacity 0.35s ease-out',
            opacity: hideEyes ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          <ellipse cx="120" cy="78" rx="46" ry="40" fill="url(#ast_visor_dark)" />
          {/* Reflejos del visor oscuro (sutiles) */}
          <ellipse cx="100" cy="62" rx="14" ry="10" fill="rgba(34,211,238,0.20)" />
          <ellipse cx="135" cy="92" rx="6" ry="3" fill="rgba(34,211,238,0.15)" />
          {/* Pequeño glow indicando "modo privado" */}
          <text
            x="120"
            y="85"
            textAnchor="middle"
            fontSize="9"
            fontFamily="monospace"
            fill="rgba(34,211,238,0.7)"
            letterSpacing="2"
          >
            ◉ ◉
          </text>
        </g>

        {/* === ANTENA con luz roja parpadeante === */}
        <line x1="120" y1="22" x2="120" y2="10" stroke="#5C6E8A" strokeWidth="2" />
        <circle cx="120" cy="8" r="3" fill="#ef4444">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="120" cy="8" r="6" fill="#ef4444" opacity="0.3">
          <animate attributeName="r" values="3;7;3" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.4;0" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
