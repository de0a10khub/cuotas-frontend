'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { refinanApi } from '@/lib/refinanciacion-api';

interface Props {
  onDetected?: () => void;
}

export function DetectButton({ onDetected }: Props) {
  const [running, setRunning] = useState(false);

  const handleClick = async () => {
    setRunning(true);
    try {
      const r = await refinanApi.detect();
      toast.success(r.message || `Detectadas ${r.detected_count}`);
      onDetected?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error en la deteccion';
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={running}
      size="sm"
      className="gap-2 bg-indigo-600 hover:bg-indigo-700"
    >
      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Detectar refinanciaciones
    </Button>
  );
}
