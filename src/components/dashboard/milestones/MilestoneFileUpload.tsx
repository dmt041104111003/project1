"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/WalletContext';
import { MilestoneFileUploadProps } from '@/constants/escrow';

export const MilestoneFileUpload: React.FC<MilestoneFileUploadProps> = ({
  jobId,
  milestoneId,
  canSubmit,
  isOverdue,
  onFileUploaded,
  onSubmit,
  submitting,
  evidenceCid,
  interactionLocked = false,
}) => {
  const { account } = useWallet();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    try {
      setUploading(true);

      if (!account) {
        toast.error('Vui lòng kết nối ví trước');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'milestone_evidence');
      formData.append('jobId', String(jobId));
      formData.append('address', account);

      const uploadRes = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({ error: 'Tải lên thất bại' }));
        throw new Error(errorData.error || 'Tải lên thất bại');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Tải lên thất bại');

      const finalCid = uploadData.encCid || uploadData.ipfsHash;
      onFileUploaded(milestoneId, finalCid);
      toast.success('Tải file lên thành công!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error(`Lỗi upload file: ${errorMessage}`);
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {isOverdue && (
        <p className="text-xs text-red-600 font-bold">
          Cột mốc đã quá hạn, không thể nộp
        </p>
      )}
      {!canSubmit && !isOverdue && (
        <p className="text-xs text-orange-600 font-bold">
          ⚠ Cột mốc trước phải được chấp nhận trước khi nộp cột mốc này
        </p>
      )}
      {canSubmit && !isOverdue && (
        <>
          <label className="flex-1 min-w-[150px]">
            <input
              type="file"
              accept="*/*"
              title="Chọn file bằng chứng để tải lên"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleFileChange(file);
              }}
              disabled={uploading || submitting || isOverdue || interactionLocked}
              className="w-full px-2 py-1 border border-gray-400 text-xs rounded text-gray-700 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </label>
          {uploading && (
            <span className="text-xs text-blue-600">Đang upload...</span>
          )}
          {selectedFile && (
            <span className="text-xs text-green-600">
              ✓ {selectedFile.name}
            </span>
          )}
          {evidenceCid && (
            <span className="text-xs text-green-600">✓ CID sẵn sàng</span>
          )}
          <Button
            size="sm"
            onClick={() => onSubmit(milestoneId)}
            disabled={submitting || uploading || !evidenceCid?.trim() || isOverdue || interactionLocked}
            className="bg-blue-100 text-black hover:bg-blue-200 text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang nộp...' : 'Nộp'}
          </Button>
        </>
      )}
    </>
  );
};

