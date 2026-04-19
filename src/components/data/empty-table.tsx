import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Props {
  colSpan: number;
  icon?: LucideIcon;
  title: string;
  hint?: string;
  className?: string;
}

export function EmptyTable({ colSpan, icon: Icon, title, hint, className }: Props) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={cn('py-16 text-center', className)}>
        <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
          {Icon && <Icon className="h-10 w-10" />}
          <p className="font-medium">{title}</p>
          {hint && <p className="text-xs">{hint}</p>}
        </div>
      </TableCell>
    </TableRow>
  );
}
