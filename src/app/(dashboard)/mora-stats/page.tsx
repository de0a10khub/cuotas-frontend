import { BarChart3, ShieldCheck } from 'lucide-react';
import { MoraCharts } from '@/components/mora/mora-charts';

export default function MoraStatsPage() {
  return (
    <div className="relative mx-auto max-w-[1400px] space-y-5 p-4">
      {/* Orbs ambient */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />

      <header className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-4 shadow-[0_0_30px_rgba(59,130,246,0.10)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            <BarChart3 className="h-6 w-6 text-cyan-200" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Dashboard Estadístico de Mora
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-blue-300/60">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Vista segura para análisis externo y toma de decisiones
            </p>
          </div>
        </div>
      </header>

      <MoraCharts />

      <footer className="border-t border-blue-500/10 py-6 text-center text-[11px] uppercase tracking-[0.2em] text-blue-300/30">
        © 2026 Dashboard de Conciliación · Datos Agregados y Protegidos
      </footer>
    </div>
  );
}
