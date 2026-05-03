import { api } from './api';

const BASE = '/api/v1/games';

export interface FutbolMyStats {
  user_email: string;
  game: string;
  daily_limit: number;
  shots_today: number;
  goals_today: number;
  remaining_today: number;
  shots_alltime: number;
  goals_alltime: number;
}

export interface FutbolLeaderEntry {
  rank: number;
  user_email: string;
  user_display_name: string | null;
  shots: number;
  goals: number;
  accuracy: number;
}

export interface FutbolShotResponse extends FutbolMyStats {
  // Mismo shape que stats — el endpoint devuelve stats actualizadas tras chutar.
}

export const gamesApi = {
  futbolMe: () => api.get<FutbolMyStats>(`${BASE}/futbol/me/`),

  futbolShot: (payload: { is_goal: boolean; shot_speed?: number; shot_angle?: number }) =>
    api.post<FutbolShotResponse>(`${BASE}/futbol/shot/`, payload),

  futbolLeaderboard: (period: 'today' | 'week' | 'month' | 'all' = 'today', limit = 50) =>
    api.get<{ period: string; results: FutbolLeaderEntry[] }>(
      `${BASE}/futbol/leaderboard/?period=${period}&limit=${limit}`,
    ),
};
