'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setCursor({ x: e.clientX, y: e.clientY });
      // Parallax sutil: el fondo se mueve unos pocos px segun cursor
      const w = window.innerWidth;
      const h = window.innerHeight;
      const px = (e.clientX / w - 0.5) * -20;
      const py = (e.clientY / h - 0.5) * -20;
      setParallax({ x: px, y: py });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      <style jsx global>{`
        @keyframes saturn-drift {
          0%, 100% { transform: translate(0, 0) rotate(-8deg); }
          50% { transform: translate(15px, -10px) rotate(-6deg); }
        }
        @keyframes comet-cross {
          0% { transform: translate(-200px, 30vh) rotate(20deg); opacity: 0; }
          5% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(115vw, -30vh) rotate(20deg); opacity: 0; }
        }
        @keyframes comet-cross-2 {
          0% { transform: translate(115vw, 70vh) rotate(200deg); opacity: 0; }
          5% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(-200px, 30vh) rotate(200deg); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* === BACKGROUND: foto real NASA del astronauta McCandless EVA === */}
      <div
        className="pointer-events-none absolute inset-0 transition-transform duration-[600ms] ease-out"
        style={{
          backgroundImage: 'url(/space/astronaut.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(1.08) translate(${parallax.x}px, ${parallax.y}px)`,
        }}
      />

      {/* Overlay oscuro encima del bg para legibilidad del form */}
      <div className="pointer-events-none absolute inset-0 bg-black/55" />
      {/* Vignette (oscurece bordes) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* === SATURN flotando esquina superior derecha === */}
      <div
        className="pointer-events-none absolute right-[3%] top-[6%] hidden md:block"
        style={{ animation: 'saturn-drift 14s ease-in-out infinite' }}
      >
        <div className="relative">
          {/* Glow detrás de Saturn */}
          <div
            className="absolute inset-0 -m-12 rounded-full bg-amber-400/15 blur-3xl"
            style={{ animation: 'glow-pulse 4s ease-in-out infinite' }}
          />
          {/* Imagen real de Saturn */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/space/saturn.jpg"
            alt=""
            className="relative w-[340px] mix-blend-screen"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.35)) brightness(1.1)',
            }}
          />
        </div>
      </div>

      {/* === COMETAS sutiles (2 en distinta direccion) === */}
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ animation: 'comet-cross 16s linear infinite' }}
      >
        <div
          className="h-[1.5px] w-32"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, white 100%)',
            borderRadius: '999px',
            boxShadow: '0 0 12px rgba(255,255,255,0.6), 0 0 24px rgba(34,211,238,0.4)',
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ animation: 'comet-cross-2 22s linear 6s infinite' }}
      >
        <div
          className="h-[1.5px] w-24"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, white 100%)',
            borderRadius: '999px',
            boxShadow: '0 0 8px rgba(255,255,255,0.5), 0 0 16px rgba(168,85,247,0.4)',
          }}
        />
      </div>

      {/* LUZ que sigue al cursor (sutil) */}
      {cursor && (
        <div
          className="pointer-events-none fixed h-[450px] w-[450px] rounded-full blur-[100px] transition-transform duration-150 ease-out"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${cursor.x - 225}px, ${cursor.y - 225}px)`,
            background:
              'radial-gradient(circle, rgba(34,211,238,0.10) 0%, rgba(59,130,246,0.06) 40%, rgba(0,0,0,0) 70%)',
          }}
        />
      )}

      {/* === LOGIN CARD === */}
      <div className="relative z-10 w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/55 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(34,211,238,0.10)] backdrop-blur-xl">
          {/* Glow accent en el card */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-blue-600/15 blur-3xl" />

          <div className="relative space-y-1 text-center">
            <h1 className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent drop-shadow-[0_2px_10px_rgba(34,211,238,0.5)]">
              Cuotas
            </h1>
            <p className="text-sm text-white/60">Accede al panel de gestión</p>
          </div>

          <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/80">
                Usuario o email
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
                className="border-white/15 bg-black/40 text-cyan-50 backdrop-blur focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10 border-white/15 bg-black/40 font-mono text-cyan-50 backdrop-blur focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center text-white/50 transition-colors hover:text-cyan-200"
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
              className="w-full border-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_25px_rgba(34,211,238,0.45)] transition-all hover:from-blue-500 hover:to-cyan-400 hover:shadow-[0_0_35px_rgba(34,211,238,0.6)] disabled:opacity-50"
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
