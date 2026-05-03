'use client';

import { CheckCircle2, AlertCircle, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contract } from '@/lib/contract-types';

interface Props {
  contracts: Contract[];
  activeContractId: string;
  onChange: (contract: Contract) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  stripe: 'border-violet-400/40 bg-violet-500/10 text-violet-200',
  whop: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  'whop-erp': 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
};

const PLATFORM_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  whop: 'Whop',
  'whop-erp': 'Whop ERP',
};

export function ContractSelector({ contracts, activeContractId, onChange }: Props) {
  if (!contracts || contracts.length <= 1) return null;

  return (
    <div className="rounded-lg border border-blue-400/20 bg-blue-950/20 p-2">
      <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-300/70">
        Contratos del cliente · {contracts.length}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {contracts.map((c) => {
          const active = c.contract_id === activeContractId;
          const hasDebt = c.debt_eur > 0;
          const platformTone = PLATFORM_COLORS[c.platform] || 'border-slate-400/40 bg-slate-500/10';
          const Icon = hasDebt ? AlertCircle : c.status === 'canceled' ? Pause : CheckCircle2;
          const iconColor = hasDebt ? 'text-orange-300' : c.status === 'canceled' ? 'text-slate-400' : 'text-emerald-300';

          return (
            <button
              key={c.contract_id}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                'group flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-all',
                active
                  ? 'border-blue-400 bg-blue-500/20 ring-2 ring-blue-400/30 text-white'
                  : 'border-blue-400/15 bg-blue-950/30 text-blue-100 hover:border-blue-400/40 hover:bg-blue-500/10',
              )}
              title={`${c.contract_id} · status: ${c.status}`}
            >
              <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
              <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1', platformTone)}>
                {PLATFORM_LABELS[c.platform] || c.platform}
              </span>
              <span className="font-medium">
                {c.paid_count}{c.pending_count > 0 ? ` / ${c.pending_count}` : ''} {c.pending_count === 1 ? 'pdte' : c.pending_count > 1 ? 'pdtes' : ''}
              </span>
              {hasDebt && (
                <span className="ml-1 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-200">
                  {c.debt_eur.toFixed(0)}€
                </span>
              )}
              {!hasDebt && c.paid_eur > 0 && (
                <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
                  {c.paid_eur.toFixed(0)}€
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
