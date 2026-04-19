'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { CrmActivity } from '@/lib/crm-api';

const ACTION_BADGES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-rose-100 text-rose-800 border-rose-200',
  stage_change: 'bg-purple-100 text-purple-800 border-purple-200',
  assign: 'bg-amber-100 text-amber-800 border-amber-200',
  note: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  backfill: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function TimelineTab({ activities }: { activities: CrmActivity[] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sin actividad registrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-3 pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
      {activities.map((a) => (
        <div key={a.id} className="relative">
          <span className="absolute -left-5 top-2 h-2 w-2 rounded-full bg-primary" />
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  ACTION_BADGES[a.action] || 'bg-zinc-100 text-zinc-800 border-zinc-200'
                }`}
              >
                {a.action}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {capitalize(a.entity_type || '')}
              </span>
            </div>
            <p className="mt-1 text-sm">
              {a.profiles?.full_name || 'Sistema'}
              {a.crm_contacts && ` · ${a.crm_contacts.full_name}`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(a.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
