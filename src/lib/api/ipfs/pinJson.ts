'use server';
import { pinJsonToIPFS } from '@/lib/api/pinata';

export async function pinVerificationJson(payload: unknown) {
  return await pinJsonToIPFS(payload);
}



