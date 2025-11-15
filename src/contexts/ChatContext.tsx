"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

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
  sendMessage: (text: string, sender: string, senderId: string, replyTo?: { id: string; text: string; sender: string; senderId: string; timestamp: number } | null) => void;
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

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/messages?roomId=${currentRoomId}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentRoomId]);

  useEffect(() => {
    if (!currentRoomId) return;
    
    fetchMessages();
    
    const interval = setInterval(fetchMessages, 5000); 
    return () => clearInterval(interval);
  }, [currentRoomId, fetchMessages]);

  const sendMessage = async (text: string, sender: string, senderId: string, replyTo?: { id: string; text: string; sender: string; senderId: string; timestamp: number } | null) => {
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
        fetchMessages();
      }
    } catch (error) {
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