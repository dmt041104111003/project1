'use client';

export function LoadingInline({ text = 'Đang tải...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-border" />
      <span className="text-sm">{text}</span>
    </div>
  );
}


