"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';
import { DisputeData } from '@/constants/escrow';

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
      const res = await fetch(`/api/role?address=${account}`);
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

  const refresh = useCallback(async () => {
    if (!isReviewer || !account) {
      setDisputes([]);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');

      const normalizeAddress = (addr?: string | null): string => {
        if (!addr) return '';
        const s = String(addr).toLowerCase();
        const noPrefix = s.startsWith('0x') ? s.slice(2) : s;
        const trimmed = noPrefix.replace(/^0+/, '');
        return '0x' + (trimmed.length === 0 ? '0' : trimmed);
      };

      const myAddr = normalizeAddress(account);

      // 1) Get all jobs
      console.log('[Disputes][refresh] fetching jobs list');
      const jobsRes = await fetch('/api/job/list');
      const jobs = await jobsRes.json();
      const jobItems = Array.isArray(jobs) ? jobs : (Array.isArray(jobs?.jobs) ? jobs.jobs : []);
      console.log('[Disputes][refresh] jobs count', jobItems.length);

      const results: DisputeData[] = [];

      // 2) For each job, fetch full details to get dispute_id and find locked milestone
      for (const j of jobItems) {
        const id = Number(j?.id ?? j?.job_id ?? j?.jobId ?? 0);
        if (!id) continue;
        console.log('[Disputes][refresh] fetch job detail', id);
        const detailRes = await fetch(`/api/job/${id}`);
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        const disputeId = detail?.job?.dispute_id ?? detail?.dispute_id;
        console.log('[Disputes][refresh] job', id, 'dispute_id raw =', disputeId);
        if (!disputeId || (Array.isArray(disputeId?.vec) && disputeId.vec.length === 0)) continue;

        // 3) Get reviewers and votes for this dispute
        const did = Array.isArray(disputeId?.vec) ? Number(disputeId.vec[0]) : Number(disputeId);
        if (!did) continue;
        console.log('[Disputes][refresh] query reviewers for dispute', did);
        const revRes = await fetch(`/api/dispute?action=get_reviewers&dispute_id=${did}`);
        if (!revRes.ok) continue;
        const rev = await revRes.json();
        const selected: string[] = Array.isArray(rev?.selected_reviewers) ? rev.selected_reviewers : [];
        console.log('[Disputes][refresh] selected_reviewers for', did, selected);
        const isAssigned = selected
          .map((a) => normalizeAddress(a))
          .some((a) => a === myAddr);
        if (!isAssigned) continue;

        // Votes & summary
        let hasVoted = false;
        let votesCompleted = false;
        const sumRes = await fetch(`/api/dispute?action=get_summary&dispute_id=${did}`);
        if (sumRes.ok) {
          const sum = await sumRes.json();
          const voted: string[] = Array.isArray(sum?.voted_reviewers) ? sum.voted_reviewers : [];
          hasVoted = voted.map((a) => normalizeAddress(a)).some((a) => a === myAddr);
          votesCompleted = Number(sum?.counts?.total || 0) >= 3;
        } else {
          const votesRes = await fetch(`/api/dispute?action=get_votes&dispute_id=${did}`);
          if (votesRes.ok) {
            const vjson = await votesRes.json();
            const voted: string[] = Array.isArray(vjson?.voted_reviewers) ? vjson.voted_reviewers : [];
            hasVoted = voted.map((a) => normalizeAddress(a)).some((a) => a === myAddr);
            votesCompleted = voted.length >= 3;
          }
        }

        // 4) Find the locked milestone index
        const milestones: any[] = Array.isArray(detail?.job?.milestones) ? detail.job.milestones : [];
        let lockedIndex = -1;
        for (let i = 0; i < milestones.length; i++) {
          const st = String(milestones[i]?.status || '');
          if (st.toLowerCase().includes('locked')) { lockedIndex = i; break; }
        }
        console.log('[Disputes][refresh] lockedIndex', lockedIndex);
        if (lockedIndex < 0) continue;

        // 5) Fetch evidence
        const evRes = await fetch(`/api/dispute?action=get_evidence&dispute_id=${did}`);
        let posterEvidenceCid = '';
        let freelancerEvidenceCid = '';
        if (evRes.ok) {
          const ev = await evRes.json();
          posterEvidenceCid = String(ev?.poster_evidence_cid || '');
          freelancerEvidenceCid = String(ev?.freelancer_evidence_cid || '');
        }

        results.push({ jobId: id, milestoneIndex: lockedIndex, disputeId: did, status: 'open', posterEvidenceCid, freelancerEvidenceCid, hasVoted, votesCompleted });
      }

      setDisputes(results);
      console.log('[Disputes][refresh] results', results);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [isReviewer, account]);

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
      const newItem: DisputeData = { jobId: Number(jobId), milestoneIndex: Number(milestoneIndex), disputeId: 0, status: 'open', reason: openReason, openedAt: new Date().toISOString() };
      const list = [newItem, ...disputes];
      setDisputes(list);
      localStorage.setItem('disputes_list', JSON.stringify(list));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to open dispute');
    } finally {
      setLoading(false);
    }
  }, [jobId, milestoneIndex, openReason, disputes]);

  const resolveToPoster = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:poster`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/dispute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reviewer_vote', dispute_id: disputeIdNum, vote_choice: false })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      // keep list; backend resolves automatically when sufficient votes
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to resolve');
    } finally {
      setResolving(null);
    }
  }, []);

  const resolveToFreelancer = useCallback(async (disputeIdNum: number) => {
    try {
      setResolving(`${disputeIdNum}:freelancer`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/dispute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reviewer_vote', dispute_id: disputeIdNum, vote_choice: true })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      // keep list; backend resolves automatically when sufficient votes
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to resolve');
    } finally {
      setResolving(null);
    }
  }, []);

  // withdrawFees removed in new dispute flow

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


