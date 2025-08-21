import { BlockchainData } from '@/constants/profile';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const MODULE_NAME = process.env.NEXT_PUBLIC_MODULE_NAME;
const APTOS_REST_URL = process.env.NEXT_PUBLIC_APTOS_REST_URL;

export async function registerProfileOnBlockchain(blockchainData: BlockchainData): Promise<string> {
  if (!window.aptos) {
    throw new Error('Petra wallet not connected');
  }

  const payload = {
    type: "entry_function_payload",
    function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::register_profile`,
    type_arguments: [],
    arguments: [
      blockchainData.did,
      blockchainData.cccd_hash,
      blockchainData.cid,
      blockchainData.name_hash,
      blockchainData.face_verified,
      blockchainData.distance,
      blockchainData.is_real,
      blockchainData.processing_time,
      blockchainData.verify_message,
      blockchainData.verification_hash
    ]
  };

  const transaction = await window.aptos.signAndSubmitTransaction(payload);
  return transaction.hash;
}

export async function updateProfileOnBlockchain(blockchainData: BlockchainData): Promise<string> {
  if (!window.aptos) {
    throw new Error('Petra wallet not connected');
  }

  const payload = {
    type: "entry_function_payload",
    function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::update_profile`,
    type_arguments: [],
    arguments: [
      blockchainData.cid,
      blockchainData.name_hash,
      blockchainData.face_verified,
      blockchainData.distance,
      blockchainData.is_real,
      blockchainData.processing_time,
      blockchainData.verify_message,
      blockchainData.verification_hash
    ]
  };

  const transaction = await window.aptos.signAndSubmitTransaction(payload);
  return transaction.hash;
}

export async function checkProfileExists(userAddress: string): Promise<boolean> {
  try {
    const response = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::has_profile`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!response.ok) { return false; }
    const data = await response.json();
    return data[0] as boolean;
  } catch (error) {
    console.error('Error checking profile existence:', error);
    return false;
  }
}

export async function getProfileData(userAddress: string) {
  try {
    const response = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_profile_by_address`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!response.ok) { return null; }
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('Error getting profile data:', error);
    return null;
  }
}
