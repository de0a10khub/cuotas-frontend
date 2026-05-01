'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAccessToken } from '@/lib/api';
import { cobrosApi } from '@/lib/cobros-api';

interface Props {
  from: string;
  to: string;
  platform: string;
  disabled?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export function ExportCiclosButton(props: Props) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const path = cobrosApi.exportCiclosUrl({
        from: props.from,
        to: props.to,
        platform: props.platform,
      });
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
      a.download = `cobros_ciclos_${props.to}.csv`;
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
    <Button size="sm" variant="outline" onClick={download} disabled={props.disabled || loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar CSV
    </Button>
  );
}
