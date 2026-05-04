'use client';

import { useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Download } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { toast } from 'sonner';

interface ResultItem {
  email: string;
  veredicto: 'RECOBRO_VALIDO' | 'PAGO_LIMPIO' | 'AUN_PENDIENTE' | 'SIN_ACTIVIDAD' | 'NO_ENCONTRADO';
  had_debt: boolean;
  paid: boolean;
  paid_total: number;
  fuentes: string[];
  signals_debt: string[];
  signals_paid: string[];
  marcado_recuperado_por: string[];
}

interface VerifyResponse {
  results: ResultItem[];
  summary: {
    RECOBRO_VALIDO: number;
    PAGO_LIMPIO: number;
    AUN_PENDIENTE: number;
    SIN_ACTIVIDAD: number;
    NO_ENCONTRADO: number;
    total: number;
    paid_total_eur: number;
  };
  month: string;
  phones_resolved: { phone: string; phone_digits: string; emails: string[] }[];
}

const VERDICT_LABEL: Record<ResultItem['veredicto'], string> = {
  RECOBRO_VALIDO: 'Recobro válido',
  PAGO_LIMPIO: 'Pago limpio',
  AUN_PENDIENTE: 'Aún pendiente',
  SIN_ACTIVIDAD: 'Sin actividad',
  NO_ENCONTRADO: 'No encontrado',
};

const VERDICT_STYLE: Record<ResultItem['veredicto'], string> = {
  RECOBRO_VALIDO: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  PAGO_LIMPIO:    'border-yellow-400/40 bg-yellow-500/10 text-yellow-200',
  AUN_PENDIENTE:  'border-orange-400/40 bg-orange-500/10 text-orange-200',
  SIN_ACTIVIDAD:  'border-zinc-400/30 bg-zinc-500/10 text-zinc-300',
  NO_ENCONTRADO:  'border-red-400/40 bg-red-500/10 text-red-200',
};

function VerdictIcon({ v }: { v: ResultItem['veredicto'] }) {
  if (v === 'RECOBRO_VALIDO') return <CheckCircle2 className="h-4 w-4" />;
  if (v === 'PAGO_LIMPIO') return <AlertTriangle className="h-4 w-4" />;
  if (v === 'AUN_PENDIENTE') return <Clock className="h-4 w-4" />;
  return <XCircle className="h-4 w-4" />;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function downloadCsv(rows: ResultItem[], month: string) {
  const header = ['email', 'veredicto', 'tuvo_deuda', 'se_cobro', 'monto_cobrado_eur', 'fuentes', 'evidencia_deuda', 'evidencia_pago', 'marcado_recuperado_por'];
  const csv = [header.join(',')];
  for (const r of rows) {
    csv.push([
      r.email,
      r.veredicto,
      r.had_debt ? 'si' : 'no',
      r.paid ? 'si' : 'no',
      r.paid_total.toFixed(2),
      r.fuentes.join('|'),
      r.signals_debt.join('|').replace(/,/g, ';'),
      r.signals_paid.join('|').replace(/,/g, ';'),
      r.marcado_recuperado_por.join('|'),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revisor-cobros-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RevisorCobrosPage() {
  const [entries, setEntries] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [filter, setFilter] = useState<'all' | ResultItem['veredicto']>('all');

  const verify = async () => {
    if (!entries.trim()) {
      toast.error('Pega al menos un email o teléfono');
      return;
    }
    setLoading(true);
    try {
      const r = await api.post<VerifyResponse>('/api/v1/revisor/verificar/', { entries, month });
      setData(r);
    } catch (err) {
      const msg = err instanceof ApiError ? `Error ${err.status}` : 'Error de red';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.results;
    return data.results.filter(r => r.veredicto === filter);
  }, [data, filter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Search className="h-6 w-6 text-cyan-400" />
          Revisor de Cobros
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Verifica si cada cliente tuvo deuda real este mes y se cobró. Sirve para validar comisiones de operarios.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Lista de emails / teléfonos
          </label>
          <textarea
            className="h-64 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
            placeholder={`Pega aquí (uno por línea, acepta ambos formatos):\n\n612345678   foo@bar.com\nperez@gmail.com\n+34 666 77 88 99\nmaria@example.com`}
            value={entries}
            onChange={(e) => setEntries(e.target.value)}
          />
          <p className="text-xs text-zinc-500">
            {(entries.match(/\n/g) || []).length + (entries.trim() ? 1 : 0)} líneas detectadas
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Mes a verificar</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-zinc-100 focus:border-cyan-400/50 focus:outline-none"
          />
          <button
            onClick={verify}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Verificando…' : 'Verificar'}
          </button>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
            <p className="mb-1.5 font-semibold text-zinc-300">Reglas</p>
            <ul className="space-y-1 text-[11px] leading-relaxed">
              <li>• <b className="text-emerald-300">Recobro válido</b>: tuvo deuda y cobró ese mes</li>
              <li>• <b className="text-yellow-300">Pago limpio</b>: cobró sin haber estado en mora</li>
              <li>• <b className="text-orange-300">Aún pendiente</b>: tuvo deuda pero sigue debiendo</li>
              <li>• <b className="text-red-300">No encontrado</b>: email/tel no existe en BD</li>
            </ul>
          </div>
        </div>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(['RECOBRO_VALIDO', 'PAGO_LIMPIO', 'AUN_PENDIENTE', 'SIN_ACTIVIDAD', 'NO_ENCONTRADO'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(filter === k ? 'all' : k)}
                className={`rounded-xl border p-3 text-left transition hover:opacity-80 ${
                  filter === k ? VERDICT_STYLE[k] + ' ring-2 ring-current' : 'border-zinc-800 bg-zinc-900/50 text-zinc-300'
                }`}
              >
                <div className="text-2xl font-bold tabular-nums">{data.summary[k]}</div>
                <div className="text-[11px] uppercase tracking-wider opacity-80">{VERDICT_LABEL[k]}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-300/80">Total cobrado en recobros válidos</div>
              <div className="text-3xl font-bold text-emerald-200">
                {data.summary.paid_total_eur.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
            </div>
            <button
              onClick={() => downloadCsv(filtered, data.month)}
              className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
          </div>

          {/* Tabla */}
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              {filter === 'all' ? `Resultados · ${filtered.length}` : `${VERDICT_LABEL[filter]} · ${filtered.length}`}
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="ml-3 text-cyan-400 hover:text-cyan-300">
                  ver todos
                </button>
              )}
            </div>
            <div className="divide-y divide-zinc-800/60">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">No hay resultados</div>
              )}
              {filtered.map((r, i) => (
                <div key={`${r.email}-${i}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${VERDICT_STYLE[r.veredicto]}`}
                      >
                        <VerdictIcon v={r.veredicto} />
                        {VERDICT_LABEL[r.veredicto]}
                      </span>
                      <span className="truncate text-sm font-medium text-zinc-100">{r.email}</span>
                      {r.fuentes.length > 0 && (
                        <span className="text-[11px] text-zinc-500">· {r.fuentes.join(' + ')}</span>
                      )}
                    </div>
                    {(r.signals_debt.length > 0 || r.signals_paid.length > 0) && (
                      <div className="mt-1.5 space-y-0.5 text-[11px] text-zinc-400">
                        {r.signals_debt.map((s, j) => (
                          <div key={`d-${j}`} className="text-orange-300/90">↳ {s}</div>
                        ))}
                        {r.signals_paid.map((s, j) => (
                          <div key={`p-${j}`} className="text-emerald-300/90">✓ {s}</div>
                        ))}
                      </div>
                    )}
                    {r.marcado_recuperado_por.length > 0 && (
                      <div className="mt-1 text-[11px] text-cyan-300/80">
                        · Marcado Recuperado por: <b>{r.marcado_recuperado_por.join(', ')}</b>
                      </div>
                    )}
                  </div>
                  {r.paid_total > 0 && (
                    <div className="text-right text-sm font-bold text-emerald-300 tabular-nums">
                      {r.paid_total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {data.phones_resolved.length > 0 && (
            <details className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-400">
              <summary className="cursor-pointer font-semibold text-zinc-300">
                Teléfonos resueltos a email ({data.phones_resolved.length})
              </summary>
              <div className="mt-3 space-y-1">
                {data.phones_resolved.map((p, i) => (
                  <div key={i}>
                    <code className="text-cyan-300">{p.phone}</code> →{' '}
                    {p.emails.length > 0 ? (
                      <span className="text-zinc-300">{p.emails.join(', ')}</span>
                    ) : (
                      <span className="text-red-400">sin match</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
