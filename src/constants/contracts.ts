export const APTOS_NETWORK = "testnet";
export const APTOS_NODE_URL = "https://api.testnet.aptoslabs.com";
export const APTOS_FAUCET_URL = "https://faucet.testnet.aptoslabs.com";

export const CONTRACT_ADDRESS = "0xd27587d9f567cc15142d34e336c49eb45be09d8f0a624e2d9cef5e173f832e1e";

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
  ACCEPT_APPLICANT: `${CONTRACT_ADDRESS}::escrow::accept_applicant`,
  FREELANCER_STAKE: `${CONTRACT_ADDRESS}::escrow::freelancer_stake`,
  SUBMIT_MILESTONE: `${CONTRACT_ADDRESS}::escrow::submit_milestone`,
  CONFIRM_MILESTONE: `${CONTRACT_ADDRESS}::escrow::confirm_milestone`,
  REJECT_MILESTONE: `${CONTRACT_ADDRESS}::escrow::reject_milestone`,
  CLAIM_TIMEOUT: `${CONTRACT_ADDRESS}::escrow::claim_timeout`,
  MUTUAL_CANCEL: `${CONTRACT_ADDRESS}::escrow::mutual_cancel`,
  FREELANCER_WITHDRAW: `${CONTRACT_ADDRESS}::escrow::freelancer_withdraw`,
  UNLOCK_NON_DISPUTED_MILESTONES: `${CONTRACT_ADDRESS}::escrow::unlock_non_disputed_milestones`,
  GET_JOB_PARTIES: `${CONTRACT_ADDRESS}::escrow::get_job_parties`,
} as const;

export const DISPUTE = {
  OPEN_DISPUTE: `${CONTRACT_ADDRESS}::dispute::open_dispute`,
  FREELANCER_ACCEPT: `${CONTRACT_ADDRESS}::dispute::freelancer_accept`,
  FREELANCER_REJECT: `${CONTRACT_ADDRESS}::dispute::freelancer_reject`,
  REVIEWER_STAKE_AND_VOTE: `${CONTRACT_ADDRESS}::dispute::reviewer_stake_and_vote`,
} as const;

export const REPUTATION = {
  GET: `${CONTRACT_ADDRESS}::reputation::get`,
  CLAIM_REVIEWER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_reviewer_reward`,
  CLAIM_FREELANCER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_freelancer_reward`,
  CLAIM_POSTER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_poster_reward`,
} as const;
