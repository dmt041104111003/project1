import React from 'react';
import { Avatar } from '@/components/ui';
import {  MessageListProps } from '@/constants/chat';

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[70%] ${message.isOwn ? 'order-2' : 'order-1'}`}>
            <div
              className={`p-3 rounded-lg ${
                message.isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-secondary text-text-primary'
              }`}
            >
              <p className="text-sm">{message.message}</p>
            </div>
            <div className={`text-xs text-text-muted mt-1 ${
              message.isOwn ? 'text-right' : 'text-left'
            }`}>
              {message.timestamp}
            </div>
          </div>
          {!message.isOwn && (
            <div className="order-2 ml-2">
              <Avatar
                src="/api/avatar/1"
                fallback="A"
                size="sm"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
