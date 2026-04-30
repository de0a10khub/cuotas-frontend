'use client';

import { useEffect, useState } from 'react';
import { Zap, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ByPlatform { count: number; amount: number }
interface PreviewResponse {
  total_targets: number;
  total_amount_eur: number;
  by_platform: Record<string, ByPlatform>;
}
interface JobDetail {
  email?: string | null;
  name?: string | null;
  platform: string;
  amount_eur?: number;
  success: boolean;
  error?: string;
  at: string;
}
interface JobStatus {
  id: string;
  status: 'running' | 'completed' | 'cancelled' | 'errored';
  started_at: string;
  completed_at: string | null;
  total: number;
  done: number;
  success: number;
  failure: number;
  recent: JobDetail[];
}

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function Spark({ delay = 0, x = '50%', y = '50%' }: { delay?: number; x?: string; y?: string }) {
  return (
    <div
      className="pointer-events-none absolute h-1 w-1 rounded-full bg-yellow-300 shadow-[0_0_8px_2px_rgba(253,224,71,0.9)]"
      style={{
        left: x,
        top: y,
        animation: `spark 1.6s ease-out ${delay}s infinite`,
      }}
    />
  );
}

function ElectricArc({ delay = 0, top = '20%', side = 'left' }: { delay?: number; top?: string; side?: 'left' | 'right' }) {
  return (
    <svg
      className="pointer-events-none absolute h-32 w-40 opacity-60"
      style={{
        top,
        [side]: '5%',
        animation: `arc 2.2s ease-in-out ${delay}s infinite`,
      }}
      viewBox="0 0 160 80"
      fill="none"
    >
      <path
        d="M5 40 L25 30 L40 50 L60 25 L85 55 L110 35 L130 50 L155 30"
        stroke="url(#arcGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <defs>
        <linearGradient id="arcGrad" x1="0" x2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export default function GodModePage() {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const r = await api.post<PreviewResponse>('/api/v1/admin/god-mode/preview/');
      setPreview(r);
    } catch {
      toast.error('No se pudo cargar el preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => { loadPreview(); }, []);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await api.get<JobStatus>(`/api/v1/admin/god-mode/status/${jobId}/`);
        if (cancelled) return;
        setJob(s);
        if (s.status === 'running') setTimeout(tick, 1500);
      } catch {
        if (!cancelled) setTimeout(tick, 3000);
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [jobId]);

  const onStart = async () => {
    setConfirmOpen(false);
    setConfirmText('');
    try {
      const r = await api.post<{ job_id: string; total: number; total_amount_eur: number }>(
        '/api/v1/admin/god-mode/start/',
      );
      setJobId(r.job_id);
      setJob(null);
      toast.success(`⚡ Lanzado: ${r.total} clientes · ${formatEur(r.total_amount_eur)}`);
    } catch {
      toast.error('No se pudo iniciar el job');
    }
  };

  const onCancel = async () => {
    if (!jobId) return;
    try {
      await api.post(`/api/v1/admin/god-mode/cancel/${jobId}/`);
      toast.info('Cancelación solicitada');
    } catch {
      toast.error('No se pudo cancelar');
    }
  };

  const isRunning = job?.status === 'running';
  const progress = job ? Math.round((job.done / Math.max(job.total, 1)) * 100) : 0;
  const targetsCount = preview?.total_targets ?? 0;
  const totalAmount = preview?.total_amount_eur ?? 0;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950">
      <style jsx global>{`
        @keyframes spark {
          0% { transform: translate(0,0) scale(0); opacity: 0; }
          20% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx,40px), var(--dy,-40px)) scale(0); opacity: 0; }
        }
        @keyframes arc {
          0%, 100% { opacity: 0; transform: scaleX(0.8); }
          10%, 18% { opacity: 0.85; transform: scaleX(1); }
          50%, 90% { opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes flicker {
          0%, 18%, 22%, 25%, 53%, 57%, 100% { opacity: 1; }
          20%, 24%, 55% { opacity: 0.4; }
        }
        @keyframes shake-tiny {
          0%, 100% { transform: translate(0,0); }
          25% { transform: translate(-1px, 0.5px); }
          75% { transform: translate(1px, -0.5px); }
        }
      `}</style>

      {/* grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fbbf24 1px, transparent 1px), linear-gradient(to bottom, #fbbf24 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* scanline */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-amber-400/10 to-transparent"
        style={{ animation: 'scan 6s linear infinite' }}
      />

      {/* electric arcs */}
      <ElectricArc top="10%" side="left" delay={0} />
      <ElectricArc top="22%" side="right" delay={0.7} />
      <ElectricArc top="65%" side="left" delay={1.2} />
      <ElectricArc top="80%" side="right" delay={0.3} />

      {/* sparks */}
      {[...Array(20)].map((_, i) => (
        <Spark
          key={i}
          delay={i * 0.18}
          x={`${(i * 53) % 100}%`}
          y={`${(i * 37) % 100}%`}
        />
      ))}

      {/* radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl"
      />

      {/* CONTENT */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center px-4 py-10">
        {/* TITLE */}
        <div
          className="mb-2 text-center"
          style={{ animation: 'flicker 4s infinite' }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-amber-400/70">
            ⚡ Sistema de cobro masivo ⚡
          </p>
        </div>
        <h1
          className="bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-center text-7xl font-black tracking-tight text-transparent sm:text-8xl"
          style={{
            textShadow: '0 0 40px rgba(251,191,36,0.5)',
            animation: 'shake-tiny 0.15s infinite',
          }}
        >
          MODO DIOS
        </h1>
        <p className="mt-3 max-w-xl text-center text-sm text-amber-100/60">
          Cobra de un solo zarpazo la cuota más vieja pendiente de cada cliente con deuda activa.
          Si una cuota falla, el sistema NO insiste con la siguiente del mismo cliente.
        </p>

        {/* STATS */}
        <div className="mt-8 grid w-full max-w-3xl grid-cols-3 gap-3">
          <div className="rounded-lg border border-amber-500/30 bg-slate-900/60 p-4 text-center backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400/70">Clientes</p>
            <p className="text-3xl font-black text-amber-100">
              {loadingPreview ? '…' : targetsCount}
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-slate-900/60 p-4 text-center backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400/70">A cobrar</p>
            <p className="text-3xl font-black text-amber-100">
              {loadingPreview ? '…' : formatEur(totalAmount)}
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-slate-900/60 p-4 text-center backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400/70">Plataformas</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
              {preview &&
                Object.entries(preview.by_platform).map(([p, info]) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="border-amber-500/40 bg-slate-950/60 text-[10px] text-amber-100"
                  >
                    {p}:{info.count}
                  </Badge>
                ))}
              {(!preview || Object.keys(preview.by_platform).length === 0) && (
                <span className="text-xs text-amber-100/40">—</span>
              )}
            </div>
          </div>
        </div>

        {/* THE BUTTON */}
        <div className="relative mt-10">
          {/* pulse rings */}
          {!isRunning && (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-400/50"
                style={{ animation: 'pulse-ring 2s ease-out infinite' }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-400/40"
                style={{ animation: 'pulse-ring 2s ease-out 1s infinite' }}
              />
            </>
          )}

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={targetsCount === 0 || isRunning || loadingPreview}
            className="group relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 font-black uppercase tracking-wider text-slate-950 shadow-[0_0_60px_15px_rgba(251,191,36,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_80px_25px_rgba(251,191,36,0.7)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <Zap className="absolute h-32 w-32 opacity-20 transition-transform group-hover:rotate-12" />
            <span className="relative z-10 text-center text-base leading-tight">
              ¡LANZAR<br />ZAPAZO!
            </span>
          </button>
        </div>

        {/* warning */}
        <div className="mt-8 flex max-w-md items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/70">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Cobros REALES sobre Stripe + Whop. Cada intento queda registrado por cliente. Pulsa con
            cabeza.
          </span>
        </div>

        {/* JOB PROGRESS */}
        {job && (
          <div className="mt-10 w-full max-w-3xl rounded-lg border border-amber-500/30 bg-slate-900/80 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {isRunning && <Loader2 className="h-5 w-5 animate-spin text-amber-400" />}
                {job.status === 'completed' && <Check className="h-5 w-5 text-emerald-400" />}
                {job.status === 'cancelled' && <X className="h-5 w-5 text-amber-400" />}
                {job.status === 'errored' && <AlertTriangle className="h-5 w-5 text-rose-400" />}
                <span className="font-mono uppercase tracking-wider text-amber-100">
                  Job · {job.status}
                </span>
              </div>
              {isRunning && (
                <button
                  onClick={onCancel}
                  className="group flex items-center gap-2 rounded-lg border-2 border-rose-500 bg-gradient-to-br from-rose-600 to-rose-800 px-5 py-2.5 font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(244,63,94,0.8)] active:scale-95"
                >
                  <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
                  PARAR JOB
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-amber-500/20 bg-slate-950/60 p-3">
                <p className="text-[10px] uppercase text-amber-400/60">Procesados</p>
                <p className="text-2xl font-bold text-amber-100">
                  {job.done} / {job.total}
                </p>
              </div>
              <div className="rounded border border-emerald-500/20 bg-slate-950/60 p-3">
                <p className="text-[10px] uppercase text-emerald-400/60">Éxitos</p>
                <p className="text-2xl font-bold text-emerald-300">{job.success}</p>
              </div>
              <div className="rounded border border-rose-500/20 bg-slate-950/60 p-3">
                <p className="text-[10px] uppercase text-rose-400/60">Fallos</p>
                <p className="text-2xl font-bold text-rose-300">{job.failure}</p>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-amber-400/70">
                Últimos resultados
              </p>
              <div className="max-h-72 overflow-auto rounded border border-amber-500/10 bg-slate-950/60">
                <table className="w-full text-xs text-amber-100/90">
                  <thead className="sticky top-0 bg-slate-900/95 text-[10px] uppercase tracking-wider text-amber-400/70">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Hora</th>
                      <th className="px-2 py-1.5 text-left">Cliente</th>
                      <th className="px-2 py-1.5 text-left">Plat.</th>
                      <th className="px-2 py-1.5 text-right">€</th>
                      <th className="px-2 py-1.5 text-left">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(job.recent || [])].reverse().map((d, i) => (
                      <tr key={i} className="border-t border-amber-500/10">
                        <td className="px-2 py-1 font-mono text-[10px] text-amber-100/50">
                          {new Date(d.at).toLocaleTimeString('es-ES')}
                        </td>
                        <td className="px-2 py-1">{d.email || '—'}</td>
                        <td className="px-2 py-1">
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-slate-900/80 text-[10px] text-amber-100"
                          >
                            {d.platform}
                          </Badge>
                        </td>
                        <td className="px-2 py-1 text-right">
                          {d.amount_eur ? formatEur(d.amount_eur) : '—'}
                        </td>
                        <td className="px-2 py-1">
                          {d.success ? (
                            <span className="text-emerald-300">✓ OK</span>
                          ) : (
                            <span className="text-rose-300" title={d.error}>
                              ✗ {(d.error || '').slice(0, 70)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING STOP BUTTON — siempre visible mientras corre el job */}
      {isRunning && (
        <button
          onClick={onCancel}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border-2 border-rose-400 bg-gradient-to-br from-rose-600 to-rose-800 px-6 py-4 text-base font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(244,63,94,0.7)] transition-all hover:scale-110 hover:shadow-[0_0_45px_rgba(244,63,94,1)] active:scale-95"
          style={{ animation: 'shake-tiny 0.4s infinite' }}
        >
          <X className="h-6 w-6" />
          PARAR JOB
        </button>
      )}

      {/* CONFIRM DIALOG */}
      <Dialog open={confirmOpen} onOpenChange={(v) => !v && setConfirmOpen(false)}>
        <DialogContent className="border-amber-500/40 bg-slate-950 text-amber-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-amber-300">
              <Zap className="h-6 w-6" />
              ¿Lanzar el zarpazo?
            </DialogTitle>
            <DialogDescription className="space-y-2 text-amber-100/80">
              <span className="block">
                Vas a intentar cobrar a{' '}
                <strong className="text-amber-300">{targetsCount} clientes</strong> por un total de{' '}
                <strong className="text-amber-300">{formatEur(totalAmount)}</strong>.
              </span>
              <span className="block">
                Los cobros son <strong>REALES</strong>. Cada intento queda registrado en el panel
                Reintentos del cliente. No hay vuelta atrás.
              </span>
              <span className="block">
                Para confirmar, escribe{' '}
                <code className="rounded bg-slate-800 px-1 text-amber-300">DIOS</code> abajo:
              </span>
            </DialogDescription>
          </DialogHeader>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded border border-amber-500/40 bg-slate-900 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-100/30 focus:border-amber-400 focus:outline-none"
            placeholder="DIOS"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={onStart}
              disabled={confirmText.trim().toUpperCase() !== 'DIOS'}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-slate-950 hover:from-amber-400 hover:to-yellow-400"
            >
              <Zap className="h-4 w-4" />
              ¡LANZAR!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
