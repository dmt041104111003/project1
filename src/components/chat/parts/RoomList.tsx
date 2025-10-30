"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type Room = {
  id: string;
  name: string;
  lastMessage: string;
  chatAccepted: boolean;
  creatorAddress: string;
  participantAddress: string;
};

type Props = {
  rooms: Room[];
  selectedRoomId?: string;
  onSelect: (id: string) => void;
  onAccept: (id: string) => void;
  currentUserAddress: string;
};

const short = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

export const RoomList: React.FC<Props> = ({
  rooms,
  selectedRoomId,
  onSelect,
  onAccept,
  currentUserAddress,
}) => {
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
                    <h3 className="text-sm font-bold text-gray-800 truncate">
                      {short(
                        room.participantAddress === currentUserAddress
                          ? room.creatorAddress
                          : room.participantAddress
                      )}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {room.lastMessage}
                    </p>
                    {!room.chatAccepted && (
                      <p className="text-xs text-orange-600">Chờ accept</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút ACCEPT */}
              {!room.chatAccepted &&
                room.creatorAddress !== currentUserAddress && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept(room.id);
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
  );
};
