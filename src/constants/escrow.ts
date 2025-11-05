import type { FormEvent, ReactNode } from 'react';
// Common layout props - reusable for all layout components
export interface LayoutProps {
  children: ReactNode;
}

// Job Types

// Base Job interface - full job data from blockchain
export interface Job {
  id: number;
  cid: string;
  poster: string;
  freelancer: string | null;
  total_amount: number;
  milestones_count: number;
  milestones?: any[];
  has_freelancer: boolean;
  state: string;
  mutual_cancel_requested_by?: string | null;
  freelancer_withdraw_requested_by?: string | null;
  apply_deadline?: number;
}

// Job list item - partial job data for list views (id and cid are required)
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
}

// Job data for sidebar - raw data from API (may have different field names/types)
export interface JobData {
  total_escrow?: number | string;
  milestones?: any[];
  state?: any;
  poster?: string;
  freelancer?: any;
  apply_deadline?: number | string;
}

// Milestone Types

export interface Milestone {
  id: string;
  amount: string;
  duration?: string;
  deadline: string;
  review_period?: string;
  review_deadline?: string;
  status: string;
  evidence_cid?: { vec?: string[] } | string | null;
}

export interface MilestoneForm {
  amount: string;
  duration: string;
  unit: string;
  reviewPeriod?: string;
  reviewUnit?: string;
}

// Dispute Types

export interface DisputeData {
  jobId: number;
  milestoneIndex: number;
  disputeId: number;
  status: 'open' | 'resolved_poster' | 'resolved_freelancer' | 'withdrawn';
  openedAt?: string;
  reason?: string;
  posterEvidenceCid?: string;
  freelancerEvidenceCid?: string;
  hasVoted?: boolean;
  votesCompleted?: boolean;
}

// Component Props - Job Related

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
}

// Job IPFS content props
export interface JobIPFSContentProps {
  jobDetails: Record<string, unknown> | null;
}

// Component Props - Milestone Related

export interface MilestoneItemProps {
  milestone: Milestone;
  index: number;
  jobId: number;
  account: string | null;
  poster: string;
  freelancer: string | null;
  jobState: string;
  canInteract: boolean;
  isCancelled: boolean;
  isFirstMilestone: boolean;
  prevMilestoneAccepted: boolean;
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
}

export interface MilestoneFileUploadProps {
  milestoneId: number;
  canSubmit: boolean;
  isOverdue: boolean;
  onFileUploaded: (milestoneId: number, cid: string) => void;
  onSubmit: (milestoneId: number) => void;
  submitting: boolean;
  evidenceCid?: string;
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
}

export interface MilestonesListProps {
  jobId: number;
  milestones: Milestone[];
  poster: string;
  freelancer: string | null;
  jobState: string;
  mutualCancelRequestedBy?: string | null;
  freelancerWithdrawRequestedBy?: string | null;
  onUpdate?: () => void;
}

// Component Props - Job Actions

export interface JobCancelActionsProps {
  jobId: number;
  account: string | null;
  poster: string;
  freelancer: string | null;
  canInteract: boolean;
  isCancelled: boolean;
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

// Component Props - Dispute Related

export interface DisputeItemProps {
  dispute: DisputeData;
  resolvingKey: string | null;
  onResolvePoster: () => void;
  onResolveFreelancer: () => void;
}

// Component Props - Job Form Related

export interface JsonJobParseData {
  title?: string;
  description?: string;
  requirements?: string[];
  deadline?: number;
  milestones?: Array<MilestoneForm>;
}

export interface JsonJobInputProps {
  onParse: (data: JsonJobParseData) => void;
  canPostJobs: boolean;
}

export interface ManualJobFormProps {
  jobTitle: string;
  setJobTitle: (v: string) => void;
  jobDescription: string;
  setJobDescription: (v: string) => void;
  jobDuration: string;
  setJobDuration: (v: string) => void;
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

