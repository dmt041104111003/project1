import React from 'react';
import { Card } from '@/components/ui';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Participant, Message } from '@/constants/chat';

interface ChatAreaProps {
  title: string;
  participant: Participant;
  messages: Message[];
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export default function ChatArea({
  title,
  participant,
  messages,
  newMessage,
  onMessageChange,
  onSendMessage,
  onKeyPress
}: ChatAreaProps) {
  return (
    <Card variant="outlined" className="h-full flex flex-col p-0">
      <ChatHeader title={title} participant={participant} />
      <MessageList messages={messages} />
      <MessageInput
        value={newMessage}
        onChange={onMessageChange}
        onSend={onSendMessage}
        onKeyPress={onKeyPress}
      />
    </Card>
  );
}
