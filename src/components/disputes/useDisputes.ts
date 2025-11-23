"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { DisputeData, DisputeHistoryItem } from '@/constants/escrow';
import { toast } from 'sonner';
import { getDisputeData } from '@/lib/aptosClient';
import { parseStatus } from '@/components/dashboard/MilestoneUtils';

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
    console.log('[useDisputes] refresh() called', { isReviewer, account, options });
    const silent = options?.silent ?? true;
    const skipLoading = options?.skipLoading ?? false;
    if (!isReviewer || !account) {
      console.log('[useDisputes] SKIPPED: !isReviewer || !account', { isReviewer, account });
      setDisputes([]);
      return false;
    }
    try {
      console.log('[useDisputes] Starting refresh...');
      if (!skipLoading) setLoading(true);
      setErrorMsg('');

      const myAddr = normalizeAddress(account);
      console.log('[useDisputes] My normalized address:', myAddr);
      console.log('[useDisputes] Account:', account);

      const { getParsedJobData, getDisputeSummary, getDisputeEvidence, getDisputeData } = await import('@/lib/aptosClient');
      const { parseAddressVector } = await import('@/lib/aptosParsers');
      const { getDisputeOpenedEvents, getReviewerDisputeEvents, clearDisputeEventsCache } = await import('@/lib/aptosEvents');
      
      console.log('[useDisputes] Clearing cache...');
      clearDisputeEventsCache();
      
      console.log('[useDisputes] Fetching events...');
      const openedEvents = await getDisputeOpenedEvents(200);
      const reviewerEvents = await getReviewerDisputeEvents(200);
      
      console.log('[useDisputes] Opened events count:', openedEvents.length);
      console.log('[useDisputes] Reviewer events count:', reviewerEvents.length);
      console.log('[useDisputes] Reviewer events:', reviewerEvents.map((e: any) => ({
        dispute_id: e?.data?.dispute_id,
        reviewer: e?.data?.reviewer,
        reviewer_normalized: normalizeAddress(e?.data?.reviewer),
      })));

      const results: DisputeData[] = [];

      for (const openedEvent of openedEvents) {
        const disputeId = Number(openedEvent?.data?.dispute_id || 0);
        if (!disputeId) {
          console.log('[useDisputes] Skipping: no disputeId');
          continue;
        }

        const jobId = Number(openedEvent?.data?.job_id || 0);
        if (!jobId) {
          console.log('[useDisputes] Skipping dispute #' + disputeId + ': no jobId');
          continue;
        }
        
        console.log(`[useDisputes] Processing dispute #${disputeId}, job #${jobId}`);

        const disputeReviewerEvents = reviewerEvents.filter((e: any) => Number(e?.data?.dispute_id || 0) === disputeId);
        console.log(`[useDisputes] Dispute #${disputeId} - Found ${disputeReviewerEvents.length} reviewer events`);
        
        const selectedReviewers = disputeReviewerEvents
          .map((e: any) => String(e?.data?.reviewer || ''))
          .filter((addr: string) => addr.length > 0);
        
        console.log(`[useDisputes] Dispute #${disputeId} - Selected reviewers (raw):`, selectedReviewers);
        
        const normalizedReviewers = selectedReviewers.map((a: string) => normalizeAddress(a));
        console.log(`[useDisputes] Dispute #${disputeId} - Selected reviewers (normalized):`, normalizedReviewers);
        console.log(`[useDisputes] Dispute #${disputeId} - My address (normalized):`, myAddr);
        console.log(`[useDisputes] Dispute #${disputeId} - Is assigned?`, normalizedReviewers.includes(myAddr));

        const isAssigned = normalizedReviewers.includes(myAddr);
        if (!isAssigned) {
          console.log(`[useDisputes] Dispute #${disputeId} - SKIPPED: Not assigned to me`);
          continue;
        }
        
        console.log(`[useDisputes] Dispute #${disputeId} - CONTINUING: I am assigned!`);

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
        console.log(`[useDisputes] Dispute #${disputeId} - Milestone ID from event: ${milestoneId}`);
        console.log(`[useDisputes] Dispute #${disputeId} - Milestones count: ${milestones.length}`);
        console.log(`[useDisputes] Dispute #${disputeId} - Milestones:`, milestones.map((m: any) => ({
          id: m?.id,
          status: m?.status,
          status_parsed: parseStatus(m?.status),
        })));
        
        let lockedIndex = -1;
        for (let i = 0; i < milestones.length; i++) {
          if (Number(milestones[i]?.id || 0) === milestoneId) {
            const statusStr = parseStatus(milestones[i]?.status);
            console.log(`[useDisputes] Dispute #${disputeId} - Milestone ${i} matches ID ${milestoneId}, status: ${statusStr}`, milestones[i]?.status);
            if (statusStr.toLowerCase() === 'locked') { 
              lockedIndex = i; 
              console.log(`[useDisputes] Dispute #${disputeId} - Found locked milestone at index ${i}`);
              break; 
            }
          }
        }
        
        console.log(`[useDisputes] Dispute #${disputeId} - Locked index: ${lockedIndex}`);
        console.log(`[useDisputes] Dispute #${disputeId} - Dispute status: ${disputeStatus}`);
        
        if (disputeStatus === 'resolved' && lockedIndex < 0) {
          console.log(`[useDisputes] Dispute #${disputeId} - SKIPPED: Resolved but no locked milestone`);
          continue; 
        }
        
        if (lockedIndex < 0) {
          console.log(`[useDisputes] Dispute #${disputeId} - SKIPPED: No locked milestone found`);
          continue;
        }
        
        console.log(`[useDisputes] Dispute #${disputeId} - CONTINUING: Found locked milestone at index ${lockedIndex}`);
        
        const evidence = await getDisputeEvidence(disputeId);
        console.log(`[useDisputes] Dispute #${disputeId} - Evidence:`, evidence);
        const posterEvidenceCid = evidence ? String(evidence.poster_evidence_cid || '') : '';
        const freelancerEvidenceCid = evidence ? String(evidence.freelancer_evidence_cid || '') : '';
        console.log(`[useDisputes] Dispute #${disputeId} - Poster CID:`, posterEvidenceCid);
        console.log(`[useDisputes] Dispute #${disputeId} - Freelancer CID:`, freelancerEvidenceCid);

        const disputeData = { 
          jobId: jobId, 
          milestoneIndex: lockedIndex, 
          disputeId: disputeId, 
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
        };
        
        console.log(`[useDisputes] Dispute #${disputeId} - Adding to results:`, disputeData);
        results.push(disputeData);
      }

      console.log(`[useDisputes] Final results count: ${results.length}`);
      console.log(`[useDisputes] Final results:`, results);
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
      
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => refresh({ silent: true, skipLoading: true }), 3000);
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
      
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => refresh({ silent: true, skipLoading: true }), 3000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể giải quyết');
    } finally {
      setResolving(null);
    }
  }, [refresh]);

  const reselectReviewers = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:reselect`);
      const { wallet } = await getWallet();
      const { disputeHelpers } = await import('@/utils/contractHelpers');
      const payload = disputeHelpers.reselectReviewers(disputeIdNum);
      await wallet.signAndSubmitTransaction(payload as any);
      
      const { clearJobEventsCache, clearDisputeEventsCache } = await import('@/lib/aptosClient');
      const { clearJobTableCache } = await import('@/lib/aptosClientCore');
      clearJobEventsCache();
      clearDisputeEventsCache();
      clearJobTableCache();
      
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      setTimeout(() => refresh({ silent: true, skipLoading: true }), 3000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể chọn lại reviewers');
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


