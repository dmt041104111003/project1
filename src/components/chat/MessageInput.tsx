import React from 'react';
import { Input, Button } from '@/components/ui';
import { MessageInputProps } from '@/constants/chat';

export default function MessageInput({
  value,
  onChange,
  onSend,
  onKeyPress
}: MessageInputProps) {
  return (
    <div className="border-t border-border">
      <div className="flex gap-2 w-full p-3">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Nhập tin nhắn..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            className="w-full"
          />
        </div>
        <Button onClick={onSend} disabled={!value.trim()} className="flex-shrink-0">
          Gửi
        </Button>
      </div>
    </div>
  );
}
