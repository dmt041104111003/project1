"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { DisputeData } from '@/constants/escrow';
import { fetchWithAuth } from '@/utils/api';
import { toast } from 'sonner';

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
      const res = await fetchWithAuth(`/api/role?address=${account}`);
      if (!res.ok) {
        setIsReviewer(false);
        return;
      }
      const data = await res.json();
      const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
      const hasReviewer = rolesArr.some((r: any) => String(r?.name).toLowerCase() === 'reviewer');
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

      const jobsRes = await fetch('/api/job/list');
      const jobs = await jobsRes.json();
      const jobItems = Array.isArray(jobs) ? jobs : (Array.isArray(jobs?.jobs) ? jobs.jobs : []);

      const results: DisputeData[] = [];

      for (const j of jobItems) {
        const id = Number(j?.id ?? j?.job_id ?? j?.jobId ?? 0);
        if (!id) continue;
        const detailRes = await fetch(`/api/job/${id}`);
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        const disputeId = detail?.job?.dispute_id ?? detail?.dispute_id;
        if (!disputeId || (Array.isArray(disputeId?.vec) && disputeId.vec.length === 0)) continue;

        const did = Array.isArray(disputeId?.vec) ? Number(disputeId.vec[0]) : Number(disputeId);
        if (!did) continue;
        const revRes = await fetch(`/api/dispute?action=get_reviewers&dispute_id=${did}`);
        if (!revRes.ok) continue;
        const rev = await revRes.json();
        const selected: string[] = Array.isArray(rev?.selected_reviewers) ? rev.selected_reviewers : [];
        const isAssigned = selected
          .map((a) => normalizeAddress(a))
          .some((a) => a === myAddr);
        if (!isAssigned) continue;

        let hasVoted = false;
        let votesCompleted = false;
        let disputeStatus: 'open' | 'resolved' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn' = 'open';
        let disputeWinner: boolean | null = null;
        const sumRes = await fetch(`/api/dispute?action=get_summary&dispute_id=${did}`);
        if (sumRes.ok) {
          const sum = await sumRes.json();
          const voted: string[] = Array.isArray(sum?.voted_reviewers) ? sum.voted_reviewers : [];
          hasVoted = voted.map((a) => normalizeAddress(a)).some((a) => a === myAddr);
          const totalVotes = Number(sum?.counts?.total || 0);
          votesCompleted = totalVotes >= 3;
          disputeWinner = sum?.winner;
          if (disputeWinner !== null && disputeWinner !== undefined && totalVotes >= 3) {
            disputeStatus = 'resolved';
          }
        } else {
          const votesRes = await fetch(`/api/dispute?action=get_votes&dispute_id=${did}`);
          if (votesRes.ok) {
            const vjson = await votesRes.json();
            const voted: string[] = Array.isArray(vjson?.voted_reviewers) ? vjson.voted_reviewers : [];
            hasVoted = voted.map((a) => normalizeAddress(a)).some((a) => a === myAddr);
            votesCompleted = voted.length >= 3;
          }
        }

        const milestones: any[] = Array.isArray(detail?.job?.milestones) ? detail.job.milestones : [];
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
        const evRes = await fetch(`/api/dispute?action=get_evidence&dispute_id=${did}`);
        let posterEvidenceCid = '';
        let freelancerEvidenceCid = '';
        if (evRes.ok) {
          const ev = await evRes.json();
          posterEvidenceCid = String(ev?.poster_evidence_cid || '');
          freelancerEvidenceCid = String(ev?.freelancer_evidence_cid || '');
        }

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


