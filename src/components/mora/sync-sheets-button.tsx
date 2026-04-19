'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { moraApi } from '@/lib/mora-api';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

// Descarga DNI+dirección desde una Google Sheet externa. Tras completar
// hace reload de la página (coherente con la web vieja).
export function SyncSheetsButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const run = async () => {
    setIsSyncing(true);
    toast.info('Sincronizando con Google Sheets...', {
      description: 'Buscando datos de DNI y direcciones para clientes en Ventas.',
    });
    try {
      const r = await moraApi.syncSheets();
      toast.success(r.message || 'Sincronización completada');
      window.location.reload();
    } catch {
      toast.error('Error sincronizando con Sheets');
      setIsSyncing(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={run} disabled={isSyncing}>
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      Sincronizar Sheets
    </Button>
  );
}
