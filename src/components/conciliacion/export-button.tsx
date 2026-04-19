'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAccessToken } from '@/lib/api';
import { conciliacionApi } from '@/lib/conciliacion-api';

interface Props {
  month: number;
  year: number;
  disabled?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export function ExportConciliacionButton({ month, year, disabled }: Props) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}${conciliacionApi.exportUrl(month, year)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('export_failed');
      const blob = await res.blob();
      const text = await blob.text();
      if (text.trim().split('\n').length <= 1) {
        toast.info('No hay datos para exportar en el periodo seleccionado');
        setLoading(false);
        return;
      }
      const newBlob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(newBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conciliacion_${month}_${year}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado correctamente');
    } catch {
      toast.error('No se pudo exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={download} disabled={disabled || loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar CSV
    </Button>
  );
}
