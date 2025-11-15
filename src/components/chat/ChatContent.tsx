"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChat, ChatProvider } from '@/contexts/ChatContext';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { CreateRoomForm } from './parts/CreateRoomForm';
import { ChatPanel } from './parts/ChatPanel';
import { RoomList } from './parts/RoomList';
import { DeleteConfirm } from './parts/DeleteConfirm';
const ChatContentInner: React.FC = () => {
  const { account } = useWallet();
  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: 'User',
    address: '',
    verified: true
  });

  const [message, setMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [rooms, setRooms] = useState<Array<{
    id: string;
    name: string;
    lastMessage: string;
    chatAccepted: boolean;
    creatorAddress: string;
    participantAddress: string;
    jobCid?: string;
    role?: string;
    idHash?: string;
    commitment?: string;
    participantCommitment?: string;
  }>>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomJobCid, setNewRoomJobCid] = useState('');
  const [newRoomIdHash, setNewRoomIdHash] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; sender: string; senderId: string; timestamp: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { messages, sendMessage, isLoading, setRoomId } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const messageText = message;
    
    await sendMessage(messageText, currentUser.name, currentUser.id, replyingTo);
    setMessage('');
    setReplyingTo(null);
  };

  const handleAcceptRoom = async (roomId: string) => {
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptRoom: true,
          roomIdToAccept: roomId
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
      
      
      const response = await fetch('/api/chat/messages', {
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return `Hôm nay ${date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };


  const loadRoomsFromFirebase = React.useCallback(async () => {
    if (!currentUser.address) return;
    
    try {
      const response = await fetch(`/api/chat/messages?getRooms=true&userAddress=${currentUser.address}`);
      const data = await response.json();
      
      if (data.success && data.rooms) {
        setRooms(data.rooms);
      }
    } catch {
    }
  }, [currentUser.address]);

  React.useEffect(() => {
    if (!currentUser.address) return;

    const interval = setInterval(() => {
      loadRoomsFromFirebase();
    }, 10000); 

    return () => clearInterval(interval);
  }, [currentUser.address, loadRoomsFromFirebase]);

  React.useEffect(() => {
    if (account) {
      const newCurrentUser = {
        id: account,
        name: `User ${account.slice(0, 8)}`,
        address: account,
        verified: true
      };
      setCurrentUser(newCurrentUser);
    }
  }, [account]);

  React.useEffect(() => {
    if (currentUser.address) {
      loadRoomsFromFirebase();
    }
  }, [currentUser.address, loadRoomsFromFirebase]);


  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomJobCid.trim() || !newRoomIdHash.trim()) return;

    setIsCreatingRoom(true);
    setCreateRoomError('');

    try {
      const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
      const res = await fetch(`${gateway}/${newRoomJobCid.trim()}`);
      if (!res.ok) throw new Error('Invalid job cid');
      const jobMeta = await res.json();
      const posterHash = (jobMeta?.poster_id_hash as string) || '';
      const freelancerHash = (jobMeta?.freelancer_id_hash as string) || '';
      const provided = newRoomIdHash.trim().toLowerCase();
      if (provided !== posterHash.toLowerCase() && provided !== freelancerHash.toLowerCase()) {
        throw new Error('ID hash không khớp metadata');
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(`${posterHash}${freelancerHash}`);
      const hashBuf = await crypto.subtle.digest('SHA-256', data);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const roomName = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
      const roomPayload = {
        name: roomName,
        creatorId: currentUser.address,
        creatorAddress: currentUser.address,
        jobCid: newRoomJobCid.trim(),
        idHash: newRoomIdHash.trim()
      };
      const roomResponse = await fetch('/api/chat/messages', {
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
          creatorAddress: currentUser.address,
          participantAddress: '',
          jobCid: newRoomJobCid.trim(),
          idHash: newRoomIdHash.trim()
        };
        setRooms(prev => [...prev, newRoom]);
        setSelectedRoom(newRoom.id);
        setRoomId(newRoom.id);
        setNewRoomJobCid('');
        setNewRoomIdHash('');
        setShowCreateRoom(false);
        setCreateRoomError('');
      } else {
        setCreateRoomError(roomData.error || 'Lỗi khi tạo phòng');
      }
    } catch {
      setCreateRoomError('Lỗi khi tạo phòng');
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
          onSelect={(id) => { setSelectedRoom(id); setRoomId(id); }}
          onAccept={handleAcceptRoom}
          currentUserAddress={currentUser.address}
        />


        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-400 bg-gray-200">
          {!showCreateRoom ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={async () => {
                if (!currentUser.address || currentUser.address === '') {
                  toast.error('Bạn chưa có địa chỉ ví. Vui lòng kết nối ví trước khi tạo phòng chat.');
                  return;
                }
                
                setShowCreateRoom(true);
              }}
            >
              TẠO PHÒNG MỚI
            </Button>
          ) : (
            <CreateRoomForm
              isCreating={isCreatingRoom}
              newRoomJobCid={newRoomJobCid}
              setNewRoomJobCid={setNewRoomJobCid}
              newRoomIdHash={newRoomIdHash}
              setNewRoomIdHash={setNewRoomIdHash}
              createRoomError={createRoomError}
              onSubmit={handleCreateRoom}
              onCancel={() => {
                setShowCreateRoom(false);
                setNewRoomJobCid('');
                setNewRoomIdHash('');
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
          currentUserId={currentUser.id}
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
