"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface VerificationResult {
  success: boolean;
  verified?: boolean;
  similarity?: number;
  is_real?: boolean;
  message: string;
  processing_time?: number;
}

interface VerificationResultProps {
  sessionId: string;
  idInfo: any;
  onRetry: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const VerificationResultDisplay: React.FC<VerificationResultProps> = ({
  sessionId,
  idInfo,
  onRetry,
  onCancel,
  onSuccess,
}) => {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Lỗi khởi động webcam:", err);
      toast.error("Không thể truy cập webcam. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async (): Promise<File | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return new Promise<File | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'webcam-photo.jpg', { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleVerify = async () => {
    if (!sessionId) {
      toast.error("Không có session_id");
      return;
    }

    setIsCapturing(true);
    const photoFile = await capturePhoto();
    setIsCapturing(false);

    if (!photoFile) {
      toast.error("Không thể chụp ảnh từ webcam");
      return;
    }

    setIsVerifying(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", photoFile);
      formData.append("action", "verify");
      formData.append("session_id", sessionId);

      const startTime = Date.now();
      const response = await fetch("/api/face", {
        method: "POST",
        body: formData
      });

      const processingTime = (Date.now() - startTime) / 1000;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Lỗi verify" }));
        throw new Error(errorData.error || "Lỗi xác minh khuôn mặt");
      }

      const data = await response.json();

      const verificationResult: VerificationResult = {
        success: data.success && data.verified === true,
        verified: data.verified,
        similarity: data.similarity,
        is_real: data.is_real,
        message: data.message || (data.verified ? "Xác minh thành công" : "Xác minh thất bại"),
        processing_time: processingTime
      };

      setResult(verificationResult);

      if (verificationResult.success) {
        toast.success("Xác minh khuôn mặt thành công!");
      } else {
        toast.error(verificationResult.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi xác minh khuôn mặt");
      setResult({
        success: false,
        message: err.message || "Lỗi xác minh khuôn mặt"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card variant="outlined" className="p-6 bg-white">
      <div className="text-lg font-bold text-windows-blue mb-4">Xác minh khuôn mặt</div>

      <div className="space-y-4">
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-md mx-auto border-2 border-windows-border rounded"
          />
          <canvas ref={canvasRef} className="hidden" />
          {isCapturing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
              <div className="text-white font-bold">Đang chụp ảnh...</div>
            </div>
          )}
        </div>

        <div className="text-sm text-black">
          <p className="mb-2">Vui lòng đảm bảo:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Khuôn mặt rõ ràng, đầy đủ ánh sáng</li>
            <li>Nhìn thẳng vào camera</li>
            <li>Không đeo khẩu trang, kính râm</li>
          </ul>
        </div>

        {!result && (
          <Button
            onClick={handleVerify}
            disabled={isVerifying || isCapturing}
            className="w-full"
          >
            {isVerifying ? "Đang xác minh..." : "Xác minh khuôn mặt"}
          </Button>
        )}

        {result && (
          <div className={`p-4 rounded-lg border-2 ${result.success ? 'bg-windows-bg border-windows-blue' : 'bg-windows-bg border-red-600'}`}>
            <div className="flex items-center gap-3 mb-3">
              {result.success ? (
                <div className="text-3xl text-windows-blue">✓</div>
              ) : (
                <div className="text-3xl text-red-600">✗</div>
              )}
              <div>
                <div className={`text-lg font-bold ${result.success ? 'text-windows-blue' : 'text-red-600'}`}>
                  {result.success ? 'Xác minh thành công' : 'Xác minh thất bại'}
                </div>
                <div className="text-sm text-black">{result.message}</div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {result.similarity !== undefined && (
                <div className="flex justify-between">
                  <span className="text-black">Độ tương đồng:</span>
                  <span className="font-bold text-windows-blue">{((result.similarity || 0) * 100).toFixed(2)}%</span>
                </div>
              )}
              {result.is_real !== undefined && (
                <div className="flex justify-between">
                  <span className="text-black">Khuôn mặt thật:</span>
                  <span className={`font-bold ${result.is_real ? 'text-windows-blue' : 'text-red-600'}`}>
                    {result.is_real ? 'Có' : 'Không'}
                  </span>
                </div>
              )}
              {result.processing_time !== undefined && (
                <div className="flex justify-between">
                  <span className="text-black">Thời gian xử lý:</span>
                  <span className="font-bold text-windows-blue">{(result.processing_time * 1000).toFixed(0)}ms</span>
                </div>
              )}
            </div>
          </div>
        )}

        {idInfo && idInfo.has_ocr_data && (
          <div className="p-3 bg-windows-bg border-2 border-windows-border rounded text-sm">
            <div className="font-bold text-windows-blue mb-2">Thông tin CCCD đã đọc:</div>
            <div className="space-y-1 text-black">
              {idInfo.id_number && <div>Số CMND/CCCD: {idInfo.id_number}</div>}
              {idInfo.name && <div>Họ và tên: {idInfo.name}</div>}
              {idInfo.date_of_birth && <div>Ngày sinh: {idInfo.date_of_birth}</div>}
            </div>
          </div>
        )}

        {result && (
          <div className="flex gap-2">
            {result.success ? (
              <Button
                onClick={() => {
                  if (onSuccess) {
                    onSuccess();
                  }
                }}
                className="flex-1"
              >
                Xác minh xong
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleVerify}
                  disabled={isVerifying || isCapturing}
                  variant="outline"
                  className="flex-1"
                >
                  {isVerifying ? "Đang xác minh..." : "Xác minh lại"}
                </Button>
                {onCancel && (
                  <Button
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1"
                  >
                    Đóng
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
