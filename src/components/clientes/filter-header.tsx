'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CATEGORY_OPTIONS,
  PLATFORM_OPTIONS,
  DISPUTE_OPTIONS,
} from './constants';

export interface HardFilters {
  category: string;
  platform: string;
  dispute_state: string;
}

interface Props {
  value: HardFilters;
  onChange: (next: HardFilters) => void;
}

// Filtros "duros" que viven en la URL y mandan a la API.
// Equivalentes al FilterHeader de la web vieja.
export function FilterHeader({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.category}
        onValueChange={(v) => onChange({ ...value, category: v || 'all' })}
      >
        <SelectTrigger className="w-52" size="sm">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.platform}
        onValueChange={(v) => onChange({ ...value, platform: v || 'all' })}
      >
        <SelectTrigger className="w-44" size="sm">
          <SelectValue placeholder="Plataforma" />
        </SelectTrigger>
        <SelectContent>
          {PLATFORM_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.dispute_state}
        onValueChange={(v) => onChange({ ...value, dispute_state: v || 'all' })}
      >
        <SelectTrigger className="w-40" size="sm">
          <SelectValue placeholder="Disputas" />
        </SelectTrigger>
        <SelectContent>
          {DISPUTE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
