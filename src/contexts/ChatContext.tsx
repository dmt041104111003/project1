"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  senderId: string;
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (text: string, sender: string, senderId: string) => void;
  isLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
  roomId?: string;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, roomId = 'general' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch messages từ API
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?roomId=${roomId}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // Polling để cập nhật tin nhắn mới (có thể thay bằng WebSocket sau)
    const interval = setInterval(fetchMessages, 2000);
    
    return () => clearInterval(interval);
  }, [roomId]);

  const sendMessage = async (text: string, sender: string, senderId: string) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          text: text.trim(),
          sender,
          senderId,
        }),
      });

      if (response.ok) {
        // Refresh messages sau khi gửi
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const value: ChatContextType = {
    messages,
    sendMessage,
    isLoading,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};