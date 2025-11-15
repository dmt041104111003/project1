"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MilestoneFileUploadProps } from '@/constants/escrow';

export const MilestoneFileUpload: React.FC<MilestoneFileUploadProps> = ({
  milestoneId,
  canSubmit,
  isOverdue,
  onFileUploaded,
  onSubmit,
  submitting,
  evidenceCid,
}) => {
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

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'milestone_evidence');

      const uploadRes = await fetch('/api/ipfs/upload-file', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');

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
          Milestone đã quá hạn, không thể submit
        </p>
      )}
      {!canSubmit && !isOverdue && (
        <p className="text-xs text-orange-600 font-bold">
          ⚠ Milestone trước phải được accepted trước khi submit milestone này
        </p>
      )}
      {canSubmit && !isOverdue && (
        <>
          <label className="flex-1 min-w-[150px]">
            <input
              type="file"
              accept="*/*"
              title="Chọn file evidence để upload"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleFileChange(file);
              }}
              disabled={uploading || submitting || isOverdue}
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
            <span className="text-xs text-green-600">✓ CID ready</span>
          )}
          <Button
            size="sm"
            onClick={() => onSubmit(milestoneId)}
            disabled={submitting || uploading || !evidenceCid?.trim() || isOverdue}
            className="bg-blue-100 text-black hover:bg-blue-200 text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang submit...' : 'Submit'}
          </Button>
        </>
      )}
    </>
  );
};

