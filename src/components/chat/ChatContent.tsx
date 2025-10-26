"use client";

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { AvatarSVG } from '@/components/ui/avatar';
import { useChat, ChatProvider } from '@/contexts/ChatContext';

const ChatContentInner: React.FC = () => {
  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: 'Chưa xác thực',
    address: ''
  });

  const [message, setMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomCommitment, setNewRoomCommitment] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');
  const [isLoadingCommitments, setIsLoadingCommitments] = useState(false);
  const { messages, sendMessage, isLoading } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    await sendMessage(message, currentUser.name, currentUser.id);
    setMessage('');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleCommitmentSubmit = (commitment: string) => {
    console.log('Commitment submitted:', commitment);
  };

  const handleUserLookup = async (commitment: string) => {
    try {
      const response = await fetch(`/api/blockchain/commitment?commitment=${commitment}`);
      const data = await response.json();
      
      if (data.success) {
        setVerifiedUser(data.user);
        setCurrentUser({
          id: data.user.address,
          name: data.user.name,
          address: data.user.address
        });
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('User lookup error:', error);
      return null;
    }
  };

  const loadCommitments = async () => {
    setIsLoadingCommitments(true);
    try {
      const response = await fetch('/api/blockchain/commitment');
      const data = await response.json();
      
      if (data.success && data.commitments) {
        setCommitments(data.commitments);
      }
    } catch (error) {
      console.error('Error loading commitments:', error);
    } finally {
      setIsLoadingCommitments(false);
    }
  };

  React.useEffect(() => {
    loadCommitments();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomCommitment.trim()) return;

    setIsCreatingRoom(true);
    setCreateRoomError('');

    try {
      const response = await fetch(`/api/blockchain/commitment?commitment=${newRoomCommitment.trim()}`);
      const data = await response.json();
      
      if (data.success && data.user) {
        if (!data.user.verified) {
          setCreateRoomError('User chưa xác thực DID');
          setIsCreatingRoom(false);
          return;
        }

        if (data.user.role !== 'poster' && data.user.role !== 'freelancer') {
          setCreateRoomError('Chỉ có thể tạo phòng với poster hoặc freelancer');
          setIsCreatingRoom(false);
          return;
        }

        if (currentUser.address && data.user.address === currentUser.address) {
          setCreateRoomError('Không thể tạo phòng với chính mình');
          setIsCreatingRoom(false);
          return;
        }

        const existingRoom = rooms.find(room => room.commitment === newRoomCommitment.trim());
        if (existingRoom) {
          setCreateRoomError('Phòng với commitment này đã tồn tại');
          setIsCreatingRoom(false);
          return;
        }

        const newRoom = {
          id: `room-${Date.now()}`,
          name: data.user.name,
          lastMessage: 'Phòng mới được tạo',
          address: data.user.address,
          commitment: newRoomCommitment.trim(),
          role: data.user.role
        };
        
        setRooms(prev => [...prev, newRoom]);
        setSelectedRoom(newRoom.id);
        setNewRoomCommitment('');
        setShowCreateRoom(false);
        setCreateRoomError('');
      } else {
        setCreateRoomError('Không tìm thấy commitment trên blockchain');
      }
    } catch (error) {
      console.error('Create room error:', error);
      setCreateRoomError('Lỗi khi kiểm tra commitment');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <div className="fixed inset-0 flex bg-gray-100 chat-page">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-400 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-800">
          <h1 className="text-lg font-bold">TIN NHẮN</h1>
        </div>


        {/* Commitment list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingCommitments ? (
            <div className="px-4 py-8 text-center text-gray-600">
              <p className="text-sm">Đang tải danh sách commitment...</p>
            </div>
          ) : commitments.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600">
              <p className="text-sm">Chưa có commitment nào</p>
              <p className="text-xs mt-1">Tạo commitment mới để bắt đầu chat</p>
            </div>
          ) : (
            commitments.map((commitment) => (
              <div
                key={commitment.id}
                onClick={() => setSelectedRoom(commitment.id)}
                className={`px-4 py-4 border-b border-gray-300 cursor-pointer hover:bg-gray-200 ${
                  selectedRoom === commitment.id ? 'bg-gray-300 border-l-4 border-l-gray-800' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <AvatarSVG 
                    address={commitment.address}
                    name={commitment.name}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-800 truncate mb-1">
                      {commitment.name}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {commitment.role} • {commitment.verified ? 'Verified' : 'Unverified'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-400 bg-gray-200">
          {!showCreateRoom ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setShowCreateRoom(true)}
            >
              TẠO PHÒNG MỚI
            </Button>
          ) : (
            <form onSubmit={handleCreateRoom} className="space-y-2">
              <input
                type="text"
                value={newRoomCommitment}
                onChange={(e) => {
                  setNewRoomCommitment(e.target.value);
                  setCreateRoomError(''); // Clear error when typing
                }}
                placeholder="Nhập commitment hash..."
                className="w-full px-3 py-2 border border-gray-400 focus:outline-none focus:border-gray-800"
                disabled={isCreatingRoom}
              />
              
              {createRoomError && (
                <div className="text-red-600 text-xs bg-red-50 p-2 border border-red-200">
                  {createRoomError}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm" 
                  className="flex-1"
                  disabled={!newRoomCommitment.trim() || isCreatingRoom}
                >
                  {isCreatingRoom ? 'ĐANG KIỂM TRA...' : 'TẠO'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomCommitment('');
                    setCreateRoomError('');
                  }}
                  disabled={isCreatingRoom}
                >
                  HỦY
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-400 px-4 py-3">
          {selectedRoom ? (
            <div className="flex items-center space-x-3">
              <AvatarSVG 
                address={commitments.find(c => c.id === selectedRoom)?.address || '0x0000000000000000000000000000000000000000'}
                name={commitments.find(c => c.id === selectedRoom)?.name || selectedRoom}
                size={40}
              />
              <div>
                <h2 className="font-bold text-gray-800">
                  {commitments.find(c => c.id === selectedRoom)?.name || selectedRoom}
                </h2>
                <p className="text-xs text-gray-600">
                  {commitments.find(c => c.id === selectedRoom)?.role} • 
                  {commitments.find(c => c.id === selectedRoom)?.verified ? ' Verified' : ' Unverified'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <h2 className="font-bold text-gray-800">Chọn commitment để bắt đầu chat</h2>
              <p className="text-xs">Chọn commitment từ danh sách bên trái</p>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-white p-4">
          {!selectedRoom ? (
            <div className="text-center text-gray-600 py-12">
              <p className="text-lg font-bold text-gray-700 mb-2">
                Chưa chọn phòng
              </p>
              <p className="text-sm text-gray-500">
                Tạo phòng mới hoặc chọn phòng để bắt đầu chat
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center text-gray-600 py-8">
              Đang tải tin nhắn...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-600 py-12">
              <p className="text-lg font-bold text-gray-700 mb-2">
                Chưa có tin nhắn nào
              </p>
              <p className="text-sm text-gray-500">
                Hãy bắt đầu cuộc trò chuyện!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwnMessage = currentUser.id === msg.senderId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs px-4 py-2 border ${
                      isOwnMessage 
                        ? 'bg-gray-800 text-white border-gray-800' 
                        : 'bg-gray-200 text-gray-800 border-gray-400'
                    }`}>
                      {!isOwnMessage && (
                        <div className="text-xs font-bold text-gray-800 mb-1">
                          {msg.sender}:
                        </div>
                      )}
                      <div className="text-sm">{msg.text}</div>
                      <div className="text-xs mt-1 text-gray-600">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-400 p-4">
          {selectedRoom ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-2 border border-gray-400 focus:outline-none focus:border-gray-800"
              />
              <Button 
                type="submit" 
                disabled={!message.trim()}
                variant="primary"
                size="md"
              >
                GỬI
              </Button>
            </form>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p className="text-sm">Chọn phòng để gửi tin nhắn</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatContent: React.FC = () => {
  return (
    <ChatProvider roomId="general">
      <ChatContentInner />
    </ChatProvider>
  );
};
