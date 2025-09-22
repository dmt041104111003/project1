'use client';

import { Input } from '@/components/ui/input';

type FileUploadInputProps = {
  label: string;
  accept: string;
  onFile: (file: File) => void;
};

export function FileUploadInput({ label, accept, onFile }: FileUploadInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input
        type="file"
        accept={accept}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}


