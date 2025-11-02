module job_work_board::escrow {
    use std::option::{Self, Option};
    use std::string::String;
    use std::vector;
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use job_work_board::role;
    use job_work_board::reputation;

    friend job_work_board::dispute;

    const OCTA: u64 = 100_000_000;
    const STAKE_AMOUNT: u64 = 1 * OCTA;
    const POSTER_FEE: u64 = 15 * OCTA / 10; // 1.5 APT
    const FREELANCER_FEE: u64 = 6 * OCTA / 10; // 0.6 APT

    enum JobState has copy, drop, store {
        Posted,
        InProgress,
        Completed,
        Cancelled,
        Disputed
    }

    enum MilestoneStatus has copy, drop, store {
        Pending,
        Submitted,
        Accepted,
        Locked
    }

    struct Milestone has store {
        id: u64,
        amount: u64,
        deadline: u64,
        status: MilestoneStatus,
        evidence_cid: Option<String>
    }

    struct Job has key, store {
        id: u64,
        poster: address,
        freelancer: Option<address>,
        cid: String,
        poster_stake: u64,
        freelancer_stake: u64,
        total_escrow: u64,
        milestones: vector<Milestone>,
        state: JobState,
        dispute_id: Option<u64>,
        job_funds: coin::Coin<AptosCoin>,
        stake_pool: coin::Coin<AptosCoin>,
        dispute_pool: coin::Coin<AptosCoin>,
    }

    struct EscrowStore has key {
        table: Table<u64, Job>,
        next_job_id: u64
    }

    fun init_module(admin: &signer) {
        move_to(admin, EscrowStore {
            table: table::new(),
            next_job_id: 1
        });
    }

    public entry fun create_job(
        poster: &signer,
        cid: String,
        milestone_deadlines: vector<u64>,
        milestone_amounts: vector<u64>,
        poster_deposit: u64
    ) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        assert!(role::has_poster(poster_addr), 1);

        let n = vector::length(&milestone_deadlines);
        assert!(n > 0 && n == vector::length(&milestone_amounts), 1);

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
        i = 0;
        while (i < n) {
            vector::push_back(&mut milestones, Milestone {
                id: i,
                amount: *vector::borrow(&milestone_amounts, i),
                deadline: *vector::borrow(&milestone_deadlines, i),
                status: MilestoneStatus::Pending,
                evidence_cid: option::none()
            });
            i = i + 1;
        };

        table::add(&mut store.table, job_id, Job {
            id: job_id,
            poster: poster_addr,
            freelancer: option::none(),
            cid,
            poster_stake: STAKE_AMOUNT,
            freelancer_stake: 0,
            total_escrow: poster_deposit,
            milestones,
            state: JobState::Posted,
            dispute_id: option::none(),
            job_funds,
            stake_pool: stake,
            dispute_pool: fee,
        });
    }

    public entry fun apply_job(freelancer: &signer, job_id: u64) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        assert!(role::has_freelancer(freelancer_addr), 1);

        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);
        
        assert!(option::is_none(&job.freelancer), 1);
        assert!(job.state == JobState::Posted, 1);
        
        job.freelancer = option::some(freelancer_addr);
        job.state = JobState::InProgress;
    }

    public entry fun freelancer_stake(freelancer: &signer, job_id: u64) acquires EscrowStore {
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);
        assert!(job.freelancer_stake == 0, 1);

        let stake = coin::withdraw<AptosCoin>(freelancer, STAKE_AMOUNT);
        let fee = coin::withdraw<AptosCoin>(freelancer, FREELANCER_FEE);

        job.freelancer_stake = STAKE_AMOUNT;
        coin::merge(&mut job.stake_pool, stake);
        coin::merge(&mut job.dispute_pool, fee);
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

        let len = vector::length(&job.milestones);
        let i = 0;
        let found = false;
        while (i < len && !found) {
            if (vector::borrow(&job.milestones, i).id == milestone_id) {
                found = true;
            } else {
                i = i + 1;
            };
        };
        assert!(found, 1);

        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Pending, 1);

        milestone.status = MilestoneStatus::Submitted;
        milestone.evidence_cid = option::some(evidence_cid);
    }

    public entry fun confirm_milestone(poster: &signer, job_id: u64, milestone_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(job.state == JobState::InProgress, 1);

        let len = vector::length(&job.milestones);
        let i = 0;
        let found = false;
        while (i < len && !found) {
            if (vector::borrow(&job.milestones, i).id == milestone_id) {
                found = true;
            } else {
                i = i + 1;
            };
        };
        assert!(found, 1);

        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Submitted, 1);

        milestone.status = MilestoneStatus::Accepted;

        if (option::is_some(&job.freelancer)) {
            let freelancer = *option::borrow(&job.freelancer);
            let payment = coin::extract(&mut job.job_funds, milestone.amount);
            coin::deposit(freelancer, payment);
            
            if (role::has_freelancer(freelancer)) {
                reputation::inc_utf(freelancer, 1);
            };
            if (role::has_poster(poster_addr)) {
                reputation::inc_utp(poster_addr, 1);
            };
        };

        let all_accepted = true;
        i = 0;
        while (i < len) {
            if (vector::borrow(&job.milestones, i).status != MilestoneStatus::Accepted) {
                all_accepted = false;
            };
            i = i + 1;
        };
        if (all_accepted) {
            job.state = JobState::Completed;
            return_stakes(job);
        };
    }

    public entry fun reject_milestone(poster: &signer, job_id: u64, milestone_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(job.state == JobState::InProgress, 1);

        let len = vector::length(&job.milestones);
        let i = 0;
        let found = false;
        while (i < len && !found) {
            if (vector::borrow(&job.milestones, i).id == milestone_id) {
                found = true;
            } else {
                i = i + 1;
            };
        };
        assert!(found, 1);

        let milestone = vector::borrow_mut(&mut job.milestones, i);
        assert!(milestone.status == MilestoneStatus::Submitted, 1);

        milestone.status = MilestoneStatus::Locked;
        job.state = JobState::Disputed;
    }

    public entry fun claim_timeout(s: &signer, job_id: u64, milestone_id: u64) acquires EscrowStore {
        let caller = signer::address_of(s);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        let len = vector::length(&job.milestones);
        let i = 0;
        let found = false;
        while (i < len && !found) {
            if (vector::borrow(&job.milestones, i).id == milestone_id) {
                found = true;
            } else {
                i = i + 1;
            };
        };
        assert!(found, 1);

        let milestone = vector::borrow_mut(&mut job.milestones, i);
        let now = timestamp::now_seconds();
        assert!(now > milestone.deadline, 1);

        if (milestone.status == MilestoneStatus::Pending) {
            assert!(job.poster == caller, 1);
            if (job.freelancer_stake > 0) {
                let penalty = coin::extract(&mut job.stake_pool, job.freelancer_stake);
                coin::deposit(caller, penalty);
                job.freelancer_stake = 0;
            };
            job.freelancer = option::none();
            job.state = JobState::Posted;
        } else if (milestone.status == MilestoneStatus::Submitted) {
            assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == caller, 1);
            milestone.status = MilestoneStatus::Accepted;
            
            let freelancer = *option::borrow(&job.freelancer);
            let payment = coin::extract(&mut job.job_funds, milestone.amount);
            coin::deposit(freelancer, payment);
            
            if (role::has_freelancer(freelancer)) {
                reputation::inc_utf(freelancer, 1);
            };
            if (role::has_poster(job.poster)) {
                reputation::inc_utp(job.poster, 1);
            };

            let all_accepted = true;
            i = 0;
            while (i < len) {
                if (vector::borrow(&job.milestones, i).status != MilestoneStatus::Accepted) {
                    all_accepted = false;
                };
                i = i + 1;
            };
            if (all_accepted) {
                job.state = JobState::Completed;
                return_stakes(job);
            };
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
            if (milestone.status != MilestoneStatus::Locked) {
                if (milestone.status == MilestoneStatus::Pending || milestone.status == MilestoneStatus::Submitted) {
                    let refund = coin::extract(&mut job.job_funds, milestone.amount);
                    coin::deposit(poster_addr, refund);
                };
            };
            i = i + 1;
        };
    }

    public entry fun mutual_cancel(poster: &signer, freelancer: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);

        let refund = coin::extract_all(&mut job.job_funds);
        coin::deposit(poster_addr, refund);
        return_stakes(job);
        job.freelancer = option::none();
        job.state = JobState::Cancelled;
    }

    public entry fun freelancer_withdraw(poster: &signer, freelancer: &signer, job_id: u64) acquires EscrowStore {
        let poster_addr = signer::address_of(poster);
        let freelancer_addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(@job_work_board);
        let job = table::borrow_mut(&mut store.table, job_id);

        assert!(job.poster == poster_addr, 1);
        assert!(option::is_some(&job.freelancer) && *option::borrow(&job.freelancer) == freelancer_addr, 1);

        if (job.freelancer_stake > 0) {
            let penalty = coin::extract(&mut job.stake_pool, job.freelancer_stake);
            coin::deposit(poster_addr, penalty);
            job.freelancer_stake = 0;
        };
        job.freelancer = option::none();
        job.state = JobState::Posted;
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

        let len = vector::length(&job.milestones);
        let i = 0;
        let found = false;
        while (i < len && !found) {
            if (vector::borrow(&job.milestones, i).id == milestone_id) {
                found = true;
            } else {
                i = i + 1;
            };
        };
        assert!(found, 1);

        let milestone = vector::borrow_mut(&mut job.milestones, i);
        milestone.status = MilestoneStatus::Accepted;

        if (winner_is_freelancer) {
            if (option::is_some(&job.freelancer)) {
                let freelancer = *option::borrow(&job.freelancer);
                let payment = coin::extract(&mut job.job_funds, milestone.amount);
                coin::deposit(freelancer, payment);
                if (role::has_freelancer(freelancer)) {
                    reputation::inc_utf(freelancer, 1);
                };
                if (role::has_poster(job.poster)) {
                    reputation::inc_utp(job.poster, 1);
                };
            };
        } else {
            let refund = coin::extract(&mut job.job_funds, milestone.amount);
            coin::deposit(job.poster, refund);
            if (job.freelancer_stake > 0) {
                let penalty = coin::extract(&mut job.stake_pool, job.freelancer_stake);
                coin::deposit(job.poster, penalty);
                job.freelancer_stake = 0;
            };
        };

        job.dispute_id = option::none();
        
        let all_accepted = true;
        i = 0;
        while (i < len) {
            if (vector::borrow(&job.milestones, i).status != MilestoneStatus::Accepted) {
                all_accepted = false;
            };
            i = i + 1;
        };
        if (all_accepted) {
            job.state = JobState::Completed;
            return_stakes(job);
        } else {
            job.state = JobState::InProgress;
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

    public fun get_job_parties(job_id: u64): (address, Option<address>) acquires EscrowStore {
        let store = borrow_global<EscrowStore>(@job_work_board);
        assert!(table::contains(&store.table, job_id), 1);
        let job = table::borrow(&store.table, job_id);
        (job.poster, job.freelancer)
    }
}
