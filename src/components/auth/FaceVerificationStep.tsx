"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  WebcamView,
  VerificationProgress,
  VerificationResultDisplay,
} from './VerificationUI';

interface VerificationResult {
  success: boolean;
  verified?: boolean;
  similarity?: number;
  is_real?: boolean;
  message: string;
  processing_time?: number;
}

interface FaceVerificationStepProps {
  verificationSessionId: string;
  idInfo: any;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isVerifying: boolean;
  verificationStep: 'idle' | 'face-matching';
  currentAction: string;
  result: VerificationResult | null;
  onStartVerification: () => void;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FaceVerificationStep({
  verificationSessionId,
  idInfo,
  videoRef,
  canvasRef,
  isVerifying,
  verificationStep,
  currentAction,
  result,
  onStartVerification,
  onSuccess,
  onCancel,
}: FaceVerificationStepProps) {
  return (
    <Card variant="outlined" className="p-4 sm:p-6 bg-white mt-4">
      <div className="text-base sm:text-lg font-bold text-windows-blue mb-4">
        Xác minh khuôn mặt
      </div>

      <div className="space-y-4">
        <WebcamView
          videoRef={videoRef}
          canvasRef={canvasRef}
          isVerifying={isVerifying}
          verificationStep={verificationStep}
          currentAction={currentAction}
        />

        <VerificationProgress
          verificationStep={verificationStep}
          isVerifying={isVerifying}
        />

        {!result && (
          <Button
            onClick={onStartVerification}
            disabled={isVerifying}
            className="w-full text-sm sm:text-base"
          >
            {isVerifying ? "Đang so sánh khuôn mặt..." : "Bắt đầu xác minh"}
          </Button>
        )}

        {result && (
          <VerificationResultDisplay
            result={result}
            onRetry={onStartVerification}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        )}

        {idInfo && idInfo.has_ocr_data && (
          <div className="p-3 bg-windows-bg border-2 border-windows-border rounded text-xs sm:text-sm">
            <div className="font-bold text-windows-blue mb-2">Thông tin CCCD đã đọc:</div>
            <div className="space-y-1 text-black">
              {idInfo.id_number && <div>Số CMND/CCCD: {idInfo.id_number}</div>}
              {idInfo.name && <div>Họ và tên: {idInfo.name}</div>}
              {idInfo.date_of_birth && <div>Ngày sinh: {idInfo.date_of_birth}</div>}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

