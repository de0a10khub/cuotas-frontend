'use client';

import { Badge } from '@/components/ui/badge';
import type { Estado, PagosVisibilidad } from '@/lib/crm-docentes-types';

export function EstadoChip({ estado }: { estado: Estado }) {
  if (estado === 'activo')
    return <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">ACTIVO</Badge>;
  if (estado === 'riesgo')
    return <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20">EN RIESGO</Badge>;
  return <Badge className="bg-red-500/18 text-red-500 hover:bg-red-500/25">PERDIDO</Badge>;
}

export function PagoChip({
  visibilidad,
  cuotasImpagadas = 0,
  hayImpago = false,
}: {
  visibilidad: PagosVisibilidad;
  cuotasImpagadas?: number;
  hayImpago?: boolean;
}) {
  if (visibilidad === 'externos') {
    return (
      <Badge className="bg-slate-500/15 text-slate-400 hover:bg-slate-500/20">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400" />
        Pago gestionado externo
      </Badge>
    );
  }
  if (hayImpago) {
    return (
      <Badge className="bg-red-500/18 text-red-500 hover:bg-red-500/25">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
        IMPAGO {cuotasImpagadas > 0 ? `×${cuotasImpagadas}` : ''}
      </Badge>
    );
  }
  return (
    <Badge className="bg-cyan-500/15 text-cyan-500 hover:bg-cyan-500/20">
      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
      PAGA
    </Badge>
  );
}

export function NotaChip({ nota }: { nota: number | null }) {
  if (nota == null) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-500 text-xs font-extrabold text-white">
        –
      </span>
    );
  }
  const color =
    nota >= 7 ? 'bg-emerald-500' : nota >= 5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-extrabold text-white ${color}`}
    >
      {nota}
    </span>
  );
}
