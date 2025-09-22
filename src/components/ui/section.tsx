'use client';

import { cn } from '@/lib/utils';

type SectionProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
};

export function Section({ title, children, className, headerRight }: SectionProps) {
  return (
    <div className={cn('border-t border-border pt-4 space-y-3', className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">{title}</h4>
          {headerRight}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {children}
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
};

export function FormField({ label, children, className, hint }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}


