'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, clearTokens, getAccessToken, login as apiLogin } from './api';
import type { Profile } from './types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async () => {
    const token = getAccessToken();
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<Profile>('/api/v1/profiles/me/');
      setProfile(data);
    } catch {
      setProfile(null);
      clearTokens();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    if (!profile && !isPublic) {
      router.replace('/login');
    } else if (profile && pathname === '/login') {
      router.replace('/');
    }
  }, [profile, loading, pathname, router]);

  // ─────────────────────────────────────────────────────────────────────
  // Idle auto-logout: cierra sesión tras 30 min sin actividad del usuario.
  // Eventos considerados actividad: click, tecla, scroll, mover ratón, touch.
  // Si el usuario está activo, los tokens se refrescan solos vía api.ts y la
  // sesión nunca se cierra. Si está idle 30 min, llamamos a logout().
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const IDLE_MS = 30 * 60 * 1000; // 30 minutos
    let timer: ReturnType<typeof setTimeout> | null = null;

    const triggerLogout = () => {
      clearTokens();
      setProfile(null);
      router.replace('/login?reason=idle');
    };

    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(triggerLogout, IDLE_MS);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove',
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [profile, router]);

  const login = async (username: string, password: string) => {
    await apiLogin(username, password);
    await fetchProfile();
  };

  const logout = () => {
    clearTokens();
    setProfile(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout, refresh: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
