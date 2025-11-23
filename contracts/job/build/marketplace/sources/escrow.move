module job_work_board::escrow {
    use std::option::{Self, Option};
    use std::string::String;
    use std::vector;
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    use job_work_board::role;
    use job_work_board::reputation;

    friend job_work_board::dispute;

    const OCTA: u64 = 100_000_000;
    const STAKE_AMOUNT: u64 = 1 * OCTA;
    const POSTER_FEE: u64 = 2 * OCTA / 10; // 0.2 APT
    const FREELANCER_FEE: u64 = 1 * OCTA / 10; // 0.1 APT 

    enum JobState has copy, drop, store {
        Posted,
        PendingApproval,
        InProgress,
        Completed,
        Cancelled,
        CancelledByPoster,
        Disputed,
        Expired
    }

    fun job_state_to_string(state: JobState): String {
        if (state == JobState::Posted) {
            std::string::utf8(b"Posted")
        } else if (state == JobState::PendingApproval) {
            std::string::utf8(b"PendingApproval")
        } else if (state == JobState::InProgress) {
            std::string::utf8(b"InProgress")
        } else if (state == JobState::Completed) {
            std::string::utf8(b"Completed")
        } else if (state == JobState::Cancelled) {
            std::string::utf8(b"Cancelled")
        } else if (state == JobState::CancelledByPoster) {
            std::string::utf8(b"CancelledByPoster")
        } else if (state == JobState::Disputed) {
            std::string::utf8(b"Disputed")
        } else {
            std::string::utf8(b"Expired")
        }
    }

    enum MilestoneStatus has copy, drop, store {
        Pending,
        Submitted,
        Accepted,
        Locked,
        Withdrawn
    }

    struct Milestone has store {
        id: u64,
        amount: u64,
        duration: u64,  
        deadline: u64,  
        review_period: u64,  
        review_deadline: u64,  
        status: MilestoneStatus,
        evidence_cid: Option<String>
    }

    struct Job has key, store {
        id: u64,
        poster: address,
        freelancer: Option<address>,
        pending_freelancer: Option<address>,
        cid: String,
        poster_stake: u64,
        freelancer_stake: u64,
        pending_stake: u64,
        pending_fee: u64,
        total_escrow: u64,
        milestones: vector<Milestone>,
        state: JobState,
        dispute_id: Option<u64>,
        dispute_winner: Option<bool>,  
        apply_deadline: u64,  
        started_at: Option<u64>,  
        job_funds: coin::Coin<AptosCoin>,
        stake_pool: coin::Coin<AptosCoin>,
        dispute_pool: coin::Coin<AptosCoin>,
        mutual_cancel_requested_by: Option<address>,  
        freelancer_withdraw_requested_by: Option<address>,  
    }

    struct EscrowStore has key {
        table: Table<u64, Job>,
        next_job_id: u64,
        claim_timeout_events: aptos_framework::event::EventHandle<ClaimTimeoutEvent>,
        job_created_events: aptos_framework::event::EventHandle<JobCreatedEvent>,
        job_applied_events: aptos_framework::event::EventHandle<JobAppliedEvent>,
        job_state_changed_events: aptos_framework::event::EventHandle<JobStateChangedEvent>,
        milestone_submitted_events: aptos_framework::event::EventHandle<MilestoneSubmittedEvent>,
        milestone_accepted_events: aptos_framework::event::EventHandle<MilestoneAcceptedEvent>,
        milestone_rejected_events: aptos_framework::event::EventHandle<MilestoneRejectedEvent>,
        milestone_created_events: aptos_framework::event::EventHandle<MilestoneCreatedEvent>
    }

    struct ClaimTimeoutEvent has drop, store {
        job_id: u64,
        milestone_id: u64,
        claimed_by: address,
        claimed_at: u64,
        freelancer_stake_claimed: u64
    }

    struct JobCreatedEvent has drop, store {
        job_id: u64,
        poster: address,
        cid: String,
        total_amount: u64,
        milestones_count: u64,
        apply_deadline: u64,
        created_at: u64
    }

    struct JobAppliedEvent has drop, store {
        job_id: u64,
        freelancer: address,
        applied_at: u64
    }

    struct JobStateChangedEvent has drop, store {
        job_id: u64,
        old_state: String,
        new_state: String,
        changed_at: u64
    }

    struct MilestoneSubmittedEvent has drop, store {
        job_id: u64,
        milestone_id: u64,
        freelancer: address,
        evidence_cid: String,
        submitted_at: u64
    }

    struct MilestoneAcceptedEvent has drop, store {
        job_id: u64,
        milestone_id: u64,
        freelancer: address,
        amount: u64,
        accepted_at: u64
    }

    struct MilestoneRejectedEvent has drop, store {
        job_id: u64,
        milestone_id: u64,
        poster: address,
        rejected_at: u64
    }

    struct MilestoneCreatedEvent has drop, store {
        job_id: u64,
        milestone_id: u64,
        amount: u64,
        duration: u64,
        deadline: u64,
        review_period: u64,
        review_deadline: u64,
        created_at: u64
    }

    fun init_module(admin: &signer) {
        move_to(admin, EscrowStore {
            table: table::new(),
            next_job_id: 1,
            claim_timeout_events: account::new_event_handle<ClaimTimeoutEvent>(admin),
            job_created_events: account::new_event_handle<JobCreatedEvent>(admin),
            job_applied_events: account::new_event_handle<JobAppliedEvent>(admin),
            job_state_changed_events: account::new_event_handle<JobStateChangedEvent>(admin),
            milestone_submitted_events: account::new_event_handle<MilestoneSubmittedEvent>(admin),
            milestone_accepted_events: account::new_event_handle<MilestoneAcceptedEvent>(admin),
            milestone_rejected_events: account::new_event_handle<MilestoneRejectedEvent>(admin),
            milestone_created_events: account::new_event_handle<MilestoneCreatedEvent>(admin)
        });
    }

    public entry fun create_job(
        poster: &signer,
        cid: String,
        milestone_deadlines: vector<u64>,
        milestone_amounts: vector<u64>,
        milestone_review_periods: vector<u64>,
        poster_deposit: u64,
        apply_deadline_duration: u64
    ) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        assert!(role::has_poster(poster_addr), 1);

        let n = vector::length(&milestone_deadlines);
        assert!(n > 0 && n == vector::length(&milestone_amounts), 1);
        assert!(n == vector::length(&milestone_review_periods), 1);

        let total_check = 0;
        let i = 0;
        while (i < n) {
            total_check = total_check + *vector::borrow(&milestone_amounts, i);
            i = i + 1;
        };
        assert!(total_check == poster_deposit, 1);

        let job_funds = coin::withdraw<AptosCoin>(poster, poster_deposit);
        let stake = coin::withdraw<AptosCoin>(poster, STAKE_AMOUNT);
        let fee = coin::withdraw<AptosCoin>(poster, POSTER_FEE);

        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job_id = store.next_job_id;
        store.next_job_id = store.next_job_id + 1;
        let milestones = vector::empty<Milestone>();
        let now = timestamp::now_seconds();
        let apply_deadline = now + apply_deadline_duration;
        i = 0;
        while (i < n) {
            let deadline_duration = *vector::borrow(&milestone_deadlines, i);
            let review_period = *vector::borrow(&milestone_review_periods, i);
            let milestone_amount = *vector::borrow(&milestone_amounts, i);
            let milestone_id = i;
            let deadline = 0;
            let review_deadline = 0;
            
            vector::push_back(&mut milestones, Milestone {
                id: milestone_id,
                amount: milestone_amount,
                duration: deadline_duration,  
                deadline,  
                review_period,
                review_deadline,
                status: MilestoneStatus::Pending,
                evidence_cid: option::none()
            });
            
            aptos_framework::event::emit_event(
                &mut store.milestone_created_events,
                MilestoneCreatedEvent {
                    job_id,
                    milestone_id,
                    amount: milestone_amount,
                    duration: deadline_duration,
                    deadline,
                    review_period,
                    review_deadline,
                    created_at: now
                }
            );
            
            i = i + 1;
        };

        table::add(&mut store.table, job_id, Job {
            id: job_id,
            poster: poster_addr,
            freelancer: option::none(),
            pending_freelancer: option::none(),
            cid,
            poster_stake: STAKE_AMOUNT,
            freelancer_stake: 0,
            pending_stake: 0,
            pending_fee: 0,
            total_escrow: poster_deposit,
            milestones,
            state: JobState::Posted,
            dispute_id: option::none(),
            dispute_winner: option::none(),
            apply_deadline,
            started_at: option::none(),
            job_funds,
            stake_pool: stake,
            mutual_cancel_requested_by: option::none(),
            dispute_pool: fee,
            freelancer_withdraw_requested_by: option::none(),
        });

        aptos_framework::event::emit_event(
            &mut store.job_created_events,
            JobCreatedEvent {
                job_id,
                poster: poster_addr,
                cid,
                total_amount: poster_deposit,
                milestones_count: n,
                apply_deadline,
                created_at: now
            }
        );
    }

    public entry fun apply_job(freelancer: &signer, job_id: u64) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        assert!(role::has_freelancer(freelancer_addr), 1);

        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);
        assert!(freelancer_addr != job.poster, 3);
        
        let now = timestamp::now_seconds();
        assert!(now <= job.apply_deadline, 2); 
        assert!(option::is_none(&job.freelancer), 1);
        assert!(option::is_none(&job.pending_freelancer), 1);
        assert!(job.state == JobState::Posted || job.state == JobState::Expired, 1);
        assert!(job.freelancer_stake == 0, 1);
        let stake = coin::withdraw<AptosCoin>(freelancer, STAKE_AMOUNT);
        let fee = coin::withdraw<AptosCoin>(freelancer, FREELANCER_FEE);
        
        job.pending_freelancer = option::some(freelancer_addr);
        job.pending_stake = STAKE_AMOUNT;
        job.pending_fee = FREELANCER_FEE;
        job.state = JobState::PendingApproval;
        
        coin::merge(&mut job.stake_pool, stake);
        coin::merge(&mut job.dispute_pool, fee);

        aptos_framework::event::emit_event(
            &mut store.job_applied_events,
            JobAppliedEvent {
                job_id,
                freelancer: freelancer_addr,
                applied_at: now
            }
        );
    }

    fun refund_pending_candidate(job: &mut Job, candidate: address) {
        if (job.pending_stake > 0) {
            let refund_stake = coin::extract(&mut job.stake_pool, job.pending_stake);
            coin::deposit(candidate, refund_stake);
            job.pending_stake = 0;
        };
        if (job.pending_fee > 0) {
            let refund_fee = coin::extract(&mut job.dispute_pool, job.pending_fee);
            coin::deposit(candidate, refund_fee);
            job.pending_fee = 0;
        };
    }

    public entry fun review_candidate(
        poster: &signer,
        job_id: u64,
        approve: bool
    ) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);
        assert!(job.poster == poster_addr, 1);
        assert!(option::is_some(&job.pending_freelancer), 1);
        let candidate = *option::borrow(&job.pending_freelancer);
        let old_state = job.state;

        if (!approve) {
            refund_pending_candidate(job, candidate);
            job.pending_freelancer = option::none();
            job.state = JobState::Posted;
            
            let now = timestamp::now_seconds();
            aptos_framework::event::emit_event(
                &mut store.job_state_changed_events,
                JobStateChangedEvent {
                    job_id,
                    old_state: job_state_to_string(old_state),
                    new_state: job_state_to_string(JobState::Posted),
                    changed_at: now
                }
            );
            return;
        };

        job.freelancer = option::some(candidate);
        job.freelancer_stake = job.pending_stake;
        job.pending_stake = 0;
        job.pending_fee = 0;
        job.pending_freelancer = option::none();
        job.state = JobState::InProgress;

        let now = timestamp::now_seconds();
        job.started_at = option::some(now);
        let len = vector::length(&job.milestones);
        if (len > 0) {
            let first_milestone = vector::borrow_mut(&mut job.milestones, 0);
            if (first_milestone.status != MilestoneStatus::Accepted) {
                first_milestone.status = MilestoneStatus::Pending;
                first_milestone.deadline = now + first_milestone.duration;
                first_milestone.review_deadline = 0;
                first_milestone.evidence_cid = option::none();
            } else if (first_milestone.deadline == 0) {
                first_milestone.deadline = now + first_milestone.duration;
            };
        };

        aptos_framework::event::emit_event(
            &mut store.job_state_changed_events,
            JobStateChangedEvent {
                job_id,
                old_state: job_state_to_string(old_state),
                new_state: job_state_to_string(JobState::InProgress),
                changed_at: now
            }
        );
    }

    public entry fun withdraw_application(
        freelancer: &signer,
        job_id: u64
    ) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);
        assert!(job.state == JobState::PendingApproval, 1);
        assert!(option::is_some(&job.pending_freelancer), 1);
        let candidate = *option::borrow(&job.pending_freelancer);
        assert!(candidate == freelancer_addr, 1);

        refund_pending_candidate(job, candidate);
        job.pending_freelancer = option::none();
        job.state = JobState::Posted;
    }

    public entry fun mark_job_expired(poster: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(job.state == JobState::Posted, 1);
        assert!(option::is_none(&job.freelancer), 1);
        
        let now = timestamp::now_seconds();
        if (job.apply_deadline > 0 && now > job.apply_deadline) {
            let old_state = job.state;
            job.state = JobState::Expired;
            
            aptos_framework::event::emit_event(
                &mut store.job_state_changed_events,
                JobStateChangedEvent {
                    job_id,
                    old_state: job_state_to_string(old_state),
                    new_state: job_state_to_string(JobState::Expired),
                    changed_at: now
                }
            );
        };
    }


    public entry fun submit_milestone(
        freelancer: &signer,
        job_id: u64,
        milestone_id: u64,
        evidence_cid: String
    ) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);
        assert!(job.state == JobState::InProgress, 1);

        let i = find_milestone_index(&job.milestones, milestone_id);
        
        if (i > 0) {
            let prev_milestone = vector::borrow(&job.milestones, i - 1);
            assert!(prev_milestone.status == MilestoneStatus::Accepted, 2); 
        };
        
        let milestone_check = vector::borrow(&job.milestones, i);
        assert!(milestone_check.status == MilestoneStatus::Pending, 1);
        assert!(milestone_check.deadline > 0, 3); // E_MILESTONE_DEADLINE_NOT_SET
        
        let milestone = vector::borrow_mut(&mut job.milestones, i);
        let now = timestamp::now_seconds();
        
        milestone.status = MilestoneStatus::Submitted;
        milestone.evidence_cid = option::some(evidence_cid);
        milestone.review_deadline = now + milestone.review_period;

        aptos_framework::event::emit_event(
            &mut store.milestone_submitted_events,
            MilestoneSubmittedEvent {
                job_id,
                milestone_id,
                freelancer: freelancer_addr,
                evidence_cid,
                submitted_at: now
            }
        );
    }

    public entry fun confirm_milestone(poster: &signer, job_id: u64, milestone_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(job.state == JobState::InProgress, 1);

        let i = find_milestone_index(&job.milestones, milestone_id);
        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Submitted, 1);

        let now = timestamp::now_seconds();
        assert!(now <= milestone.review_deadline, 1);

        let milestone_amount = milestone.amount;
        milestone.status = MilestoneStatus::Accepted;

        if (option::is_some(&job.freelancer)) {
            let freelancer = *option::borrow(&job.freelancer);
            process_milestone_payment(job, milestone_amount, freelancer);
            set_next_milestone_deadline(job, i);

            aptos_framework::event::emit_event(
                &mut store.milestone_accepted_events,
                MilestoneAcceptedEvent {
                    job_id,
                    milestone_id,
                    freelancer,
                    amount: milestone_amount,
                    accepted_at: now
                }
            );
        };

        if (are_all_milestones_accepted(&job.milestones)) {
            let old_state = job.state;
            job.state = JobState::Completed;
            return_stakes(job);

            aptos_framework::event::emit_event(
                &mut store.job_state_changed_events,
                JobStateChangedEvent {
                    job_id,
                    old_state: job_state_to_string(old_state),
                    new_state: job_state_to_string(JobState::Completed),
                    changed_at: now
                }
            );
        };
    }

    public entry fun reject_milestone(poster: &signer, job_id: u64, milestone_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(job.state == JobState::InProgress, 1);

        let i = find_milestone_index(&job.milestones, milestone_id);
        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Submitted, 1);

        let now = timestamp::now_seconds();
        assert!(now <= milestone.review_deadline, 1);

        milestone.status = MilestoneStatus::Locked;
        let old_state = job.state;
        job.state = JobState::Disputed;

        aptos_framework::event::emit_event(
            &mut store.milestone_rejected_events,
            MilestoneRejectedEvent {
                job_id,
                milestone_id,
                poster: poster_addr,
                rejected_at: now
            }
        );

        aptos_framework::event::emit_event(
            &mut store.job_state_changed_events,
            JobStateChangedEvent {
                job_id,
                old_state: job_state_to_string(old_state),
                new_state: job_state_to_string(JobState::Disputed),
                changed_at: now
            }
        );
    }

    public entry fun claim_timeout(s: &signer, job_id: u64, milestone_id: u64) acquires EscrowStore {
        let caller = signer::address_of(s);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        let i = find_milestone_index(&job.milestones, milestone_id);
        let milestone = vector::borrow_mut(&mut job.milestones, i);
        let now = timestamp::now_seconds();

        if (milestone.status == MilestoneStatus::Pending) {
            assert!(job.poster == caller, 1);
            assert!(job.state != JobState::Cancelled, 1);
            assert!(job.state != JobState::CancelledByPoster, 1);
            assert!(now > milestone.deadline, 1);
            
            let stake_claimed = job.freelancer_stake;
            if (job.freelancer_stake > 0) {
                let penalty = coin::extract(&mut job.stake_pool, job.freelancer_stake);
                coin::deposit(caller, penalty);
                job.freelancer_stake = 0;
            };
            
            job.freelancer = option::none();
            job.state = JobState::Posted;
            job.started_at = option::none();
            job.mutual_cancel_requested_by = option::none();
            job.freelancer_withdraw_requested_by = option::none();
            
            let len = vector::length(&job.milestones);
            let j = 0;
            while (j < len) {
                let m = vector::borrow_mut(&mut job.milestones, j);
                if (m.status != MilestoneStatus::Accepted) {
                    m.status = MilestoneStatus::Pending;
                    m.deadline = 0;
                    m.review_deadline = 0;
                    m.evidence_cid = option::none();
                };
                j = j + 1;
            };
            
            aptos_framework::event::emit_event(
                &mut store.claim_timeout_events,
                ClaimTimeoutEvent {
                    job_id,
                    milestone_id,
                    claimed_by: caller,
                    claimed_at: now,
                    freelancer_stake_claimed: stake_claimed
                }
            );
        } else if (milestone.status == MilestoneStatus::Submitted) {
            assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == caller, 1);
            assert!(now > milestone.review_deadline, 1);
            milestone.status = MilestoneStatus::Accepted;
            
            let freelancer = *option::borrow(&job.freelancer);
            process_milestone_payment(job, milestone.amount, freelancer);
            set_next_milestone_deadline(job, i);

            if (are_all_milestones_accepted(&job.milestones)) {
                job.state = JobState::Completed;
                return_stakes(job);
            };
        };
    }

    public entry fun reopen_job_after_timeout(poster: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(job.state == JobState::Cancelled, 1);
        assert!(job.freelancer_stake == 0, 1);
        
        job.freelancer = option::none();
        job.state = JobState::Posted;
        job.started_at = option::none();
        job.mutual_cancel_requested_by = option::none();
        job.freelancer_withdraw_requested_by = option::none();

        let len = vector::length(&job.milestones);
        let i = 0;
        while (i < len) {
            let milestone = vector::borrow_mut(&mut job.milestones, i);
            if (milestone.status != MilestoneStatus::Accepted) {
                milestone.status = MilestoneStatus::Pending;
                milestone.deadline = 0;
                milestone.review_deadline = 0;
                milestone.evidence_cid = option::none();
            };
            i = i + 1;
        };
    }

    public entry fun unlock_non_disputed_milestones(poster: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(job.state == JobState::Disputed, 1);

        let len = vector::length(&job.milestones);
        let i = 0;

        while (i < len) {
            let milestone = vector::borrow_mut(&mut job.milestones, i);
            if (milestone.status != MilestoneStatus::Locked && milestone.status != MilestoneStatus::Withdrawn) {
                if (milestone.status == MilestoneStatus::Pending || milestone.status == MilestoneStatus::Submitted) {
                    let available = coin::value(&job.job_funds);
                    if (available >= milestone.amount) {
                        let refund = coin::extract(&mut job.job_funds, milestone.amount);
                        coin::deposit(poster_addr, refund);
                        milestone.status = MilestoneStatus::Withdrawn;
                    };
                };
            };
            i = i + 1;
        };
    }

    public entry fun mutual_cancel(s: &signer, job_id: u64) acquires EscrowStore {
        let caller = signer::address_of(s);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(option::is_some(&job.freelancer), 1);
        assert!(caller == job.poster, 1);
        assert!(job.state != JobState::Disputed, 4); 
        assert!(option::is_none(&job.dispute_id), 4); 
        assert!(option::is_none(&job.dispute_winner), 4); 
        assert!(!has_milestone_submitted(&job.milestones), 5); 
        
        if (option::is_some(&job.mutual_cancel_requested_by)) {
            return
        };
        
        job.mutual_cancel_requested_by = option::some(caller);
    }

    public entry fun accept_mutual_cancel(freelancer: &signer, job_id: u64) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);
        assert!(option::is_some(&job.mutual_cancel_requested_by), 1);
        assert!(job.state != JobState::Disputed, 4); 
        assert!(option::is_none(&job.dispute_id), 4); 
        assert!(option::is_none(&job.dispute_winner), 4); 
        assert!(!has_milestone_submitted(&job.milestones), 5);
        
        let requester = *option::borrow(&job.mutual_cancel_requested_by);
        assert!(requester == job.poster, 1);  
        
        let refund = coin::extract_all(&mut job.job_funds);
        coin::deposit(job.poster, refund);

        if (job.poster_stake > 0) {
            let poster_stake_back = coin::extract(&mut job.stake_pool, job.poster_stake);
            coin::deposit(freelancer_addr, poster_stake_back);
            job.poster_stake = 0;
        };
        if (job.freelancer_stake > 0) {
            let freelancer_stake_back = coin::extract(&mut job.stake_pool, job.freelancer_stake);
            coin::deposit(freelancer_addr, freelancer_stake_back);
            job.freelancer_stake = 0;
        };
        
        let old_state = job.state;
        job.freelancer = option::none();
        job.state = JobState::Cancelled;
        job.mutual_cancel_requested_by = option::none();
        job.freelancer_withdraw_requested_by = option::none();

        let now = timestamp::now_seconds();
        aptos_framework::event::emit_event(
            &mut store.job_state_changed_events,
            JobStateChangedEvent {
                job_id,
                old_state: job_state_to_string(old_state),
                new_state: job_state_to_string(JobState::Cancelled),
                changed_at: now
            }
        );
    }

    public entry fun reject_mutual_cancel(freelancer: &signer, job_id: u64) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);
        assert!(option::is_some(&job.mutual_cancel_requested_by), 1);
        
        let requester = *option::borrow(&job.mutual_cancel_requested_by);
        assert!(requester == job.poster, 1);  
        
        job.mutual_cancel_requested_by = option::none();
    }

    public entry fun poster_withdraw_unfilled_job(poster: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        
        let now = timestamp::now_seconds();
        let has_no_freelancer = option::is_none(&job.freelancer);
        let has_no_pending = option::is_none(&job.pending_freelancer);
        let deadline_passed = job.apply_deadline == 0 || now >= job.apply_deadline;

        assert!(has_no_pending, 7);
        assert!(has_no_freelancer || deadline_passed, 2);
        assert!(!has_milestone_submitted(&job.milestones), 5); 

        let job_funds_refund = coin::extract_all(&mut job.job_funds);
        coin::deposit(poster_addr, job_funds_refund);

        if (job.poster_stake > 0) {
            let poster_stake_back = coin::extract(&mut job.stake_pool, job.poster_stake);
            coin::deposit(poster_addr, poster_stake_back);
            job.poster_stake = 0;
        };

        let old_state = job.state;
        job.state = JobState::CancelledByPoster;

        let now = timestamp::now_seconds();
        aptos_framework::event::emit_event(
            &mut store.job_state_changed_events,
            JobStateChangedEvent {
                job_id,
                old_state: job_state_to_string(old_state),
                new_state: job_state_to_string(JobState::CancelledByPoster),
                changed_at: now
            }
        );
    }

    public entry fun freelancer_withdraw(freelancer: &signer, job_id: u64) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);
        assert!(job.state != JobState::Disputed, 4); 
        assert!(option::is_none(&job.dispute_id), 4); 
        assert!(option::is_none(&job.dispute_winner), 4); 
        assert!(!has_milestone_submitted(&job.milestones), 5); 
        
        if (option::is_some(&job.freelancer_withdraw_requested_by)) {
            return
        };
        
        job.freelancer_withdraw_requested_by = option::some(freelancer_addr);
    }

    public entry fun accept_freelancer_withdraw(poster: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(option::is_some(&job.freelancer_withdraw_requested_by), 1);
        assert!(job.state != JobState::Disputed, 4); 
        assert!(option::is_none(&job.dispute_id), 4); 
        assert!(option::is_none(&job.dispute_winner), 4);
        assert!(!has_milestone_submitted(&job.milestones), 5);
        
        let requester = *option::borrow(&job.freelancer_withdraw_requested_by);
        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == requester, 1);
        
        if (job.freelancer_stake > 0) {
            let penalty = coin::extract(&mut job.stake_pool, job.freelancer_stake);
            coin::deposit(job.poster, penalty);
            job.freelancer_stake = 0;
        };
        job.freelancer = option::none();
        job.state = JobState::Posted;
        job.started_at = option::none();
        job.mutual_cancel_requested_by = option::none();  
        job.freelancer_withdraw_requested_by = option::none(); 

        let len = vector::length(&job.milestones);
        let i = 0;
        while (i < len) {
            let milestone = vector::borrow_mut(&mut job.milestones, i);
            if (milestone.status != MilestoneStatus::Accepted) {
                milestone.status = MilestoneStatus::Pending;
                milestone.deadline = 0;
                milestone.review_deadline = 0;
                milestone.evidence_cid = option::none();
            };
            i = i + 1;
        };
    }

    public entry fun reject_freelancer_withdraw(poster: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(option::is_some(&job.freelancer_withdraw_requested_by), 1);
        
        let requester = *option::borrow(&job.freelancer_withdraw_requested_by);
        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == requester, 1);
        
        job.freelancer_withdraw_requested_by = option::none();
    }

    public(friend) fun lock_for_dispute(job_id: u64, _milestone_id: u64, dispute_id: u64) acquires EscrowStore {
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        job.dispute_id = option::some(dispute_id);
        job.state = JobState::Disputed;
    }

    public(friend) fun resolve_dispute(
        job_id: u64,
        milestone_id: u64,
        winner_is_freelancer: bool
    ) acquires EscrowStore {
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.state == JobState::Disputed, 2);
        
        let i = find_milestone_index(&job.milestones, milestone_id);
        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Locked, 1);
        milestone.status = MilestoneStatus::Accepted;

        job.dispute_winner = option::some(winner_is_freelancer);
        job.dispute_id = option::none();
        
        if (option::is_some(&job.freelancer)) {
            let freelancer = *option::borrow(&job.freelancer);
            
            if (winner_is_freelancer) {
                if (role::has_freelancer(freelancer)) {
                    reputation::inc_ut(freelancer, 2);
                };
                if (role::has_poster(job.poster)) {
                    reputation::dec_ut(job.poster, 1);
                };
            } else {
                if (role::has_freelancer(freelancer)) {
                    reputation::dec_ut(freelancer, 1);
                };
                if (role::has_poster(job.poster)) {
                    reputation::inc_ut(job.poster, 2);
                };
            };
        };
        
        if (are_all_milestones_accepted(&job.milestones)) {
            let old_state = job.state;
            job.state = JobState::Completed;
            return_stakes(job);

            let now = timestamp::now_seconds();
            aptos_framework::event::emit_event(
                &mut store.job_state_changed_events,
                JobStateChangedEvent {
                    job_id,
                    old_state: job_state_to_string(old_state),
                    new_state: job_state_to_string(JobState::Completed),
                    changed_at: now
                }
            );
        } else {
            let old_state = job.state;
            job.state = JobState::InProgress;

            let now = timestamp::now_seconds();
            aptos_framework::event::emit_event(
                &mut store.job_state_changed_events,
                JobStateChangedEvent {
                    job_id,
                    old_state: job_state_to_string(old_state),
                    new_state: job_state_to_string(JobState::InProgress),
                    changed_at: now
                }
            );
        };
    }

    fun find_milestone_index(milestones: &vector<Milestone>, milestone_id: u64): u64 {
        let len = vector::length(milestones);
        let i = 0;
        while (i < len) {
            if (vector::borrow(milestones, i).id == milestone_id) {
                return i
            };
            i = i + 1;
        };
        abort 1 
    }

    fun has_milestone_submitted(milestones: &vector<Milestone>): bool {
        let len = vector::length(milestones);
        let i = 0;
        while (i < len) {
            if (vector::borrow(milestones, i).status == MilestoneStatus::Submitted) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun are_all_milestones_accepted(milestones: &vector<Milestone>): bool {
        let len = vector::length(milestones);
        let i = 0;
        let disputed_milestone_idx = len;
        
        while (i < len) {
            if (vector::borrow(milestones, i).status == MilestoneStatus::Locked) {
                disputed_milestone_idx = i;
                break
            };
            i = i + 1;
        };
        
        let check_until = if (disputed_milestone_idx < len) {
            disputed_milestone_idx + 1 
        } else {
            len 
        };
        
        i = 0;
        while (i < check_until) {
            let status = vector::borrow(milestones, i).status;
            if (status != MilestoneStatus::Accepted && status != MilestoneStatus::Locked && status != MilestoneStatus::Withdrawn) {
                return false
            };
            i = i + 1;
        };
        true
    }

    fun update_reputation(freelancer_addr: address, poster_addr: address) {
        if (role::has_freelancer(freelancer_addr)) {
            reputation::inc_ut(freelancer_addr, 1);
        };
        if (role::has_poster(poster_addr)) {
            reputation::inc_ut(poster_addr, 1);
        };
    }

    fun process_milestone_payment(
        job: &mut Job,
        amount: u64,
        freelancer_addr: address
    ) {
        let payment = coin::extract(&mut job.job_funds, amount);
        coin::deposit(freelancer_addr, payment);
        if (option::is_none(&job.dispute_id)) {
            update_reputation(freelancer_addr, job.poster);
        };
    }


    fun set_next_milestone_deadline(job: &mut Job, current_idx: u64) {
        let len = vector::length(&job.milestones);
        let next_idx = current_idx + 1;
        if (next_idx < len) {
            let now = timestamp::now_seconds();
            let next_milestone = vector::borrow_mut(&mut job.milestones, next_idx);
            if (next_milestone.status == MilestoneStatus::Pending || now < next_milestone.deadline) {
                next_milestone.deadline = now + next_milestone.duration;
            };
        };
    }

    fun return_stakes(job: &mut Job) {
        if (job.poster_stake > 0) {
            let back = coin::extract(&mut job.stake_pool, job.poster_stake);
            coin::deposit(job.poster, back);
            job.poster_stake = 0;
        };
        if (job.freelancer_stake > 0 && option::is_some(&job.freelancer)) {
            let freelancer = *option::borrow(&job.freelancer);
            let back = coin::extract(&mut job.stake_pool, job.freelancer_stake);
            coin::deposit(freelancer, back);
            job.freelancer_stake = 0;
        };
    }

    public entry fun claim_dispute_payment(
        freelancer: &signer,
        job_id: u64,
        milestone_id: u64
    ) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);
        assert!(option::is_some(&job.dispute_winner), 1);
        assert!(*option::borrow(&job.dispute_winner) == true, 1);

        let i = find_milestone_index(&job.milestones, milestone_id);
        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Accepted, 1);

        let payment = coin::extract(&mut job.job_funds, milestone.amount);
        coin::deposit(freelancer_addr, payment);
        job.dispute_winner = option::none();
        
        set_next_milestone_deadline(job, i);
        
        if (job.state == JobState::Disputed) {
            job.state = JobState::InProgress;
        };
    }

    public entry fun claim_dispute_refund(
        poster: &signer,
        job_id: u64,
        milestone_id: u64
    ) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(option::is_some(&job.dispute_winner), 1);
        assert!(*option::borrow(&job.dispute_winner) == false, 1);

        let i = find_milestone_index(&job.milestones, milestone_id);
        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Accepted, 1);

        let refund = coin::extract(&mut job.job_funds, milestone.amount);
        coin::deposit(poster_addr, refund);

        if (job.freelancer_stake > 0) {
            let penalty = coin::extract(&mut job.stake_pool, job.freelancer_stake);
            coin::deposit(poster_addr, penalty);
            job.freelancer_stake = 0;
        };

        job.dispute_winner = option::none();
        
        set_next_milestone_deadline(job, i);
        
        if (job.state == JobState::Disputed) {
            job.state = JobState::InProgress;
        };
    }

    public fun get_mutual_cancel_requested_by(job_id: u64): Option<address> acquires EscrowStore {
        let store = borrow_global<EscrowStore>(@job_work_board);
        let job = table::borrow(&store.table, job_id);
        job.mutual_cancel_requested_by
    }

    public fun get_job_parties(job_id: u64): (address, Option<address>) acquires EscrowStore {
        let store = borrow_global<EscrowStore>(@job_work_board);
        assert!(table::contains(&store.table, job_id), 1);
        let job = table::borrow(&store.table, job_id);
        (job.poster, job.freelancer)
    }
}
