import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, MESSAGES, ROLES } from '@/constants/auth';
import type { RoleType } from '@/constants/auth';
import { useWallet } from '@/contexts/WalletContext';

interface Role {
  name: string;
  cids?: string[];
}

interface IdInfo {
  id_number: string;
  name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  date_of_expiry: string;
}

export function useRoleManagement(account: string | null) {
  const { signAndSubmitTransaction, isConnected } = useWallet();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [checkingProof, setCheckingProof] = useState(true);
  const [message, setMessage] = useState('');
  const [faceVerified, setFaceVerified] = useState(false);

  const refreshRoles = useCallback(async () => {
    if (!account) return;
    
    setLoadingRoles(true);
    try {
      const { getUserRoles, clearRoleEventsCache } = await import('@/lib/aptosClient');
      clearRoleEventsCache();
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { roles } = await getUserRoles(account);
      setRoles(roles || []);
      if (roles && roles.length > 0) {
        setFaceVerified(true);
      }
      
      window.dispatchEvent(new CustomEvent('rolesUpdated'));
    } catch {
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, [account]);

  useEffect(() => {
    if (!account) {
      setRoles([]);
      setFaceVerified(false);
      setCheckingProof(false);
      return;
    }
    
    setCheckingProof(true);
    setLoadingRoles(true);
    
    Promise.all([
      (async () => {
        try {
          const { getUserRoles } = await import('@/lib/aptosClient');
          const { roles } = await getUserRoles(account);
          setRoles(roles || []);
          if (roles.length > 0) {
            setFaceVerified(true);
          }
          return roles;
        } catch {
          setRoles([]);
          return [];
        }
      })(),
      
      (async () => {
        try {
          const { getProofData } = await import('@/lib/aptosClient');
          const proof = await getProofData(account);
          setFaceVerified(!!proof);
        } catch (error) {
          console.error('Error checking proof:', error);
          setFaceVerified(false);
        }
      })()
    ]).finally(() => {
      setLoadingRoles(false);
      setCheckingProof(false);
    });
  }, [account]);

  const handleFaceVerificationSuccess = useCallback(async (
    idInfo: IdInfo,
    role: string,
    desc: string,
    setUploadedCid: (cid: string) => void
  ) => {
    setLoading(true);
    setMessage(MESSAGES.LOADING.GENERATING_ZK_PROOF);
    
    try {
      if (!account) {
        throw new Error(MESSAGES.ERROR.WALLET_NOT_CONNECTED);
      }
      
      const zkRes = await fetch(API_ENDPOINTS.ZK_GENERATE_PROOF, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: account,
          id_number: idInfo.id_number,
          name: idInfo.name,
          date_of_birth: idInfo.date_of_birth,
          gender: idInfo.gender,
          nationality: idInfo.nationality,
          date_of_expiry: idInfo.date_of_expiry,
          face_verified: true
        })
      });

      const zkResponseText = await zkRes.text();
      if (!zkResponseText || zkResponseText.trim() === '') {
        throw new Error('Empty response from ZK proof API');
      }
      let zkData;
      try {
        zkData = JSON.parse(zkResponseText);
      } catch (error) {
        console.error('Failed to parse ZK proof response:', zkResponseText);
        throw new Error('Invalid JSON response from ZK proof API');
      }
      if (!zkRes.ok || !zkData.success) {
        if (zkData.requires_reauth) {
          setFaceVerified(false);
          throw new Error(zkData.error || MESSAGES.ERROR.REAUTH_REQUIRED);
        }
        throw new Error(zkData.error || MESSAGES.ERROR.ZK_PROOF_FAILED);
      }

      setMessage(MESSAGES.LOADING.SAVING_PROOF);
      
      if (!isConnected) {
        throw new Error(MESSAGES.ERROR.WALLET_NOT_CONNECTED);
      }
      
      const { roleHelpers } = await import('@/utils/contractHelpers');
      let identityHash = zkData.identity_hash;
      if (!identityHash) {
        if (Array.isArray(zkData.public_signals?.signals) && zkData.public_signals.signals.length >= 2) {
          identityHash = Number(zkData.public_signals.signals[1]);
        } else if (zkData.public_signals?.identity_hash) {
          identityHash = zkData.public_signals.identity_hash;
        } else if (Array.isArray(zkData.raw_public_signals) && zkData.raw_public_signals.length >= 2) {
          identityHash = Number(zkData.raw_public_signals[1]);
        }
      }
      if (!identityHash) {
        throw new Error('Không tìm thấy identity_hash trong proof data');
      }
      const proofPayload = roleHelpers.storeProof(
        JSON.stringify(zkData.proof),
        JSON.stringify(zkData.public_signals),
        identityHash
      );

      await signAndSubmitTransaction(proofPayload);
      
      setFaceVerified(true);
      
      if (role && (role === ROLES.FREELANCER || role === ROLES.POSTER) && desc.trim()) {
        setMessage(MESSAGES.LOADING.UPLOADING_CID);
        try {
          if (!account) {
            throw new Error(MESSAGES.ERROR.WALLET_NOT_CONNECTED);
          }
          const ipfsRes = await fetch(API_ENDPOINTS.IPFS_UPLOAD, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              address: account,
              type: 'profile', 
              about: desc 
            })
          });
          const ipfsResponseText = await ipfsRes.text();
          if (!ipfsResponseText || ipfsResponseText.trim() === '') {
            throw new Error('Empty response from IPFS API');
          }
          let ipfsData;
          try {
            ipfsData = JSON.parse(ipfsResponseText);
          } catch (error) {
            console.error('Failed to parse IPFS response:', ipfsResponseText);
            throw new Error('Invalid JSON response from IPFS API');
          }
          if (!ipfsRes.ok || !ipfsData.success) {
            throw new Error(ipfsData.error || MESSAGES.ERROR.IPFS_UPLOAD_FAILED);
          }
          const cid = ipfsData.encCid || ipfsData.ipfsHash || '';
          if (!cid) {
            throw new Error(MESSAGES.ERROR.CID_REQUIRED);
          }
          setUploadedCid(cid);
          setMessage(MESSAGES.SUCCESS.PROOF_AND_CID_SUCCESS);
        } catch (error: any) {
          setMessage(error?.message || MESSAGES.ERROR.IPFS_ERROR);
        }
      } else {
        setMessage(MESSAGES.SUCCESS.PROOF_SUCCESS);
      }
    } catch (error: any) {
      setMessage(error?.message || MESSAGES.ERROR.PROOF_OR_ZK_ERROR);
      setFaceVerified(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (
    role: string,
    desc: string,
    uploadedCid: string,
    setUploadedCid: (cid: string) => void,
    setRole: (role: string) => void,
    setDesc: (desc: string) => void
  ) => {
    if (!role || !isConnected || !account) return;

    setLoading(true);
    setMessage(MESSAGES.LOADING.CHECKING_PROOF_STATUS);
    
    try {
      let cidForTx = uploadedCid;

      const { getProofData } = await import('@/lib/aptosClient');
      const proof = await getProofData(account);
      const hasValidProof = !!proof;
      
      if (!hasValidProof) {
        setMessage(MESSAGES.ERROR.PROOF_REQUIRED);
        setLoading(false);
        return;
      }

      if ((role === ROLES.FREELANCER || role === ROLES.POSTER) && !cidForTx) {
        if (!desc.trim()) {
          setMessage(MESSAGES.ERROR.DESCRIPTION_REQUIRED);
          setLoading(false);
          return;
        }
        
        setMessage(MESSAGES.LOADING.UPLOADING_CID);
        try {
          if (!account) {
            throw new Error(MESSAGES.ERROR.WALLET_NOT_CONNECTED);
          }
          const ipfsRes = await fetch(API_ENDPOINTS.IPFS_UPLOAD, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              address: account,
              type: 'profile', 
              about: desc 
            })
          });
          const ipfsResponseText2 = await ipfsRes.text();
          if (!ipfsResponseText2 || ipfsResponseText2.trim() === '') {
            throw new Error('Empty response from IPFS API');
          }
          let ipfsData2;
          try {
            ipfsData2 = JSON.parse(ipfsResponseText2);
          } catch (error) {
            console.error('Failed to parse IPFS response:', ipfsResponseText2);
            throw new Error('Invalid JSON response from IPFS API');
          }
          if (!ipfsRes.ok || !ipfsData2.success) {
            throw new Error(ipfsData2.error || MESSAGES.ERROR.IPFS_UPLOAD_FAILED);
          }
          const cid = ipfsData2.encCid || ipfsData2.ipfsHash || '';
          if (!cid) {
            throw new Error(MESSAGES.ERROR.CID_REQUIRED);
          }
          cidForTx = cid;
          setUploadedCid(cid);
        } catch (error: any) {
          setMessage(error?.message || MESSAGES.ERROR.IPFS_ERROR);
          setLoading(false);
          return;
        }
      }

      setMessage(MESSAGES.LOADING.SUBMITTING_TRANSACTION);
      
      const { roleHelpers } = await import('@/utils/contractHelpers');
      
      let payload;
      if ((role === ROLES.FREELANCER || role === ROLES.POSTER) && !cidForTx) {
        throw new Error(MESSAGES.ERROR.CID_NOT_FOUND);
      }

      if (role === ROLES.FREELANCER) {
        payload = roleHelpers.registerFreelancer(cidForTx);
      } else if (role === ROLES.POSTER) {
        payload = roleHelpers.registerPoster(cidForTx);
      } else if (role === ROLES.REVIEWER) {
        payload = roleHelpers.registerReviewer();
      } else {
        throw new Error(MESSAGES.ERROR.INVALID_ROLE);
      }
      
      await signAndSubmitTransaction(payload);
      
      setMessage(MESSAGES.SUCCESS.REGISTRATION_SUCCESS);
      setRole('');
      setDesc('');
      setUploadedCid('');
      
      await refreshRoles();
      
      setTimeout(async () => {
        await refreshRoles();
      }, 3000);
    } catch (error: any) {
      setMessage(error?.message || MESSAGES.ERROR.REGISTRATION_FAILED);
    } finally {
      setLoading(false);
    }
  }, [account, refreshRoles]);

  return {
    roles,
    loading,
    loadingRoles,
    checkingProof,
    message,
    faceVerified,
    setFaceVerified,
    setMessage,
    refreshRoles,
    handleFaceVerificationSuccess,
    handleRegister,
  };
}

