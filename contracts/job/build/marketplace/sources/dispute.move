module job_work_board::dispute {
    use std::vector;
    use std::option;
    use std::string::String;
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_std::table::{Self, Table};
    use job_work_board::role;
    use job_work_board::reputation;
    use job_work_board::escrow;

    const OCTA: u64 = 100_000_000;
    const MIN_REVIEWERS: u64 = 3;
    const REVIEWER_STAKE: u64 = 1 * OCTA;

    enum DisputeStatus has copy, drop, store {
        Open,
        Voting,
        Resolved
    }

    struct Vote has store {
        reviewer: address,
        choice: bool
    }

    struct Dispute has key, store {
        id: u64,
        job_id: u64,
        milestone_id: u64,
        poster: address,
        freelancer: address,
        evidence_cid: String,
        status: DisputeStatus,
        votes: vector<Vote>,
        reviewer_stakes: coin::Coin<AptosCoin>,
    }

    struct DisputeStore has key {
        table: Table<u64, Dispute>,
        next_dispute_id: u64
    }

    fun init_module(admin: &signer) {
        move_to(admin, DisputeStore {
            table: table::new(),
            next_dispute_id: 1
        });
    }

    public entry fun open_dispute(
        s: &signer,
        job_id: u64,
        milestone_id: u64,
        evidence_cid: String
    ) acquires DisputeStore {
        let caller = signer::address_of(s);
        let (poster_addr, freelancer_opt) = escrow::get_job_parties(job_id);
        
        assert!(caller == poster_addr, 1);
        assert!(option::is_some(&freelancer_opt), 1);
        let freelancer_addr = *option::borrow(&freelancer_opt);
        
        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute_id = store.next_dispute_id;
        store.next_dispute_id = store.next_dispute_id + 1;

        table::add(&mut store.table, dispute_id, Dispute {
            id: dispute_id,
            job_id,
            milestone_id,
            poster: poster_addr,
            freelancer: freelancer_addr,
            evidence_cid,
            status: DisputeStatus::Open,
            votes: vector::empty<Vote>(),
            reviewer_stakes: coin::zero<AptosCoin>(),
        });

        escrow::lock_for_dispute(job_id, milestone_id, dispute_id);
    }

    public entry fun freelancer_accept(s: &signer, dispute_id: u64) acquires DisputeStore {
        let freelancer_addr = signer::address_of(s);
        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute = table::borrow_mut(&mut store.table, dispute_id);
        
        assert!(dispute.freelancer == freelancer_addr, 1);
        assert!(dispute.status == DisputeStatus::Open, 1);
        
        dispute.status = DisputeStatus::Resolved;
        escrow::resolve_dispute(dispute.job_id, dispute.milestone_id, false);
    }

    public entry fun freelancer_reject(s: &signer, dispute_id: u64) acquires DisputeStore {
        let freelancer_addr = signer::address_of(s);
        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute = table::borrow_mut(&mut store.table, dispute_id);
        
        assert!(dispute.freelancer == freelancer_addr, 1);
        assert!(dispute.status == DisputeStatus::Open, 1);
        
        dispute.status = DisputeStatus::Voting;
    }

    public entry fun reviewer_stake_and_vote(
        reviewer: &signer,
        dispute_id: u64,
        vote_choice: bool
    ) acquires DisputeStore {
        let reviewer_addr = signer::address_of(reviewer);
        
        assert!(role::has_reviewer(reviewer_addr), 1);
        
        let (utr_x10, _, _) = reputation::get(reviewer_addr);
        assert!(utr_x10 >= 10, 1);

        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute = table::borrow_mut(&mut store.table, dispute_id);
        
        assert!(dispute.status == DisputeStatus::Voting, 1);
        assert!(reviewer_addr != dispute.poster && reviewer_addr != dispute.freelancer, 1);
        
        let votes_len = vector::length(&dispute.votes);
        let i = 0;
        while (i < votes_len) {
            let vote = vector::borrow(&dispute.votes, i);
            if (vote.reviewer == reviewer_addr) {
                abort 1
            };
            i = i + 1;
        };

        let stake = coin::withdraw<AptosCoin>(reviewer, REVIEWER_STAKE);
        coin::merge(&mut dispute.reviewer_stakes, stake);

        vector::push_back(&mut dispute.votes, Vote {
            reviewer: reviewer_addr,
            choice: vote_choice
        });

        dispute.status = DisputeStatus::Voting;

        if (vector::length(&dispute.votes) >= MIN_REVIEWERS) {
            tally_votes(dispute_id);
        };
    }

    public fun tally_votes(dispute_id: u64) acquires DisputeStore {
        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute = table::borrow_mut(&mut store.table, dispute_id);
        
        assert!(dispute.status != DisputeStatus::Resolved, 1);
        
        let total_votes = vector::length(&dispute.votes);
        assert!(total_votes >= MIN_REVIEWERS, 1);

        let freelancer_votes = 0;
        let i = 0;
        while (i < total_votes) {
            if (vector::borrow(&dispute.votes, i).choice) {
                freelancer_votes = freelancer_votes + 1;
            };
            i = i + 1;
        };

        let winner_is_freelancer = freelancer_votes * 3 > total_votes * 2;

        i = 0;
        while (i < total_votes) {
            let vote = vector::borrow(&dispute.votes, i);
            let reviewer = vote.reviewer;
            let voted_for_freelancer = vote.choice;
            
            if (winner_is_freelancer == voted_for_freelancer) {
                reputation::inc_utr(reviewer, 10);
            } else {
                reputation::change_utr(reviewer, 5);
            };
            i = i + 1;
        };

        escrow::resolve_dispute(dispute.job_id, dispute.milestone_id, winner_is_freelancer);
        dispute.status = DisputeStatus::Resolved;
    }
}
