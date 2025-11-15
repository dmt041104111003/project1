import { ESCROW, DISPUTE, ROLE, REPUTATION, ROLE_KIND } from '@/constants/contracts';

/**
 * Build transaction payload for contract calls
 */
export function buildTransactionPayload(
  functionName: string,
  args: any[],
  typeArgs: string[] = []
) {
  return {
    type: 'entry_function_payload' as const,
    function: functionName,
    type_arguments: typeArgs,
    arguments: args
  };
}

/**
 * ESCROW module helpers
 */
const OCTA = 100_000_000;
const STAKE_AMOUNT = 1 * OCTA; // 1 APT
const POSTER_FEE = 15 * OCTA / 10; // 1.5 APT

export const escrowHelpers = {
  /**
   * Calculate total amount needed to create a job
   * @param milestones Array of milestone amounts in octas
   * @returns Total amount in octas (poster_deposit + stake + fee)
   */
  calculateJobCreationCost: (milestones: number[]): number => {
    const posterDeposit = milestones.reduce((sum, m) => sum + m, 0);
    return posterDeposit + STAKE_AMOUNT + POSTER_FEE;
  },

  createJob: (
    jobDetailsCid: string,
    milestoneDurations: number[],
    milestones: number[],
    milestoneReviewPeriods: number[],
    applyDeadline?: number
  ) => {
    const posterDeposit = milestones.reduce((sum, m) => sum + m, 0);
    const finalApplyDeadline = applyDeadline || (Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60));
    return buildTransactionPayload(ESCROW.CREATE_JOB, [
      jobDetailsCid,
      milestoneDurations,
      milestones,
      milestoneReviewPeriods,
      posterDeposit,
      finalApplyDeadline
    ]);
  },
  
  applyJob: (jobId: number) => buildTransactionPayload(ESCROW.APPLY_JOB, [jobId]),
  
  submitMilestone: (jobId: number, milestoneId: number, evidenceCid: string) =>
    buildTransactionPayload(ESCROW.SUBMIT_MILESTONE, [jobId, milestoneId, evidenceCid]),
  
  confirmMilestone: (jobId: number, milestoneId: number) =>
    buildTransactionPayload(ESCROW.CONFIRM_MILESTONE, [jobId, milestoneId]),
  
  rejectMilestone: (jobId: number, milestoneId: number) =>
    buildTransactionPayload(ESCROW.REJECT_MILESTONE, [jobId, milestoneId]),
  
  claimTimeout: (jobId: number, milestoneId: number) =>
    buildTransactionPayload(ESCROW.CLAIM_TIMEOUT, [jobId, milestoneId]),
  
  mutualCancel: (jobId: number) =>
    buildTransactionPayload(ESCROW.MUTUAL_CANCEL, [jobId]),
  
  acceptMutualCancel: (jobId: number) =>
    buildTransactionPayload(ESCROW.ACCEPT_MUTUAL_CANCEL, [jobId]),
  
  rejectMutualCancel: (jobId: number) =>
    buildTransactionPayload(ESCROW.REJECT_MUTUAL_CANCEL, [jobId]),
  
  freelancerWithdraw: (jobId: number) =>
    buildTransactionPayload(ESCROW.FREELANCER_WITHDRAW, [jobId]),
  
  acceptFreelancerWithdraw: (jobId: number) =>
    buildTransactionPayload(ESCROW.ACCEPT_FREELANCER_WITHDRAW, [jobId]),
  
  rejectFreelancerWithdraw: (jobId: number) =>
    buildTransactionPayload(ESCROW.REJECT_FREELANCER_WITHDRAW, [jobId]),
  
  posterWithdrawUnfilled: (jobId: number) =>
    buildTransactionPayload(ESCROW.POSTER_WITHDRAW_UNFILLED, [jobId]),
  
  unlockNonDisputedMilestones: (jobId: number) =>
    buildTransactionPayload(ESCROW.UNLOCK_NON_DISPUTED_MILESTONES, [jobId]),
  
  claimDisputePayment: (jobId: number, milestoneId: number) =>
    buildTransactionPayload(ESCROW.CLAIM_DISPUTE_PAYMENT, [jobId, milestoneId]),
  
  claimDisputeRefund: (jobId: number, milestoneId: number) =>
    buildTransactionPayload(ESCROW.CLAIM_DISPUTE_REFUND, [jobId, milestoneId]),
};

/**
 * DISPUTE module helpers
 */
export const disputeHelpers = {
  openDispute: (jobId: number, milestoneId: number, evidenceCid: string) =>
    buildTransactionPayload(DISPUTE.OPEN_DISPUTE, [jobId, milestoneId, evidenceCid]),
  
  addEvidence: (disputeId: number, evidenceCid: string) =>
    buildTransactionPayload(DISPUTE.ADD_EVIDENCE, [disputeId, evidenceCid]),
  
  reviewerVote: (disputeId: number, voteChoice: boolean) =>
    buildTransactionPayload(DISPUTE.REVIEWER_VOTE, [disputeId, voteChoice]),
};

/**
 * ROLE module helpers
 * Note: For FREELANCER and POSTER, CID is required. For REVIEWER, pass empty string or null.
 */
export const roleHelpers = {
  registerFreelancer: (cid: string) =>
    buildTransactionPayload(ROLE.REGISTER_ROLE, [ROLE_KIND.FREELANCER, cid]),
  
  registerPoster: (cid: string) =>
    buildTransactionPayload(ROLE.REGISTER_ROLE, [ROLE_KIND.POSTER, cid]),
  
  registerReviewer: () =>
    buildTransactionPayload(ROLE.REGISTER_ROLE, [ROLE_KIND.REVIEWER, null]),
};

/**
 * REPUTATION module helpers
 */
export const reputationHelpers = {
  /**
   * Query reputation points (UT) for an address
   * Use API: GET /api/reputation?address={address}
   */
  getReputationPoints: async (address: string): Promise<{ ut: number } | null> => {
    try {
      const res = await fetch(`/api/reputation?address=${address}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data : null;
    } catch {
      return null;
    }
  },
};

