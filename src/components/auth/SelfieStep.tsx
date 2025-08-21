'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, RotateCcw, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { SelfieStepProps } from '@/constants/auth';

export default function SelfieStep({ 
  onNext, 
  onBack,
  onError, 
  onVerifyWebcam, 
  isApiLoading = false, 
  verificationResult,
  idCardData 
}: SelfieStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  useEffect(() => {
    if (!idCardData) {
      onError('Vui lòng upload CCCD trước khi xác minh khuôn mặt');
    }
  }, [idCardData, onError]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      onError('Không thể truy cập camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current || !onVerifyWebcam) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob(async (blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setVerificationAttempts(prev => prev + 1);
        
        try {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
          await onVerifyWebcam(file);
        } catch (error) {
          console.error('Verification error:', error);
        }
      }
    }, 'image/jpeg', 0.8);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setVerificationAttempts(0);
    startCamera();
  };

  const goBack = () => {
    stopCamera();
    if (onBack) {
      onBack();
    }
  };

  const proceedToNext = () => {
    stopCamera();
    onNext();
  };

  return (
    <div className="space-y-6">
      {idCardData && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Thông tin CCCD đã upload:</h4>
          <div className="space-y-1 text-xs text-blue-800">
            <p><span className="font-medium">CCCD:</span> {idCardData.cccd || 'Không đọc được'}</p>
            <p><span className="font-medium">Họ tên:</span> {idCardData.name || 'Không đọc được'}</p>
          </div>
        </div>
      )}

      {!capturedImage ? (
        <div className="space-y-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md mx-auto rounded-lg border"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          <div className="flex flex-col items-center space-y-3">
            {!isCameraActive ? (
              <Button onClick={startCamera} variant="outline" className="w-full max-w-xs">
                <Camera className="w-4 h-4 mr-2" />
                Bật Camera
              </Button>
            ) : (
              <Button onClick={captureAndVerify} className="w-full max-w-xs">
                <CheckCircle className="w-4 h-4 mr-2" />
                Chụp Ảnh
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured selfie"
              className="w-full max-w-md mx-auto rounded-lg border"
            />
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button onClick={retakePhoto} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Chụp lại
            </Button>
          </div>
          
          {isApiLoading && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xác minh khuôn mặt...</span>
            </div>
          )}
        </div>
      )}
      
      {verificationResult && (
        <div className={`p-3 rounded-lg text-sm ${
          verificationResult.success 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {verificationResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <div>
              <p className="font-medium">
                {verificationResult.success ? '✓ Xác minh thành công' : '✗ Xác minh thất bại'}
              </p>
              <p className="text-xs mt-1">{verificationResult.message}</p>
              {verificationResult.distance && (
                <div className="text-xs mt-1 space-y-1">
                  <p>
                    Độ tương đồng: {((1 - verificationResult.distance) * 100).toFixed(1)}% 
                    (Khoảng cách: {verificationResult.distance.toFixed(3)})
                  </p>
                  <p className="text-gray-600">
                    Ngưỡng chấp nhận: ≤ 0.6 (≥ 40% tương đồng)
                  </p>
                  {verificationResult.processing_time && (
                    <p className="text-gray-500">
                      Thời gian xử lý: {verificationResult.processing_time.toFixed(2)}s
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button onClick={goBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        
        {verificationResult?.success && (
          <Button onClick={proceedToNext} className="ml-auto">
            Tiếp tục
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

    </div>
  );
}
