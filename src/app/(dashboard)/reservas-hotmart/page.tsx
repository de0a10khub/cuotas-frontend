'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, BadgeEuro, Search, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { listReservas, type HotmartReservation, type ReservaFilter } from '@/lib/reservas-hotmart-api';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-50 text-yellow-700' },
  converted: { label: 'Convertida (refund pendiente)', cls: 'bg-green-50 text-green-700' },
  refunded: { label: 'Refundeada', cls: 'bg-gray-100 text-gray-600' },
};

export default function ReservasHotmartPage() {
  const [filter, setFilter] = useState<ReservaFilter>('pending');
  const [items, setItems] = useState<HotmartReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReservas(filter);
      setItems(data.results || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.buyer_email.toLowerCase().includes(q) ||
      (r.buyer_name || '').toLowerCase().includes(q) ||
      r.transaction.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <BadgeEuro className="h-6 w-6 text-[#1C3163]" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Reservas Hotmart</h1>
            <p className="text-sm text-gray-500">
              Reservas de 25/50/100/150€ (señal del cliente). Cuando paga la compra real,
              el closer debe hacer el refund manual en Hotmart.
            </p>
          </div>
          <button onClick={load} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {(['pending', 'converted', 'refunded', 'all'] as ReservaFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded ${
                  filter === f ? 'bg-[#1C3163] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'pending' ? 'Pendientes' : f === 'converted' ? 'Refund pendiente' : f === 'refunded' ? 'Refundeadas' : 'Todas'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, nombre o transaction..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="ml-auto text-xs text-gray-500">{filtered.length} / {items.length}</div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#1C3163]" />
            </div>
          ) : error ? (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              {filter === 'pending' ? 'No hay reservas pendientes.' : 'Sin resultados.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2 text-right">Importe</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2 text-right">Ventas reales (email)</th>
                  <th className="px-4 py-2">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filtered.map((r) => {
                  const badge = STATUS_BADGE[r.reservation_status || 'pending'] || STATUS_BADGE.pending;
                  return (
                    <tr key={r.transaction} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">
                        {(r.approved_date || r.order_date || '').slice(0, 10) || '—'}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">{r.buyer_email}</td>
                      <td className="px-4 py-2 text-gray-700">{r.buyer_name || '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {r.price_cents != null ? `${(r.price_cents / 100).toFixed(2)} ${r.currency || ''}` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                          {r.reservation_status === 'refunded' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {r.sales_for_email > 0 ? (
                          <span className="font-semibold text-green-700">{r.sales_for_email}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{r.transaction}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
