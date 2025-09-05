export interface ProfileData {
  did_hash: string;
  verification_cid: string;
  profile_cid: string;
  cv_cid: string;
  avatar_cid: string;
  created_at: number;
}

export interface ProfileDisplayProps {
  userAddress: string;
}

export interface IDCardData {
  cccd: string;
  name: string;
  cid?: string; 
}

export interface FaceVerificationResult {
  success: boolean;
  distance: number;
  is_real: boolean;
  processing_time: number;
  message: string;
  threshold?: number;
}

export interface BlockchainData {
  did: string;
  cccd_hash: string;
  name_hash: string;
  cid: string;
  face_verified: boolean;
  distance: number;
  is_real: boolean;
  processing_time: number;
  verify_message: string;
  verification_hash: string;
}
