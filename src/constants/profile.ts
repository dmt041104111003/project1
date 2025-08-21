export interface ProfileData {
  did: string;
  cccd_hash: string;
  name_hash: string;
  cid: string;
  created_at: string;
  face_verified: boolean;
  distance: number;
  is_real: boolean;
  processing_time: number;
  verify_message: string;
  trust_score: number;
  verification_hash: string;
}

export interface ProfileDisplayProps {
  userAddress: string;
}

export interface IDCardData {
  cccd: string;
  name: string;
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
