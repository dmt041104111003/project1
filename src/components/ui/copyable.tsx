'use client';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CopyableProps = {
  value: string;
  className?: string;
  label?: string;
};

export function CopyableMono({ value, className, label }: CopyableProps) {
  return (
    <p
      className={cn('font-mono bg-card text-card-foreground border border-border p-2 rounded text-sm break-all cursor-pointer hover:bg-accent/40 transition-colors', className)}
      onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label || 'Đã copy!'}`); }}
      title="Click để copy"
    >
      {value || '—'}
    </p>
  );
}


