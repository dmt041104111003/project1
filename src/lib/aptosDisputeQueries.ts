import {
  getJobCreatedEvents,
  getDisputeOpenedEvents,
  getDisputeResolvedEvents,
} from './aptosEvents';
import { getParsedJobData } from './aptosJobDetailQueries';
import { getDisputeData, getDisputeSummary } from './aptosUserQueries';

export interface JobWithDispute {
  jobId: number;
  disputeId: number;
  milestoneId: number;
  poster: string;
  freelancer: string | null;
  cid: string;
  totalAmount: number;
  createdAt: number;
  disputeStatus: 'open' | 'resolved' | 'voting';
  disputeWinner: boolean | null;
  openedAt: number;
  resolvedAt?: number;
  openedBy: string;
  initialVoteDeadline?: number;
  lastReselectionTime?: number;
  lastVoteTime?: number;
  votesCount?: number;
}

export async function getJobsWithDisputes(account: string, limit: number = 200): Promise<JobWithDispute[]> {
  const normalizedAddr = account.toLowerCase();
  
  const [createdEvents, disputeOpenedEvents, disputeResolvedEvents] = await Promise.all([
    getJobCreatedEvents(limit),
    getDisputeOpenedEvents(limit),
    getDisputeResolvedEvents(limit),
  ]);

  const jobCreatedMap = new Map<number, { poster: string; cid: string; total_amount: number; created_at: number }>();
  createdEvents.forEach((evt: any) => {
    const jobId = Number(evt?.data?.job_id || 0);
    if (jobId > 0) {
      jobCreatedMap.set(jobId, {
        poster: String(evt?.data?.poster || ''),
        cid: String(evt?.data?.cid || ''),
        total_amount: Number(evt?.data?.total_amount || 0),
        created_at: Number(evt?.data?.created_at || 0),
      });
    }
  });

  const disputeResolvedMap = new Map<number, { resolved_at: number; winner: boolean | null }>();
  disputeResolvedEvents.forEach((evt: any) => {
    const disputeId = Number(evt?.data?.dispute_id || 0);
    if (disputeId > 0) {
      disputeResolvedMap.set(disputeId, {
        resolved_at: Number(evt?.data?.resolved_at || 0),
        winner: evt?.data?.winner_is_freelancer !== undefined ? Boolean(evt?.data?.winner_is_freelancer) : null,
      });
    }
  });

  const jobsWithDisputes: JobWithDispute[] = [];

  for (const openedEvent of disputeOpenedEvents) {
    const disputeId = Number(openedEvent?.data?.dispute_id || 0);
    const jobId = Number(openedEvent?.data?.job_id || 0);
    const milestoneId = Number(openedEvent?.data?.milestone_id || 0);
    
    if (!disputeId || !jobId) continue;

    const jobInfo = jobCreatedMap.get(jobId);
    if (!jobInfo) continue;

    const poster = jobInfo.poster.toLowerCase();
    const openedBy = String(openedEvent?.data?.opened_by || '').toLowerCase();
    
    const isPoster = poster === normalizedAddr;
    const isOpenedBy = openedBy === normalizedAddr;
    
    if (!isPoster && !isOpenedBy) {
      const jobData = await getParsedJobData(jobId);
      const freelancer = jobData?.freelancer?.toLowerCase() || '';
      if (freelancer !== normalizedAddr) {
        continue;
      }
    }

    const dispute = await getDisputeData(disputeId);
    if (!dispute) continue;

    const summary = await getDisputeSummary(disputeId);
    let disputeStatus: 'open' | 'resolved' | 'voting' = 'open';
    let disputeWinner: boolean | null = null;
    let votesCount = 0;

    if (summary) {
      votesCount = Number(summary.counts?.total || 0);
      
      if (summary.isResolved) {
        disputeStatus = 'resolved';
        disputeWinner = summary.winner;
      }
    }

    const resolved = disputeResolvedMap.get(disputeId);

    jobsWithDisputes.push({
      jobId,
      disputeId,
      milestoneId,
      poster: jobInfo.poster,
      freelancer: dispute.freelancer || null,
      cid: jobInfo.cid,
      totalAmount: jobInfo.total_amount,
      createdAt: jobInfo.created_at,
      disputeStatus,
      disputeWinner,
      openedAt: Number(openedEvent?.data?.created_at || 0),
      resolvedAt: resolved?.resolved_at,
      openedBy: String(openedEvent?.data?.opened_by || ''),
      initialVoteDeadline: dispute.initial_vote_deadline || 0,
      lastReselectionTime: dispute.last_reselection_time || 0,
      lastVoteTime: dispute.last_vote_time || Number(openedEvent?.data?.created_at || 0),
      votesCount,
    });
  }

  return jobsWithDisputes.sort((a, b) => b.openedAt - a.openedAt);
}

