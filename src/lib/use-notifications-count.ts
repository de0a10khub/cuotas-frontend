'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Hook compartido para el contador de notificaciones.
 *
 * Hace polling cada 60s. Si lo usan VARIOS componentes a la vez (sidebar
 * desktop + sheet móvil), cada hook hace su propio fetch — pero el coste
 * es despreciable (1 GET cada 60s). La alternativa real sería un
 * Context provider, pero para 1 contador no merece la pena.
 *
 * Si en el futuro hay más metadatos o necesitamos sub minuto, migramos
 * a contexto.
 */
export function useNotificationsCount(): number {
  const [count, setCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const fetchCount = () => {
      api
        .get<{ total_count: number }>('/api/v1/notifications/system/summary/')
        .then((d) => {
          if (isMountedRef.current) setCount(d.total_count || 0);
        })
        .catch(() => {});
    };
    fetchCount();
    const t = setInterval(fetchCount, 60_000);
    return () => {
      isMountedRef.current = false;
      clearInterval(t);
    };
  }, []);

  return count;
}
