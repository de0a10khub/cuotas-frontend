'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GraduationCap, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  mentoriasApi,
  type MentorshipKpi,
  type MentorshipStudent,
} from '@/lib/mentorias-api';
import { Copyable } from '@/components/data/copyable';

export default function MentoriasPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const search = sp.get('search') || '';
  const mentor = sp.get('mentor') || 'all';
  const status = sp.get('status') || 'all';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.max(10, Number(sp.get('limit')) || 50);

  const [pendingSearch, setPendingSearch] = useState(search);
  useEffect(() => setPendingSearch(search), [search]);

  const [kpis, setKpis] = useState<MentorshipKpi[]>([]);
  const [students, setStudents] = useState<MentorshipStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const pushParams = useCallback(
    (next: Record<string, string>) => {
      const q = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next)) {
        if (!v || v === 'all') q.delete(k);
        else q.set(k, v);
      }
      router.push(`/mentorias${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, c, f] = await Promise.all([
        mentoriasApi.kpis(),
        mentoriasApi.customers({ search, mentor, status, page, page_size: pageSize }),
        mentoriasApi.filterOptions(),
      ]);
      setKpis(k.results);
      setStudents(c.results);
      setTotal(c.total_count);
      setMentors(f.mentors);
      setStatuses(f.statuses);
    } catch {
      toast.error('Error cargando mentorías');
    } finally {
      setLoading(false);
    }
  }, [search, mentor, status, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search
  useEffect(() => {
    const cleaned = pendingSearch.trim();
    if (cleaned === search) return;
    const t = setTimeout(() => pushParams({ search: cleaned, page: '1' }), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch]);

  return (
    <div className="relative mx-auto max-w-[1500px] space-y-5 p-4">
      {/* Orbs ambient navy */}
      <div className="pointer-events-none fixed -left-20 top-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none fixed left-1/3 top-2/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />

      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-400/30 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            <GraduationCap className="h-5 w-5 text-cyan-300" />
          </span>
          <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
            Gestión de Mentorías
          </span>
        </h1>
        <p className="mt-1 ml-12 text-sm text-blue-300/60">
          Alumnos con productos de mentoría activos.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        {!loading && kpis.map((k) => <MentorKpiCard key={k.mentor_name} kpi={k} />)}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#0a1628] shadow-[0_0_30px_rgba(59,130,246,0.10)]">
        <div className="flex flex-row items-center justify-between gap-3 border-b border-blue-500/15 bg-gradient-to-r from-blue-950/40 via-blue-900/30 to-blue-950/40 px-5 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span className="text-cyan-300">🎓</span>
            <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Alumnos en Mentoría
            </span>
          </h2>
          <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300 ring-1 ring-cyan-400/30">
            {total} alumnos
          </span>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Buscar nombre o email..."
                className="h-8 pl-7"
              />
            </div>
            <Select value={mentor} onValueChange={(v) => pushParams({ mentor: v || 'all', page: '1' })}>
              <SelectTrigger className="h-8 w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los mentores</SelectItem>
                {mentors.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => pushParams({ status: v || 'all', page: '1' })}>
              <SelectTrigger className="h-8 w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Deuda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {!loading && students.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Sin alumnos con esos filtros.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                students.map((s) => (
                  <TableRow key={s.subscription_id}>
                    <TableCell className="font-medium">{s.customer_name}</TableCell>
                    <TableCell>
                      <Copyable value={s.customer_email} className="text-xs" />
                    </TableCell>
                    <TableCell className="text-sm">{s.product_name || '—'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <GraduationCap className="h-3 w-3 text-primary" />
                        {s.mentor_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {s.recovery_status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-sm',
                        s.unpaid_total > 0 && 'text-rose-600 font-bold',
                      )}
                    >
                      {s.unpaid_total > 0
                        ? new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(s.unpaid_total)
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function MentorKpiCard({ kpi }: { kpi: MentorshipKpi }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1f3a] to-[#1a2c52] p-4 shadow-[0_0_25px_rgba(59,130,246,0.10)] transition-all hover:border-cyan-400/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.18)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl opacity-40 transition-opacity group-hover:opacity-70" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-gradient-to-br from-cyan-400/30 to-blue-500/30 p-2 ring-1 ring-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
              <Users className="h-4 w-4 text-cyan-200" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{kpi.mentor_name}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-cyan-300/60">
                Mentor asignado
              </p>
            </div>
          </div>
          <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
            {kpi.total_students} Alumnos
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-300/80">✓ Activos</span>
            <span className="font-bold text-emerald-200">{kpi.active_percentage}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-blue-950/60">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] transition-all"
              style={{ width: `${Math.max(0, Math.min(100, kpi.active_percentage))}%` }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-blue-500/15 pt-2">
          <div className="text-xs">
            <p className="text-amber-300/70 text-[10px] uppercase tracking-wider">% Impago</p>
            <p className="font-bold text-amber-200">{kpi.unpaid_percentage}%</p>
          </div>
          <div className="text-xs">
            <p className="text-sky-300/70 text-[10px] uppercase tracking-wider">% Reactiv.</p>
            <p className="font-bold text-sky-200">0%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
