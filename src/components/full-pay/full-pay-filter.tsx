'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Database, Filter, FilterX, User } from 'lucide-react';
import { PLATFORM_OPTIONS, STATUS_OPTIONS } from './constants';

export interface FullPayFilters {
  platform: string;
  status: string;
  operator: string;
}

interface Props {
  value: FullPayFilters;
  operators: string[];
  onChange: (next: FullPayFilters) => void;
}

export function FullPayFilter({ value, operators, onChange }: Props) {
  const anyFilter =
    value.platform !== 'all' || value.status !== 'all' || value.operator !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-muted/20 px-2 py-1 dark:border-slate-800">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <Select
          value={value.platform}
          onValueChange={(v) => onChange({ ...value, platform: v || 'all' })}
        >
          <SelectTrigger className="h-7 w-32 border-none bg-transparent px-1" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-muted/20 px-2 py-1 dark:border-slate-800">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select
          value={value.status}
          onValueChange={(v) => onChange({ ...value, status: v || 'all' })}
        >
          <SelectTrigger className="h-7 w-44 border-none bg-transparent px-1" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.emoji} {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-muted/20 px-2 py-1 dark:border-slate-800">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <Select
          value={value.operator}
          onValueChange={(v) => onChange({ ...value, operator: v || 'all' })}
        >
          <SelectTrigger className="h-7 w-40 border-none bg-transparent px-1" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los operadores</SelectItem>
            {operators.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {anyFilter && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange({ platform: 'all', status: 'all', operator: 'all' })}
        >
          <FilterX className="h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
