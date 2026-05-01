'use client';

/**
 * LoginSplash — animación de "boot" del sistema tras login exitoso.
 *
 * Total ~3000 ms en 3 fases:
 *   - 0–2100 ms : 7 líneas de boot tipo terminal con efecto typewriter +
 *                 barra de progreso, fondo de hex grid + circuitos animados.
 *   - 2100–2700: fade del boot, aparece "BIENVENIDO" + nombre con gradient
 *                cyan/white/cyan y particles.
 *   - 2700–3000: fade-out del overlay → debajo aparece el dashboard.
 *
 * Se renderiza desde el layout del dashboard cuando hay flag
 * `cuotas_show_splash` en sessionStorage (puesto por la login page tras
 * autenticar OK). Skippable: click o tecla cierra antes.
 */

import { useEffect, useMemo, useState } from 'react';

const BOOT_LINES = [
  'Establishing secure link',
  'Verifying biometric signature',
  'Synchronizing data streams',
  'Loading user profile',
  'Permissions: 47 modules online',
  'Quantum-resistant keys: ACTIVE',
  'Initializing dashboard',
];

interface Props {
  userName: string;
  onComplete: () => void;
}

export function LoginSplash({ userName, onComplete }: Props) {
  // Fase actual del show
  const [phase, setPhase] = useState<'boot' | 'welcome' | 'fade'>('boot');
  // Cuántas líneas del boot se han "tipeado" ya
  const [linesShown, setLinesShown] = useState(0);

  // Pistas de circuito animadas — coordenadas decorativas (no funcional)
  const circuitPaths = useMemo(
    () => [
      { d: 'M 0 100 L 200 100 L 220 120 L 350 120 L 380 90 L 600 90', dur: 4 },
      { d: 'M 0 250 L 150 250 L 170 230 L 280 230 L 310 260 L 600 260', dur: 5 },
      { d: 'M 100% 200 L 70% 200 L 65% 180 L 40% 180 L 35% 220 L 0 220', dur: 4.5 },
      { d: 'M 100% 400 L 70% 400 L 68% 380 L 50% 380 L 48% 420 L 0 420', dur: 5.5 },
      { d: 'M 0 80% L 35% 80% L 37% 78% L 60% 78% L 62% 82% L 100% 82%', dur: 4 },
    ],
    [],
  );

  // Avance de las líneas: una nueva cada 280 ms hasta completar las 7
  useEffect(() => {
    if (linesShown >= BOOT_LINES.length) return;
    const t = setTimeout(() => setLinesShown((n) => n + 1), 280);
    return () => clearTimeout(t);
  }, [linesShown]);

  // Cronómetro maestro de fases
  useEffect(() => {
    const tWelcome = setTimeout(() => setPhase('welcome'), 2100);
    const tFade = setTimeout(() => setPhase('fade'), 2700);
    const tDone = setTimeout(() => onComplete(), 3000);
    return () => {
      clearTimeout(tWelcome);
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, [onComplete]);

  // Skip: click o tecla cualquier cierra el splash
  useEffect(() => {
    const skip = () => onComplete();
    window.addEventListener('keydown', skip);
    window.addEventListener('click', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('click', skip);
    };
  }, [onComplete]);

  const progress = Math.min(100, (linesShown / BOOT_LINES.length) * 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#03050d]"
      style={{
        opacity: phase === 'fade' ? 0 : 1,
        transition: 'opacity 280ms ease-out',
        pointerEvents: phase === 'fade' ? 'none' : 'auto',
      }}
    >
      <style jsx global>{`
        @keyframes splash-circuit-flow {
          to { stroke-dashoffset: -200; }
        }
        @keyframes splash-pulse-node {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes splash-hex-pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.14; }
        }
        @keyframes splash-typewriter {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        @keyframes splash-line-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes splash-glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(34,211,238,0.6)); }
          50% { filter: drop-shadow(0 0 18px rgba(34,211,238,0.9)); }
        }
        @keyframes splash-welcome-in {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); letter-spacing: 0.05em; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.18em; }
        }
        @keyframes splash-particle {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          20% { opacity: 1; transform: translate(var(--px), var(--py)) scale(1); }
          100% { opacity: 0; transform: translate(calc(var(--px) * 2.5), calc(var(--py) * 2.5)) scale(0.4); }
        }
        @keyframes splash-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes splash-scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      {/* === FONDO BASE === */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, #061226 0%, #030714 50%, #000 100%)',
        }}
      />

      {/* === HEX GRID === */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ animation: 'splash-hex-pulse 3s ease-in-out infinite' }}
      >
        <defs>
          <pattern
            id="splash-hex"
            width="60"
            height="52"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(1.2)"
          >
            <polygon
              points="30,2 56,16 56,44 30,58 4,44 4,16"
              fill="none"
              stroke="rgba(34,211,238,0.5)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#splash-hex)" />
      </svg>

      {/* === CIRCUITOS animados === */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {/* Trazas estáticas tenues */}
        <g stroke="rgba(34,211,238,0.18)" strokeWidth="1" fill="none">
          {circuitPaths.map((p, i) => (
            <path key={`s-${i}`} d={p.d} />
          ))}
        </g>
        {/* Corriente fluyendo */}
        {circuitPaths.map((p, i) => (
          <path
            key={`f-${i}`}
            d={p.d}
            stroke="rgba(34,211,238,0.85)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="40 200"
            style={{
              animation: `splash-circuit-flow ${p.dur}s linear ${i * 0.4}s infinite`,
              filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.8))',
            }}
          />
        ))}
        {/* Nodos pulsantes */}
        {[
          [200, 100], [350, 120], [600, 90],
          [150, 250], [280, 230], [600, 260],
        ].map(([x, y], i) => (
          <circle
            key={`n-${i}`}
            cx={x}
            cy={y}
            r="3.5"
            fill="#22d3ee"
            style={{
              animation: `splash-pulse-node ${1.4 + i * 0.25}s ease-in-out infinite`,
              filter: 'drop-shadow(0 0 5px rgba(34,211,238,1))',
            }}
          />
        ))}
      </svg>

      {/* === SCAN LINE estilo CRT === */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-40"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.18) 50%, transparent 100%)',
          animation: 'splash-scan 3s linear infinite',
        }}
      />

      {/* === CONTENIDO PRINCIPAL === */}
      <div className="relative z-10 w-full max-w-2xl px-6">
        {/* HEADER fijo: marca CUOTAS arriba */}
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded border border-cyan-400/30 bg-cyan-400/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            BOOT · SEQUENCE
          </div>
          <h1
            className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text font-mono text-3xl font-bold tracking-[0.2em] text-transparent"
            style={{
              animation: 'splash-glow-pulse 1.4s ease-in-out infinite',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CUOTAS
          </h1>
        </div>

        {/* FASE BOOT — terminal con líneas */}
        {phase === 'boot' && (
          <div className="space-y-4">
            <div className="rounded border border-cyan-400/20 bg-black/60 p-5 font-mono text-sm shadow-[0_0_40px_rgba(34,211,238,0.15)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between border-b border-cyan-400/15 pb-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-400/70">
                  /dev/tty0
                </span>
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-emerald-400/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                  CONNECTED
                </span>
              </div>
              <ul className="space-y-1.5">
                {BOOT_LINES.map((line, i) => {
                  const visible = i < linesShown;
                  return (
                    <li
                      key={i}
                      className="flex items-baseline gap-2 text-cyan-100/90"
                      style={{
                        opacity: visible ? 1 : 0,
                        animation: visible ? 'splash-line-in 200ms ease-out forwards' : undefined,
                      }}
                    >
                      <span className="text-cyan-400/50">{`>`}</span>
                      <span className="flex-1">
                        <span
                          className="inline-block"
                          style={{
                            animation: visible ? 'splash-typewriter 200ms steps(30) forwards' : undefined,
                            clipPath: visible ? undefined : 'inset(0 100% 0 0)',
                          }}
                        >
                          {line}
                        </span>
                        <span className="text-cyan-500/40">
                          {' '}
                          {'.'.repeat(Math.max(0, 32 - line.length))}
                        </span>
                      </span>
                      <span
                        className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/40"
                        style={{
                          opacity: visible ? 1 : 0,
                          transitionDelay: '180ms',
                          transition: 'opacity 100ms ease-out',
                        }}
                      >
                        OK
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">
                <span>SYSTEM LOAD</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-cyan-950/60 ring-1 ring-cyan-500/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                  style={{ width: `${progress}%`, transition: 'width 280ms ease-out' }}
                />
              </div>
            </div>

            <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400/50">
              Click anywhere to skip
            </p>
          </div>
        )}

        {/* FASE WELCOME — bienvenida con nombre */}
        {(phase === 'welcome' || phase === 'fade') && (
          <div className="relative flex flex-col items-center justify-center py-10">
            {/* Partículas radiales */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360) / 16;
              const dist = 100 + (i % 3) * 30;
              const px = Math.cos((angle * Math.PI) / 180) * dist;
              const py = Math.sin((angle * Math.PI) / 180) * dist;
              const colors = ['#22d3ee', '#60a5fa', '#a78bfa', '#34d399'];
              const color = colors[i % colors.length];
              return (
                <div
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full"
                  style={{
                    background: color,
                    boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
                    left: '50%',
                    top: '50%',
                    ['--px' as string]: `${px}px`,
                    ['--py' as string]: `${py}px`,
                    animation: `splash-particle ${0.9 + (i % 3) * 0.15}s ease-out forwards`,
                  }}
                />
              );
            })}

            <p
              className="font-mono text-xs uppercase tracking-[0.4em] text-cyan-400/80"
              style={{ animation: 'splash-welcome-in 500ms ease-out 0ms forwards', opacity: 0 }}
            >
              · ACCESS GRANTED ·
            </p>
            <h2
              className="mt-2 bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text font-mono text-5xl font-bold uppercase text-transparent drop-shadow-[0_2px_18px_rgba(34,211,238,0.6)]"
              style={{ animation: 'splash-welcome-in 600ms ease-out 100ms forwards', opacity: 0 }}
            >
              Bienvenido
            </h2>
            <p
              className="mt-3 text-2xl font-semibold tracking-wider text-cyan-100"
              style={{ animation: 'splash-welcome-in 600ms ease-out 250ms forwards', opacity: 0 }}
            >
              {userName}
            </p>
            <div
              className="mt-6 h-px w-48 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              style={{ animation: 'splash-welcome-in 400ms ease-out 400ms forwards', opacity: 0 }}
            />
            <p
              className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/60"
              style={{ animation: 'splash-welcome-in 400ms ease-out 500ms forwards', opacity: 0 }}
            >
              Sistema Cuotas · ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
