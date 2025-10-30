"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

export interface DisputeData {
  jobId: number;
  milestoneIndex: number;
  status: 'open' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn';
  openedAt?: string;
  reason?: string;
}

export function useDisputes(account?: string | null) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [isReviewer, setIsReviewer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);

  const [jobId, setJobId] = useState('');
  const [milestoneIndex, setMilestoneIndex] = useState('');
  const [openReason, setOpenReason] = useState('');

  const [resolving, setResolving] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const getWallet = async () => {
    const wallet = (window as { aptos?: { account: () => Promise<string | { address: string }>; signAndSubmitTransaction: (payload: unknown) => Promise<{ hash?: string }> } }).aptos;
    if (!wallet) throw new Error('Wallet not found');
    const acc = await wallet.account();
    const address = typeof acc === 'string' ? acc : acc?.address;
    if (!address) throw new Error('Please connect wallet');
    return { wallet, address };
  };

  const checkReviewerRole = useCallback(async () => {
    if (!account) return;
    try {
      setCheckingRole(true);
      const res = await fetch('/v1/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: `${CONTRACT_ADDRESS}::role::has_reviewer`,
          type_arguments: [],
          arguments: [account]
        })
      });
      const data = await res.json();
      const hasReviewer = Array.isArray(data) ? !!data[0] : !!data;
      setIsReviewer(hasReviewer);
    } catch (e: any) {
      setIsReviewer(false);
    } finally {
      setCheckingRole(false);
    }
  }, [account]);

  const refresh = useCallback(async () => {
    if (!isReviewer) {
      setDisputes([]);
      return;
    }
    
    try {
      setLoading(true);
      setErrorMsg('');

      const raw = localStorage.getItem('disputes_list');
      const list = raw ? JSON.parse(raw) as any[] : [];
      const normalized: DisputeData[] = (Array.isArray(list) ? list : []).map((d: any) => ({
        jobId: Number(d?.jobId ?? d?.job_id ?? 0),
        milestoneIndex: Number(d?.milestoneIndex ?? d?.milestone_index ?? 0),
        status: ((): DisputeData['status'] => {
          const s = String(d?.status || 'open');
          return s === 'resolved_poster' || s === 'resolved_freelancer' || s === 'withdrawn' ? s : 'open';
        })(),
        openedAt: d?.openedAt || d?.opened_at,
        reason: d?.reason || '',
      }));
      setDisputes(normalized);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [isReviewer]);

  useEffect(() => { 
    if (account) checkReviewerRole(); 
  }, [account, checkReviewerRole]);

  useEffect(() => { 
    if (isReviewer) refresh(); 
  }, [isReviewer, refresh]);

  const openDispute = useCallback(async () => {
    if (!jobId || !milestoneIndex) {
      setErrorMsg('Job ID and Milestone Index are required');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_dispute', args: [CONTRACT_ADDRESS, Number(jobId), Number(milestoneIndex)], typeArgs: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      // optimistic add
      const newItem: DisputeData = { jobId: Number(jobId), milestoneIndex: Number(milestoneIndex), status: 'open', reason: openReason, openedAt: new Date().toISOString() };
      const list = [newItem, ...disputes];
      setDisputes(list);
      localStorage.setItem('disputes_list', JSON.stringify(list));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to open dispute');
    } finally {
      setLoading(false);
    }
  }, [jobId, milestoneIndex, openReason, disputes]);

  const resolveToPoster = useCallback(async (jobIdNum: number, index: number) => {
    try {
      setResolving(`${jobIdNum}:${index}`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock_non_disputed_to_poster', args: [CONTRACT_ADDRESS, jobIdNum, index], typeArgs: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      const updated: DisputeData[] = disputes.map(d => (d.jobId === jobIdNum && d.milestoneIndex === index ? { ...d, status: 'resolved_poster' } : d));
      setDisputes(updated);
      localStorage.setItem('disputes_list', JSON.stringify(updated));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to resolve');
    } finally {
      setResolving(null);
    }
  }, [disputes]);

  const resolveToFreelancer = useCallback(async (jobIdNum: number, index: number) => {
    try {
      setResolving(`${jobIdNum}:${index}`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_approve_if_poster_inactive', args: [CONTRACT_ADDRESS, jobIdNum, index], typeArgs: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      const updated: DisputeData[] = disputes.map(d => (d.jobId === jobIdNum && d.milestoneIndex === index ? { ...d, status: 'resolved_freelancer' } : d));
      setDisputes(updated);
      localStorage.setItem('disputes_list', JSON.stringify(updated));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to resolve');
    } finally {
      setResolving(null);
    }
  }, [disputes]);

  const withdrawFees = useCallback(async (jobIdNum: number, index: number) => {
    try {
      setWithdrawing(`${jobIdNum}:${index}`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw_dispute_fees', args: [CONTRACT_ADDRESS, jobIdNum, index], typeArgs: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to withdraw');
    } finally {
      setWithdrawing(null);
    }
  }, []);

  return {
    loading,
    errorMsg,
    disputes,
    isReviewer,
    checkingRole,
    jobId,
    setJobId,
    milestoneIndex,
    setMilestoneIndex,
    openReason,
    setOpenReason,
    openDispute,
    refresh,
    resolving,
    withdrawing,
    resolveToPoster,
    resolveToFreelancer,
    withdrawFees,
  } as const;
}


