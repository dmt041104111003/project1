import type { FormEvent, ReactNode } from 'react';

export interface LayoutProps {
  children: ReactNode;
}

export interface DisputeResolvedInfo {
  winner_is_freelancer: boolean;
  milestone_id: number;
  resolved_at: number;
}

export interface Job {
  id: number;
  cid: string;
  decodedCid?: string;
  ipfsUrl?: string;
  poster: string;
  freelancer: string | null;
  pending_freelancer?: string | null;
  total_amount: number;
  milestones_count: number;
  milestones?: any[];
  has_freelancer: boolean;
  state: string;
  mutual_cancel_requested_by?: string | null;
  freelancer_withdraw_requested_by?: string | null;
  apply_deadline?: number;
  pending_stake?: number;
  pending_fee?: number;
  dispute_resolved?: DisputeResolvedInfo | null;
}

export interface JobListItem {
  id: number;
  cid: string;
  total_amount?: number;
  milestones_count?: number;
  has_freelancer?: boolean;
  state?: string;
  apply_deadline?: number;
  poster?: string;
  freelancer?: string | null;
  pending_freelancer?: string | null;
}

export interface JobData {
  total_escrow?: number | string;
  milestones?: any[];
  state?: any;
  poster?: string;
  freelancer?: any;
  pending_freelancer?: string | null;
  apply_deadline?: number | string;
  freelancer_stake?: number | string;
  pending_stake?: number | string;
  pending_fee?: number | string;
  dispute_resolved?: {
    winner_is_freelancer: boolean;
    milestone_id: number;
    resolved_at: number;
  } | null;
}

export interface Milestone {
  id: string;
  amount: string;
  duration?: string;
  deadline: string;
  review_period?: string;
  review_deadline?: string;
  status: string;
  evidence_cid?: { vec?: string[] } | string | null;
  claim_timeout?: { claimed_by: string; claimed_at: number; freelancer_stake_claimed: number } | null;
}

export interface MilestoneForm {
  amount: string;
  duration: string;
  unit: string;
  reviewPeriod?: string;
  reviewUnit?: string;
}

export interface DisputeData {
  jobId: number;
  milestoneIndex: number;
  disputeId: number;
  status: 'open' | 'resolved' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn';
  openedAt?: string;
  createdAt?: number;
  initialVoteDeadline?: number;
  lastReselectionTime?: number;
  lastVoteTime?: number;
  reason?: string;
  posterEvidenceCid?: string;
  freelancerEvidenceCid?: string;
  hasVoted?: boolean;
  votesCompleted?: boolean;
  disputeWinner?: boolean | null;
}

export interface DisputeHistoryItem {
  disputeId: number;
  jobId: number;
  milestoneId: number;
  timestamp: number;
}

export interface JobCardProps {
  job: Job;
  account: string | null;
  activeTab: 'posted' | 'applied';
  onUpdate: () => void;
}

export interface JobSidebarProps {
  jobData: JobData | null;
  account: string | null;
  hasFreelancerRole: boolean;
  applying: boolean;
  onApply: () => void;
  latestFreelancerAddress?: string | null;
  pendingFreelancerAddress?: string | null;
  withdrawingApplication?: boolean;
  onWithdrawApplication?: () => void;
  reviewingCandidate?: boolean;
  onReviewCandidate?: (approve: boolean) => void;
}


export interface MilestoneItemProps {
  milestone: Milestone;
  milestones: Milestone[];
  index: number;
  jobId: number;
  account: string | null;
  poster: string;
  freelancer: string | null;
  jobState: string;
  canInteract: boolean;
  isCancelled: boolean;
  isFirstMilestone: boolean;
  submitting: boolean;
  confirming: boolean;
  rejecting: boolean;
  claiming: boolean;
  evidenceCid?: string;
  disputeEvidenceCid?: string;
  openingDispute?: boolean;
  submittingEvidence?: boolean;
  hasDisputeId?: boolean;
  votesCompleted?: boolean;
  onFileUploaded: (milestoneId: number, cid: string) => void;
  onDisputeFileUploaded?: (milestoneId: number, cid: string) => void;
  onSubmitMilestone: (milestoneId: number) => void;
  onConfirmMilestone: (milestoneId: number) => void;
  onRejectMilestone: (milestoneId: number) => void;
  onClaimTimeout: (milestoneId: number) => void;
  onOpenDispute?: (milestoneId: number) => void;
  onSubmitEvidence?: (milestoneId: number) => void;
  onClaimDispute?: (milestoneId: number) => void;
  disputeWinner?: boolean | null;
  isClaimed?: boolean;
  interactionLocked?: boolean;
}

export interface MilestoneFileUploadProps {
  jobId: number;
  milestoneId: number;
  canSubmit: boolean;
  isOverdue: boolean;
  onFileUploaded: (milestoneId: number, cid: string) => void;
  onSubmit: (milestoneId: number) => void;
  submitting: boolean;
  evidenceCid?: string;
  interactionLocked?: boolean;
}

export interface MilestoneReviewActionsProps {
  jobId: number;
  milestoneId: number;
  account: string | null;
  isOverdue: boolean;
  isPending: boolean;
  isSubmitted: boolean;
  isCancelled: boolean;
  canInteract: boolean;
  reviewTimeout?: boolean;
  confirming: boolean;
  rejecting: boolean;
  claiming: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onClaimTimeout: () => void;
  interactionLocked?: boolean;
}

export interface MilestonesListProps {
  jobId: number;
  milestones: Milestone[];
  poster: string;
  freelancer: string | null;
  jobState: string;
  mutualCancelRequestedBy?: string | null;
  freelancerWithdrawRequestedBy?: string | null;
  pendingFreelancer?: string | null;
  onUpdate?: () => void;
}

export interface JobCancelActionsProps {
  hasDisputeId?: boolean;
  disputeWinner?: boolean | null;
  jobId: number;
  account: string | null;
  poster: string;
  freelancer: string | null;
  canInteract: boolean;
  isCancelled: boolean;
  jobState?: string;
  mutualCancelRequestedBy: string | null;
  freelancerWithdrawRequestedBy: string | null;
  onMutualCancel: () => void;
  onAcceptMutualCancel: () => void;
  onRejectMutualCancel: () => void;
  onFreelancerWithdraw: () => void;
  onAcceptFreelancerWithdraw: () => void;
  onRejectFreelancerWithdraw: () => void;
  cancelling: boolean;
  withdrawing: boolean;
  acceptingCancel: boolean;
  rejectingCancel: boolean;
  acceptingWithdraw: boolean;
  rejectingWithdraw: boolean;
}

export interface DisputeItemProps {
  dispute: DisputeData;
  resolvingKey: string | null;
  onResolvePoster: () => void;
  onResolveFreelancer: () => void;
}

export interface JsonJobParseData {
  title?: string;
  description?: string;
  requirements?: string[];
  deadline?: number;
  deadlineUnit?: 'giây' | 'phút' | 'giờ' | 'ngày' | 'tuần' | 'tháng';
  milestones?: Array<MilestoneForm>;
}

export interface JsonJobInputProps {
  onParse: (data: JsonJobParseData) => void;
  canPostJobs: boolean;
  isSubmitting?: boolean;
}

export interface ManualJobFormProps {
  isSubmitting?: boolean;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  jobDescription: string;
  setJobDescription: (v: string) => void;
  jobDuration: string;
  setJobDuration: (v: string) => void;
  jobDurationUnit: 'giây' | 'phút' | 'giờ' | 'ngày' | 'tuần' | 'tháng';
  setJobDurationUnit: (v: 'giây' | 'phút' | 'giờ' | 'ngày' | 'tuần' | 'tháng') => void;
  skillsList: string[];
  currentSkill: string;
  setCurrentSkill: (v: string) => void;
  addSkill: () => void;
  removeSkill: (index: number) => void;
  milestonesList: MilestoneForm[];
  currentMilestone: MilestoneForm;
  setCurrentMilestone: (v: MilestoneForm) => void;
  addMilestone: () => void;
  removeMilestone: (index: number) => void;
  calculateTotalBudget: () => number;
  validationErrors: {[key: string]: string};
  canPostJobs: boolean;
  onSubmit: (e: FormEvent) => void;
  jobResult: string;
}

 
