"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AvatarSVG } from '@/components/ui/avatar';
import { useChat, ChatProvider } from '@/contexts/ChatContext';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
const ChatContentInner: React.FC = () => {
  const { account } = useWallet();
  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: 'Chưa xác thực',
    address: '',
    commitment: '',
    verified: false
  });

  const [message, setMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [rooms, setRooms] = useState<Array<{
    id: string;
    name: string;
    lastMessage: string;
    commitment: string;
    chatAccepted: boolean;
    creatorAddress: string;
    participantCommitment: string;
    participantAddress: string;
  }>>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomCommitment, setNewRoomCommitment] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { messages, sendMessage, isLoading, setRoomId } = useChat();

  const getMiddleCommitment = (commitment: string) => {
    if (!commitment || commitment.length < 5) return commitment;
    const start = Math.floor((commitment.length - 5) / 2);
    return commitment.slice(start, start + 5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const messageText = message;
    
    await sendMessage(messageText, currentUser.name, currentUser.commitment || currentUser.id, replyingTo);
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
        // Reload rooms to update status
        loadRoomsFromFirebase();
      } else {
        toast.error(data.error || 'Lỗi khi accept phòng');
      }
    } catch (error) {
      console.error('Error accepting room:', error);
      toast.error('Lỗi khi accept phòng');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Sử dụng selectedRoom trực tiếp vì nó đã là roomId thực tế
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
        // Messages will be refreshed automatically by the polling
      } else {
        toast.error(data.error || 'Lỗi khi xóa tin nhắn');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
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
    } catch (error) {
      console.error('Error loading rooms from Firebase:', error);
    }
  }, [currentUser.address]);

  // Realtime Firebase listener for rooms
  React.useEffect(() => {
    if (!currentUser.address) return;

    const interval = setInterval(() => {
      loadRoomsFromFirebase();
    }, 10000); // Poll every 10 seconds for realtime updates

    return () => clearInterval(interval);
  }, [currentUser.address]);

  // Set current user when account changes
  React.useEffect(() => {
    if (account) {
      const getCurrentUserCommitment = async () => {
        try {
          const response = await fetch(`/api/blockchain/commitment?address=${account}`);
          const data = await response.json();
          if (data.success && data.commitment) {
            const newCurrentUser = {
              id: account,
              name: `USER${getMiddleCommitment(data.commitment)}`,
              address: account,
              commitment: data.commitment,
              verified: true
            };
            setCurrentUser(newCurrentUser);
          } else {
            const newCurrentUser = {
              id: account,
              name: `User ${account.slice(0, 8)}`,
              address: account,
              commitment: '',
              verified: true
            };
            setCurrentUser(newCurrentUser);
          }
        } catch (error) {
          console.error('Error getting commitment:', error);
          const newCurrentUser = {
            id: account,
            name: `User ${account.slice(0, 8)}`,
            address: account,
            commitment: '',
            verified: true
          };
          setCurrentUser(newCurrentUser);
        }
      };
      
      getCurrentUserCommitment();
    }
  }, [account]);

  React.useEffect(() => {
    if (currentUser.address) {
      loadRoomsFromFirebase();
    }
  }, [currentUser.address, loadRoomsFromFirebase]);


  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomCommitment.trim() || !newRoomName.trim()) return;

    setIsCreatingRoom(true);
    setCreateRoomError('');

    try {
      const response = await fetch(`/api/blockchain/commitment?commitment=${newRoomCommitment.trim()}`);
      const data = await response.json();
      console.log('Commitment verification response:', data);
      
      if (data.success) {
        if (!data.user || !data.user.verified) {
          setCreateRoomError('Commitment chưa xác thực DID');
          setIsCreatingRoom(false);
          return;
        }

        if (currentUser.address && data.user.address === currentUser.address) {
          setCreateRoomError('Không thể tạo phòng với chính mình');
          setIsCreatingRoom(false);
          return;
        }

        const roomPayload = {
          name: newRoomName.trim(),
          commitment: newRoomCommitment,
          creatorId: currentUser.address,
          creatorAddress: currentUser.address
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
            commitment: newRoomCommitment,
            chatAccepted: false,
            creatorAddress: currentUser.address,
            participantCommitment: newRoomCommitment,
            participantAddress: data.user.address
          };
          
          setRooms(prev => [...prev, newRoom]);
          setSelectedRoom(newRoom.id);
          setRoomId(newRoom.id);
        } else {
          setCreateRoomError(roomData.error || 'Lỗi khi tạo phòng');
          setIsCreatingRoom(false);
          return;
        }
        setNewRoomCommitment('');
        setNewRoomName('');
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


  if (!currentUser.verified) {
    return (
      <div className="fixed inset-0 flex bg-gray-100 chat-page z-10">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-300">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Chưa xác thực DID</h2>
              <p className="text-gray-600 mb-6">Bạn cần xác thực DID để sử dụng tính năng chat.</p>
              <p className="text-sm text-gray-500">Vui lòng xác thực DID trước khi truy cập chat.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-gray-100 chat-page z-10">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-400 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-800">
          <h1 className="text-lg font-bold">TIN NHẮN</h1>
        </div>


        {/* User Info */}
        <div className="px-4 py-4 border-b border-gray-400 bg-gray-50">
          <div className="flex items-center space-x-3">
            <AvatarSVG 
              address={currentUser.address}
              name={currentUser.name}
              size={40}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-800 truncate">
                {currentUser.name || 'Chưa có địa chỉ'}
              </h3>
              <p className="text-xs text-gray-600 truncate">
                {currentUser.address ? `${currentUser.address.slice(0, 8)}...${currentUser.address.slice(-8)}` : 'Chưa có địa chỉ'}
              </p>
            </div>
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-400 bg-gray-50 mt-2">
            <h2 className="text-sm font-bold text-gray-800">DANH SÁCH PHÒNG</h2>
          </div>
          
          {rooms.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600">
              <p className="text-sm">Chưa có phòng nào</p>
              <p className="text-xs mt-1">Tạo phòng mới để bắt đầu chat</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className={`px-4 py-3 border-b border-gray-300 hover:bg-gray-200 ${
                  selectedRoom === room.id ? 'bg-gray-300 border-l-4 border-l-gray-800' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedRoom(room.id);
                          setRoomId(room.id);
                        }}
                  >
                    <div className="flex items-center space-x-3">
                      <AvatarSVG 
                        address={room.commitment}
                        name={room.name}
                        size={32}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-800 truncate">
                          USER{getMiddleCommitment(room.commitment)}
                        </h3>
                        <p className="text-xs text-gray-600 truncate">
                          {room.lastMessage}
                        </p>
                        {!room.chatAccepted && (
                          <p className="text-xs text-orange-600">
                            Chờ accept
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!room.chatAccepted && room.participantAddress === currentUser.address && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptRoom(room.id);
                      }}
                    >
                      ACCEPT
                    </Button>
                  )}
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
              onClick={async () => {
                if (!currentUser.address || currentUser.address === '') {
                  toast.error('Bạn chưa có địa chỉ ví. Vui lòng kết nối ví trước khi tạo phòng chat.');
                  return;
                }
                
                // User already verified, just show create room form
                setShowCreateRoom(true);
              }}
            >
              TẠO PHÒNG MỚI
            </Button>
          ) : (
            <form onSubmit={handleCreateRoom} className="space-y-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => {
                  setNewRoomName(e.target.value);
                  setCreateRoomError(''); // Clear error when typing
                }}
                placeholder="Nhập tên phòng..."
                className="w-full px-3 py-2 border border-gray-400 focus:outline-none focus:border-gray-800"
                disabled={isCreatingRoom}
              />
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
                  disabled={!newRoomCommitment.trim() || !newRoomName.trim() || isCreatingRoom}
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
                    setNewRoomName('');
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
      <div className="flex-1 flex">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-400 px-4 py-3">
            {selectedRoom ? (
              <div className="flex items-center space-x-3">
                <AvatarSVG 
                  address={rooms.find(r => r.id === selectedRoom)?.commitment || '0x0000000000000000000000000000000000000000'}
                  name={rooms.find(r => r.id === selectedRoom)?.name || selectedRoom}
                  size={40}
                />
                <div>
                  <h2 className="font-bold text-gray-800">
                    USER{getMiddleCommitment(rooms.find(r => r.id === selectedRoom)?.commitment || '')}
                  </h2>
                  <p className="text-xs text-gray-600">
                    {rooms.find(r => r.id === selectedRoom)?.commitment ? 
                      `${rooms.find(r => r.id === selectedRoom)?.commitment.slice(0, 8)}...${rooms.find(r => r.id === selectedRoom)?.commitment.slice(-8)}` : 
                      'Unknown commitment'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Verified
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600">
                <h2 className="font-bold text-gray-800">Chọn phòng để bắt đầu chat</h2>
                <p className="text-xs">Chọn phòng từ danh sách bên trái</p>
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
                const isOwnMessage = (currentUser.commitment || currentUser.id) === msg.senderId;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}
                  >
                    <div className="flex items-end gap-2">
                      {isOwnMessage && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(msg.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      <div className={`max-w-xs px-4 py-2 border ${
                        isOwnMessage 
                          ? 'bg-gray-800 text-white border-gray-800' 
                          : 'bg-gray-200 text-gray-800 border-gray-400'
                      }`}>
                        {msg.replyTo && (
                          <div className={`mb-2 p-2 border-l-4 ${
                            isOwnMessage 
                              ? 'bg-gray-700 border-gray-600' 
                              : 'bg-gray-100 border-gray-400'
                          }`}>
                            <div className={`text-xs ${
                              isOwnMessage ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {msg.replyTo.senderId === (currentUser.commitment || currentUser.id)
                                ? 'Replying to yourself' 
                                : `Replying to USER${getMiddleCommitment(msg.replyTo.senderId)}`}
                            </div>
                            <div className={`text-xs truncate ${
                              isOwnMessage ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {msg.replyTo.text}
                            </div>
                          </div>
                        )}
                        {!isOwnMessage && (
                          <div className="text-xs font-bold text-gray-800 mb-1">
                            USER{getMiddleCommitment(msg.senderId)}:
                          </div>
                        )}
                        <div className="text-sm">{msg.text}</div>
                        <div className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                      {!isOwnMessage && (
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Reply
                        </button>
                      )}
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
                      (() => {
                        const currentRoom = rooms.find(r => r.id === selectedRoom);
                        const isChatAccepted = currentRoom?.chatAccepted !== false;
                        const isParticipant = currentRoom?.participantAddress === currentUser.address;
                        const isCreator = currentRoom?.creatorAddress === currentUser.address;
                        
                        
                        return isChatAccepted ? (
                          <div>
                            {replyingTo && (
                              <div className="mb-2 p-2 bg-gray-100 border-l-4 border-blue-500">
                                <div className="text-xs text-gray-600">
                                  {replyingTo.senderId === currentUser.id 
                                    ? 'Reply chính mình:' 
                                    : `Reply ${replyingTo.sender}:`}
                                </div>
                                <div className="text-sm text-gray-800 truncate">
                                  {replyingTo.text}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatTime(replyingTo.timestamp)}
                                </div>
                                <button
                                  onClick={() => setReplyingTo(null)}
                                  className="text-xs text-red-600 hover:text-red-800 mt-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            <form onSubmit={handleSubmit} className="flex gap-2">
                              <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={replyingTo ? "Reply..." : "Nhập tin nhắn..."}
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
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-4">
                            {isParticipant ? (
                              <div className="space-y-3">
                                <p className="text-sm">Bạn có lời mời chat từ {currentRoom?.name}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAcceptRoom(selectedRoom)}
                                >
                                  ACCEPT CHAT
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm">Đang chờ bên kia xác nhận cuộc trò chuyện</p>
                                <p className="text-xs mt-1">Chưa thể gửi tin nhắn</p>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <p className="text-sm">Chọn phòng để gửi tin nhắn</p>
                      </div>
                    )}
                  </div>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg border border-gray-400 w-80">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Xác nhận xóa tin nhắn</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa tin nhắn này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1"
              >
                HỦY
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDeleteMessage(showDeleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-black hover:text-white"
              >
                XÓA
              </Button>
            </div>
          </div>
        </div>
      )}
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
