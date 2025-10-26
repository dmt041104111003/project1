export const APTOS_NETWORK = "testnet";
export const APTOS_NODE_URL = "https://api.testnet.aptoslabs.com/v1";
export const APTOS_FAUCET_URL =  "https://faucet.testnet.aptoslabs.com";
export const APTOS_API_KEY = process.env.APTOS_API_KEY;


export const CONTRACT_ADDRESS ="0xe7b20cd398ea0b505ba19987b89cf4d0dbf456e82bee5a87ba0ee3f05e635f55";

export const DID = {
  BURN_DID: `${CONTRACT_ADDRESS}::did_registry::burn_did`,
  CREATE_PROFILE: `${CONTRACT_ADDRESS}::did_registry::create_profile`,
  UPDATE_PROFILE: `${CONTRACT_ADDRESS}::did_registry::update_profile`,
  IS_PROFILE_VERIFIED: `${CONTRACT_ADDRESS}::did_registry::is_profile_verified`,
  GET_ROLE_TYPES_BY_COMMITMENT: `${CONTRACT_ADDRESS}::did_registry::get_role_types_by_commitment`,
  GET_PROFILE_DATA_BY_COMMITMENT: `${CONTRACT_ADDRESS}::did_registry::get_profile_data_by_commitment`,
  GET_ADDRESS_BY_COMMITMENT: `${CONTRACT_ADDRESS}::did_registry::get_address_by_commitment`,
  GET_ALL_COMMITMENTS: `${CONTRACT_ADDRESS}::did_registry::get_all_commitments`,
} as const;

export const JOB = {
  EXECUTE_JOB_ACTION: `${CONTRACT_ADDRESS}::escrow::execute_job_action`,
  
  ACTION_POST: 1,
  ACTION_APPLY: 2,
  ACTION_APPROVE: 3,
  ACTION_SUBMIT: 4,
  ACTION_ACCEPT: 5,
  ACTION_COMPLETE: 6,
  ACTION_CLAIM: 7,
  ACTION_CANCEL: 8,
  ACTION_AUTO_RETURN_STAKE: 9,
  
  GET_JOB_BY_ID: `${CONTRACT_ADDRESS}::escrow::get_job_by_id`,
  GET_JOB_LATEST: `${CONTRACT_ADDRESS}::escrow::get_job_latest`,
  HAS_NO_ACTIVE_JOBS: `${CONTRACT_ADDRESS}::escrow::has_no_active_jobs`,
  GET_APPLICATION_DEADLINE: `${CONTRACT_ADDRESS}::escrow::get_application_deadline`,
  GET_MILESTONE_DEADLINE: `${CONTRACT_ADDRESS}::escrow::get_milestone_deadline`,
  IS_MILESTONE_EXPIRED: `${CONTRACT_ADDRESS}::escrow::is_milestone_expired`,
  IS_WORKER_BANNED: `${CONTRACT_ADDRESS}::escrow::is_worker_banned`,
} as const;

export const ZKP = {
  ADD_ZKP_PROOF: `${CONTRACT_ADDRESS}::zkp_lookup::add_zkp_proof`,
  ADD_ZKP_PROOF_INTERNAL: `${CONTRACT_ADDRESS}::zkp_lookup::add_zkp_proof_internal`,
  ADD_LOOKUP_TABLE: `${CONTRACT_ADDRESS}::zkp_lookup::add_lookup_table`,
  VERIFY_ZKP_PROOF_EXISTS: `${CONTRACT_ADDRESS}::zkp_lookup::verify_zkp_proof_exists`,
} as const;

