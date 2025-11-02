export const APTOS_NETWORK = "testnet";
export const APTOS_NODE_URL = "https://api.testnet.aptoslabs.com";
export const APTOS_FAUCET_URL = "https://faucet.testnet.aptoslabs.com";

export const CONTRACT_ADDRESS = "0xe66a2dfa9123fc8393c9530e8e110a706ca50513229e379c4e7a312f3b291f96";

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
  FREELANCER_WITHDRAW: `${CONTRACT_ADDRESS}::escrow::freelancer_withdraw`,
  UNLOCK_NON_DISPUTED_MILESTONES: `${CONTRACT_ADDRESS}::escrow::unlock_non_disputed_milestones`,
  CLAIM_DISPUTE_PAYMENT: `${CONTRACT_ADDRESS}::escrow::claim_dispute_payment`,
  CLAIM_DISPUTE_REFUND: `${CONTRACT_ADDRESS}::escrow::claim_dispute_refund`,
} as const;

export const DISPUTE = {
  OPEN_DISPUTE: `${CONTRACT_ADDRESS}::dispute::open_dispute`,
  FREELANCER_ACCEPT: `${CONTRACT_ADDRESS}::dispute::freelancer_accept`,
  FREELANCER_REJECT: `${CONTRACT_ADDRESS}::dispute::freelancer_reject`,
  REVIEWER_VOTE: `${CONTRACT_ADDRESS}::dispute::reviewer_vote`,
} as const;

export const REPUTATION = {
  GET: `${CONTRACT_ADDRESS}::reputation::get`,
  CLAIM_REVIEWER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_reviewer_reward`,
  CLAIM_FREELANCER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_freelancer_reward`,
  CLAIM_POSTER_REWARD: `${CONTRACT_ADDRESS}::reputation::claim_poster_reward`,
} as const;
