"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Room = {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageSender?: string;
  chatAccepted: boolean;
  creatorAddress: string;
  participantAddress: string;
};

type Props = {
  rooms: Room[];
  selectedRoomId?: string;
  onSelect: (id: string) => void;
  onAccept: (id: string) => void;
  onDelete: (id: string) => void;
  onEditName: (id: string, newName: string) => void;
  currentUserAddress: string;
};

const short = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

export const RoomList: React.FC<Props> = ({
  rooms,
  selectedRoomId,
  onSelect,
  onAccept,
  onDelete,
  onEditName,
  currentUserAddress,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRefs.current[openMenuId]) {
        if (!menuRefs.current[openMenuId]?.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleEditName = (roomId: string, currentName: string) => {
    setEditingRoomId(roomId);
    const short = (id: string) => id ? `${id.slice(0, 6)}...${id.slice(-4)}` : '';
    const shortId = short(roomId);
    const nameWithoutId = currentName.startsWith(shortId) 
      ? currentName.substring(shortId.length + 1).trim() 
      : currentName.trim();
    setEditName(nameWithoutId);
    setOpenMenuId(null);
  };

  const saveEditName = (roomId: string) => {
    if (editName.trim()) {
      onEditName(roomId, editName.trim());
      setEditingRoomId(null);
      setEditName('');
    }
  };

  const cancelEdit = () => {
    setEditingRoomId(null);
    setEditName('');
  };
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-400 bg-gray-50 mt-2">
        <h2 className="text-sm font-bold text-gray-800">DANH SÁCH PHÒNG</h2>
      </div>

      {/* Nếu không có phòng */}
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
              selectedRoomId === room.id
                ? "bg-gray-300 border-l-4 border-l-gray-800"
                : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              {/* Phần click chọn phòng */}
              <div
                className="flex-1 cursor-pointer"
                onClick={() => onSelect(room.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-1 min-w-0">
                    {editingRoomId === room.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            if (e.target.value.length <= 10) {
                              setEditName(e.target.value);
                            }
                          }}
                          maxLength={10}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditName(room.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1 text-sm border border-gray-400 focus:outline-none focus:border-gray-800"
                          autoFocus
                        />
                        {editName.length > 0 && (
                          <span className="text-xs text-gray-500">{editName.length}/10</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEditName(room.id);
                          }}
                          className="text-green-600 hover:text-green-800 text-xs"
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-gray-800 truncate">
                          {room.name}
                        </h3>
                        <p className="text-xs text-gray-600 truncate">
                          {(() => {
                            if (!room.lastMessage) return 'Chưa có tin nhắn';
                            
                            const currentUserAddr = currentUserAddress.toLowerCase();
                            const creatorAddr = (room.creatorAddress || '').toLowerCase();
                            const participantAddr = (room.participantAddress || '').toLowerCase();
                            const senderAddr = (room.lastMessageSender || '').toLowerCase();
                            
                            if (senderAddr === currentUserAddr) {
                              return `Bạn: ${room.lastMessage}`;
                            } else if (senderAddr === creatorAddr) {
                              return `${short(room.creatorAddress)}: ${room.lastMessage}`;
                            } else if (senderAddr === participantAddr) {
                              return `${short(room.participantAddress)}: ${room.lastMessage}`;
                            } else {
                              return room.lastMessage;
                            }
                          })()}
                        </p>
                        {!room.chatAccepted && (
                          <p className="text-xs text-orange-600">Chờ accept</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu 3 chấm */}
              <div className="flex gap-2 items-center">
                {((room.creatorAddress || '').toLowerCase() === currentUserAddress.toLowerCase() ||
                  (room.participantAddress || '').toLowerCase() === currentUserAddress.toLowerCase() ||
                  (!room.chatAccepted && (room.creatorAddress || '').toLowerCase() !== currentUserAddress.toLowerCase())) && (
                  <div className="relative" ref={(el) => { menuRefs.current[room.id] = el; }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === room.id ? null : room.id);
                      }}
                      className="p-1 hover:bg-gray-300 rounded"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="5" r="1"/>
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="12" cy="19" r="1"/>
                      </svg>
                    </button>
                    {openMenuId === room.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-400 shadow-lg z-10">
                        {!room.chatAccepted &&
                          (room.creatorAddress || '').toLowerCase() !== currentUserAddress.toLowerCase() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onAccept(room.id);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-200"
                            >
                              Accept phòng
                            </button>
                          )}
                        {((room.creatorAddress || '').toLowerCase() === currentUserAddress.toLowerCase() ||
                          (room.participantAddress || '').toLowerCase() === currentUserAddress.toLowerCase()) && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditName(room.id, room.name);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-200"
                            >
                              Sửa tên phòng
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                toast.warning('Bạn có chắc chắn muốn xóa phòng chat này?', {
                                  action: {
                                    label: 'Xóa',
                                    onClick: () => onDelete(room.id)
                                  },
                                  cancel: {
                                    label: 'Hủy',
                                    onClick: () => {}
                                  }
                                });
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-200"
                            >
                              Xóa phòng
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
