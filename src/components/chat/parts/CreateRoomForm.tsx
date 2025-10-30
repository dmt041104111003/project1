"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
	isCreating: boolean;
	newRoomJobCid: string;
	setNewRoomJobCid: (v: string) => void;
	newRoomIdHash: string;
	setNewRoomIdHash: (v: string) => void;
	createRoomError: string;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
};

export const CreateRoomForm: React.FC<Props> = ({
	isCreating,
	newRoomJobCid,
	setNewRoomJobCid,
	newRoomIdHash,
	setNewRoomIdHash,
	createRoomError,
	onSubmit,
	onCancel,
}) => {
	return (
		<form onSubmit={onSubmit} className="space-y-2">
			<input
				type="text"
				value={newRoomJobCid}
				onChange={(e) => setNewRoomJobCid(e.target.value)}
				placeholder="Job IPFS CID..."
				className="w-full px-3 py-2 border border-gray-400 focus:outline-none focus:border-gray-800"
				disabled={isCreating}
			/>
			<input
				type="text"
				value={newRoomIdHash}
				onChange={(e) => setNewRoomIdHash(e.target.value)}
				placeholder="ID hash (0x...) của bạn (poster hoặc freelancer)"
				className="w-full px-3 py-2 border border-gray-400 focus:outline-none focus:border-gray-800"
				disabled={isCreating}
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
					disabled={isCreating}
				>
					{isCreating ? 'ĐANG KIỂM TRA...' : 'TẠO'}
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


