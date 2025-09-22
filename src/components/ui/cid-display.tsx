'use client';

import { CopyableMono } from '@/components/ui/copyable';
import { cn } from '@/lib/utils';

type CidDisplayProps = {
  label: string;
  cid?: string;
  className?: string;
};

export function CidDisplay({ label, cid, className }: CidDisplayProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-muted-foreground text-sm">{label}</label>
      <CopyableMono value={cid || '—'} label={`${label} đã được copy!`} />
    </div>
  );
}


