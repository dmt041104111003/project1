"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { DisputeData } from '@/constants/escrow';
import { toast } from 'sonner';
import { getDisputeData } from '@/lib/aptosClient';

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

      const normalizeAddress = (addr?: string | null): string => {
        if (!addr) return '';
        const s = String(addr).toLowerCase();
        const noPrefix = s.startsWith('0x') ? s.slice(2) : s;
        const trimmed = noPrefix.replace(/^0+/, '');
        return '0x' + (trimmed.length === 0 ? '0' : trimmed);
      };

      const myAddr = normalizeAddress(account);

      const { getJobsList, getParsedJobData, getDisputeSummary, getDisputeEvidence } = await import('@/lib/aptosClient');
      const { parseAddressVector } = await import('@/lib/aptosParsers');
      
      const jobsData = await getJobsList();
      const jobItems = jobsData.jobs || [];

      const results: DisputeData[] = [];

      for (const j of jobItems) {
        const id = Number(j?.id ?? j?.job_id ?? j?.jobId ?? 0);
        if (!id) continue;
        
        const detail = await getParsedJobData(id);
        if (!detail) continue;
        
        // Get raw job data để lấy dispute_id
        const { getJobData } = await import('@/lib/aptosClient');
        const rawJobData = await getJobData(id);
        const disputeId = rawJobData?.dispute_id;
        if (!disputeId || (Array.isArray(disputeId?.vec) && disputeId.vec.length === 0)) continue;

        const did = Array.isArray(disputeId?.vec) ? Number(disputeId.vec[0]) : Number(disputeId);
        if (!did) continue;
        
        const dispute = await getDisputeData(did);
        if (!dispute) continue;
        
        const selected = parseAddressVector(dispute?.selected_reviewers);
        const isAssigned = selected
          .map((a) => normalizeAddress(a))
          .some((a) => a === myAddr);
        if (!isAssigned) continue;

        let hasVoted = false;
        let votesCompleted = false;
        let disputeStatus: 'open' | 'resolved' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn' = 'open';
        let disputeWinner: boolean | null = null;
        
        const summary = await getDisputeSummary(did);
        if (summary) {
          const voted: string[] = summary.voted_reviewers || [];
          hasVoted = voted.map((a) => normalizeAddress(a)).some((a) => a === myAddr);
          const totalVotes = Number(summary.counts?.total || 0);
          votesCompleted = totalVotes >= 3;
          disputeWinner = summary.winner;
          if (disputeWinner !== null && disputeWinner !== undefined && totalVotes >= 3) {
            disputeStatus = 'resolved';
          }
        }

        const milestones: any[] = detail.milestones || [];
        let lockedIndex = -1;
        for (let i = 0; i < milestones.length; i++) {
          const st = String(milestones[i]?.status || '');
          if (st.toLowerCase().includes('locked')) { 
            lockedIndex = i; 
            break; 
          }
          if (st.toLowerCase().includes('accepted') && disputeId) {
            if (disputeWinner === null) {
            }
          }
        }
        
        if (disputeStatus === 'resolved' && lockedIndex < 0) {
          continue; 
        }
        
        if (lockedIndex < 0) continue;
        
        const evidence = await getDisputeEvidence(did);
        const posterEvidenceCid = evidence ? String(evidence.poster_evidence_cid || '') : '';
        const freelancerEvidenceCid = evidence ? String(evidence.freelancer_evidence_cid || '') : '';

        results.push({ 
          jobId: id, 
          milestoneIndex: lockedIndex, 
          disputeId: did, 
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

  useEffect(() => { 
    if (account) checkReviewerRole(); 
  }, [account, checkReviewerRole]);

  useEffect(() => { 
    if (isReviewer) refresh({ silent: true });
  }, [isReviewer, refresh]);

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
  } as const;
}


