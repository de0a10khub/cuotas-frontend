'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

/** Engranaje SVG con N dientes, gira al ritmo de la prop duration. */
function Gear({
  size = 100,
  teeth = 12,
  duration = 20,
  reverse = false,
  className = '',
  color = '#22d3ee',
}: {
  size?: number;
  teeth?: number;
  duration?: number;
  reverse?: boolean;
  className?: string;
  color?: string;
}) {
  const r = 50;
  const toothH = 10;
  const toothW = 5;
  const innerR = r - toothH * 0.5;
  return (
    <svg
      viewBox="-60 -60 120 120"
      width={size}
      height={size}
      className={className}
      style={{
        animation: `gear-spin ${duration}s linear ${reverse ? 'reverse' : ''} infinite`,
      }}
    >
      <defs>
        <radialGradient id={`gear-grad-${size}-${teeth}-${color.slice(1)}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="60%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.08" />
        </radialGradient>
      </defs>
      {/* Dientes */}
      {Array.from({ length: teeth }).map((_, i) => {
        const angle = (i * 360) / teeth;
        return (
          <rect
            key={i}
            x={-toothW / 2}
            y={-r - toothH * 0.3}
            width={toothW}
            height={toothH}
            fill={color}
            opacity="0.6"
            transform={`rotate(${angle})`}
          />
        );
      })}
      {/* Cuerpo */}
      <circle cx="0" cy="0" r={innerR} fill={`url(#gear-grad-${size}-${teeth}-${color.slice(1)})`} stroke={color} strokeWidth="1.2" strokeOpacity="0.5" />
      {/* Aros internos */}
      <circle cx="0" cy="0" r={innerR * 0.7} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="0" cy="0" r={innerR * 0.45} fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Hueco central */}
      <circle cx="0" cy="0" r={innerR * 0.18} fill="#000" stroke={color} strokeWidth="1" strokeOpacity="0.7" />
      {/* Marcas radiales */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60) * (Math.PI / 180);
        const x1 = innerR * 0.45 * Math.cos(angle);
        const y1 = innerR * 0.45 * Math.sin(angle);
        const x2 = innerR * 0.7 * Math.cos(angle);
        const y2 = innerR * 0.7 * Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />;
      })}
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [glitchAt, setGlitchAt] = useState(0);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Glitch ocasional cada ~5s
  useEffect(() => {
    const t = setInterval(() => setGlitchAt(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Bienvenido');
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 401
          ? 'Usuario o contraseña incorrectos'
          : 'Error al conectar con el servidor';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03050d] p-4">
      <style jsx global>{`
        @keyframes gear-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes circuit-flow {
          to { stroke-dashoffset: -200; }
        }
        @keyframes pulse-node {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes scan-line {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        @keyframes glitch-shift {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
        }
        @keyframes spark {
          0%, 90%, 100% { opacity: 0; }
          92%, 96% { opacity: 1; }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes hex-pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.12; }
        }
      `}</style>

      {/* === FONDO BASE: gradient deep === */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, #061226 0%, #030714 50%, #000 100%)',
        }}
      />

      {/* === HEXAGON GRID PATTERN === */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ animation: 'hex-pulse 6s ease-in-out infinite' }}
      >
        <defs>
          <pattern id="hexgrid" width="60" height="52" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
            <polygon
              points="30,2 56,16 56,44 30,58 4,44 4,16"
              fill="none"
              stroke="rgba(34,211,238,0.5)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexgrid)" />
      </svg>

      {/* === CIRCUITOS con corriente cyan === */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="circuit-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(34,211,238,0)" />
            <stop offset="50%" stopColor="rgba(34,211,238,0.9)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </linearGradient>
        </defs>
        {/* Trazas estaticas */}
        <g stroke="rgba(34,211,238,0.18)" strokeWidth="1" fill="none">
          <path d="M 0 100 L 200 100 L 220 120 L 350 120 L 380 90 L 600 90" />
          <path d="M 0 250 L 150 250 L 170 230 L 280 230 L 310 260 L 500 260 L 530 240 L 800 240" />
          <path d="M 100% 200 L 80% 200 L 75% 180 L 60% 180 L 55% 220 L 30% 220" />
          <path d="M 100% 400 L 75% 400 L 73% 380 L 50% 380 L 48% 420 L 20% 420 L 18% 400 L 0 400" />
          <path d="M 0 80% L 30% 80% L 32% 78% L 60% 78% L 62% 82% L 100% 82%" />
          <path d="M 50% 0 L 50% 15% L 48% 17% L 48% 30% L 52% 32% L 52% 50%" />
          <path d="M 70% 100% L 70% 85% L 72% 83% L 85% 83% L 87% 70% L 95% 70%" />
        </g>
        {/* Corriente fluyendo (animadas) */}
        {[
          { d: 'M 0 100 L 200 100 L 220 120 L 350 120 L 380 90 L 600 90', delay: 0, dur: 6 },
          { d: 'M 0 250 L 150 250 L 170 230 L 280 230 L 310 260 L 500 260 L 530 240 L 800 240', delay: 1.5, dur: 8 },
          { d: 'M 100% 400 L 75% 400 L 73% 380 L 50% 380 L 48% 420 L 20% 420', delay: 3, dur: 7 },
          { d: 'M 0 80% L 30% 80% L 32% 78% L 60% 78% L 62% 82% L 100% 82%', delay: 4.5, dur: 9 },
          { d: 'M 50% 0 L 50% 15% L 48% 17% L 48% 30% L 52% 32% L 52% 50%', delay: 2, dur: 6 },
        ].map((c, i) => (
          <path
            key={i}
            d={c.d}
            stroke="rgba(34,211,238,0.85)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="40 200"
            strokeDashoffset={0}
            style={{
              animation: `circuit-flow ${c.dur}s linear ${c.delay}s infinite`,
              filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.8))',
            }}
          />
        ))}
        {/* Nodos pulsantes en intersecciones */}
        {[
          [200, 100], [350, 120], [600, 90],
          [150, 250], [280, 230], [500, 260],
        ].map(([x, y], i) => (
          <circle
            key={`node-${i}`}
            cx={x}
            cy={y}
            r="3"
            fill="#22d3ee"
            style={{
              animation: `pulse-node ${1.5 + (i * 0.3)}s ease-in-out infinite`,
              filter: 'drop-shadow(0 0 4px rgba(34,211,238,1))',
            }}
          />
        ))}
      </svg>

      {/* === ENGRANAJES decorativos en esquinas === */}
      <div className="pointer-events-none absolute -left-10 top-12 opacity-50">
        <Gear size={180} teeth={16} duration={28} />
      </div>
      <div className="pointer-events-none absolute -left-4 top-44 opacity-40">
        <Gear size={110} teeth={10} duration={18} reverse color="#a855f7" />
      </div>

      <div className="pointer-events-none absolute -right-12 bottom-8 opacity-50">
        <Gear size={200} teeth={20} duration={35} reverse />
      </div>
      <div className="pointer-events-none absolute -right-6 bottom-44 opacity-45">
        <Gear size={120} teeth={12} duration={22} color="#10b981" />
      </div>

      <div className="pointer-events-none absolute right-1/4 -top-6 opacity-30">
        <Gear size={80} teeth={8} duration={14} color="#f59e0b" />
      </div>

      {/* === SPARKS / cortocircuitos aleatorios === */}
      {[
        { left: '15%', top: '30%', delay: 0 },
        { left: '85%', top: '25%', delay: 2 },
        { left: '25%', top: '70%', delay: 4 },
        { left: '75%', top: '60%', delay: 1.5 },
      ].map((s, i) => (
        <div
          key={`spark-${i}`}
          className="pointer-events-none absolute"
          style={{
            left: s.left,
            top: s.top,
            animation: `spark 4s linear ${s.delay}s infinite`,
          }}
        >
          <div
            className="h-2 w-2 rounded-full bg-yellow-300"
            style={{
              boxShadow:
                '0 0 8px rgba(253,224,71,1), 0 0 16px rgba(251,191,36,0.8), 0 0 32px rgba(245,158,11,0.5)',
            }}
          />
        </div>
      ))}

      {/* === SCAN LINE estilo CRT === */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-30"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.15) 50%, transparent 100%)',
          animation: 'scan-line 8s linear infinite',
        }}
      />

      {/* === HUD: lineas estado tipo terminal arriba === */}
      <div
        key={glitchAt}
        className="pointer-events-none absolute left-6 top-6 hidden font-mono text-[10px] text-cyan-400/70 md:block"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-emerald-400">[●] SYSTEM ONLINE</span>
          <span>[◉] PROTOCOL: SECURE-AUTH-v2.6</span>
          <span>[◉] CONN: cuotas-backend.onrender.com</span>
          <span className="text-amber-400">[!] AWAITING CREDENTIALS</span>
          <span className="opacity-50">└─ NODE-26 │ SESSION READY</span>
        </div>
      </div>

      {/* HUD inferior derecha — telemetría falsa */}
      <div className="pointer-events-none absolute right-6 bottom-6 hidden font-mono text-[10px] text-cyan-400/70 md:block">
        <div className="flex flex-col gap-0.5 text-right">
          <span>CPU: <span className="text-emerald-400">8.4%</span></span>
          <span>MEM: <span className="text-cyan-300">2.1GB / 16GB</span></span>
          <span>NET: <span className="text-emerald-400">●</span> 142ms</span>
          <span>UPTIME: 142d 6h 22m</span>
          <span className="opacity-50">v26.04.29 │ build 7ab6efc</span>
        </div>
      </div>

      {/* Ticker bar inferior */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 overflow-hidden border-t border-cyan-400/20 bg-black/40 py-1 text-[9px] font-mono text-cyan-400/40 backdrop-blur-sm">
        <div className="flex whitespace-nowrap" style={{ animation: 'ticker 60s linear infinite' }}>
          <span className="px-8">{'>>'} CUOTAS-OS // SECURE LAYER ACTIVE // ALL TRANSACTIONS ENCRYPTED // FIREWALL: ENGAGED // BIOMETRIC GATEWAY: STANDBY // QUANTUM-RESISTANT KEYS DEPLOYED // MAINFRAME LINK: STABLE // DATA STREAM: NOMINAL //</span>
          <span className="px-8">{'>>'} CUOTAS-OS // SECURE LAYER ACTIVE // ALL TRANSACTIONS ENCRYPTED // FIREWALL: ENGAGED // BIOMETRIC GATEWAY: STANDBY // QUANTUM-RESISTANT KEYS DEPLOYED // MAINFRAME LINK: STABLE // DATA STREAM: NOMINAL //</span>
        </div>
      </div>

      {/* LUZ que sigue al cursor */}
      {cursor && (
        <div
          className="pointer-events-none fixed h-[400px] w-[400px] rounded-full blur-[80px] transition-transform duration-100 ease-out"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${cursor.x - 200}px, ${cursor.y - 200}px)`,
            background:
              'radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(168,85,247,0.10) 40%, rgba(0,0,0,0) 70%)',
          }}
        />
      )}

      {/* === LOGIN CARD con HUD frame === */}
      <div className="relative z-10 w-full max-w-md">
        {/* Corner brackets HUD */}
        <div className="pointer-events-none absolute -left-3 -top-3 h-6 w-6 border-l-2 border-t-2 border-cyan-400" />
        <div className="pointer-events-none absolute -right-3 -top-3 h-6 w-6 border-r-2 border-t-2 border-cyan-400" />
        <div className="pointer-events-none absolute -left-3 -bottom-3 h-6 w-6 border-l-2 border-b-2 border-cyan-400" />
        <div className="pointer-events-none absolute -right-3 -bottom-3 h-6 w-6 border-r-2 border-b-2 border-cyan-400" />

        <div className="relative overflow-hidden rounded-md border border-cyan-400/30 bg-[#050a18]/85 p-8 shadow-[0_0_60px_rgba(34,211,238,0.15),inset_0_0_20px_rgba(34,211,238,0.05)] backdrop-blur-xl">
          {/* Lineas internas tipo HUD */}
          <div className="pointer-events-none absolute left-0 top-0 h-px w-1/3 bg-gradient-to-r from-cyan-400 to-transparent" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-px w-1/3 bg-gradient-to-l from-cyan-400 to-transparent" />

          {/* Glow orbs decorativos */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />

          <div className="relative space-y-1 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded border border-cyan-400/30 bg-cyan-400/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              ACCESS · TERMINAL
            </div>
            <h1 className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text font-mono text-3xl font-bold tracking-[0.15em] text-transparent drop-shadow-[0_2px_10px_rgba(34,211,238,0.5)]">
              CUOTAS
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
              authenticate to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
                {'> '}Usuario / email
              </Label>
              <Input
                id="username"
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="rounded border-cyan-400/20 bg-black/60 font-mono text-cyan-50 backdrop-blur focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
                {'> '}Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="rounded pr-10 border-cyan-400/20 bg-black/60 font-mono text-cyan-50 backdrop-blur focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center text-cyan-400/50 transition-colors hover:text-cyan-200"
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="group w-full rounded border-0 bg-gradient-to-r from-cyan-600 to-blue-600 font-mono uppercase tracking-[0.2em] text-white shadow-[0_0_25px_rgba(34,211,238,0.45)] transition-all hover:from-cyan-500 hover:to-blue-500 hover:shadow-[0_0_40px_rgba(34,211,238,0.7)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  Iniciar sesión
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
