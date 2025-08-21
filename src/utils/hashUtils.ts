import { sha256 } from 'js-sha256';
import { VerificationData } from '@/constants/auth';

export function hashCCCD(cccd: string): string {
  return sha256(cccd);
}

export function hashName(name: string): string {
  return sha256(name);
}

export function createVerificationHash(data: VerificationData): string {
  const combinedString = [
    data.did,
    data.cccd,
    data.name,
    data.cid,
    data.face_verified.toString(),
    data.distance.toString(),
    data.is_real.toString(),
    data.processing_time.toString(),
    data.verify_message
  ].join(':');
  return sha256(combinedString);
}

export function verifyDataIntegrity(data: VerificationData, storedHash: string): boolean {
  const currentHash = createVerificationHash(data);
  return currentHash === storedHash;
}

export function prepareBlockchainData(data: VerificationData) {
  return {
    did: data.did,
    cccd_hash: hashCCCD(data.cccd), // Vẫn hash CCCD vì nhạy cảm
    name_hash: data.name, // Gửi tên thật
    cid: data.cid,
    face_verified: data.face_verified,
    distance: parseInt((data.distance * 1e6).toString()),
    is_real: data.is_real,
    processing_time: parseInt(data.processing_time.toString()),
    verify_message: data.verify_message,
    verification_hash: data.verify_message // Gửi verify_message thật
  };
}
