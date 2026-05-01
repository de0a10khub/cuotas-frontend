'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { MotivationalBubble } from '@/components/motivational-bubble';
import { LoginSplash } from '@/components/login-splash';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  // Splash post-login: se monta solo si la login page dejó la flag en
  // sessionStorage. Lo consumimos en el primer render y lo limpiamos para
  // que un F5 posterior no lo dispare otra vez.
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem('cuotas_show_splash') === '1') {
        sessionStorage.removeItem('cuotas_show_splash');
        setShowSplash(true);
      }
    } catch {
      // sessionStorage bloqueado: no mostramos splash, dashboard carga directo.
    }
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      {/* Modo TEST: 1 min entre apariciones, visible 5s. Cambiar intervalMs a 300_000 para prod (5min). */}
      <MotivationalBubble intervalMs={60_000} visibleMs={5_000} />
      {showSplash && (
        <LoginSplash
          userName={
            profile.full_name ||
            profile.user?.first_name ||
            profile.user?.username ||
            'usuario'
          }
          onComplete={() => setShowSplash(false)}
        />
      )}
    </div>
  );
}
