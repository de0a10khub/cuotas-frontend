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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050b1a] p-4">
      {/* Estilos animaciones espaciales */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes drift {
          0% { transform: translate(0, 0); }
          50% { transform: translate(20px, -15px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes comet {
          0% { transform: translate(-100px, -100px) rotate(35deg); opacity: 0; }
          5% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(120vw, 120vh) rotate(35deg); opacity: 0; }
        }
        @keyframes asteroid-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Fondo navy gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#050b1a] via-[#0a1628] to-[#050b1a]" />

      {/* Grid pattern sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* === ESTRELLAS TITILANTES === */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => {
          const seed = (i * 9973 + 7) % 10000;
          const x = (seed % 100);
          const y = ((seed * 13) % 10000) / 100;
          const size = 1 + ((seed * 7) % 30) / 10;
          const delay = ((seed * 3) % 50) / 10;
          const duration = 2 + ((seed * 5) % 40) / 10;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.6,
                animation: `twinkle ${duration}s ease-in-out ${delay}s infinite`,
                boxShadow: size > 2 ? '0 0 4px rgba(255,255,255,0.5)' : undefined,
              }}
            />
          );
        })}
      </div>

      {/* === PLANETA CON ANILLO esquina superior derecha === */}
      <div
        className="pointer-events-none absolute right-[8%] top-[12%] h-32 w-32"
        style={{ animation: 'drift 12s ease-in-out infinite' }}
      >
        {/* Glow alrededor del planeta */}
        <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl" />
        {/* Anillo (rotando) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: 'orbit 30s linear infinite' }}
        >
          <div
            className="h-44 w-44 rounded-full border-2 border-cyan-300/30"
            style={{ transform: 'rotateX(75deg)' }}
          />
        </div>
        {/* Esfera del planeta */}
        <div
          className="relative h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #d8b4fe 0%, #a855f7 35%, #6b21a8 70%, #1e1b4b 100%)',
            boxShadow: 'inset -8px -8px 20px rgba(0,0,0,0.5), 0 0 30px rgba(168,85,247,0.4)',
          }}
        />
      </div>

      {/* === ASTEROIDE pequeño girando arriba izq === */}
      <div className="pointer-events-none absolute left-[10%] top-[25%]">
        <div
          className="h-6 w-8 rounded-[40%]"
          style={{
            background: 'linear-gradient(135deg, #6b7280, #374151)',
            boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.5)',
            animation: 'asteroid-spin 18s linear infinite',
          }}
        />
      </div>

      {/* === ASTEROIDE pequeño abajo derecha === */}
      <div className="pointer-events-none absolute right-[15%] bottom-[20%]">
        <div
          className="h-4 w-5 rounded-[40%]"
          style={{
            background: 'linear-gradient(135deg, #94a3b8, #475569)',
            boxShadow: 'inset -1px -1px 3px rgba(0,0,0,0.5)',
            animation: 'asteroid-spin 22s linear infinite reverse',
          }}
        />
      </div>

      {/* === COMETA cruzando ocasionalmente === */}
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ animation: 'comet 14s linear infinite' }}
      >
        <div
          className="h-1 w-32"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.6) 60%, white 100%)',
            borderRadius: '999px',
            boxShadow: '0 0 12px rgba(34,211,238,0.6), 0 0 24px rgba(34,211,238,0.3)',
          }}
        />
      </div>

      {/* Orbs ambient */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/12 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/8 blur-[140px]" />

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
                placeholder="laura@empresa.com"
                required
                autoFocus
                autoComplete="username"
                className="border-blue-500/30 bg-blue-950/40 text-cyan-50 placeholder:text-blue-300/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
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
                  placeholder="••••••••••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-10 border-blue-500/30 bg-blue-950/40 font-mono text-cyan-50 placeholder:text-blue-300/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
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
