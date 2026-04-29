'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { PeekingMonkey } from '@/components/login/peeking-monkey';

/** Calcula la posicion (x,y en pantalla) del caret dentro del input. */
function getCaretPosition(input: HTMLInputElement | null): { x: number; y: number } | null {
  if (!input) return null;
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);
  const span = document.createElement('span');
  span.style.position = 'absolute';
  span.style.visibility = 'hidden';
  span.style.whiteSpace = 'pre';
  span.style.font = style.font;
  span.style.letterSpacing = style.letterSpacing;
  span.textContent = input.value || '';
  document.body.appendChild(span);
  const textWidth = span.getBoundingClientRect().width;
  document.body.removeChild(span);
  const paddingLeft = parseFloat(style.paddingLeft) || 12;
  const maxX = rect.right - 8;
  return {
    x: Math.min(rect.left + paddingLeft + textWidth, maxX),
    y: rect.top + rect.height / 2,
  };
}

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [caret, setCaret] = useState<{ x: number; y: number } | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Cursor seguidor
  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Caret tracking en el input de username
  useEffect(() => {
    if (!usernameFocused) {
      setCaret(null);
      return;
    }
    setCaret(getCaretPosition(usernameRef.current));
  }, [username, usernameFocused]);

  // Re-calcular caret en resize/scroll para que el mono no mire mal
  useEffect(() => {
    if (!usernameFocused) return;
    const recalc = () => setCaret(getCaretPosition(usernameRef.current));
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [usernameFocused]);

  const monkeyHides = passwordFocused && (showPassword || password.length > 0);
  const lookTarget = usernameFocused ? caret : null; // null -> mono usa mouse

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      {/* Estilos animaciones espaciales */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -12px); }
        }
        @keyframes orbit-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        /* Cometas: 4 angulos distintos */
        @keyframes comet-tl {
          0% { transform: translate(-200px, -200px) rotate(40deg); opacity: 0; }
          3% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(110vw, 110vh) rotate(40deg); opacity: 0; }
        }
        @keyframes comet-tr {
          0% { transform: translate(110vw, -200px) rotate(140deg); opacity: 0; }
          3% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(-200px, 110vh) rotate(140deg); opacity: 0; }
        }
        @keyframes comet-r {
          0% { transform: translate(110vw, 30vh) rotate(190deg); opacity: 0; }
          3% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(-200px, 50vh) rotate(190deg); opacity: 0; }
        }
        @keyframes comet-bl {
          0% { transform: translate(-200px, 110vh) rotate(-40deg); opacity: 0; }
          3% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(110vw, -200px) rotate(-40deg); opacity: 0; }
        }
        /* Fireballs: bolas de fuego flotantes con pulso */
        @keyframes fireball-drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(40px, -25px) rotate(90deg); }
          50% { transform: translate(60px, 10px) rotate(180deg); }
          75% { transform: translate(20px, 30px) rotate(270deg); }
        }
        @keyframes fire-flicker {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes nebula-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Fondo MUY oscuro con nebulosa sutil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, #0a0420 0%, #050310 30%, #000000 70%), ' +
            'radial-gradient(ellipse at 70% 80%, #050a1a 0%, transparent 50%)',
        }}
      />

      {/* Nebulosa de fondo difusa */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background:
            'radial-gradient(ellipse 50% 30% at 80% 20%, rgba(168,85,247,0.18) 0%, transparent 60%),' +
            'radial-gradient(ellipse 40% 30% at 20% 80%, rgba(59,130,246,0.18) 0%, transparent 60%),' +
            'radial-gradient(ellipse 30% 20% at 50% 50%, rgba(34,211,238,0.10) 0%, transparent 70%)',
          animation: 'nebula-pulse 8s ease-in-out infinite',
        }}
      />

      {/* === ESTRELLAS TITILANTES (más densas) === */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 120 }).map((_, i) => {
          const seed = (i * 9973 + 7) % 10000;
          const x = (seed % 100);
          const y = ((seed * 13) % 10000) / 100;
          const size = 0.6 + ((seed * 7) % 30) / 14;
          const delay = ((seed * 3) % 50) / 10;
          const duration = 2 + ((seed * 5) % 40) / 10;
          const isBright = (seed * 11) % 8 === 0;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.5,
                animation: `twinkle ${duration}s ease-in-out ${delay}s infinite`,
                boxShadow: isBright
                  ? '0 0 6px rgba(255,255,255,0.9), 0 0 12px rgba(34,211,238,0.4)'
                  : size > 1.5 ? '0 0 3px rgba(255,255,255,0.5)' : undefined,
              }}
            />
          );
        })}
      </div>

      {/* === PLANETA 1 (Saturno-style) esquina superior derecha === */}
      <div
        className="pointer-events-none absolute right-[6%] top-[8%]"
        style={{ animation: 'drift 14s ease-in-out infinite' }}
      >
        <div className="relative h-36 w-36">
          {/* Glow externa */}
          <div className="absolute -inset-8 rounded-full bg-violet-600/15 blur-3xl" />
          {/* Anillo trasero */}
          <div
            className="absolute left-1/2 top-1/2 h-[110%] w-[200%] -translate-x-1/2 -translate-y-1/2"
            style={{
              animation: 'orbit-ring 60s linear infinite',
              transform: 'translate(-50%, -50%) rotateX(70deg) rotateZ(-15deg)',
            }}
          >
            <div className="absolute inset-0 rounded-full border-[3px] border-violet-300/40" />
            <div className="absolute inset-[5%] rounded-full border-[2px] border-cyan-200/25" />
          </div>
          {/* Esfera del planeta con bandas tipo Júpiter */}
          <div
            className="relative h-full w-full rounded-full"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #f5d0fe 0%, #d8b4fe 15%, #a855f7 35%, #7e22ce 60%, #4c1d95 85%, #1e1b4b 100%),' +
                'repeating-linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 8%, transparent 16%)',
              backgroundBlendMode: 'multiply',
              boxShadow:
                'inset -15px -10px 30px rgba(0,0,0,0.65), inset 8px 5px 20px rgba(255,255,255,0.15), 0 0 50px rgba(168,85,247,0.35)',
            }}
          />
          {/* Anillo frontal (más cerca) */}
          <div
            className="absolute left-1/2 top-1/2 h-[80%] w-[180%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              animation: 'orbit-ring 60s linear infinite',
              transform: 'translate(-50%, -50%) rotateX(70deg) rotateZ(-15deg)',
            }}
          >
            <div className="absolute inset-0 rounded-full border-t-[3px] border-violet-300/60" />
          </div>
        </div>
      </div>

      {/* === PLANETA 2 (mini-Tierra/azul) abajo izquierda === */}
      <div
        className="pointer-events-none absolute left-[5%] bottom-[15%]"
        style={{ animation: 'drift 18s ease-in-out infinite reverse' }}
      >
        <div className="relative h-20 w-20">
          <div className="absolute -inset-4 rounded-full bg-cyan-500/20 blur-2xl" />
          <div
            className="relative h-full w-full rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, #93c5fd 0%, #3b82f6 25%, #1e40af 55%, #0c4a6e 80%, #082f49 100%)',
              boxShadow:
                'inset -8px -6px 18px rgba(0,0,0,0.6), inset 4px 3px 10px rgba(255,255,255,0.2), 0 0 30px rgba(59,130,246,0.4)',
            }}
          />
          {/* Continentes / nubes overlay */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full opacity-40 mix-blend-overlay"
            style={{
              background:
                'radial-gradient(ellipse 40% 20% at 35% 40%, white 0%, transparent 60%), ' +
                'radial-gradient(ellipse 30% 15% at 65% 65%, white 0%, transparent 60%)',
            }}
          />
        </div>
      </div>

      {/* === FIREBALLS (3 bolas de fuego flotando) === */}
      {[
        { left: '12%', top: '60%', size: 28, dur: 16, delay: 0, color: 'orange' },
        { left: '85%', top: '55%', size: 20, dur: 19, delay: 4, color: 'red' },
        { left: '40%', top: '85%', size: 16, dur: 22, delay: 8, color: 'orange' },
      ].map((fb, idx) => (
        <div
          key={idx}
          className="pointer-events-none absolute"
          style={{
            left: fb.left,
            top: fb.top,
            animation: `fireball-drift ${fb.dur}s ease-in-out ${fb.delay}s infinite`,
          }}
        >
          <div
            className="relative"
            style={{ width: fb.size, height: fb.size }}
          >
            {/* Estela de fuego */}
            <div
              className="absolute -left-[160%] top-1/2 -translate-y-1/2 h-[60%] w-[180%] rounded-full"
              style={{
                background:
                  fb.color === 'orange'
                    ? 'linear-gradient(90deg, transparent 0%, rgba(251,146,60,0.05) 20%, rgba(249,115,22,0.45) 60%, rgba(251,191,36,0.85) 100%)'
                    : 'linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.05) 20%, rgba(239,68,68,0.45) 60%, rgba(251,146,60,0.85) 100%)',
                filter: 'blur(2px)',
              }}
            />
            {/* Halo */}
            <div
              className="absolute inset-[-50%] rounded-full"
              style={{
                background:
                  fb.color === 'orange'
                    ? 'radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(249,115,22,0.20) 40%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(251,146,60,0.45) 0%, rgba(220,38,38,0.20) 40%, transparent 70%)',
                filter: 'blur(4px)',
                animation: `fire-flicker ${1 + idx * 0.3}s ease-in-out infinite`,
              }}
            />
            {/* Núcleo brillante */}
            <div
              className="relative h-full w-full rounded-full"
              style={{
                background:
                  fb.color === 'orange'
                    ? 'radial-gradient(circle at 35% 35%, #fff 0%, #fef08a 15%, #fbbf24 35%, #f97316 65%, #b91c1c 100%)'
                    : 'radial-gradient(circle at 35% 35%, #fff 0%, #fed7aa 12%, #fb923c 30%, #dc2626 65%, #7f1d1d 100%)',
                boxShadow:
                  fb.color === 'orange'
                    ? '0 0 14px rgba(251,191,36,0.9), 0 0 28px rgba(249,115,22,0.7), 0 0 50px rgba(220,38,38,0.4)'
                    : '0 0 14px rgba(251,146,60,0.9), 0 0 28px rgba(220,38,38,0.7), 0 0 50px rgba(127,29,29,0.5)',
                animation: `fire-flicker ${0.8 + idx * 0.4}s ease-in-out infinite`,
              }}
            />
          </div>
        </div>
      ))}

      {/* === COMETAS desde 4 lados distintos === */}
      {[
        { keyframe: 'comet-tl', delay: 0 },
        { keyframe: 'comet-tr', delay: 5 },
        { keyframe: 'comet-r', delay: 10 },
        { keyframe: 'comet-bl', delay: 15 },
      ].map((c, i) => (
        <div
          key={i}
          className="pointer-events-none absolute left-0 top-0"
          style={{ animation: `${c.keyframe} 18s linear ${c.delay}s infinite` }}
        >
          <div
            className="h-[2px] w-40"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.4) 50%, white 100%)',
              borderRadius: '999px',
              boxShadow: '0 0 16px rgba(34,211,238,0.7), 0 0 32px rgba(34,211,238,0.4)',
            }}
          />
        </div>
      ))}

      {/* Orbs ambient sutiles */}
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/6 blur-[120px]" />

      {/* LUZ que sigue al cursor */}
      {cursor && (
        <div
          className="pointer-events-none fixed h-[400px] w-[400px] rounded-full blur-[80px] transition-transform duration-100 ease-out"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${cursor.x - 200}px, ${cursor.y - 200}px)`,
            background:
              'radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(59,130,246,0.10) 40%, rgba(0,0,0,0) 70%)',
          }}
        />
      )}

      {/* Contenido */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-2">
        {/* Mono peek-a-boo */}
        <PeekingMonkey
          hideEyes={monkeyHides}
          lookTarget={lookTarget}
          size={200}
          className="drop-shadow-[0_0_30px_rgba(34,211,238,0.25)]"
        />

        {/* Card */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#0a1628]/95 via-[#0d1f3a]/95 to-[#0a1628]/95 p-8 shadow-[0_0_60px_rgba(34,211,238,0.15)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative space-y-1 text-center">
            <h1 className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Cuotas
            </h1>
            <p className="text-sm text-blue-200/60">Accede al panel de gestión</p>
          </div>

          <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-blue-200">
                Usuario o email
              </Label>
              <Input
                id="username"
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                required
                autoFocus
                autoComplete="username"
                className="border-blue-500/30 bg-blue-950/40 text-cyan-50 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-blue-200">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  autoComplete="current-password"
                  className="pr-10 border-blue-500/30 bg-blue-950/40 font-mono text-cyan-50 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center text-blue-300/60 transition-colors hover:text-cyan-200"
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
              className="w-full border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all hover:from-blue-500 hover:to-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
