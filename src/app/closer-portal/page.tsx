'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  closerPortalApi,
  getCloserSessionToken,
  setCloserSessionToken,
  type CloserLoginItem,
} from '@/lib/closers-api';

export default function CloserPortalLoginPage() {
  const router = useRouter();
  const [closers, setClosers] = useState<CloserLoginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closerId, setCloserId] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Si ya hay sesión, redirige
    if (getCloserSessionToken()) {
      closerPortalApi
        .session()
        .then(() => router.replace('/closer-portal/calendario'))
        .catch(() => setCloserSessionToken(null));
    }
    closerPortalApi
      .listForLogin()
      .then((r) => setClosers(r.results))
      .catch(() => toast.error('Error cargando lista'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!closerId) {
      toast.error('Selecciona tu nombre');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error('PIN debe ser 6 dígitos');
      return;
    }
    setSubmitting(true);
    try {
      const r = await closerPortalApi.login(closerId, pin);
      if (!r.success) {
        toast.error(r.error || 'Error');
      } else {
        setCloserSessionToken(r.session_token);
        toast.success(`Bienvenida, ${r.full_name}`);
        router.replace('/closer-portal/calendario');
      }
    } catch (err) {
      const data = (err as { data?: { error?: string; detail?: string } })?.data;
      toast.error(data?.error || data?.detail || 'Error de acceso');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-2xl font-bold text-violet-600 dark:bg-violet-950 dark:text-violet-300">
            C
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Portal Closers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecciona tu nombre e introduce tu PIN.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <Select value={closerId} onValueChange={(v) => setCloserId(v || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tu nombre" />
                </SelectTrigger>
                <SelectContent>
                  {closers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                      {c.role === 'closers_manager' && (
                        <span className="ml-1 text-[10px] text-violet-600">(Jefa)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="PIN de 6 dígitos"
                className="text-center tracking-[0.5em]"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={submit} disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
