"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  senderId: string;
  deleted?: boolean;
  deletedAt?: number;
  replyTo?: {
    id: string;
    text: string;
    sender: string;
    senderId: string;
    timestamp: number;
  } | null;
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (text: string, sender: string, senderId: string, replyTo?: any) => void;
  isLoading: boolean;
  setRoomId: (roomId: string) => void;
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
  const [currentRoomId, setCurrentRoomId] = useState(roomId);

  // Fetch messages từ API
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?roomId=${currentRoomId}`);
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
    if (!currentRoomId) return;
    
    fetchMessages();
    
    // Polling để cập nhật tin nhắn mới (có thể thay bằng WebSocket sau)
    const interval = setInterval(fetchMessages, 5000); // Tăng lên 5 giây để giảm tải
    
    return () => clearInterval(interval);
  }, [currentRoomId]);

  const sendMessage = async (text: string, sender: string, senderId: string, replyTo?: any) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: currentRoomId,
          text: text.trim(),
          sender,
          senderId,
          replyTo,
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

  const setRoomId = (newRoomId: string) => {
    setCurrentRoomId(newRoomId);
  };

  const value: ChatContextType = {
    messages,
    sendMessage,
    isLoading,
    setRoomId,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};