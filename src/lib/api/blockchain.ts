const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const PROFILE_MODULE = process.env.NEXT_PUBLIC_PROFILE_MODULE as string;
const DID_MODULE = process.env.NEXT_PUBLIC_DID_MODULE as string;
const APTOS_REST_URL = process.env.NEXT_PUBLIC_APTOS_REST_URL as string;

export async function registerDidOnChain(): Promise<string> {
  if (!window.aptos) throw new Error('Petra wallet not connected');
  const payload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${DID_MODULE}::register_did`,
    type_arguments: [],
    arguments: []
  };
  const tx = await window.aptos.signAndSubmitTransaction(payload);
  return tx.hash;
}

export async function registerProfileOnBlockchain(verificationCid: string, profileCid: string, cvCid: string, avatarCid: string): Promise<string> {
  if (!window.aptos) throw new Error('Petra wallet not connected');
  const payload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::register_profile`,
    type_arguments: [],
    arguments: [verificationCid, profileCid, cvCid, avatarCid]
  };
  const tx = await window.aptos.signAndSubmitTransaction(payload);
  return tx.hash;
}

export async function updateProfileAssets(profileCid: string, cvCid: string, avatarCid: string): Promise<string> {
  if (!window.aptos) throw new Error('Petra wallet not connected');
  const payload = {
    type: 'entry_function_payload',
    function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::update_profile_assets`,
    type_arguments: [],
    arguments: [profileCid, cvCid, avatarCid]
  };
  const tx = await window.aptos.signAndSubmitTransaction(payload);
  return tx.hash;
}

// addProfileCid deprecated in v32

export async function checkProfileExists(userAddress: string): Promise<boolean> {
  try {
    const response = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::has_profile`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!response.ok) return false;
    const data = await response.json() as unknown[];
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
        function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_profile_by_address`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!response.ok) return null;
    const data = await response.json() as unknown[];
    const raw = data[0] as Record<string, unknown>;
    if (!raw) return null;
    
    // CIDs are now stored as strings, no need to decode
    const verificationCid = (raw.verification_cid as string) || '';
    const profileCid = (raw.profile_cid as string) || '';
    const cvCid = (raw.cv_cid as string) || '';
    const avatarCid = (raw.avatar_cid as string) || '';
    
    return {
      did_hash: raw.did_hash as string,
      verification_cid: verificationCid,
      profile_cid: profileCid,
      cv_cid: cvCid,
      avatar_cid: avatarCid,
      trust_score: Number(raw.trust_score),
      created_at: Number(raw.created_at)
    };
  } catch (error) {
    console.error('Error getting profile data:', error);
    return null;
  }
}

export async function getVerificationCidByAddress(userAddress: string): Promise<string> {
  try {
    const response = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_verification_cid_by_address`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!response.ok) return '';
    const data = await response.json() as unknown[];
    return data[0] as string; // Already a string
  } catch (error) {
    console.error('Error getting verification CID:', error);
    return '';
  }
}

export async function getProfileCidsByAddress(userAddress: string): Promise<string[]> {
  try {
    const response = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_profile_cids_by_address`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!response.ok) return [];
    const data = await response.json() as unknown[];
    return data[0] as string[]; // Already string array
  } catch (error) {
    console.error('Error getting profile CIDs:', error);
    return [];
  }
}

export async function getLatestProfileCidByAddress(userAddress: string): Promise<string> {
  try {
    const response = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_latest_profile_cid_by_address`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!response.ok) return '';
    const data = await response.json() as unknown[];
    return data[0] as string; // Already a string
  } catch (error) {
    console.error('Error getting latest profile CID:', error);
    return '';
  }
}

export async function getDidDetails(userAddress: string) {
  try {
    const profileRes = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::get_profile_by_address`,
        type_arguments: [],
        arguments: [userAddress]
      })
    });
    if (!profileRes.ok) return { hasVerified: false, didHash: '0x', controller: '' };
    const profileJson = await profileRes.json() as unknown[];
    const didHash = (profileJson?.[0] as Record<string, unknown>)?.did_hash as string | undefined;
    if (!didHash) return { hasVerified: false, didHash: '0x', controller: '' };

    const ctrlRes = await fetch(`${APTOS_REST_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${DID_MODULE}::resolve_controller_by_hash`,
        type_arguments: [],
        arguments: [didHash]
      })
    });
    const controller = ctrlRes.ok ? ((await ctrlRes.json() as unknown[])[0] as string) : '';
    const hasVerified = !!controller && controller.toLowerCase() === userAddress.toLowerCase();
    return { hasVerified, didHash, controller };
  } catch (e) {
    console.error('Error getting DID details:', e);
    return { hasVerified: false, didHash: '0x', controller: '' };
  }
}

export async function getProfileRegisteredEventsForUser(userAddress: string, limit = 10) {
  try {
    const tag = `${CONTRACT_ADDRESS}::${PROFILE_MODULE}::Events`;
    const url = `${APTOS_REST_URL}/v1/accounts/${CONTRACT_ADDRESS}/events/${encodeURIComponent(tag)}/registered?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [] as unknown[];
    const events = await res.json() as unknown[];
    return (events as unknown[]).filter((e) => {
      const event = e as Record<string, unknown>;
      const data = event?.data as Record<string, unknown>;
      return data?.user?.toString().toLowerCase() === userAddress.toLowerCase();
    });
  } catch (e) {
    console.error('Error fetching profile registered events:', e);
    return [] as unknown[];
  }
}


