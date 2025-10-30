"use client";

import { useCallback, useEffect, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

export type UserRole = 'freelancer' | 'poster' | 'reviewer' | 'none';

export interface UTRPoints {
  total: number;
  available: number;
  claimed: number;
}

export interface ReputationData {
  score: number;
  level: string;
  completedJobs: number;
  successfulJobs: number;
  disputeCount: number;
  lastUpdated: string;
}

export function useReputation(account?: string | null) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('none');
  const [checkingRole, setCheckingRole] = useState(false);
  
  const [utrPoints, setUtrPoints] = useState<UTRPoints>({ total: 0, available: 0, claimed: 0 });
  const [utfPoints, setUtfPoints] = useState<UTRPoints>({ total: 0, available: 0, claimed: 0 });
  const [utpPoints, setUtpPoints] = useState<UTRPoints>({ total: 0, available: 0, claimed: 0 });
  const [aptBalance, setAptBalance] = useState(0);
  const [reputation, setReputation] = useState<ReputationData | null>(null);

  const getWallet = async () => {
    const wallet = (window as { aptos?: { account: () => Promise<string | { address: string }>; signAndSubmitTransaction: (payload: unknown) => Promise<{ hash?: string }> } }).aptos;
    if (!wallet) throw new Error('Wallet not found');
    const acc = await wallet.account();
    const address = typeof acc === 'string' ? acc : acc?.address;
    if (!address) throw new Error('Please connect wallet');
    return { wallet, address };
  };

  const checkUserRole = useCallback(async () => {
    if (!account) return;
    try {
      setCheckingRole(true);
      const [freelancerRes, posterRes, reviewerRes] = await Promise.all([
        fetch('/v1/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::role::has_freelancer`,
            type_arguments: [],
            arguments: [account]
          })
        }),
        fetch('/v1/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::role::has_poster`,
            type_arguments: [],
            arguments: [account]
          })
        }),
        fetch('/v1/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::role::has_reviewer`,
            type_arguments: [],
            arguments: [account]
          })
        })
      ]);

      const [freelancer, poster, reviewer] = await Promise.all([
        freelancerRes.json().then(d => Array.isArray(d) ? !!d[0] : !!d).catch(() => false),
        posterRes.json().then(d => Array.isArray(d) ? !!d[0] : !!d).catch(() => false),
        reviewerRes.json().then(d => Array.isArray(d) ? !!d[0] : !!d).catch(() => false)
      ]);

      if (freelancer) setUserRole('freelancer');
      else if (poster) setUserRole('poster');
      else if (reviewer) setUserRole('reviewer');
      else setUserRole('none');
    } catch (e: any) {
      setUserRole('none');
    } finally {
      setCheckingRole(false);
    }
  }, [account]);

  const fetchUTRPoints = useCallback(async () => {
    if (!account) return;
    try {
      setLoading(true);
      setErrorMsg('');
      
      // TODO: Replace with actual UTR API call
      // For now, simulate with mock data
      const mockPoints = {
        total: Math.floor(Math.random() * 1000) + 100,
        available: Math.floor(Math.random() * 500) + 50,
        claimed: Math.floor(Math.random() * 200) + 10
      };
      setUtrPoints(mockPoints);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to fetch UTR points');
    } finally {
      setLoading(false);
    }
  }, [account]);

  const fetchUTFPoints = useCallback(async () => {
    if (!account) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const mock = {
        total: Math.floor(Math.random() * 1000) + 200,
        available: Math.floor(Math.random() * 400) + 20,
        claimed: Math.floor(Math.random() * 150) + 5,
      };
      setUtfPoints(mock);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to fetch UTF points');
    } finally {
      setLoading(false);
    }
  }, [account]);

  const fetchUTPPoints = useCallback(async () => {
    if (!account) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const mock = {
        total: Math.floor(Math.random() * 1000) + 100,
        available: Math.floor(Math.random() * 300) + 10,
        claimed: Math.floor(Math.random() * 120) + 3,
      };
      setUtpPoints(mock);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to fetch UTP points');
    } finally {
      setLoading(false);
    }
  }, [account]);

  const claimReviewerUTR = useCallback(async () => {
    if (!account || utrPoints.available <= 0) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const { wallet } = await getWallet();
      const res = await fetch('/api/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_reviewer_bonus', args: [CONTRACT_ADDRESS], typeArgs: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      const claimAmount = utrPoints.available;
      setUtrPoints(prev => ({ ...prev, available: 0, claimed: prev.claimed + claimAmount }));
      setAptBalance(prev => prev + claimAmount);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to claim reviewer UTR');
    } finally {
      setLoading(false);
    }
  }, [account, utrPoints.available]);

  const claimUTF = useCallback(async () => {
    if (!account || utfPoints.available <= 0) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const { wallet } = await getWallet();
      const res = await fetch('/api/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_freelancer_bonus', args: [CONTRACT_ADDRESS], typeArgs: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      const claimAmount = utfPoints.available;
      setUtfPoints(prev => ({ ...prev, available: 0, claimed: prev.claimed + claimAmount }));
      setAptBalance(prev => prev + claimAmount);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to claim freelancer bonus');
    } finally {
      setLoading(false);
    }
  }, [account, utfPoints.available]);

  const claimUTP = useCallback(async () => {
    if (!account || utpPoints.available <= 0) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const { wallet } = await getWallet();
      const res = await fetch('/api/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_poster_bonus', args: [CONTRACT_ADDRESS], typeArgs: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      const claimAmount = utpPoints.available;
      setUtpPoints(prev => ({ ...prev, available: 0, claimed: prev.claimed + claimAmount }));
      setAptBalance(prev => prev + claimAmount);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to claim poster bonus');
    } finally {
      setLoading(false);
    }
  }, [account, utpPoints.available]);

  const checkReputation = useCallback(async (address?: string) => {
    const targetAddress = address || account;
    if (!targetAddress) return;
    
    try {
      setLoading(true);
      setErrorMsg('');
      
      // TODO: Replace with actual reputation API call
      // For now, simulate with mock data
      const mockReputation = {
        score: Math.floor(Math.random() * 100) + 50,
        level: ['Bronze', 'Silver', 'Gold', 'Platinum'][Math.floor(Math.random() * 4)],
        completedJobs: Math.floor(Math.random() * 50) + 5,
        successfulJobs: Math.floor(Math.random() * 45) + 3,
        disputeCount: Math.floor(Math.random() * 5),
        lastUpdated: new Date().toISOString()
      };
      
      setReputation(mockReputation);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to check reputation');
    } finally {
      setLoading(false);
    }
  }, [account]);

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchUTRPoints(),
      fetchUTFPoints(),
      fetchUTPPoints(),
      checkReputation(),
    ]);
  }, [fetchUTRPoints, fetchUTFPoints, fetchUTPPoints, checkReputation]);

  useEffect(() => {
    if (account) {
      checkUserRole();
    }
  }, [account, checkUserRole]);

  useEffect(() => {
    if (userRole !== 'none') {
      refresh();
    }
  }, [userRole, refresh]);

  return {
    loading,
    errorMsg,
    userRole,
    checkingRole,
    utrPoints,
    utfPoints,
    utpPoints,
    aptBalance,
    reputation,
    fetchUTRPoints,
    fetchUTFPoints,
    fetchUTPPoints,
    claimReviewerUTR,
    claimUTF,
    claimUTP,
    checkReputation,
    refresh,
  } as const;
}
