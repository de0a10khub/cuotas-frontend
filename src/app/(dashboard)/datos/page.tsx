'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, Database, Download, RefreshCw, TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import { datosApi } from '@/lib/datos-api';
import type { DatosEntity } from '@/lib/datos-types';
import { getAccessToken } from '@/lib/api';
import { DynamicTable } from '@/components/datos/dynamic-table';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const LIMIT_OPTIONS = [
  { value: 1000, label: '1k' },
  { value: 2000, label: '2k' },
  { value: 3000, label: '3k' },
  { value: 5000, label: '5k' },
  { value: 10000, label: '10k' },
  { value: -1, label: 'Todo' },
];

export default function DatosPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [entities, setEntities] = useState<DatosEntity[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [dateColumn, setDateColumn] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'table' | 'charts'>('table');
  const [limit, setLimit] = useState(1000);

  const entity = sp.get('entity') || 'purchases';
  const from = sp.get('from') || undefined;
  const to = sp.get('to') || undefined;

  const pushParams = (next: Partial<Record<string, string>>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'purchases') q.delete(k);
      else q.set(k, v);
    }
    router.push(`/datos${q.toString() ? `?${q}` : ''}`);
  };

  useEffect(() => {
    datosApi
      .entities()
      .then((d) => setEntities(d.results))
      .catch(() => toast.error('Error cargando entidades'));
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const r = await datosApi.listEntity(entity, { from, to, limit });
        setRows(r.results);
        setTotal(r.total_count);
        setDateColumn(r.date_column);
      } catch {
        toast.error('Error cargando datos');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [entity, from, to, limit],
  );

  useEffect(() => {
    load();
  }, [load]);

  const downloadCsv = async () => {
    try {
      const path = datosApi.exportEntityUrl(entity, { from, to, limit });
      const token = getAccessToken();
      const res = await fetch(`${API_URL}${path}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('export_failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${entity}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV generado');
    } catch {
      toast.error('No se pudo exportar');
    }
  };

  const shownCount = rows.length;

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Datos</h1>
        </div>

        <span className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="inline-flex rounded-md border border-slate-200 bg-background p-0.5 dark:border-slate-800">
          {(['table', 'charts'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                tab === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {t === 'table' ? <TableIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
              {t === 'table' ? 'Tabla' : 'Gráficos'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Entidad:</label>
          <Select value={entity} onValueChange={(v) => pushParams({ entity: v || 'purchases' })}>
            <SelectTrigger className="h-8 w-60" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Límite:</label>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v) || 1000)}>
            <SelectTrigger className="h-8 w-24" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Desde:</label>
          <Input
            type="date"
            value={from || ''}
            onChange={(e) => pushParams({ from: e.target.value })}
            className="h-8 w-36"
          />
          <Input
            type="date"
            value={to || ''}
            onChange={(e) => pushParams({ to: e.target.value })}
            className="h-8 w-36"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={downloadCsv}
            disabled={rows.length === 0 || tab !== 'table'}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Mostrando <b>{shownCount}</b> de <b>{total}</b> filas · columna de fecha:{' '}
          <code className="font-mono text-[10px]">{dateColumn}</code>
        </span>
      </div>

      {tab === 'table' ? (
        <DynamicTable rows={rows} loading={loading} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 py-20 text-center text-sm text-muted-foreground dark:border-slate-800">
          <BarChart3 className="mx-auto mb-2 h-8 w-8" />
          <p>Gráficos auto-generados — próximamente.</p>
          <p className="text-xs">Por ahora, usa la tab Tabla para explorar los datos.</p>
        </div>
      )}
    </div>
  );
}
