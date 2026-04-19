'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { moraStatsApi } from '@/lib/mora-stats-api';
import type {
  AgingItem,
  ObjecionItem,
  RecoveryStatusItem,
} from '@/lib/mora-stats-api';
import { toast } from 'sonner';

// Mapa fiel de colores por recovery_status (web vieja).
const STATUS_COLORS: Record<string, string> = {
  Recuperado: '#10b981',
  PAGADO: '#10b981',
  CORRIENTE: '#10b981',
  'PAGOS COMPLETADOS': '#16a34a',
  'Promesa Pago': '#3b82f6',
  RENEGOCIADO: '#6366f1',
  Contactado: '#f59e0b',
  'No responde': '#f97316',
  Abogado: '#e11d48',
  Seguimiento: '#06b6d4',
  REEMBOLSADO: '#94a3b8',
  'DISPUTA PERDIDA': '#ef4444',
  Incobrable: '#b91c1c',
  Pendiente: '#cbd5e1',
};

const AGING_COLORS = ['#facc15', '#f97316', '#ef4444', '#020617'];

const GENERIC_PALETTE = [
  '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#64748b',
];

export function MoraCharts() {
  const [status, setStatus] = useState<RecoveryStatusItem[] | null>(null);
  const [aging, setAging] = useState<AgingItem[] | null>(null);
  const [objeciones, setObjeciones] = useState<ObjecionItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      moraStatsApi.recoveryStatus(),
      moraStatsApi.aging(),
      moraStatsApi.objeciones(),
    ])
      .then(([s, a, o]) => {
        setStatus(s.results);
        setAging(a.results);
        setObjeciones(o.results);
      })
      .catch(() => toast.error('Error cargando estadísticas'))
      .finally(() => setLoading(false));
  }, []);

  // Primer elemento tiene el agregado global de recovered_payments.
  const totalRecoveredPayments = status?.[0]?.total_recovered_payments || 0;

  const statusChartData = (status || [])
    .filter((s) => s.recovery_status !== 'Pendiente')
    .map((s, i) => ({
      name: s.recovery_status,
      value: s.client_count,
      color:
        STATUS_COLORS[s.recovery_status] ||
        GENERIC_PALETTE[i % GENERIC_PALETTE.length],
    }));

  const agingChartData = (aging || []).map((a, i) => ({
    name: a.aging_category,
    value: a.client_count,
    color: AGING_COLORS[i % AGING_COLORS.length],
  }));

  const objecionesChartData = (objeciones || [])
    .slice(0, 10)
    .map((o, i) => ({
      name: o.tag_name,
      value: o.client_count,
      color: GENERIC_PALETTE[i % GENERIC_PALETTE.length],
    }));

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[360px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <ChartCard title="Estado de Recobro">
        <ChartPie data={statusChartData} />
        {totalRecoveredPayments > 0 && (
          <div className="mt-2 rounded-md bg-emerald-50/50 px-3 py-2 text-center dark:bg-emerald-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Total cuotas recuperadas
            </p>
            <p className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {totalRecoveredPayments}
            </p>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Tipo de Mora (Tramo)">
        <ChartPie data={agingChartData} />
      </ChartCard>

      <ChartCard title="Top 10 Objeciones">
        <ChartPie data={objecionesChartData} />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border bg-white/50 shadow-md backdrop-blur-md dark:bg-slate-900/40">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-4 py-3">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[320px] p-2">{children}</CardContent>
    </Card>
  );
}

interface SliceData {
  name: string;
  value: number;
  color: string;
}

interface LabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
}

function ChartPie({ data }: { data: SliceData[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin datos
      </div>
    );
  }
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="40%"
          outerRadius={85}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          wrapperStyle={{
            fontSize: '10px',
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(4px)',
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.05)',
            width: 'auto',
            maxWidth: '90%',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '10px',
            overflowY: 'auto',
            maxHeight: '100px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderLabel(props: LabelProps) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0 } = props;
  if (percent < 0.02) return null;
  const RADIAN = Math.PI / 180;
  const insideRadius = outerRadius * 0.6;
  const outsideRadius = outerRadius + 20;
  const radius = percent >= 0.1 ? insideRadius : outsideRadius;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const fill = percent >= 0.1 ? '#fff' : 'var(--color-muted-foreground)';
  const fontSize = percent >= 0.1 ? 9 : 8;
  const fontWeight = percent >= 0.1 ? 'bold' : 'medium';
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {(percent * 100).toFixed(1)}%
    </text>
  );
}

interface TooltipPayload {
  name?: string;
  value?: number;
  payload?: SliceData;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-md border border-slate-200 bg-popover p-2 shadow-md dark:border-slate-800">
      <p className="text-xs font-bold">{item.name}</p>
      <p className="text-[11px] text-muted-foreground">
        {item.value} clientes
      </p>
    </div>
  );
}
