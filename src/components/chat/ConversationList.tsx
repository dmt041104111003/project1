import React from 'react';
import { Card, Avatar, Badge } from '@/components/ui';
import { ConversationListProps } from '@/constants/chat';

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  robotoCondensed
}: ConversationListProps) {
  return (
    <Card variant="outlined" className="h-full">
      <div className="p-4 border-b border-border">
        <h2 
          style={robotoCondensed}
          className="text-2xl font-semibold text-primary"
        >
          Tin nhắn
        </h2>
      </div>
      <div className="overflow-y-auto h-[calc(100%-80px)]">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`p-4 border-b border-border cursor-pointer hover:bg-background-secondary transition-colors ${
              selectedConversation === conversation.id ? 'bg-primary/10' : ''
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar
                  src={conversation.participants[0].avatar}
                  fallback={conversation.participants[0].name.charAt(0)}
                  size="md"
                />
                {conversation.participants[0].online && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-text-primary truncate">
                    {conversation.title}
                  </h3>
                  <span className="text-xs text-text-muted">
                    {conversation.lastMessageTime}
                  </span>
                </div>
                <p className="text-sm text-text-secondary truncate mb-1">
                  {conversation.lastMessage}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {conversation.participants[0].name}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="primary" size="sm">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
