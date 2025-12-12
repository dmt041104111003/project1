"use client";

import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OCRResult } from './VerificationUI';

interface IDCardUploadStepProps {
  step: 'upload' | 'verify';
  uploading: boolean;
  uploadingFace: boolean;
  ocrError: string | null;
  idCardPreview: string | null;
  idInfo: any;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetry: () => void;
  onUploadFace?: () => void;
}

export function IDCardUploadStep({
  step,
  uploading,
  uploadingFace,
  ocrError,
  idCardPreview,
  idInfo,
  onFileChange,
  onRetry,
  onUploadFace,
}: IDCardUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card variant="outlined" className="p-4 sm:p-6 bg-white mt-4">
      <div className="text-base sm:text-lg font-bold text-windows-blue mb-4">
        Xác minh danh tính
      </div>

      {step === "upload" && (
        <div className="space-y-4">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-black mb-2">
              Bước 1: Tải ảnh CCCD/CMND
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              disabled={uploading || uploadingFace}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || uploadingFace}
              variant="outline"
              className="w-full text-sm sm:text-base"
            >
              {uploading ? "Đang xử lý OCR..." : uploadingFace ? "Đang chuyển sang xác minh..." : "Chọn ảnh CCCD/CMND"}
            </Button>
          </div>

          {ocrError && (
            <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded">
              <p className="text-sm font-bold text-blue-800">⚠ Lỗi xác minh</p>
              <p className="text-xs text-blue-700 mt-1">{ocrError}</p>
            </div>
          )}

          {idCardPreview && (
            <div className="mt-4">
              <img
                src={idCardPreview}
                alt="CCCD Preview"
                className="w-full h-auto max-w-full border-2 border-windows-border rounded"
              />
            </div>
          )}

          {idInfo && <OCRResult idInfo={idInfo} />}
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          {idCardPreview && (
            <div className="mt-4">
              <div className="text-xs sm:text-sm font-semibold text-black mb-2">
                Ảnh CCCD đã upload:
              </div>
              <img
                src={idCardPreview}
                alt="CCCD Preview"
                className="w-full h-auto max-w-full border-2 border-windows-border rounded"
              />
            </div>
          )}

          {idInfo && <OCRResult idInfo={idInfo} />}

          <div className="mt-4 space-y-2">
            {onUploadFace && (
              <Button
                className="w-full text-sm sm:text-base"
                onClick={onUploadFace}
                disabled={uploadingFace}
              >
                {uploadingFace ? "Đang xử lý..." : "Xác nhận và tiếp tục"}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full text-sm sm:text-base"
              onClick={onRetry}
              disabled={uploadingFace}
            >
              Tải lại ảnh khác
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

