'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  value: unknown;
}

// Celda expandible para payloads JSON. Colapsada muestra un resumen;
// expandida muestra el JSON completo formateado.
export function JsonCell({ value }: Props) {
  const [open, setOpen] = useState(false);
  const text = JSON.stringify(value);
  const short = text.length > 40 ? text.slice(0, 37) + '…' : text;

  return (
    <div className="max-w-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded font-mono text-[10px] text-slate-600 hover:text-primary dark:text-slate-400"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {short}
      </button>
      {open && (
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-100 p-2 text-[10px] dark:bg-slate-900">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
