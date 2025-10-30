export const APTOS_NETWORK = "testnet";
export const APTOS_NODE_URL = "https://api.testnet.aptoslabs.com";
export const APTOS_FAUCET_URL = "https://faucet.testnet.aptoslabs.com";
export const APTOS_API_KEY = process.env.APTOS_API_KEY;


export const CONTRACT_ADDRESS = "0x51832f05e99b301c5947837edfa98754d6291c274b58a34f14cedc5a90563050";

export const ROLE = {
  REGISTER_FREELANCER: `${CONTRACT_ADDRESS}::role::register_freelancer`,
  REGISTER_POSTER: `${CONTRACT_ADDRESS}::role::register_poster`,
  REGISTER_REVIEWER: `${CONTRACT_ADDRESS}::role::register_reviewer`,
  GET_POSTER_CID_BYTES: `${CONTRACT_ADDRESS}::role::get_poster_cid_bytes`,
  GET_FREELANCER_CID_BYTES: `${CONTRACT_ADDRESS}::role::get_freelancer_cid_bytes`,
} as const;

export const ESCROW = {
  CREATE_JOB: `${CONTRACT_ADDRESS}::escrow::create_job`,
  JOIN_AS_FREELANCER: `${CONTRACT_ADDRESS}::escrow::join_as_freelancer`,
  SUBMIT_MILESTONE: `${CONTRACT_ADDRESS}::escrow::submit_milestone`,
  APPROVE_MILESTONE: `${CONTRACT_ADDRESS}::escrow::approve_milestone`,
  AUTO_APPROVE_IF_POSTER_INACTIVE: `${CONTRACT_ADDRESS}::escrow::auto_approve_if_poster_inactive`,
  CLAIM_STAKE_ON_MISS_DEADLINE: `${CONTRACT_ADDRESS}::escrow::claim_stake_on_miss_deadline`,
  OPEN_DISPUTE: `${CONTRACT_ADDRESS}::escrow::open_dispute`,
  UNLOCK_NON_DISPUTED_TO_POSTER: `${CONTRACT_ADDRESS}::escrow::unlock_non_disputed_to_poster`,
  POSTER_REQUEST_CANCEL: `${CONTRACT_ADDRESS}::escrow::poster_request_cancel`,
  FREELANCER_REQUEST_CANCEL: `${CONTRACT_ADDRESS}::escrow::freelancer_request_cancel`,
  WITHDRAW_DISPUTE_FEES: `${CONTRACT_ADDRESS}::escrow::withdraw_dispute_fees`,
  WITHDRAW_ALL_DISPUTE_FEES: `${CONTRACT_ADDRESS}::escrow::withdraw_all_dispute_fees`,
} as const;

export const DISPUTE = {
  OPEN: `${CONTRACT_ADDRESS}::dispute::open`,
  SET_MILESTONE_INDEX: `${CONTRACT_ADDRESS}::dispute::set_milestone_index`,
  FREELANCER_RESPONSE: `${CONTRACT_ADDRESS}::dispute::freelancer_response`,
  REVIEWER_STAKE_AND_VOTE: `${CONTRACT_ADDRESS}::dispute::reviewer_stake_and_vote`,
} as const;

export const REPUTATION = {
  CLAIM_REVIEWER_BONUS: `${CONTRACT_ADDRESS}::reputation::claim_reviewer_bonus`,
  CLAIM_FREELANCER_BONUS: `${CONTRACT_ADDRESS}::reputation::claim_freelancer_bonus`,
  CLAIM_POSTER_BONUS: `${CONTRACT_ADDRESS}::reputation::claim_poster_bonus`,
} as const;

export const JOB = {
  CREATE: `${CONTRACT_ADDRESS}::job::create`,
  JOIN: `${CONTRACT_ADDRESS}::job::join`,
  SUBMIT: `${CONTRACT_ADDRESS}::job::submit`,
  APPROVE: `${CONTRACT_ADDRESS}::job::approve`,
  AUTO_APPROVE_AFTER_TIMEOUT: `${CONTRACT_ADDRESS}::job::auto_approve_after_timeout`,
  MISS_DEADLINE_CLAIM: `${CONTRACT_ADDRESS}::job::miss_deadline_claim`,
  OPEN_DISPUTE: `${CONTRACT_ADDRESS}::job::open_dispute`,
} as const;
