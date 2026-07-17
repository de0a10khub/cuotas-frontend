'use client';

import type { ReactivacionContext } from '@/lib/crm-docentes-types';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "octubre 2025" — el docente piensa en meses, no en fechas exactas. */
function mesYAno(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function fechaCorta(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES');
}

function eur(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  return `${Math.round(cents / 100).toLocaleString('es-ES')} €`;
}

/**
 * Contexto real de un alumno reactivado.
 *
 * Existe porque el docente recibía la ficha sin ninguna historia: solo
 * nombre, un importe y una fecha — y las dos cifras engañaban (el importe
 * es la deuda refinanciada, no el precio; la fecha es la del alta de la
 * ficha, no la de entrada en la academia). Paula acababa preguntando a
 * Félix y Flor uno por uno.
 *
 * Todo lo de aquí sale del rastro de Stripe de su compra ORIGINAL. Cada
 * dato se omite si el backend no lo pudo deducir — antes un hueco que un
 * dato inventado.
 */
export function BloqueReactivacion({ ctx }: { ctx: ReactivacionContext }) {
  const desde = mesYAno(ctx.primera_compra);
  const pagado = eur(ctx.pagado_cents);
  const total = eur(ctx.total_plan_cents);
  const refi = eur(ctx.refinanciado_cents);
  const refiEn = fechaCorta(ctx.refinanciado_en);

  return (
    <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-emerald-500/30">
      <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
      <div className="bg-gradient-to-r from-emerald-500/8 to-cyan-500/8 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded bg-gradient-to-r from-emerald-500 to-cyan-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
            🔄 Reactivación
          </span>
          {desde && (
            <span className="text-[12px] font-bold">
              En la academia desde {desde}
              {ctx.meses_en_academia ? ` · ${ctx.meses_en_academia} meses` : ''}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-3">
          {ctx.producto_real && (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Producto real
              </dt>
              <dd className="font-bold">Formación Agencia {ctx.producto_real}</dd>
            </div>
          )}

          {pagado && total && (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Ya pagado
              </dt>
              <dd className="font-bold">
                {pagado} <span className="font-medium text-muted-foreground">de {total}</span>
                {ctx.pagos_ok !== null && ctx.plan_pagos !== null && (
                  <span className="ml-1 font-medium text-muted-foreground">
                    ({ctx.pagos_ok}/{ctx.plan_pagos} cuotas)
                  </span>
                )}
              </dd>
            </div>
          )}

          {ctx.recibos_devueltos !== null && ctx.recibos_devueltos > 0 && (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Recibos devueltos
              </dt>
              <dd className="font-bold text-amber-600">
                {ctx.recibos_devueltos}
                <span className="ml-1 font-medium text-muted-foreground">
                  {ctx.recibos_devueltos >= 10 ? '· impago severo' : '· tuvo problemas de pago'}
                </span>
              </dd>
            </div>
          )}

          {refi && (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Refinanció
              </dt>
              <dd className="font-bold">
                {refi}
                {refiEn && (
                  <span className="ml-1 font-medium text-muted-foreground">el {refiEn}</span>
                )}
              </dd>
            </div>
          )}
        </dl>

        {/* Los dos avisos que evitan que el docente lea mal la ficha. */}
        <div className="mt-3 space-y-1 border-t border-emerald-500/20 pt-2 text-[11px] text-muted-foreground">
          {refi && (
            <div>
              ⚠️ Los <strong>{refi}</strong> son la <strong>deuda que refinanció</strong>, no el
              precio de su producto.
            </div>
          )}
          {ctx.producto_real && (
            <div>
              ⚠️ La ficha puede poner <strong>2K</strong>: es el vehículo de cobro que usa
              recobros. Su producto real es <strong>{ctx.producto_real}</strong>.
            </div>
          )}
          <div>
            El proceso son <strong>4 reuniones</strong> (días 3, 10, 17 y 24 desde la
            reactivación). Sin onboarding y sin quincenal.
          </div>
        </div>
      </div>
    </div>
  );
}
