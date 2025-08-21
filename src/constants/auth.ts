import { IDCardData, FaceVerificationResult } from './profile';
import { VerificationStatus } from './did-verification';

export interface VerificationProgressProps {
  steps: any[];
  currentStep: number;
}

export interface SelfieStepProps {
  onNext: () => void;
  onBack?: () => void;
  onError: (message: string) => void;
  onVerifyWebcam?: (file: File) => Promise<any>;
  isApiLoading?: boolean;
  verificationResult?: FaceVerificationResult | null;
  idCardData?: IDCardData | null;
}

export interface IDUploadStepProps {
  onNext: () => void;
  onUploadIdCard?: (file: File) => Promise<any>;
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
  verificationData: any;
  blockchainData: any;
  onViewProfile: () => void;
}
