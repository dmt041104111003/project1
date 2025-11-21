"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChat, ChatProvider } from '@/contexts/ChatContext';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { useProofVerification } from '@/hooks/useProofVerification';
import { formatTime } from '@/utils/timeUtils';
import { CreateRoomForm } from './parts/CreateRoomForm';
import { ChatPanel } from './parts/ChatPanel';
import { RoomList } from './parts/RoomList';
import { DeleteConfirm } from './parts/DeleteConfirm';
const ChatContentInner: React.FC = () => {
  const { account } = useWallet();
  const { checkProof, checkMultipleProofs } = useProofVerification();

  const [message, setMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [rooms, setRooms] = useState<Array<{
    id: string;
    name: string;
    lastMessage: string;
    lastMessageSender?: string;
    lastMessageTime?: number;
    chatAccepted: boolean;
    creatorAddress: string;
    participantAddress: string;
  }>>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomParticipantAddress, setNewRoomParticipantAddress] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; sender: string; senderId: string; timestamp: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { messages, sendMessage, isLoading, setRoomId } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const messageText = message;
    
    await sendMessage(messageText, account ? `User ${account.slice(0, 8)}` : 'User', account || '', replyingTo);
    setMessage('');
    setReplyingTo(null);
  };

  const handleAcceptRoom = async (roomId: string) => {
    if (!account) return;
    try {
      const response = await fetch('/api/chat/messages/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptRoom: true,
          roomIdToAccept: roomId,
          address: account
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Đã accept phòng chat!');
        loadRoomsFromFirebase();
      } else {
        toast.error(data.error || 'Lỗi khi accept phòng');
      }
    } catch {
      toast.error('Lỗi khi accept phòng');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const actualRoomId = selectedRoom || 'general';
      
      const response = await fetch('/api/chat/messages/delete', {
        credentials: 'include',
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          roomId: actualRoomId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowDeleteConfirm(null);
        toast.success('Đã xóa tin nhắn');
      } else {
        toast.error(data.error || 'Lỗi khi xóa tin nhắn');
      }
    } catch {
      toast.error('Lỗi khi xóa tin nhắn');
    }
  };

  const handleEditRoomName = async (roomId: string, newName: string) => {
    if (!newName.trim() || newName.trim().length > 10) {
      toast.error('Tên phòng phải từ 1-10 ký tự');
      return;
    }
    
    const short = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
    const shortId = short(roomId);
    const finalName = `${shortId} ${newName.trim()}`;
    
    try {
      const response = await fetch('/api/chat/messages/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateRoomName: true,
          roomIdToUpdate: roomId,
          newName: finalName,
          address: account
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Đã cập nhật tên phòng');
        loadRoomsFromFirebase();
      } else {
        toast.error(data.error || 'Lỗi khi cập nhật tên phòng');
      }
    } catch {
      toast.error('Lỗi khi cập nhật tên phòng');
    }
  };



  const loadRoomsFromFirebase = React.useCallback(async () => {
    if (!account) return;
    
    try {
      const response = await fetch(
        `/api/chat/messages?getRooms=true&userAddress=${encodeURIComponent(account)}&address=${encodeURIComponent(account)}`,
        { credentials: 'include' }
      );
      const data = await response.json();
      
      if (data.success && data.rooms) {
        setRooms(data.rooms);
      }
    } catch {
    }
  }, [account]);

  React.useEffect(() => {
    if (!account) return;

    const interval = setInterval(() => {
      loadRoomsFromFirebase();
    }, 10000); 

    return () => clearInterval(interval);
  }, [account, loadRoomsFromFirebase]);

  React.useEffect(() => {
    if (account) {
      loadRoomsFromFirebase();
    }
  }, [account, loadRoomsFromFirebase]);



  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomParticipantAddress.trim()) return;

    if (newRoomName.trim().length > 10) {
      setCreateRoomError('Tên phòng không được vượt quá 10 ký tự');
      return;
    }

    if (!account) {
      setCreateRoomError('Bạn chưa kết nối ví');
      return;
    }

    const participantAddr = newRoomParticipantAddress.trim().toLowerCase();
    const creatorAddr = account.toLowerCase();
    
    if (participantAddr === creatorAddr) {
      setCreateRoomError('Bạn không thể tạo phòng chat với chính mình');
      return;
    }

    // Kiểm tra địa chỉ participant có hợp lệ không
    if (!participantAddr || !participantAddr.startsWith('0x') || participantAddr.length < 10) {
      setCreateRoomError('Địa chỉ người nhận không hợp lệ');
      return;
    }

    setIsCreatingRoom(true);
    setCreateRoomError('');

    try {
      const isCreatorVerified = await checkProof();
      if (!isCreatorVerified) {
        setCreateRoomError('Bạn chưa có xác minh không kiến thức. Vui lòng xác minh định danh tài khoản trước.');
        setIsCreatingRoom(false);
        return;
      }

      const proofResults = await checkMultipleProofs([participantAddr]);
      if (!proofResults[participantAddr]) {
        setCreateRoomError('Người nhận chưa có xác minh không kiến thức. Không thể tạo phòng.');
        setIsCreatingRoom(false);
        return;
      }

      const roomPayload = {
        address: account,
        name: newRoomName.trim(),
        creatorAddress: account,
        participantAddress: participantAddr,
        senderId: account
      };
      const roomResponse = await fetch('/api/chat/messages/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomPayload)
      });
      const roomData = await roomResponse.json();
      if (roomData.success) {
        const newRoom = {
          id: roomData.roomId,
          name: roomData.room.name,
          lastMessage: roomData.room.lastMessage,
          chatAccepted: false,
          creatorAddress: account,
          participantAddress: participantAddr
        };
        setRooms(prev => [...prev, newRoom]);
        setSelectedRoom(newRoom.id);
        setRoomId(newRoom.id);
        setNewRoomName('');
        setNewRoomParticipantAddress('');
        setShowCreateRoom(false);
        setCreateRoomError('');
        loadRoomsFromFirebase();
        toast.success('Đã tạo phòng chat thành công!');
      } else {
        setCreateRoomError(roomData.error || 'Lỗi khi tạo phòng');
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      setCreateRoomError(error?.message || 'Lỗi khi tạo phòng');
    } finally {
      setIsCreatingRoom(false);
    }
  };



  return (
    <div className="fixed inset-0 flex bg-gray-100 chat-page z-10">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-400 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-800">
          <h1 className="text-lg font-bold">TIN NHẮN</h1>
        </div>


        {/* User info removed per request */}

        <RoomList
          rooms={rooms as any}
          selectedRoomId={selectedRoom}
          onSelect={(id) => { 
            setSelectedRoom(id); 
            setRoomId(id);
          }}
          onAccept={handleAcceptRoom}
          onEditName={handleEditRoomName}
          currentUserAddress={account || ''}
        />


        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-400 bg-gray-200">
          {!showCreateRoom ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                setShowCreateRoom(true);
              }}
            >
              TẠO PHÒNG MỚI
            </Button>
          ) : (
            <CreateRoomForm
              isCreating={isCreatingRoom}
              newRoomName={newRoomName}
              setNewRoomName={setNewRoomName}
              newRoomParticipantAddress={newRoomParticipantAddress}
              setNewRoomParticipantAddress={setNewRoomParticipantAddress}
              createRoomError={createRoomError}
              onSubmit={handleCreateRoom}
              onCancel={() => {
                setShowCreateRoom(false);
                setNewRoomName('');
                setNewRoomParticipantAddress('');
                setCreateRoomError('');
              }}
            />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex">
        <ChatPanel
          selectedRoom={rooms.find(r => r.id === selectedRoom)}
          messages={messages as any}
          isLoading={isLoading}
          currentUserId={account || ''}
          formatTime={formatTime}
          replyingTo={replyingTo as any}
          setReplyingTo={setReplyingTo as any}
          message={message}
          setMessage={setMessage}
          handleSubmit={handleSubmit}
          handleAcceptRoom={handleAcceptRoom}
        />
      </div>

      <DeleteConfirm openId={showDeleteConfirm} onCancel={() => setShowDeleteConfirm(null)} onConfirm={handleDeleteMessage} />
    </div>
  );
};

export const ChatContent: React.FC = () => {
  return (
    <ChatProvider>
      <ChatContentInner />
    </ChatProvider>
  );
};
