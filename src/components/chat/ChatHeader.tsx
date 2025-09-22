import React from 'react';
import { Avatar } from '@/components/ui';
import { ChatHeaderProps } from '@/constants/chat';

export default function ChatHeader({ title, participant }: ChatHeaderProps) {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <Avatar
          src={participant.avatar}
          fallback={participant.name.charAt(0)}
          size="md"
        />
        <div>
          <h3 className="font-semibold text-text-primary">
            {title}
          </h3>
          <p className="text-sm text-text-secondary">
            {participant.name}
            {participant.online && (
              <span className="ml-2 text-success">● Online</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
