'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Calendar, CheckCircle2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  closerPortalApi,
  getCloserSessionToken,
  setCloserSessionToken,
  type Meeting,
} from '@/lib/closers-api';

function fmtDateLong(iso: string): string {
  try {
    const d = new Date(iso);
    const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('es-ES', { month: 'short' });
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const wCap = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
    const mCap = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
    return `${wCap} ${day} ${mCap} · ${hours}:${mins}`;
  } catch {
    return iso;
  }
}

export default function CalendarioPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ full_name: string; role: string } | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getCloserSessionToken()) {
      router.replace('/closer-portal');
      return;
    }
    Promise.all([closerPortalApi.session(), closerPortalApi.myMeetings()])
      .then(([s, m]) => {
        setSession({ full_name: s.full_name, role: s.role });
        setMeetings(m.results);
      })
      .catch(() => {
        setCloserSessionToken(null);
        router.replace('/closer-portal');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const { upcoming, pending, completed } = useMemo(() => {
    const now = Date.now();
    const past = meetings.filter((m) => new Date(m.scheduled_at).getTime() < now);
    const future = meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now);
    return {
      upcoming: [...future].reverse(),
      pending: past.filter((m) => !m.attendance),
      completed: past.filter((m) => m.attendance),
    };
  }, [meetings]);

  const logout = async () => {
    try {
      await closerPortalApi.logout();
    } catch {
      // ignore
    }
    setCloserSessionToken(null);
    router.replace('/closer-portal');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Portal Closers</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? <Skeleton className="h-7 w-48" /> : session?.full_name}
          </h1>
          {session?.role === 'closers_manager' && (
            <p className="mt-0.5 text-xs font-medium text-violet-600">
              Jefa · Viendo todos los closers
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Próximas" value={upcoming.length} tone="border-blue-200 text-blue-600" />
        <SummaryCard
          label="Pendientes rellenar"
          value={pending.length}
          tone={cn(
            'border-amber-200 text-amber-600',
            pending.length > 0 && 'ring-2 ring-amber-100 dark:ring-amber-900/50',
          )}
        />
        <SummaryCard
          label="Completadas"
          value={completed.length}
          tone="border-emerald-200 text-emerald-600"
        />
      </div>

      <Section
        title="Pendientes de rellenar"
        icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
        emptyMsg="No tienes reuniones pendientes."
        rows={pending}
        tone="amber"
        loading={loading}
        urgent
      />

      <Section
        title="Próximas reuniones"
        icon={<Calendar className="h-4 w-4 text-blue-600" />}
        emptyMsg="No tienes reuniones agendadas."
        rows={upcoming}
        tone="blue"
        loading={loading}
      />

      <Section
        title="Histórico"
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        emptyMsg="Todavía sin reuniones completadas."
        rows={completed}
        tone="emerald"
        loading={loading}
      />

      {!loading && meetings.length === 0 && (
        <Card className="py-10 text-center">
          <CardContent>
            <Calendar className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no tienes reuniones asignadas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card className={cn('border-2', tone)}>
      <CardContent className="p-3">
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-3xl font-black tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon,
  emptyMsg,
  rows,
  tone,
  loading,
  urgent,
}: {
  title: string;
  icon: React.ReactNode;
  emptyMsg: string;
  rows: Meeting[];
  tone: 'amber' | 'blue' | 'emerald';
  loading?: boolean;
  urgent?: boolean;
}) {
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
          <Badge variant="outline" className="ml-1 text-[10px]">
            {rows.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((m) => (
            <MeetingRow key={m.id} meeting={m} urgent={urgent} tone={tone} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function MeetingRow({
  meeting,
  urgent,
}: {
  meeting: Meeting;
  urgent?: boolean;
  tone: 'amber' | 'blue' | 'emerald';
}) {
  const c = meeting.crm_contacts;
  const name = c ? `${c.first_name} ${c.last_name}` : '—';

  let badge: React.ReactNode = (
    <span className="text-xs text-muted-foreground">→</span>
  );
  if (meeting.attendance === 'attended' && meeting.sale_status === 'yes') {
    badge = <Badge className="bg-emerald-600 text-white">Venta</Badge>;
  } else if (meeting.attendance === 'attended') {
    badge = <Badge className="bg-slate-500 text-white">No vendida</Badge>;
  } else if (meeting.attendance === 'no_show') {
    badge = <Badge className="bg-rose-600 text-white">No show</Badge>;
  } else if (urgent) {
    badge = (
      <Badge className="bg-amber-500 text-white">Rellenar →</Badge>
    );
  }

  return (
    <li>
      <Link
        href={`/closer-portal/llamada/${meeting.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
      >
        <div className="w-40 shrink-0 text-xs">
          <p className="font-medium">{fmtDateLong(meeting.scheduled_at)}</p>
          <p className="text-muted-foreground">{meeting.duration_minutes} min</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {meeting.event_type_name || meeting.title}
            {meeting.is_repeat && (
              <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                Repetido
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0">{badge}</div>
      </Link>
    </li>
  );
}
