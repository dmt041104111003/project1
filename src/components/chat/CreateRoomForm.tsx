"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
	isCreating: boolean;
	newRoomName: string;
	setNewRoomName: (v: string) => void;
	newRoomParticipantAddress: string;
	setNewRoomParticipantAddress: (v: string) => void;
	createRoomError: string;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
};

export const CreateRoomForm: React.FC<Props> = ({
	isCreating,
	newRoomName,
	setNewRoomName,
	newRoomParticipantAddress,
	setNewRoomParticipantAddress,
	createRoomError,
	onSubmit,
	onCancel,
}) => {
	return (
		<form onSubmit={onSubmit} className="space-y-2">
			<input
				type="text"
				value={newRoomName}
				onChange={(e) => {
					if (e.target.value.length <= 10) {
						setNewRoomName(e.target.value);
					}
				}}
				placeholder="Tên phòng chat (tối đa 10 ký tự)..."
				maxLength={10}
				className="w-full px-3 py-2 border border-gray-400 focus:outline-none focus:border-gray-800"
				disabled={isCreating}
			/>
			{newRoomName.length > 0 && (
				<p className="text-xs text-gray-500">{newRoomName.length}/10 ký tự</p>
			)}
			<input
				type="text"
				value={newRoomParticipantAddress}
				onChange={(e) => setNewRoomParticipantAddress(e.target.value)}
				placeholder="Địa chỉ ví người muốn chat (0x...)"
				className="w-full px-3 py-2 border border-gray-400 focus:outline-none focus:border-gray-800"
				disabled={isCreating}
			/>

			{createRoomError && (
				<div className="text-blue-800 text-xs bg-blue-50 p-2 border border-blue-200">
					{createRoomError}
				</div>
			)}

			<div className="flex gap-2">
				<Button 
					type="submit" 
					variant="primary" 
					size="sm" 
					className="flex-1"
					disabled={isCreating || !newRoomName.trim() || newRoomName.trim().length > 10 || !newRoomParticipantAddress.trim()}
				>
					{isCreating ? 'ĐANG TẠO...' : 'TẠO'}
				</Button>
				<Button 
					type="button" 
					variant="outline" 
					size="sm" 
					onClick={onCancel}
					disabled={isCreating}
				>
					HỦY
				</Button>
			</div>
		</form>
	);
};

