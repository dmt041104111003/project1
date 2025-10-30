"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTRACT_ADDRESS } from '@/constants/contracts';

export type RoleState = 'unknown' | 'poster' | 'freelancer' | 'none';

export interface JobMetadata {
  title?: string;
  description?: string;
  requirements?: string[];
  poster_id_hash?: string;
  freelancer_id_hash?: string;
  applicants?: any[];
}

export interface MilestoneInfo {
  amount?: string;
  deadline_sec?: number;
  submitted?: boolean;
  approved?: boolean;
  disputed?: boolean;
  released?: boolean;
}

export interface JobChainInfo {
  totalAmount?: string;
  milestoneCount?: number;
  hasFreelancer?: boolean;
  isLocked?: boolean;
  milestones?: MilestoneInfo[];
}

export interface JobItem { id: number; cid: string; meta: JobMetadata; chainInfo?: JobChainInfo }

export function useJobs(account?: string | null) {
  const [roleState, setRoleState] = useState<RoleState>('unknown');
  const [checkingRole, setCheckingRole] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [posterIdHash, setPosterIdHash] = useState('');
  const [freelancerIdHash, setFreelancerIdHash] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const viewFn = useMemo(() => `${CONTRACT_ADDRESS}::escrow::get_job_cid`, []);

  const getWallet = async () => {
    const wallet = (window as { aptos?: { account: () => Promise<string | { address: string }>; signAndSubmitTransaction: (payload: unknown) => Promise<{ hash?: string }> } }).aptos;
    if (!wallet) throw new Error('Wallet not found');
    const acc = await wallet.account();
    const address = typeof acc === 'string' ? acc : acc?.address;
    if (!address) throw new Error('Please connect wallet');
    return { wallet, address };
  };

  const checkRoles = useCallback(async () => {
    if (!account) return;
    try {
      setCheckingRole(true);
      setRoleState('unknown');
      const [posterRes, freelancerRes] = await Promise.all([
        fetch(`/v1/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: `${CONTRACT_ADDRESS}::role::has_poster`, type_arguments: [], arguments: [account] }) }),
        fetch(`/v1/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: `${CONTRACT_ADDRESS}::role::has_freelancer`, type_arguments: [], arguments: [account] }) }),
      ]);
      const poster = posterRes.ok ? await posterRes.json() : [false];
      const freelancer = freelancerRes.ok ? await freelancerRes.json() : [false];
      const isPoster = Array.isArray(poster) ? !!poster[0] : !!poster;
      const isFreelancer = Array.isArray(freelancer) ? !!freelancer[0] : !!freelancer;
      if (isPoster) setRoleState('poster'); else if (isFreelancer) setRoleState('freelancer'); else setRoleState('none');
    } catch {
      setRoleState('unknown');
    } finally {
      setCheckingRole(false);
    }
  }, [account]);

  useEffect(() => { if (account) checkRoles(); }, [account, checkRoles]);

  useEffect(() => {
    try {
      const p = localStorage.getItem('poster_id_hash') || '';
      const f = localStorage.getItem('freelancer_id_hash') || '';
      setPosterIdHash(p);
      setFreelancerIdHash(f);
    } catch {}
  }, []);

  const scanAndFetchJobs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setJobs([]);
    setCurrentPage(1);
    try {
      const maxToScan = 500;
      const firstId = 1;
      const fetched: JobItem[] = [];
      for (let id = firstId; id < firstId + maxToScan; id++) {
        try {
          const res = await fetch(`/api/ipfs/get?jobId=${id}&viewFn=${encodeURIComponent(viewFn)}`);
          const data = await res.json();
          if (!data.success) continue;
          const cid: string = data.cid || data.encCid || '';
          const meta: JobMetadata | null = data.data || null;
          if (!meta) continue;

          let chainInfo: JobChainInfo = {};
          try {
            const [totalRes, milestoneRes, freelancerRes, lockedRes] = await Promise.all([
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: `${CONTRACT_ADDRESS}::escrow::get_total_amount`, type_arguments: [], arguments: [id] }) }).catch(() => null),
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: `${CONTRACT_ADDRESS}::escrow::get_milestone_count`, type_arguments: [], arguments: [Number(id)] }) }).catch(() => null),
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: `${CONTRACT_ADDRESS}::escrow::has_freelancer`, type_arguments: [], arguments: [Number(id)] }) }).catch(() => null),
              fetch('/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: `${CONTRACT_ADDRESS}::escrow::is_locked`, type_arguments: [], arguments: [Number(id)] }) }).catch(() => null),
            ]);
            if (totalRes?.ok) { const j = await totalRes.json(); chainInfo.totalAmount = j?.[0]?.toString() || '0'; }
            if (milestoneRes?.ok) { const j = await milestoneRes.json(); chainInfo.milestoneCount = j?.[0] || 0; }
            if (freelancerRes?.ok) { const j = await freelancerRes.json(); chainInfo.hasFreelancer = j?.[0] || false; }
            if (lockedRes?.ok) { const j = await lockedRes.json(); chainInfo.isLocked = j?.[0] || false; }
          } catch {}

          if (roleState === 'poster') {
            if (posterIdHash && meta.poster_id_hash === posterIdHash) fetched.push({ id, cid, meta, chainInfo });
          } else if (roleState === 'freelancer') {
            const idh = freelancerIdHash;
            const list = Array.isArray(meta.applicants) ? meta.applicants : [];
            const inApplicants = idh && list.some((a: any) => (typeof a === 'string' ? a : (a?.freelancer_id_hash || '')).toLowerCase() === idh.toLowerCase());
            const isAccepted = idh && (meta.freelancer_id_hash || '').toLowerCase() === idh.toLowerCase();
            if (idh && (inApplicants || isAccepted)) fetched.push({ id, cid, meta, chainInfo });
          }
        } catch {}
      }
      setJobs(fetched);
      if (fetched.length === 0) setErrorMsg('Không tìm thấy dự án phù hợp.');
    } catch (e: unknown) {
      setErrorMsg((e as Error)?.message || 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, [viewFn, roleState, posterIdHash, freelancerIdHash]);

  useEffect(() => {
    if (roleState === 'poster' && posterIdHash) scanAndFetchJobs();
    if (roleState === 'freelancer' && freelancerIdHash) scanAndFetchJobs();
  }, [roleState, posterIdHash, freelancerIdHash, scanAndFetchJobs]);

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [stakingJobId, setStakingJobId] = useState<number | null>(null);
  const [submittingMilestone, setSubmittingMilestone] = useState<string | null>(null);
  const [approvingMilestone, setApprovingMilestone] = useState<string | null>(null);
  const [disputingMilestone, setDisputingMilestone] = useState<string | null>(null);

  const acceptApplicant = useCallback(async (jobId: number, cid: string, applicantIdHash: string) => {
    try {
      setAcceptingId(`${jobId}:${applicantIdHash}`);
      const res = await fetch('/api/ipfs/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'finalize', job_cid: cid, freelancer_id_hash: applicantIdHash })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Finalize failed');
      await scanAndFetchJobs();
    } finally {
      setAcceptingId(null);
    }
  }, [scanAndFetchJobs]);

  const stakeAndJoin = useCallback(async (jobId: number) => {
    try {
      setStakingJobId(jobId);
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join_as_freelancer', args: [CONTRACT_ADDRESS, jobId], typeArgs: [] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      await scanAndFetchJobs();
    } finally {
      setStakingJobId(null);
    }
  }, [scanAndFetchJobs]);

  const submitMilestone = useCallback(async (jobId: number, milestoneIndex: number) => {
    try {
      setSubmittingMilestone(`${jobId}:${milestoneIndex}`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit_milestone', args: [CONTRACT_ADDRESS, jobId, milestoneIndex], typeArgs: [] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      await scanAndFetchJobs();
    } finally {
      setSubmittingMilestone(null);
    }
  }, [scanAndFetchJobs]);

  const approveMilestone = useCallback(async (jobId: number, milestoneIndex: number) => {
    try {
      setApprovingMilestone(`${jobId}:${milestoneIndex}`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_milestone', args: [CONTRACT_ADDRESS, jobId, milestoneIndex], typeArgs: [] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      await scanAndFetchJobs();
    } finally {
      setApprovingMilestone(null);
    }
  }, [scanAndFetchJobs]);

  const disputeMilestone = useCallback(async (jobId: number, milestoneIndex: number) => {
    try {
      setDisputingMilestone(`${jobId}:${milestoneIndex}`);
      const { wallet } = await getWallet();
      const res = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open_dispute', args: [CONTRACT_ADDRESS, jobId, milestoneIndex], typeArgs: [] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const payload = { type: 'entry_function_payload', function: data.function, type_arguments: data.type_args, arguments: data.args } as const;
      await wallet.signAndSubmitTransaction(payload as any);
      await scanAndFetchJobs();
    } finally {
      setDisputingMilestone(null);
    }
  }, [scanAndFetchJobs]);

  return {
    roleState,
    checkingRole,
    loading,
    errorMsg,
    jobs,
    posterIdHash,
    freelancerIdHash,
    currentPage,
    setCurrentPage,
    pageSize,
    scanAndFetchJobs,
    acceptingId,
    stakingJobId,
    submittingMilestone,
    approvingMilestone,
    disputingMilestone,
    acceptApplicant,
    stakeAndJoin,
    submitMilestone,
    approveMilestone,
    disputeMilestone,
  } as const;
}


