import { IDCardData, FaceVerificationResult, BlockchainData } from './profile';
import { VerificationStatus } from './did-verification';

export interface VerificationStep {
  id: number;
  title: string;
  description: string;
  status?: 'pending' | 'current' | 'completed' | 'error';
}

export interface VerificationProgressProps {
  steps: VerificationStep[];
  currentStep: number;
}

export interface SelfieStepProps {
  onNext: () => void;
  onBack?: () => void;
  onError: (message: string) => void;
  onVerifyWebcam?: (file: File) => Promise<FaceVerificationResult>;
  isApiLoading?: boolean;
  verificationResult?: FaceVerificationResult | null;
  idCardData?: IDCardData | null;
}

export interface IDUploadStepProps {
  onNext: () => void;
  onUploadIdCard?: (file: File) => Promise<IDCardData>;
  isApiLoading?: boolean;
  idCardData?: IDCardData | null;
}

export interface ChallengeSignStepProps {
  verificationStatus: VerificationStatus;
  progress: number;
  onSignChallenge: () => void;
}

// Auth related interfaces
export interface VerificationData {
  did: string;
  cccd: string;
  name: string;
  cid: string;
  face_verified: boolean;
  distance: number;
  is_real: boolean;
  processing_time: number;
  verify_message: string;
}

export interface EncryptionPreviewProps {
  verificationData: VerificationData;
  onConfirm: () => void;
  onBack: () => void;
}

export interface BlockchainResultProps {
  transactionHash: string;
  verificationData: VerificationData;
  blockchainData: BlockchainData;
  onViewProfile: () => void;
}

// Profile related interfaces
export interface ProfileFormData {
  headline: string;
  summary: string;
  skills: string[];
  experience: string;
  education: string;
  links: string[];
  avatar?: File;
  cv?: File;
}
