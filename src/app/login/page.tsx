'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

/** Chip con N pines en cada lado y LEDs animados. */
function Chip({
  width = 80,
  height = 80,
  pins = 8,
  label = 'CPU',
  color = '#22d3ee',
  className = '',
  style,
}: {
  width?: number;
  height?: number;
  pins?: number;
  label?: string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const pinW = 4;
  const pinH = 6;
  const gap = (width - pins * pinW * 2) / (pins + 1);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} style={style}>
      {/* Cuerpo del chip */}
      <rect x={pinH} y={pinH} width={width - pinH * 2} height={height - pinH * 2} rx="2" fill="#0a0e1a" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
      {/* Texto */}
      <text x={width / 2} y={height / 2 + 3} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.9">{label}</text>
      {/* Marca esquina (pin 1) */}
      <circle cx={pinH + 5} cy={pinH + 5} r="2" fill={color} opacity="0.7" />
      {/* LEDs centrales */}
      {Array.from({ length: 3 }).map((_, i) => (
        <circle key={i} cx={width / 2 - 12 + i * 12} cy={height - pinH - 4} r="1.5" fill={i === 0 ? '#22d3ee' : i === 1 ? '#10b981' : '#f59e0b'}>
          <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* Pines arriba */}
      {Array.from({ length: pins }).map((_, i) => (
        <rect key={`top-${i}`} x={gap + i * (pinW + gap)} y="0" width={pinW} height={pinH} fill="#9ca3af" />
      ))}
      {/* Pines abajo */}
      {Array.from({ length: pins }).map((_, i) => (
        <rect key={`bot-${i}`} x={gap + i * (pinW + gap)} y={height - pinH} width={pinW} height={pinH} fill="#9ca3af" />
      ))}
      {/* Pines izq */}
      {Array.from({ length: pins }).map((_, i) => (
        <rect key={`left-${i}`} x="0" y={gap + i * (pinW + gap)} width={pinH} height={pinW} fill="#9ca3af" />
      ))}
      {/* Pines der */}
      {Array.from({ length: pins }).map((_, i) => (
        <rect key={`right-${i}`} x={width - pinH} y={gap + i * (pinW + gap)} width={pinH} height={pinW} fill="#9ca3af" />
      ))}
    </svg>
  );
}

/** Capacitor cilindrico vertical. */
function Capacitor({ x, y, color = '#22d3ee' }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx="0" cy="0" rx="6" ry="2" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
      <rect x="-6" y="0" width="12" height="14" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
      <ellipse cx="0" cy="14" rx="6" ry="2" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
      <text x="0" y="9" textAnchor="middle" fill={color} fontSize="6" fontFamily="monospace">+</text>
      <line x1="-2" y1="16" x2="-2" y2="20" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="2" y1="16" x2="2" y2="20" stroke="#9ca3af" strokeWidth="0.8" />
    </g>
  );
}

/** Resistencia tipo bobinada con las bandas de color. */
function Resistor({ x, y, rotation = 0 }: { x: number; y: number; rotation?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <line x1="-15" y1="0" x2="-8" y2="0" stroke="#9ca3af" strokeWidth="1" />
      <rect x="-8" y="-3" width="16" height="6" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.5" />
      <rect x="-5" y="-3" width="1.5" height="6" fill="#7c2d12" />
      <rect x="-2" y="-3" width="1.5" height="6" fill="#000" />
      <rect x="1" y="-3" width="1.5" height="6" fill="#dc2626" />
      <rect x="4" y="-3" width="1.5" height="6" fill="#fbbf24" />
      <line x1="8" y1="0" x2="15" y2="0" stroke="#9ca3af" strokeWidth="1" />
    </g>
  );
}

/** Ventilador estilo CPU cooler que gira. */
function CPUFan({ size = 90, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} className={className}>
      {/* Marco cuadrado del cooler */}
      <rect x="-48" y="-48" width="96" height="96" rx="4" fill="#0a0e1a" stroke="#475569" strokeWidth="1" />
      {/* Tornillos esquinas */}
      {[[-42, -42], [42, -42], [-42, 42], [42, 42]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#374151" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.5" />
      ))}
      {/* Aspas (giran) */}
      <g style={{ animation: 'gear-spin 1.5s linear infinite', transformOrigin: 'center' }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const angle = i * (360 / 7);
          return (
            <path
              key={i}
              d="M 0 0 Q 4 -10 12 -28 Q 8 -36 -2 -32 Q -6 -20 -2 -2 Z"
              fill="#1f2937"
              stroke="#475569"
              strokeWidth="0.5"
              transform={`rotate(${angle})`}
            />
          );
        })}
      </g>
      {/* Hub central */}
      <circle cx="0" cy="0" r="10" fill="#0a0e1a" stroke="#22d3ee" strokeWidth="0.8" />
      <text x="0" y="3" textAnchor="middle" fill="#22d3ee" fontSize="6" fontFamily="monospace">CPU</text>
    </svg>
  );
}

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
        @keyframes bit-fall {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh); opacity: 0; }
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
      <div className="pointer-events-none absolute left-32 top-32 opacity-45">
        <Gear size={110} teeth={10} duration={18} reverse color="#a855f7" />
      </div>
      <div className="pointer-events-none absolute left-44 top-12 opacity-30">
        <Gear size={70} teeth={8} duration={12} color="#10b981" />
      </div>

      <div className="pointer-events-none absolute -right-12 bottom-8 opacity-50">
        <Gear size={200} teeth={20} duration={35} reverse />
      </div>
      <div className="pointer-events-none absolute right-32 bottom-44 opacity-45">
        <Gear size={120} teeth={12} duration={22} color="#10b981" />
      </div>
      <div className="pointer-events-none absolute right-44 bottom-16 opacity-35">
        <Gear size={80} teeth={9} duration={16} reverse color="#f59e0b" />
      </div>

      <div className="pointer-events-none absolute right-1/4 -top-6 opacity-30">
        <Gear size={80} teeth={8} duration={14} color="#f59e0b" />
      </div>
      <div className="pointer-events-none absolute left-1/3 -bottom-8 opacity-30">
        <Gear size={90} teeth={10} duration={16} reverse color="#22d3ee" />
      </div>

      {/* === MOTHERBOARD: chips, capacitores, resistencias === */}
      {/* Chip esquina superior izquierda */}
      <div className="pointer-events-none absolute left-[18%] top-[20%] hidden md:block opacity-80">
        <Chip width={90} height={90} pins={10} label="MCU" color="#22d3ee" />
      </div>
      {/* Chip pequeño */}
      <div className="pointer-events-none absolute left-[8%] top-[55%] hidden md:block opacity-75">
        <Chip width={60} height={60} pins={6} label="ROM" color="#a855f7" />
      </div>
      {/* Chip BIOS */}
      <div className="pointer-events-none absolute right-[10%] top-[28%] hidden md:block opacity-80">
        <Chip width={70} height={70} pins={7} label="BIOS" color="#10b981" />
      </div>
      {/* Chip RAM */}
      <div className="pointer-events-none absolute right-[18%] top-[60%] hidden md:block opacity-75">
        <Chip width={100} height={50} pins={12} label="RAM-DDR4" color="#f59e0b" />
      </div>

      {/* CPU FAN ventilador girando */}
      <div className="pointer-events-none absolute left-[13%] bottom-[18%] hidden md:block opacity-70">
        <CPUFan size={100} />
      </div>

      {/* Capacitores y resistencias dispersas */}
      <svg className="pointer-events-none absolute inset-0 hidden md:block" width="100%" height="100%">
        {/* Capacitores en columna izquierda */}
        <Capacitor x={150} y={350} color="#22d3ee" />
        <Capacitor x={170} y={350} color="#22d3ee" />
        <Capacitor x={190} y={350} color="#a855f7" />
        {/* Capacitores derecha */}
        <Capacitor x={1150} y={250} color="#10b981" />
        <Capacitor x={1170} y={250} color="#22d3ee" />
        {/* Resistencias dispersas */}
        <Resistor x={250} y={500} />
        <Resistor x={300} y={500} />
        <Resistor x={1000} y={520} rotation={90} />
        <Resistor x={1050} y={550} />
        <Resistor x={130} y={650} rotation={45} />
      </svg>

      {/* === CABLES animados saliendo de la "placa base" === */}
      <svg className="pointer-events-none absolute inset-0 hidden md:block" width="100%" height="100%">
        <defs>
          <linearGradient id="cable-flow-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Cables curvos saliendo del chip MCU */}
        <path
          d="M 280 280 Q 350 280 380 220 Q 420 150 500 150"
          stroke="rgba(34,211,238,0.3)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 280 280 Q 350 280 380 220 Q 420 150 500 150"
          stroke="#22d3ee"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="8 200"
          strokeLinecap="round"
          style={{ animation: 'circuit-flow 4s linear infinite', filter: 'drop-shadow(0 0 4px rgba(34,211,238,1))' }}
        />
        {/* Cable del MCU a abajo */}
        <path
          d="M 230 320 Q 230 400 280 450 Q 330 500 380 600"
          stroke="rgba(168,85,247,0.3)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 230 320 Q 230 400 280 450 Q 330 500 380 600"
          stroke="#a855f7"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="8 200"
          strokeLinecap="round"
          style={{ animation: 'circuit-flow 5s linear 1s infinite', filter: 'drop-shadow(0 0 4px rgba(168,85,247,1))' }}
        />
        {/* Cable derecha BIOS al centro */}
        <path
          d="M 1000 350 Q 950 350 920 400 Q 880 460 800 480"
          stroke="rgba(16,185,129,0.3)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 1000 350 Q 950 350 920 400 Q 880 460 800 480"
          stroke="#10b981"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="8 200"
          strokeLinecap="round"
          style={{ animation: 'circuit-flow 6s linear 2s infinite', filter: 'drop-shadow(0 0 4px rgba(16,185,129,1))' }}
        />
        {/* Cable RAM hacia abajo */}
        <path
          d="M 1100 700 Q 1000 720 900 700 Q 800 680 700 720"
          stroke="rgba(245,158,11,0.3)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 1100 700 Q 1000 720 900 700 Q 800 680 700 720"
          stroke="#f59e0b"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="8 200"
          strokeLinecap="round"
          style={{ animation: 'circuit-flow 5s linear 0.5s infinite', filter: 'drop-shadow(0 0 4px rgba(245,158,11,1))' }}
        />
      </svg>

      {/* === OSCILOSCOPIO / waveform === */}
      <svg className="pointer-events-none absolute right-[5%] top-[42%] hidden lg:block opacity-70" width="180" height="60" viewBox="0 0 180 60">
        <rect x="0" y="0" width="180" height="60" rx="4" fill="rgba(0,0,0,0.7)" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.5" />
        {/* Grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * 30} y1="0" x2={i * 30} y2="60" stroke="rgba(34,211,238,0.15)" />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 15} x2="180" y2={i * 15} stroke="rgba(34,211,238,0.15)" />
        ))}
        {/* Waveform sinusoidal */}
        <path
          d="M 0 30 Q 22 5 45 30 T 90 30 T 135 30 T 180 30"
          stroke="#22d3ee"
          strokeWidth="1.5"
          fill="none"
          style={{ filter: 'drop-shadow(0 0 3px #22d3ee)' }}
        >
          <animate attributeName="d" dur="3s" repeatCount="indefinite"
            values="M 0 30 Q 22 5 45 30 T 90 30 T 135 30 T 180 30;
                    M 0 30 Q 22 55 45 30 T 90 30 T 135 30 T 180 30;
                    M 0 30 Q 22 5 45 30 T 90 30 T 135 30 T 180 30" />
        </path>
        <text x="6" y="11" fill="#22d3ee" fontSize="8" fontFamily="monospace" opacity="0.7">SIG-IN</text>
        <text x="155" y="56" fill="#10b981" fontSize="7" fontFamily="monospace">2.4kHz</text>
      </svg>

      {/* === LLUVIA DE BITS estilo Matrix sutil === */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {Array.from({ length: 12 }).map((_, i) => {
          const seed = (i * 17 + 3) % 100;
          return (
            <div
              key={`bit-${i}`}
              className="absolute font-mono text-[10px] text-cyan-400/30"
              style={{
                left: `${seed}%`,
                top: '-20%',
                animation: `bit-fall ${8 + (seed % 6)}s linear ${(seed % 4)}s infinite`,
                writingMode: 'vertical-rl',
              }}
            >
              {Array.from({ length: 12 }).map((_, j) => (
                <span key={j}>{(seed + i + j) % 2}</span>
              ))}
            </div>
          );
        })}
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
