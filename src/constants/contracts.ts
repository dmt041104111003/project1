export const APTOS_NETWORK = "testnet";
export const APTOS_NODE_URL = "https://api.testnet.aptoslabs.com";
export const APTOS_FAUCET_URL = "https://faucet.testnet.aptoslabs.com";
export const APTOS_API_KEY = "aptoslabs_Y2EfW2Yac23_NBduCDuMf7QRqVdARDFFYQquo2mJi9HYA";
export const CONTRACT_ADDRESS = "0x345f210605fbfd1e4286ad513c1eb29ac08416d290bd635543be53488056bcf4";

export const ROLE_KIND = {
  FREELANCER: 1,
  POSTER: 2,
  REVIEWER: 3
} as const;

export const ROLE = {
  REGISTER_ROLE: `${CONTRACT_ADDRESS}::role::register_role`,
  HAS_FREELANCER: `${CONTRACT_ADDRESS}::role::has_freelancer`,
  HAS_POSTER: `${CONTRACT_ADDRESS}::role::has_poster`,
  HAS_REVIEWER: `${CONTRACT_ADDRESS}::role::has_reviewer`,
  GET_CID: `${CONTRACT_ADDRESS}::role::get_cid`,
} as const;

export const ESCROW = {
  CREATE_JOB: `${CONTRACT_ADDRESS}::escrow::create_job`,
  APPLY_JOB: `${CONTRACT_ADDRESS}::escrow::apply_job`,
  SUBMIT_MILESTONE: `${CONTRACT_ADDRESS}::escrow::submit_milestone`,
  CONFIRM_MILESTONE: `${CONTRACT_ADDRESS}::escrow::confirm_milestone`,
  REJECT_MILESTONE: `${CONTRACT_ADDRESS}::escrow::reject_milestone`,
  CLAIM_TIMEOUT: `${CONTRACT_ADDRESS}::escrow::claim_timeout`,
  MUTUAL_CANCEL: `${CONTRACT_ADDRESS}::escrow::mutual_cancel`,
  ACCEPT_MUTUAL_CANCEL: `${CONTRACT_ADDRESS}::escrow::accept_mutual_cancel`,
  REJECT_MUTUAL_CANCEL: `${CONTRACT_ADDRESS}::escrow::reject_mutual_cancel`,
  FREELANCER_WITHDRAW: `${CONTRACT_ADDRESS}::escrow::freelancer_withdraw`,
  ACCEPT_FREELANCER_WITHDRAW: `${CONTRACT_ADDRESS}::escrow::accept_freelancer_withdraw`,
  REJECT_FREELANCER_WITHDRAW: `${CONTRACT_ADDRESS}::escrow::reject_freelancer_withdraw`,
  POSTER_WITHDRAW_UNFILLED: `${CONTRACT_ADDRESS}::escrow::poster_withdraw_unfilled_job`,
  UNLOCK_NON_DISPUTED_MILESTONES: `${CONTRACT_ADDRESS}::escrow::unlock_non_disputed_milestones`,
  CLAIM_DISPUTE_PAYMENT: `${CONTRACT_ADDRESS}::escrow::claim_dispute_payment`,
  CLAIM_DISPUTE_REFUND: `${CONTRACT_ADDRESS}::escrow::claim_dispute_refund`,
} as const;

export const DISPUTE = {
  OPEN_DISPUTE: `${CONTRACT_ADDRESS}::dispute::open_dispute`,
  ADD_EVIDENCE: `${CONTRACT_ADDRESS}::dispute::add_evidence`,
  REVIEWER_VOTE: `${CONTRACT_ADDRESS}::dispute::reviewer_vote`,
} as const;

export const REPUTATION = {
  GET: `${CONTRACT_ADDRESS}::reputation::get`,
  CLAIM_REVIEWER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_reviewer_reward`,
  CLAIM_FREELANCER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_freelancer_reward`,
  CLAIM_POSTER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_poster_reward`,
} as const;
