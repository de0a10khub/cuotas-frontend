'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { CobrosPeriod, CobrosPlatform } from '@/lib/cobros-types';

export interface CobrosFilters {
  period: CobrosPeriod;
  platform: CobrosPlatform;
  from?: string;
  to?: string;
}

interface Props {
  value: CobrosFilters;
  onChange: (next: CobrosFilters) => void;
}

const PRESETS: { value: CobrosPeriod; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'last_month', label: 'Último mes' },
  { value: '90d', label: '90 días' },
  { value: 'mtd', label: 'Este mes' },
  { value: 'qtd', label: 'Este trimestre' },
  { value: 'ytd', label: 'Este año' },
  { value: 'all', label: 'Todo' },
  { value: 'custom', label: 'Personalizado…' },
];

const PLATFORM_OPTIONS: { value: CobrosPlatform; label: string }[] = [
  { value: 'all', label: 'Todas las plataformas' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'whop', label: 'Whop' },
];

export function CobrosFilterBar({ value, onChange }: Props) {
  const isCustom = value.period === 'custom';

  const customInputs = useMemo(() => {
    if (!isCustom) return null;
    return (
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={value.from || ''}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-8 w-36"
        />
        <span className="text-xs text-slate-400">→</span>
        <Input
          type="date"
          value={value.to || ''}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-8 w-36"
        />
      </div>
    );
  }, [isCustom, value, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.period}
        onValueChange={(v) => onChange({ ...value, period: (v as CobrosPeriod) || 'mtd' })}
      >
        <SelectTrigger className="w-44" size="sm">
          <SelectValue placeholder="Periodo" />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {customInputs}

      <Select
        value={value.platform}
        onValueChange={(v) => onChange({ ...value, platform: (v as CobrosPlatform) || 'all' })}
      >
        <SelectTrigger className="w-44" size="sm">
          <SelectValue placeholder="Plataforma" />
        </SelectTrigger>
        <SelectContent>
          {PLATFORM_OPTIONS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
