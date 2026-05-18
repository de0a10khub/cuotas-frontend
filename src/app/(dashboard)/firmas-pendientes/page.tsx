'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, FileSignature, Search, CheckCircle, AlertCircle, X } from 'lucide-react';
import {
  listPendingSignatures,
  matchSignature,
  type PendingSignature,
  type FirmaFilter,
} from '@/lib/firmas-pendientes-api';

export default function FirmasPendientesPage() {
  const [filter, setFilter] = useState<FirmaFilter>('pending');
  const [items, setItems] = useState<PendingSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<PendingSignature | null>(null);
  const [matchTxn, setMatchTxn] = useState('');
  const [matchNotes, setMatchNotes] = useState('');
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPendingSignatures(filter);
      setItems(data.results || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar firmas');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.buyer_name || '').toLowerCase().includes(q) ||
      (s.buyer_vat || '').toLowerCase().includes(q) ||
      (s.matched_transaction || '').toLowerCase().includes(q)
    );
  });

  const openMatch = (sig: PendingSignature) => {
    setSelected(sig);
    setMatchTxn('');
    setMatchNotes('');
    setMatchError(null);
  };

  const handleMatch = async () => {
    if (!selected) return;
    const txn = matchTxn.trim();
    if (!txn.startsWith('HP')) {
      setMatchError('El transaction id debe empezar por "HP"');
      return;
    }
    setMatchSaving(true);
    setMatchError(null);
    try {
      await matchSignature(selected.id, txn, matchNotes.trim() || undefined);
      setSelected(null);
      await load();
    } catch (e: unknown) {
      setMatchError(e instanceof Error ? e.message : 'Error al asociar');
    } finally {
      setMatchSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <FileSignature className="h-6 w-6 text-[#1C3163]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Firmas pendientes</h1>
            <p className="text-sm text-gray-500">
              Firmas Hotmart que no encontraron compra automaticamente. Asocialas a un transaction manualmente.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {(['pending', 'matched', 'all'] as FirmaFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded ${
                  filter === f
                    ? 'bg-[#1C3163] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'pending' ? 'Sin match' : f === 'matched' ? 'Asociadas' : 'Todas'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, nombre, DNI o transaction..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="ml-auto text-xs text-gray-500">
            {filtered.length} / {items.length}
          </div>
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
              {filter === 'pending'
                ? 'No hay firmas pendientes. Todo asociado.'
                : 'Sin resultados.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Firmado</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">DNI</th>
                  <th className="px-4 py-2">Telefono</th>
                  <th className="px-4 py-2">Match</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">
                      {new Date(s.signed_at).toLocaleString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{s.email}</td>
                    <td className="px-4 py-2 text-gray-700">{s.buyer_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{s.buyer_vat || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{s.buyer_phone || '—'}</td>
                    <td className="px-4 py-2">
                      {s.matched_transaction ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          {s.matched_transaction}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                          <AlertCircle className="h-3 w-3" />
                          Sin match
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {!s.matched_transaction && (
                        <button
                          onClick={() => openMatch(s)}
                          className="rounded-md border border-[#1C3163] px-2.5 py-1 text-xs font-semibold text-[#1C3163] hover:bg-[#1C3163]/5"
                        >
                          Asociar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-bold text-gray-900">Asociar firma a transaction Hotmart</h3>
              <button onClick={() => setSelected(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-4">
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <div><span className="font-semibold">Firma:</span> {selected.email}</div>
                <div><span className="font-semibold">Nombre:</span> {selected.buyer_name || '—'}</div>
                <div><span className="font-semibold">DNI:</span> {selected.buyer_vat || '—'}</div>
                <div><span className="font-semibold">Firmado:</span> {new Date(selected.signed_at).toLocaleString('es-ES')}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Transaction ID Hotmart *</label>
                <input
                  type="text"
                  value={matchTxn}
                  onChange={(e) => { setMatchTxn(e.target.value); if (matchError) setMatchError(null); }}
                  placeholder="HP3217952637"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Busca el transaction en Hotmart o en /clientes (badge naranja).
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
                <textarea
                  value={matchNotes}
                  onChange={(e) => setMatchNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Por que se hizo el match manual..."
                />
              </div>
              {matchError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{matchError}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-3">
              <button onClick={() => setSelected(null)} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleMatch}
                disabled={matchSaving || !matchTxn.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#1C3163] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1C3163]/90 disabled:opacity-50"
              >
                {matchSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Asociar y generar contrato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
