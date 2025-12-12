"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWallet } from './WalletContext';

type RolesContextValue = {
  roles: string[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
  hasPosterRole: boolean;
  hasFreelancerRole: boolean;
  hasReviewerRole: boolean;
  hasProof: boolean;
  initialized: boolean;
};

const RolesContext = createContext<RolesContextValue>({
  roles: [],
  loading: false,
  refreshRoles: async () => {},
  hasPosterRole: false,
  hasFreelancerRole: false,
  hasReviewerRole: false,
  hasProof: false,
  initialized: false,
});

export const RolesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { account } = useWallet();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasProof, setHasProof] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const lastFetchedAccount = useRef<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!account) {
      setRoles([]);
      setHasProof(false);
      setLoading(false);
      setInitialized(true);
      return;
    }
    
    if (lastFetchedAccount.current === account && initialized) {
      return;
    }
    
    setLoading(true);
    try {
      const { getUserRoles, getProofData } = await import('@/lib/aptosClient');
      const [rolesData, proofData] = await Promise.all([
        getUserRoles(account),
        getProofData(account),
      ]);
      
      const normalized = (rolesData?.roles || []).map((role: any) => String(role?.name || '').toLowerCase());
      setRoles(normalized);
      setHasProof(!!proofData);
      lastFetchedAccount.current = account;
      
      window.dispatchEvent(new CustomEvent('rolesUpdated'));
    } catch {
      setRoles([]);
      setHasProof(false);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [account, initialized]);

  useEffect(() => {
    if (!account) {
      setRoles([]);
      setHasProof(false);
      lastFetchedAccount.current = null;
      setInitialized(true);
      return;
    }
    
    if (lastFetchedAccount.current !== account) {
      fetchRoles();
    }
  }, [account]); 

  useEffect(() => {
    const handleRefreshRequest = () => {
      if (account) {
        lastFetchedAccount.current = null; 
        fetchRoles();
      }
    };
    
    window.addEventListener('requestRolesRefresh', handleRefreshRequest);
    return () => window.removeEventListener('requestRolesRefresh', handleRefreshRequest);
  }, [account, fetchRoles]);

  const value = useMemo<RolesContextValue>(() => ({
    roles,
    loading,
    refreshRoles: fetchRoles,
    hasPosterRole: roles.includes('poster'),
    hasFreelancerRole: roles.includes('freelancer'),
    hasReviewerRole: roles.includes('reviewer'),
    hasProof,
    initialized,
  }), [roles, loading, fetchRoles, hasProof, initialized]);

  return (
    <RolesContext.Provider value={value}>
      {children}
    </RolesContext.Provider>
  );
};

export const useRoles = () => useContext(RolesContext);

