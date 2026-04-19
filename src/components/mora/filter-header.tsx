'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MORA_CATEGORY_OPTIONS,
  MORA_DISPUTE_OPTIONS,
  MORA_PLATFORM_OPTIONS,
} from './constants';

export interface MoraHardFilters {
  category: string;
  platform: string;
  dispute_state: string;
}

interface Props {
  value: MoraHardFilters;
  onChange: (next: MoraHardFilters) => void;
  hideCategory?: boolean;
}

// Filtros duros de /mora (URL-sync). Reutilizable por /recobros con hideCategory.
export function MoraFilterHeader({ value, onChange, hideCategory }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideCategory && (
        <Select
          value={value.category}
          onValueChange={(v) => onChange({ ...value, category: v || 'all' })}
        >
          <SelectTrigger className="w-52" size="sm">
            <SelectValue placeholder="Tramo" />
          </SelectTrigger>
          <SelectContent>
            {MORA_CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={value.platform}
        onValueChange={(v) => onChange({ ...value, platform: v || 'all' })}
      >
        <SelectTrigger className="w-44" size="sm">
          <SelectValue placeholder="Plataforma" />
        </SelectTrigger>
        <SelectContent>
          {MORA_PLATFORM_OPTIONS.map((o) => (
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
        <SelectTrigger className="w-48" size="sm">
          <SelectValue placeholder="Disputas" />
        </SelectTrigger>
        <SelectContent>
          {MORA_DISPUTE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
