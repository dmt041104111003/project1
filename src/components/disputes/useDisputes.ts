"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { DisputeData, DisputeHistoryItem } from '@/constants/escrow';
import { toast } from 'sonner';
import { getDisputeData } from '@/lib/aptosClient';
import { parseStatus } from '@/components/dashboard/MilestoneUtils';
import { useWallet } from '@/contexts/WalletContext';
import { useRoles } from '@/contexts/RolesContext';

export function useDisputes(account?: string | null) {
  const { signAndSubmitTransaction } = useWallet();
  const { hasReviewerRole } = useRoles(); // Use context instead of separate API call
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [history, setHistory] = useState<DisputeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const isReviewer = hasReviewerRole; 
  const checkingRole = false; 

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

  // checkReviewerRole is no longer needed - using RolesContext

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
      const { getDisputeOpenedEvents, getReviewerDisputeEvents, clearDisputeEventsCache } = await import('@/lib/aptosEvents');
      
      clearDisputeEventsCache();
      
      const openedEvents = await getDisputeOpenedEvents(200);
      const reviewerEvents = await getReviewerDisputeEvents(200);

      const myDisputes: Array<{
        disputeId: number;
        jobId: number;
        milestoneId: number;
        reviewers: string[];
      }> = [];

      for (const openedEvent of openedEvents) {
        const disputeId = Number(openedEvent?.data?.dispute_id || 0);
        const jobId = Number(openedEvent?.data?.job_id || 0);
        const milestoneId = Number(openedEvent?.data?.milestone_id || 0);
        
        if (!disputeId || !jobId) continue;

        const disputeReviewerEvents = reviewerEvents.filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
        const selectedReviewers = disputeReviewerEvents
          .map((e: any) => normalizeAddress(String(e?.data?.reviewer || '')))
          .filter((addr: string) => addr.length > 2);

        if (!selectedReviewers.includes(myAddr)) continue;

        myDisputes.push({ disputeId, jobId, milestoneId, reviewers: selectedReviewers });
      }

      if (myDisputes.length === 0) {
        setDisputes([]);
        return true;
      }

      const disputeIds = myDisputes.map(d => d.disputeId);
      const jobIds = [...new Set(myDisputes.map(d => d.jobId))];

      const [disputeDataResults, jobDataResults, summaryResults, evidenceResults] = await Promise.all([
        Promise.all(disputeIds.map(id => getDisputeData(id).catch(() => null))),
        Promise.all(jobIds.map(id => getParsedJobData(id).catch(() => null))),
        Promise.all(disputeIds.map(id => getDisputeSummary(id).catch(() => null))),
        Promise.all(disputeIds.map(id => getDisputeEvidence(id).catch(() => null))),
      ]);

      const disputeDataMap = new Map<number, any>();
      disputeDataResults.forEach((data, idx) => {
        if (data) disputeDataMap.set(disputeIds[idx], data);
      });

      const jobDataMap = new Map<number, any>();
      jobDataResults.forEach((data, idx) => {
        if (data) jobDataMap.set(jobIds[idx], data);
      });

      const summaryMap = new Map<number, any>();
      summaryResults.forEach((data, idx) => {
        if (data) summaryMap.set(disputeIds[idx], data);
      });

      const evidenceMap = new Map<number, any>();
      evidenceResults.forEach((data, idx) => {
        if (data) evidenceMap.set(disputeIds[idx], data);
      });

      const results: DisputeData[] = [];

      for (const { disputeId, jobId, milestoneId } of myDisputes) {
        const dispute = disputeDataMap.get(disputeId);
        const detail = jobDataMap.get(jobId);
        
        if (!dispute || !detail) continue;

        let hasVoted = false;
        let votesCompleted = false;
        let disputeStatus: 'open' | 'resolved' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn' = 'open';
        let disputeWinner: boolean | null = null;
        
        const summary = summaryMap.get(disputeId);
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

        // Không bỏ qua dispute đã resolved - vẫn hiển thị để user biết kết quả

        const milestones: any[] = detail.milestones || [];
        let milestoneIndex = milestones.findIndex((m: any) => Number(m?.id || 0) === milestoneId);
        if (milestoneIndex < 0) milestoneIndex = milestoneId;
        
        const evidence = evidenceMap.get(disputeId);
        const posterEvidenceCid = evidence ? String(evidence.poster_evidence_cid || '') : '';
        const freelancerEvidenceCid = evidence ? String(evidence.freelancer_evidence_cid || '') : '';

        results.push({ 
          jobId, 
          milestoneIndex, 
          disputeId, 
          status: disputeStatus, 
          createdAt: dispute.created_at,
          initialVoteDeadline: dispute.initial_vote_deadline || 0,
          lastReselectionTime: dispute.last_reselection_time || 0,
          lastVoteTime: dispute.last_vote_time || dispute.created_at,
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
      console.error('Lỗi khi tải lịch sử tranh chấp', e);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [account, isReviewer, normalizeAddress]);


  useEffect(() => { 
    if (isReviewer && account) refresh({ silent: true });
  }, [isReviewer, account, refresh]);

  useEffect(() => {
    if (isReviewer) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [isReviewer, fetchHistory]);

  const openDispute = useCallback(async () => {
    if (!jobId || !milestoneIndex) {
      setErrorMsg('Mã công việc và chỉ số cột mốc là bắt buộc');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.openDispute(Number(jobId), Number(milestoneIndex), openReason || '');
      await signAndSubmitTransaction(payload);
      
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      refresh({ silent: true, skipLoading: true });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể mở tranh chấp');
    } finally {
      setLoading(false);
    }
  }, [jobId, milestoneIndex, openReason, refresh]);

  const resolveToPoster = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:poster`);
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.reviewerVote(disputeIdNum, false);
      await signAndSubmitTransaction(payload);
      
      toast.success('Đã bỏ phiếu cho Người thuê thành công!');
      setDisputes(prev => prev.map(d => 
        d.disputeId === disputeIdNum 
          ? { ...d, hasVoted: true } 
          : d
      ));
            const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => {
        refresh({ silent: true, skipLoading: true });
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể giải quyết');
      toast.error(e?.message || 'Không thể bỏ phiếu');
    } finally {
      setResolving(null);
    }
  }, [refresh]);

  const resolveToFreelancer = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:freelancer`);
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.reviewerVote(disputeIdNum, true);
      await signAndSubmitTransaction(payload);
      
      toast.success('Đã bỏ phiếu cho Người làm tự do thành công!');
      setDisputes(prev => prev.map(d => 
        d.disputeId === disputeIdNum 
          ? { ...d, hasVoted: true } 
          : d
      ));
      
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      
      setTimeout(() => {
        refresh({ silent: true, skipLoading: true });
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể giải quyết');
      toast.error(e?.message || 'Không thể bỏ phiếu');
    } finally {
      setResolving(null);
    }
  }, [refresh]);

  const reselectReviewers = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:reselect`);
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.reselectReviewers(disputeIdNum);
      await signAndSubmitTransaction(payload);
      
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      refresh({ silent: true, skipLoading: true });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể chọn lại đánh giá viên');
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
    reselectReviewers,
  } as const;
}


