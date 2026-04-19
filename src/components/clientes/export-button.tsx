'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAccessToken } from '@/lib/api';
import { clientesApi } from '@/lib/clientes-api';

interface Props {
  search: string;
  platform: string;
  category: string;
  dispute_state: string;
  operator: string;
  status: string;
  sub_status: string;
  disabled?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Exporta CSV con los filtros actuales. Usa fetch directo porque la respuesta
// no es JSON — necesitamos el Blob para descarga del navegador.
export function ExportButton(props: Props) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const path = clientesApi.exportCsvUrl({
        search: props.search,
        platform: props.platform,
        category: props.category,
        dispute_state: props.dispute_state,
        operator: props.operator,
        status: props.status,
        sub_status: props.sub_status,
      });
      const token = getAccessToken();
      const res = await fetch(`${API_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('export_failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV generado');
    } catch {
      toast.error('No se pudo exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={download} disabled={props.disabled || loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar CSV
    </Button>
  );
}
