"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
};

const RolesContext = createContext<RolesContextValue>({
  roles: [],
  loading: false,
  refreshRoles: async () => {},
  hasPosterRole: false,
  hasFreelancerRole: false,
  hasReviewerRole: false,
  hasProof: false,
});

export const RolesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { account } = useWallet();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasProof, setHasProof] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!account) {
      setRoles([]);
      setHasProof(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Query trực tiếp từ Aptos
      const { getUserRoles, getProofData } = await import('@/lib/aptosClient');
      const [rolesData, proofData] = await Promise.all([
        getUserRoles(account),
        getProofData(account),
      ]);
      
      const normalized = (rolesData?.roles || []).map((role: any) => String(role?.name || '').toLowerCase());
      setRoles(normalized);
      setHasProof(!!proofData);
    } catch {
      setRoles([]);
      setHasProof(false);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (!account) {
      setRoles([]);
      return;
    }
    fetchRoles();
  }, [account, fetchRoles]);

  const value = useMemo<RolesContextValue>(() => ({
    roles,
    loading,
    refreshRoles: fetchRoles,
    hasPosterRole: roles.includes('poster'),
    hasFreelancerRole: roles.includes('freelancer'),
    hasReviewerRole: roles.includes('reviewer'),
    hasProof,
  }), [roles, loading, fetchRoles, hasProof]);

  return (
    <RolesContext.Provider value={value}>
      {children}
    </RolesContext.Provider>
  );
};

export const useRoles = () => useContext(RolesContext);

