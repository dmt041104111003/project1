"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

type Message = { id: string; text: string; sender: string; senderId: string; timestamp: number; replyTo?: Message | null };
type Room = { id: string; name: string; lastMessage: string; chatAccepted: boolean; creatorAddress: string; participantAddress: string };

type Props = {
	selectedRoom?: Room;
	messages: Message[];
	isLoading: boolean;
	currentUserId: string;
	formatTime: (t: number) => string;
	replyingTo: Message | null;
	setReplyingTo: (m: Message | null) => void;
	message: string;
	setMessage: (v: string) => void;
	handleSubmit: (e: React.FormEvent) => void;
	handleAcceptRoom: (roomId: string) => Promise<void>;
};

const short = (addr: string) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '');

export const ChatPanel: React.FC<Props> = ({
	selectedRoom,
	messages,
	isLoading,
	currentUserId,
	formatTime,
	replyingTo,
	setReplyingTo,
	message,
	setMessage,
	handleSubmit,
	handleAcceptRoom,
}) => {
	return (
		<div className="flex-1 flex flex-col">
			<div className="bg-white border-b border-gray-400 px-4 py-3">
				{selectedRoom ? (
					<div className="flex items-center space-x-3">
						<div className="flex-1 min-w-0">
							<h2 className="font-bold text-gray-800">{selectedRoom.name}</h2>
							<p className="text-xs text-gray-600">
								{selectedRoom.participantAddress 
									? `Với ${short(selectedRoom.participantAddress)}`
									: `Tạo bởi ${short(selectedRoom.creatorAddress)}`
								}
							</p>
							{selectedRoom.chatAccepted && (
								<p className="text-xs text-green-600">Đã chấp nhận</p>
							)}
						</div>
					</div>
				) : (
					<div className="text-center text-gray-600">
						<h2 className="font-bold text-gray-800">Chọn phòng để bắt đầu chat</h2>
						<p className="text-xs">Chọn phòng từ danh sách bên trái</p>
					</div>
				)}
			</div>

			<div className="flex-1 overflow-y-auto bg-white p-4">
				{!selectedRoom ? (
					<div className="text-center text-gray-600 py-12">
						<p className="text-lg font-bold text-gray-700 mb-2">Chưa chọn phòng</p>
						<p className="text-sm text-gray-500">Tạo phòng mới hoặc chọn phòng để bắt đầu chat</p>
					</div>
				) : isLoading ? (
					<div className="text-center text-gray-600 py-8">Đang tải tin nhắn...</div>
				) : messages.length === 0 ? (
					<div className="text-center text-gray-600 py-12">
						<p className="text-lg font-bold text-gray-700 mb-2">Chưa có tin nhắn nào</p>
						<p className="text-sm text-gray-500">Hãy bắt đầu cuộc trò chuyện!</p>
					</div>
				) : (
					<div className="space-y-3">
						{messages.map((msg) => {
							const isOwn = currentUserId === msg.senderId;
							return (
								<div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
									<div className="flex items-end gap-2">
										{isOwn && (
											<div className="flex flex-col gap-1">
												<button onClick={() => setReplyingTo(msg)} className="text-xs text-blue-400 hover:text-blue-300">Reply</button>
											</div>
										)}
										<div className={`max-w-xs px-4 py-2 border ${isOwn ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-200 text-gray-800 border-gray-400'}`}>
											{msg.replyTo && (
												<div className={`mb-2 p-2 border-l-4 ${isOwn ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-400'}`}>
													<div className={`text-xs ${isOwn ? 'text-gray-300' : 'text-gray-600'}`}>
														{msg.replyTo.senderId === currentUserId ? 'Replying to yourself' : `Replying to ${short(msg.replyTo.senderId)}`}
													</div>
													<div className={`text-xs truncate ${isOwn ? 'text-gray-400' : 'text-gray-700'}`}>{msg.replyTo.text}</div>
												</div>
											)}
											{!isOwn && (
												<div className="text-xs font-bold text-gray-800 mb-1">{short(msg.senderId)}:</div>
											)}
											<div className="text-sm">{msg.text}</div>
											<div className={`text-xs mt-1 ${isOwn ? 'text-gray-300' : 'text-gray-600'}`}>
												{formatTime(msg.timestamp)}
											</div>
										</div>
										{!isOwn && (
											<button onClick={() => setReplyingTo(msg)} className="text-xs text-blue-600 hover:text-blue-800">Reply</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div className="bg-white border-t border-gray-400 p-4">
				{selectedRoom ? (
					selectedRoom.chatAccepted !== false ? (
						<div>
							{replyingTo && (
								<div className="mb-2 p-2 bg-gray-100 border-l-4 border-blue-500">
									<div className="text-xs text-gray-600">{replyingTo.senderId === currentUserId ? 'Reply chính mình:' : `Reply ${replyingTo.sender}:`}</div>
									<div className="text-sm text-gray-800 truncate">{replyingTo.text}</div>
									<div className="text-xs text-gray-500 mt-1">{formatTime(replyingTo.timestamp)}</div>
									<button onClick={() => setReplyingTo(null)} className="text-xs text-red-600 hover:text-red-800 mt-1">Cancel</button>
								</div>
							)}
							<form onSubmit={handleSubmit} className="flex gap-2">
								<input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={replyingTo ? 'Reply...' : 'Nhập tin nhắn...'} className="flex-1 px-4 py-2 border border-gray-400 focus:outline-none focus:border-gray-800" />
								<Button type="submit" disabled={!message.trim()} variant="primary" size="md">GỬI</Button>
							</form>
						</div>
					) : (
						<div className="text-center text-gray-500 py-4">
							<div className="space-y-3">
								<p className="text-sm">Phòng chat chưa được chấp nhận</p>
								{selectedRoom.creatorAddress.toLowerCase() !== currentUserId.toLowerCase() && (
									<Button variant="outline" size="sm" onClick={() => handleAcceptRoom(selectedRoom.id)}>ACCEPT CHAT</Button>
								)}
							</div>
						</div>
					)
				) : (
					<div className="text-center text-gray-500 py-4"><p className="text-sm">Chọn phòng để gửi tin nhắn</p></div>
				)}
			</div>
		</div>
	);
};

