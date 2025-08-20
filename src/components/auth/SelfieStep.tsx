'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle } from 'lucide-react';
import { SelfieStepProps } from '@/constants/did-verification';

export default function SelfieStep({ onNext, onError }: SelfieStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      onError('Không thể truy cập camera');
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        onNext();
      }
    }
  };

  return (
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
      <div className="flex justify-center space-x-4">
        <Button onClick={startCamera} variant="outline">
          <Camera className="w-4 h-4 mr-2" />
          Bật Camera
        </Button>
        <Button onClick={captureSelfie}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Chụp Ảnh
        </Button>
      </div>
    </div>
  );
}
