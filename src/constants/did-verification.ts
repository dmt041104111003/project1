export interface VerificationStep {
  id: number;
  title: string;
  description: string;
}

export type VerificationStatus = 'idle' | 'processing' | 'success' | 'error';

export interface VerificationProgressProps {
  steps: VerificationStep[];
  currentStep: number;
}

export interface SelfieStepProps {
  onNext: () => void;
  onBack?: () => void;
  onError: (message: string) => void;
  onVerifyWebcam?: (file: File) => Promise<any>;
  isApiLoading?: boolean;
  verificationResult?: any;
  idCardData?: {cccd: string, name: string} | null;
}

export interface IDUploadStepProps {
  onNext: () => void;
  onUploadIdCard?: (file: File) => Promise<any>;
  isApiLoading?: boolean;
  idCardData?: {cccd: string, name: string} | null;
}

export interface ChallengeSignStepProps {
  verificationStatus: VerificationStatus;
  progress: number;
  onSignChallenge: () => void;
}

export const VERIFICATION_STEPS: VerificationStep[] = [
  { 
    id: 1, 
    title: 'Upload CCCD/Hộ chiếu', 
    description: 'Upload ảnh giấy tờ tùy thân để xác minh danh tính' 
  },
  { 
    id: 2, 
    title: 'Xác minh Khuôn mặt Real-time', 
    description: 'Chụp ảnh selfie để xác minh liveness và so sánh với CCCD' 
  },
  { 
    id: 3, 
    title: 'Ký Challenge', 
    description: 'Ký challenge bằng ví để xác minh quyền sở hữu' 
  },
  { 
    id: 4, 
    title: 'Hoàn thành', 
    description: 'Xác minh DID thành công' 
  }
];

export const VERIFICATION_MESSAGES = {
  CAMERA_ERROR: 'Không thể truy cập camera',
  SUCCESS: 'DID của bạn đã được xác minh và ghi nhận on-chain',
  CHALLENGE_SIGN: 'Vui lòng ký challenge bằng ví của bạn để xác minh quyền sở hữu'
} as const;
