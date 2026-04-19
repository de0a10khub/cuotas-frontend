'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { recobrosApi } from '@/lib/recobros-api';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

// SyncSheets específico de /recobros. Fiel a web vieja:
// registra solicitud + toast descriptivo + reload tras éxito.
export function RecobrosSyncSheetsButton() {
  const [syncing, setSyncing] = useState(false);

  const run = async () => {
    setSyncing(true);
    toast.info('Sincronizando con Google Sheets...', {
      description: 'Buscando datos de DNI y direcciones para clientes en Ventas.',
    });
    try {
      const r = await recobrosApi.syncSheets();
      toast.success(r.message);
      window.location.reload();
    } catch {
      toast.error('Error solicitando sincronización');
      setSyncing(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={run} disabled={syncing}>
      {syncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      Sincronizar Sheets
    </Button>
  );
}
