"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { DisputeData, DisputeHistoryItem } from '@/constants/escrow';
import { toast } from 'sonner';
import { getDisputeData } from '@/lib/aptosClient';

export function useDisputes(account?: string | null) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [history, setHistory] = useState<DisputeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);

  const [jobId, setJobId] = useState('');
  const [milestoneIndex, setMilestoneIndex] = useState('');
  const [openReason, setOpenReason] = useState('');

  const [resolving, setResolving] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const normalizeAddress = useCallback((addr?: string | null): string => {
    if (!addr) return '';
    const s = String(addr).toLowerCase();
    const noPrefix = s.startsWith('0x') ? s.slice(2) : s;
    const trimmed = noPrefix.replace(/^0+/, '');
    return '0x' + (trimmed.length === 0 ? '0' : trimmed);
  }, []);

  const getWallet = async () => {
    const wallet = (window as { aptos?: { account: () => Promise<string | { address: string }>; signAndSubmitTransaction: (payload: unknown) => Promise<{ hash?: string }> } }).aptos;
    if (!wallet) throw new Error('Không tìm thấy ví');
    const acc = await wallet.account();
    const address = typeof acc === 'string' ? acc : acc?.address;
    if (!address) throw new Error('Vui lòng kết nối ví');
    return { wallet, address };
  };

  const checkReviewerRole = useCallback(async () => {
    if (!account) return;
    try {
      setCheckingRole(true);
      const { getUserRoles } = await import('@/lib/aptosClient');
      const { roles } = await getUserRoles(account);
      const hasReviewer = roles.some((r: any) => String(r?.name).toLowerCase() === 'reviewer');
      setIsReviewer(hasReviewer);
    } catch (e: any) {
      setIsReviewer(false);
    } finally {
      setCheckingRole(false);
    }
  }, [account]);

  const refresh = useCallback(async (options?: { silent?: boolean; skipLoading?: boolean }) => {
    const silent = options?.silent ?? true;
    const skipLoading = options?.skipLoading ?? false;
    if (!isReviewer || !account) {
      setDisputes([]);
      return false;
    }
    try {
      if (!skipLoading) setLoading(true);
      setErrorMsg('');

      const myAddr = normalizeAddress(account);

      const { getParsedJobData, getDisputeSummary, getDisputeEvidence, getDisputeData } = await import('@/lib/aptosClient');
      const { parseAddressVector } = await import('@/lib/aptosParsers');
      const { getDisputeOpenedEvents, getReviewerDisputeEvents } = await import('@/lib/aptosEvents');
      
      const openedEvents = await getDisputeOpenedEvents(200);
      const reviewerEvents = await getReviewerDisputeEvents(200);

      const results: DisputeData[] = [];

      for (const openedEvent of openedEvents) {
        const disputeId = Number(openedEvent?.data?.dispute_id || 0);
        if (!disputeId) continue;

        const jobId = Number(openedEvent?.data?.job_id || 0);
        if (!jobId) continue;

        const selectedReviewers = reviewerEvents
          .filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId)
          .map((e: any) => String(e?.data?.reviewer || ''))
          .filter((addr: string) => addr.length > 0);

        const isAssigned = selectedReviewers
          .map((a: string) => normalizeAddress(a))
          .some((a: string) => a === myAddr);
        if (!isAssigned) continue;

        const dispute = await getDisputeData(disputeId);
        if (!dispute) continue;

        const detail = await getParsedJobData(jobId);
        if (!detail) continue;

        let hasVoted = false;
        let votesCompleted = false;
        let disputeStatus: 'open' | 'resolved' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn' = 'open';
        let disputeWinner: boolean | null = null;
        
        const summary = await getDisputeSummary(disputeId);
        if (summary) {
          const voted: string[] = summary.voted_reviewers || [];
          hasVoted = voted.map((a: string) => normalizeAddress(a)).some((a: string) => a === myAddr);
          const totalVotes = Number(summary.counts?.total || 0);
          votesCompleted = totalVotes >= 3;
          disputeWinner = summary.winner;
          if (disputeWinner !== null && disputeWinner !== undefined && totalVotes >= 3) {
            disputeStatus = 'resolved';
          }
        }

        const milestones: any[] = detail.milestones || [];
        const milestoneId = Number(openedEvent?.data?.milestone_id || 0);
        let lockedIndex = -1;
        for (let i = 0; i < milestones.length; i++) {
          if (Number(milestones[i]?.id || 0) === milestoneId) {
            const st = String(milestones[i]?.status || '');
            if (st.toLowerCase().includes('locked')) { 
              lockedIndex = i; 
              break; 
            }
          }
        }
        
        if (disputeStatus === 'resolved' && lockedIndex < 0) {
          continue; 
        }
        
        if (lockedIndex < 0) continue;
        
        const evidence = await getDisputeEvidence(disputeId);
        const posterEvidenceCid = evidence ? String(evidence.poster_evidence_cid || '') : '';
        const freelancerEvidenceCid = evidence ? String(evidence.freelancer_evidence_cid || '') : '';

        results.push({ 
          jobId: jobId, 
          milestoneIndex: lockedIndex, 
          disputeId: disputeId, 
          status: disputeStatus, 
          posterEvidenceCid, 
          freelancerEvidenceCid, 
          hasVoted, 
          votesCompleted,
          disputeWinner 
        });
      }

      setDisputes(results);
      if (!silent) {
        toast.success('Đã làm mới danh sách tranh chấp');
      }
      return true;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể tải tranh chấp');
      if (!silent) {
        toast.error(e?.message || 'Không thể tải tranh chấp');
      }
      return false;
    } finally {
      if (!skipLoading) setLoading(false);
    }
  }, [isReviewer, account]);

  const fetchHistory = useCallback(async () => {
    if (!isReviewer || !account) {
      setHistory([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const { getReviewerDisputeHistory } = await import('@/lib/aptosClient');
      const entries = await getReviewerDisputeHistory(normalizeAddress(account), 200);
      const mapped: DisputeHistoryItem[] = entries
        .map((item: any) => ({
          disputeId: Number(item?.disputeId || 0),
          jobId: Number(item?.jobId || 0),
          milestoneId: Number(item?.milestoneId || 0),
          timestamp: Number(item?.timestamp || 0),
        }))
        .filter((item: DisputeHistoryItem) => item.disputeId > 0)
        .sort((a: DisputeHistoryItem, b: DisputeHistoryItem) => b.timestamp - a.timestamp);
      setHistory(mapped);
    } catch (e: any) {
      console.error('Error loading dispute history', e);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [account, isReviewer, normalizeAddress]);

  useEffect(() => { 
    if (account) checkReviewerRole(); 
  }, [account, checkReviewerRole]);

  useEffect(() => { 
    if (isReviewer) refresh({ silent: true });
  }, [isReviewer, refresh]);

  useEffect(() => {
    if (isReviewer) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [isReviewer, fetchHistory]);

  const openDispute = useCallback(async () => {
    if (!jobId || !milestoneIndex) {
      setErrorMsg('Job ID và Milestone Index là bắt buộc');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');
      const { wallet } = await getWallet();
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.openDispute(Number(jobId), Number(milestoneIndex), openReason || '');
      await wallet.signAndSubmitTransaction(payload as any);
      const newItem: DisputeData = { jobId: Number(jobId), milestoneIndex: Number(milestoneIndex), disputeId: 0, status: 'open', reason: openReason, openedAt: new Date().toISOString() };
      const list = [newItem, ...disputes];
      setDisputes(list);
      localStorage.setItem('disputes_list', JSON.stringify(list));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể mở tranh chấp');
    } finally {
      setLoading(false);
    }
  }, [jobId, milestoneIndex, openReason, disputes]);

  const resolveToPoster = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:poster`);
      const { wallet } = await getWallet();
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.reviewerVote(disputeIdNum, false);
      await wallet.signAndSubmitTransaction(payload as any);
      setTimeout(() => refresh({ silent: true, skipLoading: true }), 2000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể giải quyết');
    } finally {
      setResolving(null);
    }
  }, [refresh]);

  const resolveToFreelancer = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:freelancer`);
      const { wallet } = await getWallet();
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.reviewerVote(disputeIdNum, true);
      await wallet.signAndSubmitTransaction(payload as any);
      setTimeout(() => refresh({ silent: true, skipLoading: true }), 2000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể giải quyết');
    } finally {
      setResolving(null);
    }
  }, [refresh]);

  return {
    loading,
    errorMsg,
    disputes,
    history,
    historyLoading,
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
    fetchHistory,
    resolving,
    withdrawing,
    resolveToPoster,
    resolveToFreelancer,
  } as const;
}


