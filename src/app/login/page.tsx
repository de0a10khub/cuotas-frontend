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

          <div className="relative mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-blue-300/30">
            © 2026 · Panel de gestión
          </div>
        </div>
      </div>
    </div>
  );
}
