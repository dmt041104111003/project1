"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
	openId: string | null;
	onCancel: () => void;
	onConfirm: (id: string) => void;
};

export const DeleteConfirm: React.FC<Props> = ({ openId, onCancel, onConfirm }) => {
	if (!openId) return null;
	return (
		<div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded-lg border border-gray-400 w-80">
				<h3 className="text-lg font-bold text-gray-800 mb-4">Xác nhận xóa tin nhắn</h3>
				<p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa tin nhắn này? Hành động này không thể hoàn tác.</p>
				<div className="flex gap-3">
					<Button variant="outline" size="sm" onClick={onCancel} className="flex-1">HỦY</Button>
					<Button variant="primary" size="sm" onClick={() => onConfirm(openId)} className="flex-1 bg-red-600 hover:bg-red-700 text-black hover:text-white">XÓA</Button>
				</div>
			</div>
		</div>
	);
};

