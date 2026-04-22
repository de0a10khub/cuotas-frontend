'use client';

/**
 * /clientes-v2 — Vista AGRUPADA (1 fila por persona).
 *
 * Prueba en paralelo al /clientes actual. Consume el endpoint nuevo
 * /api/v1/clientes-directorio/list-grouped/ que colapsa los contratos
 * del mismo unified_customer en una sola fila con agregados.
 *
 * Esta pagina NO reemplaza la antigua. Cuando se apruebe, /clientes
 * pasara a usar este mismo enfoque.
 */

import { useEffect, useMemo, useState } from 'react';
import { clientesApi } from '@/lib/clientes-api';
import type { PersonRow } from '@/lib/clientes-types';
import { CATEGORY_STYLES, PLATFORM_STYLES } from '@/components/recovery/styles';

const CATEGORIES = ['all', 'Pago único', 'Al día', 'Abiertas', 'Vencidas', 'Crónicas', 'Incobrable'];
const PLATFORMS = ['all', 'stripe', 'whop', 'whop-erp'];

export default function ClientesV2Page() {
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    clientesApi
      .listGrouped({ search, platform, category, page, page_size: pageSize })
      .then((res) => {
        if (!alive) return;
        setRows(res.results);
        setTotal(res.total_count);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [search, platform, category, page]);

  const totalDeuda = useMemo(
    () => rows.reduce((acc, r) => acc + (r.unpaid_total || 0), 0),
    [rows],
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Clientes (vista agrupada)</h1>
            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
              BETA
            </span>
          </div>
          <p className="text-sm text-slate-500">
            1 fila por persona. Los contratos de checkout y los accesos Whop
            del mismo cliente se consolidan.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="search"
            placeholder="Buscar email / nombre / tlf"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm w-64"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(1);
            }}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? 'Todas plataformas' : p}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'Todas categorías' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-6 text-sm">
        <span className="font-semibold">Resumen filtrado</span>
        <span className="text-slate-600">
          <strong>{total}</strong> {total === 1 ? 'cliente' : 'clientes'}
        </span>
        <span className="text-slate-600">
          Deuda vencida total:{' '}
          <strong className="text-red-600">
            {totalDeuda.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </strong>
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Cliente</th>
              <th className="text-left px-3 py-2">Teléfono</th>
              <th className="text-left px-3 py-2">Plataformas</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-right px-3 py-2">Pagos</th>
              <th className="text-right px-3 py-2">Cobrado</th>
              <th className="text-right px-3 py-2">Deuda vencida</th>
              <th className="text-right px-3 py-2">Contrato</th>
              <th className="text-left px-3 py-2">Operario</th>
              <th className="text-left px-3 py-2">Nº Contratos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r, i) => {
                const catStyle = CATEGORY_STYLES[r.category] ?? CATEGORY_STYLES['Al día'];
                return (
                  <tr key={r.person_key} className="hover:bg-indigo-50/40">
                    <td className="px-3 py-3 text-slate-400">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">{r.customer_name || '(sin nombre)'}</div>
                      <div className="text-xs text-slate-500">{r.customer_email}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{r.customer_phone || '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.platforms.map((p) => {
                          const ps = PLATFORM_STYLES[p] ?? { className: 'bg-slate-100 text-slate-700', label: p };
                          return (
                            <span
                              key={p}
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${ps.className}`}
                            >
                              {ps.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${catStyle.className}`}
                      >
                        {catStyle.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {r.paid_count} / {r.unpaid_count}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      {r.paid_total.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {r.unpaid_total > 0 ? (
                        <span className="text-red-600 font-semibold">
                          {r.unpaid_total.toLocaleString('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-600">
                      {r.total_contract_value > 0
                        ? r.total_contract_value.toLocaleString('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                          })
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      {r.recovery_contacted_by ? (
                        <div>
                          <div className="text-sm">{r.recovery_contacted_by}</div>
                          <div className="text-xs text-slate-500">
                            {r.recovery_status}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {r.n_contracts}
                      {r.contracts.some((c) => c.is_access_only) && (
                        <span className="ml-1 text-[10px] text-slate-400">
                          (+{r.contracts.filter((c) => c.is_access_only).length} acc)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-slate-400">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-500">
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))} · {total} clientes
          </div>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <button
              disabled={page * pageSize >= total}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
