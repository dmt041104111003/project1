import { IDCardData, FaceVerificationResult, BlockchainData } from './profile';

export type VerificationStatus = 'idle' | 'processing' | 'success' | 'error';

export interface VerificationStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

export interface DIDVerificationStepsProps {
  step: number;
  verificationStatus: VerificationStatus;
  progress: number;
  errorMessage: string;
  idCardData: IDCardData | null;
  faceVerificationResult: FaceVerificationResult | null;
  isFaceApiLoading: boolean;
  showEncryptionPreview: boolean;
  transactionHash: string;
  blockchainData: BlockchainData | null;
  account: string;
  onNext: () => void;
  onBack: () => void;
  onError: (message: string) => void;
  onUploadIdCard: (file: File) => Promise<any>;
  onVerifyWebcam: (file: File) => Promise<any>;
  onRegisterProfile: () => void;
  onConfirmBlockchain: () => void;
  onBackToEncryption: () => void;
  onViewProfile: () => void;
}

export interface DIDVerificationLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const VERIFICATION_STEPS: VerificationStep[] = [
  {
    id: 1,
    title: 'Upload CCCD/Hộ chiếu',
    description: 'Tải lên ảnh căn cước công dân hoặc hộ chiếu',
    status: 'pending'
  },
  {
    id: 2,
    title: 'Xác minh Khuôn mặt Real-time',
    description: 'Chụp ảnh selfie để xác minh danh tính',
    status: 'pending'
  },
  {
    id: 3,
    title: 'Đăng ký trên Blockchain',
    description: 'Lưu thông tin xác minh lên blockchain',
    status: 'pending'
  },
  {
    id: 4,
    title: 'Hoàn thành',
    description: 'Xác minh DID thành công',
    status: 'pending'
  }
];

export const VERIFICATION_MESSAGES = {
  CAMERA_ERROR: 'Không thể truy cập camera',
  SUCCESS: 'DID của bạn đã được xác minh và ghi nhận on-chain',
  CHALLENGE_SIGN: 'Vui lòng ký challenge bằng ví của bạn để xác minh quyền sở hữu'
} as const;
