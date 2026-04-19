'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAccessToken } from '@/lib/api';
import { moraApi } from '@/lib/mora-api';

interface Props {
  search: string;
  platform: string;
  category: string;
  dispute_state: string;
  operator: string;
  status: string;
  action_needed: string;
  tags: string[];
  disabled?: boolean;
  /** 'mora' (default) → CSV estándar; 'recobros' → CSV con DNI/dirección en MAYÚSCULAS + BOM. */
  mode?: 'mora' | 'recobros';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export function MoraExportButton(props: Props) {
  const [loading, setLoading] = useState(false);
  const mode = props.mode || 'mora';

  const download = async () => {
    setLoading(true);
    try {
      const path =
        mode === 'recobros'
          ? buildRecobrosPath(props)
          : moraApi.exportCsvUrl({
              search: props.search,
              platform: props.platform,
              category: props.category,
              dispute_state: props.dispute_state,
              operator: props.operator,
              status: props.status,
              action_needed: props.action_needed,
              tags: props.tags.join(','),
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
      const date = new Date().toISOString().slice(0, 10);
      a.download = `${mode}-${date}.csv`;
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

function buildRecobrosPath(props: Props): string {
  const q = new URLSearchParams();
  if (props.search) q.set('search', props.search);
  if (props.platform && props.platform !== 'all') q.set('platform', props.platform);
  if (props.dispute_state && props.dispute_state !== 'all')
    q.set('dispute_state', props.dispute_state);
  const s = q.toString();
  return `/api/v1/recobros-directorio/export/${s ? `?${s}` : ''}`;
}
