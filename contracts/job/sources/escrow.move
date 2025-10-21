module did_addr_profile::escrow {
    use std::option::{Self, Option};
    use std::signer;
    use aptos_framework::coin::{Self};
    use aptos_framework::aptos_coin::AptosCoin;
    use std::table;
    use std::event;
    use aptos_framework::account::{Self, SignerCapability};
    use std::vector;
    use aptos_framework::timestamp;
    use did_addr_profile::did_registry;

    const EJOB_NOT_FOUND: u64 = 0;
    const EALREADY_HAS_WORKER: u64 = 1;
    const ENOT_POSTER: u64 = 2;
    const ENOT_ACTIVE: u64 = 4;
    const ENOT_WORKER: u64 = 5;
    const EALREADY_SUBMITTED: u64 = 6;
    const ENOT_SUBMITTED: u64 = 7;
    const ENOT_APPROVED: u64 = 12;
    const EINVALID_MILESTONE: u64 = 18;
    const EMODULE_NOT_INITIALIZED: u64 = 21;
    const EINVALID_PROFILE: u64 = 22;
    const EINVALID_AMOUNT: u64 = 25;
    const EINVALID_SIGNER_FOR_INIT: u64 = 26;
    const ENO_PROFILE: u64 = 31;
    const EINVALID_CID: u64 = 32;
    const ENOT_AUTHORIZED: u64 = 29;
    const EJOB_NOT_COMPLETED: u64 = 33;

    const ONE_APT: u64 = 100_000_000;

    const ACTION_POST: u8 = 1;
    const ACTION_APPLY: u8 = 2;
    const ACTION_APPROVE: u8 = 3;
    const ACTION_SUBMIT: u8 = 4;
    const ACTION_ACCEPT: u8 = 5;
    const ACTION_COMPLETE: u8 = 6;
    const ACTION_CLAIM: u8 = 7;
    const ACTION_CANCEL: u8 = 8;

    struct Job has key, store, copy, drop {
        poster_commitment: vector<u8>,
        cid: vector<u8>,
        milestones: vector<u64>,
        worker_commitment: Option<vector<u8>>,
        approved: bool,
        active: bool,
        current_milestone: u64,
        escrowed_amount: u64,
        completed: bool,
        application_deadline: u64,
        worker_stake: u64,
        cancel_requested: bool,
        cancel_approved_poster: bool,
        cancel_approved_worker: bool,
    }

    struct Jobs has key {
        jobs: table::Table<u64, Job>,
        job_counter: u64,
    }

    struct JobEvent has copy, drop, store {
        action: u8,
        job_id: u64,
        user_commitment: vector<u8>,
        time: u64,
        data: vector<u8>
    }

    struct Events has key {
        job_event: event::EventHandle<JobEvent>,
    }

    struct MarketplaceCapability has key {
        cap: SignerCapability,
        escrow_address: address, 
    }
   
    fun is_valid_cid(cid: &vector<u8>): bool {
        let len = vector::length(cid);
        if (len < 10 || len > 100) return false;
        
        let i = 0;
        while (i < len) {
            let byte = *vector::borrow(cid, i);
            if (!((byte >= 48 && byte <= 57) || // 0-9
                  (byte >= 65 && byte <= 90) || // A-Z
                  (byte >= 97 && byte <= 122) || // a-z
                  byte == 45 || // -
                  byte == 95 || // _
                  byte == 46)) { // .
                return false
            };
            i = i + 1;
        };
        true
    }

    public entry fun init_events(account: &signer) {
        move_to(account, Events {
            job_event: account::new_event_handle<JobEvent>(account),
        });
    }

    public entry fun initialize_marketplace(account: &signer) {
        let owner_addr = signer::address_of(account);
        assert!(owner_addr == @did_addr_profile, EINVALID_SIGNER_FOR_INIT);

        if (!exists<Jobs>(owner_addr)) {
            move_to(account, Jobs {
                jobs: table::new<u64, Job>(),
                job_counter: 0,
            });
        };

        if (!exists<Events>(owner_addr)) {
            init_events(account);
        };
     
        if (!exists<MarketplaceCapability>(owner_addr)) {
            let (escrow_signer, escrow_cap) = account::create_resource_account(account, x"6d61726b6574706c6163655f657363726f77");
            let escrow_address = signer::address_of(&escrow_signer);
            move_to(account, MarketplaceCapability { cap: escrow_cap, escrow_address: escrow_address });
            coin::register<AptosCoin>(&escrow_signer);
        }
    }

    public entry fun execute_job_action(
        user: &signer,
        action: u8,
        job_id: u64,
        user_commitment: vector<u8>,
        worker_commitment: vector<u8>,
        milestone_index: u64,
        cid: vector<u8>,
        job_details_cid: vector<u8>,
        milestones: vector<u64>,
        application_deadline: u64
    ) acquires Jobs, Events, MarketplaceCapability {
        assert!(exists<Jobs>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        
        if (action == ACTION_POST) {
            // POST JOB - Create new job
            let roles = did_registry::get_role_types_by_commitment(user_commitment);
            assert!(vector::length(&roles) > 0, ENO_PROFILE);
            assert!(vector::contains(&roles, &2), EINVALID_PROFILE);

            let jobs_res = borrow_global_mut<Jobs>(@did_addr_profile);
        let job_id = jobs_res.job_counter;
        jobs_res.job_counter = jobs_res.job_counter + 1;

            let total_amount = 0u64;
        let i = 0;
            while (i < vector::length(&milestones)) {
            let amount = *vector::borrow(&milestones, i);
            assert!(amount > 0, EINVALID_AMOUNT);
                total_amount = total_amount + amount;
            i = i + 1;
        };

            // Transfer funds to escrow account
        let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
            let escrow_address = marketplace_cap.escrow_address;
            
            // Transfer funds from poster to escrow account
            coin::transfer<AptosCoin>(user, escrow_address, total_amount);

        let new_job = Job {
                poster_commitment: user_commitment,
            cid: job_details_cid,
            milestones: milestones,
            worker_commitment: option::none(),
            approved: false,
            active: true,
            current_milestone: 0,
                escrowed_amount: total_amount,
            completed: false,
            application_deadline: application_deadline,
            worker_stake: 0,
                cancel_requested: false,
                cancel_approved_poster: false,
                cancel_approved_worker: false,
        };

        table::add(&mut jobs_res.jobs, job_id, new_job);
        } else {
            // All other actions
        let jobs = borrow_global_mut<Jobs>(@did_addr_profile);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        let job = table::borrow_mut(&mut jobs.jobs, job_id);

            if (action == ACTION_APPLY) {
                // APPLY - Worker applies to job
                let roles = did_registry::get_role_types_by_commitment(worker_commitment);
                assert!(vector::length(&roles) > 0, ENO_PROFILE);
                assert!(vector::contains(&roles, &1), EINVALID_PROFILE);
        assert!(job.active, ENOT_ACTIVE);
                assert!(timestamp::now_seconds() <= job.application_deadline, 28);
                assert!(job.poster_commitment != worker_commitment, ENOT_AUTHORIZED);
                
                // Transfer worker stake to escrow account
                let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
                let escrow_address = marketplace_cap.escrow_address;
                
                coin::transfer<AptosCoin>(user, escrow_address, ONE_APT);

        job.worker_commitment = option::some(worker_commitment);
                job.approved = false;
                job.worker_stake = ONE_APT;
            } else if (action == ACTION_APPROVE) {
                // APPROVE - Poster approves worker
                let roles = did_registry::get_role_types_by_commitment(user_commitment);
                assert!(vector::length(&roles) > 0, ENO_PROFILE);
                assert!(vector::contains(&roles, &2), EINVALID_PROFILE);
                assert!(job.poster_commitment == user_commitment, ENOT_POSTER);
                assert!(job.active, ENOT_ACTIVE);
                assert!(option::is_some(&job.worker_commitment), 11);
                assert!(!job.approved, EALREADY_HAS_WORKER);
        
        job.approved = true;
            } else if (action == ACTION_SUBMIT) {
                // SUBMIT - Worker submits milestone
                let roles = did_registry::get_role_types_by_commitment(user_commitment);
                assert!(vector::length(&roles) > 0, ENO_PROFILE);
                assert!(vector::contains(&roles, &1), EINVALID_PROFILE);
                assert!(is_valid_cid(&cid), EINVALID_CID);
        assert!(option::is_some(&job.worker_commitment), ENOT_WORKER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(job.approved, ENOT_APPROVED);
        assert!(milestone_index < vector::length(&job.milestones), EINVALID_MILESTONE);
                
                // Milestone submitted (simplified - no complex state tracking)
                job.current_milestone = milestone_index + 1;
            } else if (action == ACTION_ACCEPT) {
                // ACCEPT - Poster accepts milestone
                let roles = did_registry::get_role_types_by_commitment(user_commitment);
                assert!(vector::length(&roles) > 0, ENO_PROFILE);
                assert!(vector::contains(&roles, &2), EINVALID_PROFILE);
                assert!(is_valid_cid(&cid), EINVALID_CID);
                assert!(job.poster_commitment == user_commitment, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker_commitment), ENOT_WORKER);

        let milestone_amount = *vector::borrow(&job.milestones, milestone_index);
        job.escrowed_amount = job.escrowed_amount - milestone_amount;
                
        if (job.current_milestone == vector::length(&job.milestones)) {
            job.completed = true;
            job.active = false;
        };
            } else if (action == ACTION_COMPLETE) {
                // COMPLETE - Complete job
                let roles = did_registry::get_role_types_by_commitment(user_commitment);
                assert!(vector::contains(&roles, &2), EINVALID_PROFILE);
                assert!(job.poster_commitment == user_commitment, ENOT_POSTER);
        assert!(job.active, ENOT_ACTIVE);
        assert!(option::is_some(&job.worker_commitment), ENOT_WORKER);
                
                // Transfer remaining funds from escrow to worker
                if (job.escrowed_amount > 0) {
                    let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
                    let escrow_signer = account::create_signer_with_capability(&marketplace_cap.cap);
                    let worker_address = did_registry::get_address_by_commitment(*option::borrow(&job.worker_commitment));
                    
                    coin::transfer<AptosCoin>(&escrow_signer, worker_address, job.escrowed_amount);
                };
                
                // Return worker stake
                if (job.worker_stake > 0) {
            let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
                    let escrow_signer = account::create_signer_with_capability(&marketplace_cap.cap);
                    let worker_address = did_registry::get_address_by_commitment(*option::borrow(&job.worker_commitment));
                    
                    coin::transfer<AptosCoin>(&escrow_signer, worker_address, job.worker_stake);
                };

    job.active = false;
    job.completed = true;
    job.escrowed_amount = 0;
    job.worker_stake = 0;
            } else if (action == ACTION_CLAIM) {
                // CLAIM - Thanh toán khi hoàn thành job
                let is_poster = job.poster_commitment == user_commitment;
                let is_worker = option::is_some(&job.worker_commitment) && 
                               *option::borrow(&job.worker_commitment) == user_commitment;
                assert!(is_poster || is_worker, ENOT_AUTHORIZED);
                assert!(job.completed, EJOB_NOT_COMPLETED); // Job must be completed to claim
                
                // Transfer funds from escrow to worker
                if (is_worker && job.escrowed_amount > 0) {
            let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
                    let escrow_signer = account::create_signer_with_capability(&marketplace_cap.cap);
                    let worker_address = did_registry::get_address_by_commitment(user_commitment);
                    
                    coin::transfer<AptosCoin>(&escrow_signer, worker_address, job.escrowed_amount);
                job.escrowed_amount = 0; 
                };
                
                // Return worker stake
                if (job.worker_stake > 0 && is_worker) {
                let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
                    let escrow_signer = account::create_signer_with_capability(&marketplace_cap.cap);
                    let worker_address = did_registry::get_address_by_commitment(user_commitment);
                    
                    coin::transfer<AptosCoin>(&escrow_signer, worker_address, job.worker_stake);
                    job.worker_stake = 0;
                };
            } else if (action == ACTION_CANCEL) {
                // CANCEL - Cancel job (only poster can request, both must approve)
                let is_poster = job.poster_commitment == user_commitment;
                let is_worker = option::is_some(&job.worker_commitment) && 
                               *option::borrow(&job.worker_commitment) == user_commitment;
                assert!(is_poster || is_worker, ENOT_AUTHORIZED);
        assert!(job.active, ENOT_ACTIVE);
                
                if (is_poster) {
                    job.cancel_requested = true;
                    job.cancel_approved_poster = true;
                } else if (is_worker) {
                    // Worker approves cancellation
                    assert!(job.cancel_requested, 34); // ECANCEL_NOT_REQUESTED
                    job.cancel_approved_worker = true;
                };
                
                if (job.cancel_approved_poster && job.cancel_approved_worker) {
                    if (job.escrowed_amount > 0) {
            let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
                        let escrow_signer = account::create_signer_with_capability(&marketplace_cap.cap);
                        let poster_address = did_registry::get_address_by_commitment(job.poster_commitment);
                        
                        coin::transfer<AptosCoin>(&escrow_signer, poster_address, job.escrowed_amount);
                        job.escrowed_amount = 0;
                    };
                    
                    // Refund worker's stake
        if (job.worker_stake > 0) {
        let marketplace_cap = borrow_global<MarketplaceCapability>(@did_addr_profile);
                        let escrow_signer = account::create_signer_with_capability(&marketplace_cap.cap);
                        let worker_address = did_registry::get_address_by_commitment(*option::borrow(&job.worker_commitment));
                        
                        coin::transfer<AptosCoin>(&escrow_signer, worker_address, job.worker_stake);
            job.worker_stake = 0;
        };

                    // Mark job as inactive
            job.active = false;
                    job.completed = true;
                };
            }
        };

        if (exists<Events>(@did_addr_profile)) {
            let events = borrow_global_mut<Events>(@did_addr_profile);
            event::emit_event(
                &mut events.job_event,
                JobEvent {
                    action,
                    job_id,
                    user_commitment,
                    time: timestamp::now_seconds(),
                    data: cid
                }
            );
        };
    }

    #[view]
    public fun get_job_by_id(job_id: u64): Job acquires Jobs {
        let jobs = borrow_global<Jobs>(@did_addr_profile);
        assert!(table::contains(&jobs.jobs, job_id), EJOB_NOT_FOUND);
        *table::borrow(&jobs.jobs, job_id)
    }

    #[view]
    public fun get_job_latest(): vector<Job> acquires Jobs {
        let jobs = borrow_global<Jobs>(@did_addr_profile);
        let job_counter = jobs.job_counter;
        let result = vector::empty<Job>();
        let i = 0u64;
        
        while (i < job_counter) {
            if (table::contains(&jobs.jobs, i)) {
                let job = *table::borrow(&jobs.jobs, i);
                vector::push_back(&mut result, job);
            };
            i = i + 1;
        };
        
        result
    }

    #[view]
    public fun has_no_active_jobs(user_commitment: vector<u8>): bool acquires Jobs {
        let jobs = borrow_global<Jobs>(@did_addr_profile);
        let job_counter = jobs.job_counter;
        let i = 0;
        
        while (i < job_counter) {
            if (table::contains(&jobs.jobs, i)) {
                let job = table::borrow(&jobs.jobs, i);

                let is_poster = job.poster_commitment == user_commitment;
                let is_worker = option::is_some(&job.worker_commitment) && 
                               *option::borrow(&job.worker_commitment) == user_commitment;
                
                if ((is_poster || is_worker) && job.active) {
                    return false
                };
            };
            i = i + 1;
        };
        
        true
    }
}