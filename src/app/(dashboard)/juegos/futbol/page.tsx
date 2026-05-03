'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FutbolCanvas } from '@/components/games/futbol-canvas';
import { gamesApi, type FutbolMyStats, type FutbolLeaderEntry } from '@/lib/games-api';
import { Trophy, Target, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Period = 'today' | 'week' | 'month' | 'all';

export default function FutbolPage() {
  const [stats, setStats] = useState<FutbolMyStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<FutbolLeaderEntry[]>([]);
  const [period, setPeriod] = useState<Period>('today');
  const [loading, setLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    try {
      const r = await gamesApi.futbolMe();
      setStats(r);
    } catch {
      // silent
    }
  }, []);

  const refreshLeaderboard = useCallback(async (p: Period) => {
    try {
      const r = await gamesApi.futbolLeaderboard(p);
      setLeaderboard(r.results);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshStats(), refreshLeaderboard(period)]).finally(() => setLoading(false));
  }, [refreshStats, refreshLeaderboard, period]);

  const handleShot = async (result: { is_goal: boolean }) => {
    try {
      const r = await gamesApi.futbolShot({ is_goal: result.is_goal });
      setStats(r);
      // refrescar leaderboard si cambió el periodo actual
      refreshLeaderboard(period);
      if (result.is_goal) {
        toast.success('¡GOL!', { description: `Llevas ${r.goals_today}/${r.shots_today} hoy` });
      } else {
        toast('Parada', { description: `${r.remaining_today} chutes restantes hoy` });
      }
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } } | null)?.response?.data?.detail ??
        (e as { data?: { detail?: string } } | null)?.data?.detail ??
        'No se pudo registrar el chute';
      toast.error('Limite alcanzado', { description: detail });
      // Refrescar para asegurar UI sincronizada
      refreshStats();
    }
  };

  const remaining = stats?.remaining_today ?? 10;
  const disabled = remaining <= 0;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-1">
      {/* Header */}
      <header className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/80 via-[#0a1f12] to-emerald-900/40 p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40">
            <Trophy className="h-7 w-7 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-50">⚽ Penalty Shootout</h1>
            <p className="text-sm text-emerald-200/70">
              Arrastra la pelota para chutar. 10 chutes al día. Mejor portero, peor para ti.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Canvas + stats */}
        <Card className="border-emerald-500/20 bg-[#0a1628]">
          <CardContent className="p-5 space-y-4">
            {/* Stats personales */}
            {loading || !stats ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <StatBox icon={<Target className="h-4 w-4 text-emerald-300" />} label="Goles hoy" value={`${stats.goals_today}/${stats.shots_today}`} tone="emerald" />
                <StatBox icon={<Zap className="h-4 w-4 text-amber-300" />} label="Restantes" value={`${stats.remaining_today}/10`} tone="amber" />
                <StatBox icon={<Trophy className="h-4 w-4 text-cyan-300" />} label="Total goles" value={`${stats.goals_alltime}`} tone="cyan" />
              </div>
            )}

            <FutbolCanvas disabled={disabled} onShot={handleShot} />

            {disabled && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
                ⏰ Has agotado tus 10 chutes de hoy. Vuelve mañana — el reset es a medianoche (Madrid).
              </div>
            )}
            <p className="text-xs text-emerald-200/50 text-center">
              Tip: arrastra desde la pelota hacia abajo y suéltala para chutar. Cuanto más fuerte el flick, más probabilidad de gol.
            </p>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="border-emerald-500/20 bg-[#0a1628]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-100">Ranking</h2>
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-1 text-xs">
              {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-md py-1 font-medium transition-colors',
                    period === p ? 'bg-emerald-500 text-white' : 'text-emerald-200/70 hover:text-white',
                  )}
                >
                  {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Todo'}
                </button>
              ))}
            </div>

            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : leaderboard.length === 0 ? (
              <p className="py-8 text-center text-sm text-emerald-200/50">Aún nadie ha chutado este periodo. Sé el primero 🥇</p>
            ) : (
              <ul className="space-y-1.5">
                {leaderboard.map((e) => {
                  const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : null;
                  return (
                    <li
                      key={e.user_email}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                        e.rank === 1
                          ? 'border-yellow-400/40 bg-yellow-500/10'
                          : e.rank <= 3
                          ? 'border-emerald-400/30 bg-emerald-500/5'
                          : 'border-blue-400/10 bg-blue-500/5',
                      )}
                    >
                      <span className="w-8 text-center text-sm font-bold text-emerald-100 tabular-nums">
                        {medal ?? `#${e.rank}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {e.user_display_name || e.user_email}
                        </p>
                        <p className="truncate text-[10px] text-emerald-200/50">
                          {e.shots} chutes · {e.accuracy.toFixed(0)}% acierto
                        </p>
                      </div>
                      <Badge variant="outline" className="border-emerald-400/40 text-emerald-200">
                        {e.goals} ⚽
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'emerald' | 'amber' | 'cyan';
}) {
  const tones = {
    emerald: 'border-emerald-400/30 bg-emerald-500/10',
    amber: 'border-amber-400/30 bg-amber-500/10',
    cyan: 'border-cyan-400/30 bg-cyan-500/10',
  }[tone];
  return (
    <div className={cn('rounded-xl border p-3', tones)}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
        {icon} {label}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}
