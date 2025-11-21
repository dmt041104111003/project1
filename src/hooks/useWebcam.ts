import { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';

export const useWebcam = (enabled: boolean = false) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

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
        setIsReady(true);
      }
    } catch (err) {
      console.error("Lỗi khởi động webcam:", err);
      toast.error("Không thể truy cập webcam. Vui lòng kiểm tra quyền truy cập.");
      setIsReady(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
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
          const file = new File([blob], 'webcam-photo.png', { type: 'image/png' });
          resolve(file);
        } else {
          canvas.toBlob((jpegBlob) => {
            if (jpegBlob) {
              const file = new File([jpegBlob], 'webcam-photo.jpg', { type: 'image/jpeg' });
              resolve(file);
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 1.0);
        }
      }, 'image/png');
    });
  };

  useEffect(() => {
    if (enabled) {
      startWebcam();
      return () => {
        stopWebcam();
      };
    } else {
      stopWebcam();
    }
  }, [enabled]);

  return {
    videoRef,
    canvasRef,
    isReady,
    capturePhoto,
    startWebcam,
    stopWebcam
  };
};

