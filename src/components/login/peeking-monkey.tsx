'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  hideEyes: boolean;
  lookTarget?: { x: number; y: number } | null;
  size?: number;
  className?: string;
}

const VB_W = 280;
const VB_H = 320;

/**
 * Astronauta estilizado-realistico flotando.
 * Multiples gradientes para simular 3D, visor reflectante con horizon line,
 * mochila con tanques de O2 detallados, traje con creases.
 */
export function PeekingMonkey({ hideEyes, lookTarget, size = 220, className = '' }: Props) {
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
    const leftEyeCx = r.left + 117 * scale;
    const leftEyeCy = r.top + 100 * scale;
    const rightEyeCx = r.left + 163 * scale;
    const rightEyeCy = r.top + 100 * scale;
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
          animation: astrofloat 6s ease-in-out infinite;
          filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 40px rgba(34, 211, 238, 0.18));
        }
        @keyframes astrofloat {
          0%, 100% { transform: translateY(0) rotate(-1.2deg); }
          50% { transform: translateY(-14px) rotate(1.2deg); }
        }
      `}</style>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={size} height={size * (VB_H / VB_W)}>
        <defs>
          {/* Casco — metalico con highlights */}
          <radialGradient id="ast2_helmet" cx="35%" cy="25%" r="80%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#F0F4F9" />
            <stop offset="55%" stopColor="#C0CCDA" />
            <stop offset="85%" stopColor="#7088A8" />
            <stop offset="100%" stopColor="#3A4860" />
          </radialGradient>
          {/* Borde del casco / metalico */}
          <linearGradient id="ast2_helmet_rim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D8DFE8" />
            <stop offset="50%" stopColor="#8094B0" />
            <stop offset="100%" stopColor="#3A4860" />
          </linearGradient>
          {/* Visor — vidrio cyan con reflejos */}
          <radialGradient id="ast2_visor" cx="35%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#E0F7FF" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#7DD3FC" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#0891B2" stopOpacity="0.85" />
            <stop offset="85%" stopColor="#0E2A4D" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#050B1A" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="ast2_visor_dark" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="60%" stopColor="#020514" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          {/* Reflejo grande del visor */}
          <linearGradient id="ast2_reflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* Traje blanco — gradient suit */}
          <linearGradient id="ast2_suit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#E8EEF5" />
            <stop offset="80%" stopColor="#A8B5C8" />
            <stop offset="100%" stopColor="#5A6B85" />
          </linearGradient>
          {/* Volumen lateral del traje */}
          <linearGradient id="ast2_suit_side" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5A6B85" stopOpacity="0.6" />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="80%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#3A4860" stopOpacity="0.7" />
          </linearGradient>
          {/* Backpack metalico */}
          <linearGradient id="ast2_pack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5A6B85" />
            <stop offset="50%" stopColor="#3A4860" />
            <stop offset="100%" stopColor="#1F2A3F" />
          </linearGradient>
          {/* Tanque O2 */}
          <linearGradient id="ast2_tank" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1F2A3F" />
            <stop offset="40%" stopColor="#4A5A75" />
            <stop offset="60%" stopColor="#4A5A75" />
            <stop offset="100%" stopColor="#1F2A3F" />
          </linearGradient>
          {/* Glove */}
          <radialGradient id="ast2_glove" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#5A6B85" />
            <stop offset="100%" stopColor="#1F2A3F" />
          </radialGradient>
          {/* Glow ambient */}
          <radialGradient id="ast2_glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.30)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
          {/* Filter para profundidad */}
          <filter id="ast2_shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="2" dy="3" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow ambient detras */}
        <ellipse cx="140" cy="140" rx="135" ry="160" fill="url(#ast2_glow)" />

        {/* === MOCHILA / BACKPACK === */}
        <rect x="60" y="180" width="160" height="105" rx="18" fill="url(#ast2_pack)" filter="url(#ast2_shadow)" />
        {/* Bordes brillantes mochila */}
        <rect x="60" y="180" width="160" height="6" rx="3" fill="#7088A8" opacity="0.7" />
        {/* Tanques O2 verticales */}
        <rect x="76" y="170" width="14" height="22" rx="4" fill="url(#ast2_tank)" />
        <rect x="190" y="170" width="14" height="22" rx="4" fill="url(#ast2_tank)" />
        {/* Detalles mochila — paneles cuadrados */}
        <rect x="80" y="200" width="120" height="50" rx="4" fill="#1F2A3F" stroke="#4A5A75" strokeWidth="0.8" />
        <rect x="86" y="206" width="50" height="22" rx="2" fill="#0a1628" stroke="#22d3ee" strokeWidth="0.5" opacity="0.8" />
        {/* Pantalla con LEDs en mochila */}
        <circle cx="92" cy="217" r="2.5" fill="#22d3ee">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="217" r="2.5" fill="#10b981" />
        <rect x="108" y="214" width="22" height="4" rx="1" fill="#22d3ee" opacity="0.6" />
        {/* Panel derecho mochila */}
        <rect x="146" y="206" width="50" height="22" rx="2" fill="#0a1628" stroke="#22d3ee" strokeWidth="0.5" opacity="0.8" />
        <text x="171" y="221" textAnchor="middle" fontSize="8" fill="#22d3ee" fontFamily="monospace">N2-O2</text>
        {/* Tornillos */}
        {[80, 200].map((x, i) => (
          <g key={`back_${i}`}>
            <circle cx={x} cy="195" r="2" fill="#7088A8" />
            <circle cx={x} cy="270" r="2" fill="#7088A8" />
          </g>
        ))}

        {/* === HOSES desde casco a mochila === */}
        <path
          d="M 90 175 Q 75 165 70 150 Q 65 130 80 125"
          stroke="#3A4860"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 90 175 Q 75 165 70 150 Q 65 130 80 125"
          stroke="#5A6B85"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 190 175 Q 205 165 210 150 Q 215 130 200 125"
          stroke="#3A4860"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 190 175 Q 205 165 210 150 Q 215 130 200 125"
          stroke="#5A6B85"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* === BRAZO IZQ === */}
        <path
          d="M 50 200 Q 36 215 36 240 Q 38 265 56 270 L 70 268 L 75 215 Z"
          fill="url(#ast2_suit)"
          stroke="#0a1628"
          strokeWidth="1.2"
        />
        {/* Sombra brazo izq */}
        <path
          d="M 50 200 Q 36 215 36 240 Q 38 265 56 270 L 70 268 L 75 215 Z"
          fill="url(#ast2_suit_side)"
        />
        {/* Guante izq con dedos */}
        <path
          d="M 38 260 Q 30 270 32 285 Q 35 295 50 297 Q 65 295 68 285 L 70 268 Z"
          fill="url(#ast2_glove)"
          stroke="#0a1628"
          strokeWidth="1.2"
        />
        {/* Anillo del guante */}
        <ellipse cx="55" cy="265" rx="20" ry="4" fill="#22d3ee" opacity="0.6" />

        {/* === BRAZO DER === */}
        <path
          d="M 230 200 Q 244 215 244 240 Q 242 265 224 270 L 210 268 L 205 215 Z"
          fill="url(#ast2_suit)"
          stroke="#0a1628"
          strokeWidth="1.2"
        />
        <path
          d="M 230 200 Q 244 215 244 240 Q 242 265 224 270 L 210 268 L 205 215 Z"
          fill="url(#ast2_suit_side)"
          opacity="0.6"
        />
        {/* Guante der */}
        <path
          d="M 242 260 Q 250 270 248 285 Q 245 295 230 297 Q 215 295 212 285 L 210 268 Z"
          fill="url(#ast2_glove)"
          stroke="#0a1628"
          strokeWidth="1.2"
        />
        <ellipse cx="225" cy="265" rx="20" ry="4" fill="#22d3ee" opacity="0.6" />

        {/* === CUERPO / TRAJE === */}
        <path
          d="M 75 175 Q 75 158 95 158 L 185 158 Q 205 158 205 175 L 205 290 Q 205 305 195 305 L 85 305 Q 75 305 75 290 Z"
          fill="url(#ast2_suit)"
          stroke="#0a1628"
          strokeWidth="1.5"
        />
        {/* Sombras laterales del traje */}
        <path
          d="M 75 175 Q 75 158 95 158 L 185 158 Q 205 158 205 175 L 205 290 Q 205 305 195 305 L 85 305 Q 75 305 75 290 Z"
          fill="url(#ast2_suit_side)"
        />
        {/* Creases / pliegues */}
        <path d="M 100 165 L 100 290" stroke="#A8B5C8" strokeWidth="0.6" opacity="0.5" />
        <path d="M 180 165 L 180 290" stroke="#A8B5C8" strokeWidth="0.6" opacity="0.5" />
        <path d="M 140 175 Q 140 240 138 290" stroke="#A8B5C8" strokeWidth="0.5" opacity="0.4" />
        {/* Linea horizontal del cinturon */}
        <path d="M 78 248 L 202 248" stroke="#A8B5C8" strokeWidth="1" opacity="0.7" />
        <rect x="125" y="244" width="30" height="10" rx="2" fill="#3A4860" />
        <rect x="135" y="246" width="10" height="6" rx="1" fill="#22d3ee" />

        {/* === PANEL PECTORAL === */}
        <rect x="105" y="195" width="70" height="42" rx="6" fill="#0a1628" stroke="#22d3ee" strokeWidth="1" />
        <rect x="108" y="198" width="64" height="36" rx="4" fill="#020514" />
        {/* LEDs */}
        <circle cx="116" cy="207" r="2.5" fill="#22d3ee">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="128" cy="207" r="2.5" fill="#10b981">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="207" r="2.5" fill="#f59e0b">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="152" cy="207" r="2.5" fill="#ef4444">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="164" cy="207" r="2.5" fill="#a855f7">
          <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* Display lines */}
        <rect x="114" y="214" width="56" height="2.5" rx="1" fill="#22d3ee" opacity="0.7" />
        <rect x="114" y="220" width="40" height="2.5" rx="1" fill="#10b981" opacity="0.7" />
        <rect x="114" y="226" width="48" height="2.5" rx="1" fill="#f59e0b" opacity="0.5" />
        {/* Texto */}
        <text x="140" y="280" textAnchor="middle" fill="#0a1628" fontSize="11" fontWeight="bold" fontFamily="monospace">CUOTAS-26</text>

        {/* === CASCO === */}
        {/* Aro del cuello — metalico */}
        <ellipse cx="140" cy="160" rx="55" ry="12" fill="url(#ast2_helmet_rim)" stroke="#0a1628" strokeWidth="1.5" />
        {/* Tornillos del aro */}
        {[100, 120, 140, 160, 180].map((x) => (
          <circle key={x} cx={x} cy="160" r="1.5" fill="#1F2A3F" />
        ))}

        {/* Cabeza/casco esfera */}
        <circle cx="140" cy="100" r="68" fill="url(#ast2_helmet)" stroke="#0a1628" strokeWidth="2" />

        {/* Visor — gradient cyan */}
        <ellipse cx="140" cy="100" rx="56" ry="48" fill="url(#ast2_visor)" stroke="#0a1628" strokeWidth="1.5" />

        {/* Reflejo grande izquierda del visor */}
        <path
          d="M 95 75 Q 92 100 100 130 Q 110 135 115 100 Q 113 78 100 70 Z"
          fill="url(#ast2_reflection)"
          opacity="0.6"
        />
        {/* Highlight pequeno arriba */}
        <ellipse cx="120" cy="72" rx="20" ry="6" fill="white" opacity="0.55" />
        {/* Reflejo abajo derecha */}
        <ellipse cx="170" cy="125" rx="14" ry="3" fill="white" opacity="0.30" />
        {/* Linea de reflexion horizonte */}
        <ellipse cx="140" cy="100" rx="56" ry="48" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        <ellipse cx="140" cy="100" rx="50" ry="42" fill="none" stroke="rgba(34,211,238,0.25)" strokeWidth="0.5" />

        {/* === OJOS dentro del visor === */}
        <g style={{ transition: 'opacity 0.25s', opacity: hideEyes ? 0 : 1 }}>
          {/* Sclera */}
          <ellipse cx="117" cy="100" rx="9" ry="11" fill="white" />
          <ellipse cx="163" cy="100" rx="9" ry="11" fill="white" />
          {/* Iris cyan */}
          <ellipse cx={117 + pupilOffset.lx} cy={100 + pupilOffset.ly} rx="6" ry="7" fill="#0891B2" />
          <ellipse cx={163 + pupilOffset.rx} cy={100 + pupilOffset.ry} rx="6" ry="7" fill="#0891B2" />
          {/* Pupila */}
          <circle cx={117 + pupilOffset.lx} cy={100 + pupilOffset.ly} r="3.5" fill="#0a1628" />
          <circle cx={163 + pupilOffset.rx} cy={100 + pupilOffset.ry} r="3.5" fill="#0a1628" />
          {/* Brillo */}
          <circle cx={117 + pupilOffset.lx + 1.5} cy={100 + pupilOffset.ly - 2} r="1.5" fill="white" />
          <circle cx={163 + pupilOffset.rx + 1.5} cy={100 + pupilOffset.ry - 2} r="1.5" fill="white" />
          {/* Sonrisa */}
          <path
            d="M 130 128 Q 140 134 150 128"
            stroke="#1F2A3F"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* === VISOR OSCURO (overlay cuando hideEyes) === */}
        <g
          style={{
            transition: 'opacity 0.4s ease-out',
            opacity: hideEyes ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          <ellipse cx="140" cy="100" rx="56" ry="48" fill="url(#ast2_visor_dark)" />
          {/* Reflejo sutil del visor oscuro */}
          <ellipse cx="120" cy="80" rx="18" ry="8" fill="rgba(34,211,238,0.20)" />
          <ellipse cx="160" cy="115" rx="10" ry="3" fill="rgba(34,211,238,0.15)" />
          {/* Texto modo privado */}
          <text x="140" y="105" textAnchor="middle" fontSize="11" fontFamily="monospace" fill="rgba(34,211,238,0.85)" letterSpacing="3">◉ ◉</text>
        </g>

        {/* === ANTENA con LED rojo parpadeante === */}
        <line x1="140" y1="32" x2="140" y2="18" stroke="#5A6B85" strokeWidth="2.5" />
        <circle cx="140" cy="14" r="3.5" fill="#ef4444" />
        <circle cx="140" cy="14" r="3.5" fill="#ef4444" opacity="0.6">
          <animate attributeName="r" values="3;9;3" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.6;0" dur="1.4s" repeatCount="indefinite" />
        </circle>

        {/* Antena lateral */}
        <line x1="195" y1="55" x2="210" y2="40" stroke="#5A6B85" strokeWidth="2" />
        <circle cx="212" cy="38" r="2.5" fill="#22d3ee">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
