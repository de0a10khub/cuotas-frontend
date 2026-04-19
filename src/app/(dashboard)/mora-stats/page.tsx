import { BarChart3, ShieldCheck } from 'lucide-react';
import { MoraCharts } from '@/components/mora/mora-charts';

export default function MoraStatsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <header className="flex items-center gap-3 rounded-lg border bg-muted/10 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold italic tracking-tight">
            Dashboard Estadístico de Mora
          </h1>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Vista segura para análisis externo y toma de decisiones.
          </p>
        </div>
      </header>

      <MoraCharts />

      <footer className="border-t py-8 text-center text-xs text-muted-foreground opacity-50">
        <p>© 2026 Dashboard de Conciliación - Datos Agregados y Protegidos</p>
      </footer>
    </div>
  );
}
