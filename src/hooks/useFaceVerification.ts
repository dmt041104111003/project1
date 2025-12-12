import { useState } from 'react';
import { toast } from 'sonner';

// ============ BYPASS MODE FOR TESTING ============
const BYPASS_FACE_VERIFICATION_UI = true;
// =================================================

interface VerificationResult {
  success: boolean;
  verified?: boolean;
  similarity?: number;
  is_real?: boolean;
  message: string;
  processing_time?: number;
}

export const useFaceVerification = (sessionId: string) => {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'idle' | 'face-matching'>('idle');
  const [currentAction, setCurrentAction] = useState<string>('');

  const startVerification = async (capturePhoto: () => Promise<File | null>) => {
    // ========== BYPASS MODE ==========
    if (BYPASS_FACE_VERIFICATION_UI) {
      setIsVerifying(true);
      setVerificationStep('face-matching');
      setCurrentAction('Đang xử lý...');
      
      // Simulate small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const bypassResult: VerificationResult = {
        success: true,
        verified: true,
        similarity: 0.99,
        is_real: true,
        message: 'Xác minh thành công',
        processing_time: 0.5
      };
      
      setResult(bypassResult);
      setVerificationStep('idle');
      setCurrentAction('');
      setIsVerifying(false);
      toast.success("Xác minh khuôn mặt thành công!");
      return;
    }
    // =================================
    
    if (!sessionId) {
      toast.error("Không có session_id");
      return;
    }

    setIsVerifying(true);
    setResult(null);

    try {
      const startTime = Date.now();
      setVerificationStep('face-matching');
      setCurrentAction('Đang xử lý...');
      
      const photoFile = await capturePhoto();
      
      if (!photoFile) {
        toast.error("Không thể chụp ảnh");
        setIsVerifying(false);
        setVerificationStep('idle');
        setCurrentAction('');
        return;
      }

      const formData = new FormData();
      formData.append('image', photoFile);
      formData.append('session_id', sessionId);
      
      const response = await fetch("/api/face/verify", {
        method: "POST",
        body: formData
      });
      
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        throw new Error("Không nhận được response từ server");
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error("Failed to parse JSON response:", responseText);
        throw new Error("Lỗi khi xử lý response từ server");
      }
      
      const processingTime = (Date.now() - startTime) / 1000;
      
      let message = "";
      if (!data.verified) {
        if (data.is_real === false) {
          message = "Không phải từ camera thật (có thể là ảnh giả, video, hoặc màn hình)";
        } else if (data.similarity < 0.4) {
          message = "Khuôn mặt không khớp";
        } else {
          const apiMessage = data.message || "";
          if (apiMessage.toLowerCase().includes('face') || apiMessage.toLowerCase().includes('match') || apiMessage.toLowerCase().includes('similarity')) {
            message = "Khuôn mặt không khớp";
          } else if (apiMessage.toLowerCase().includes('real') || apiMessage.toLowerCase().includes('fake')) {
            message = "Không phải từ camera thật";
          } else {
            message = apiMessage || "Xác minh thất bại";
          }
        }
      } else {
        message = "Xác minh thành công";
      }

      const verificationResult: VerificationResult = {
        success: data.verified === true,
        verified: data.verified === true,
        similarity: data.similarity || 0,
        is_real: data.is_real === true,
        message: message,
        processing_time: processingTime
      };

      setResult(verificationResult);
      setVerificationStep('idle');
      setCurrentAction('');

      if (verificationResult.success) {
        toast.success("Xác minh khuôn mặt thành công!");
      } else {
        if (data.is_real === false) {
          toast.error("Không phải từ camera thật");
        } else {
          toast.error("Khuôn mặt không khớp");
        }
      }
    } catch (error: any) {
      console.error("Lỗi:", error);
      toast.error(error.message || "Lỗi xác minh");
      setIsVerifying(false);
      setVerificationStep('idle');
      setCurrentAction('');
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    result,
    isVerifying,
    verificationStep,
    currentAction,
    startVerification
  };
};

