'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Customer, Paginated } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { CustomerDetailSheet } from './customer-detail-sheet';
import { toast } from 'sonner';

const PLATFORM_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  whop: 'Whop',
  manual: 'Manual',
};

export default function ClientesPage() {
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platform, setPlatform] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, platform]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (platform !== 'all') params.set('platform', platform);
    params.set('page', String(page));
    setLoading(true);
    api
      .get<Paginated<Customer>>(`/api/v1/customers/?${params}`)
      .then(setData)
      .catch(() => toast.error('Error cargando clientes'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, platform, page]);

  const totalPages = data ? Math.ceil(data.count / 50) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.count} clientes en total` : 'Cargando...'}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono..."
            className="pl-9"
          />
        </div>
        <Select value={platform} onValueChange={(v) => setPlatform(v || 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las plataformas</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="whop">Whop</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-background dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Fecha alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {data?.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Users className="h-10 w-10" />
                    <p>No hay clientes con esos filtros</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {data?.results.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(c.id)}
              >
                <TableCell className="font-medium">{c.name || '—'}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">{c.email}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">{c.phone || '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{PLATFORM_LABELS[c.platform] || c.platform}</Badge>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {new Date(c.created_at).toLocaleDateString('es-ES')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.count > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CustomerDetailSheet
        customerId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
