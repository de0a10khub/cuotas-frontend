'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header>
        <h1 className="text-2xl font-bold italic tracking-tight">Gestión de Mentorías</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alumnos con productos de mentoría activos.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        {!loading && kpis.map((k) => <MentorKpiCard key={k.mentor_name} kpi={k} />)}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">🎓 Alumnos en Mentoría</CardTitle>
          <span className="text-xs text-muted-foreground">{total} alumnos</span>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>
    </div>
  );
}

function MentorKpiCard({ kpi }: { kpi: MentorshipKpi }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold">{kpi.mentor_name}</p>
              <p className="text-xs text-muted-foreground">Mentor asignado</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {kpi.total_students} Alumnos
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-600">✓ Activos</span>
            <span className="font-bold">{kpi.active_percentage}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, kpi.active_percentage))}%` }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="text-xs">
            <p className="text-amber-600">% Impago</p>
            <p className="font-bold text-amber-600">{kpi.unpaid_percentage}%</p>
          </div>
          <div className="text-xs">
            <p className="text-sky-600">% Reactiv.</p>
            <p className="font-bold text-sky-600">0%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
