module job_work_board::dispute {
    use std::vector;
    use std::option;
    use std::string::String;
    use aptos_framework::signer;
    use aptos_std::table::{Self, Table};
    use job_work_board::role;
    use job_work_board::escrow;
    use job_work_board::reputation;

    const MIN_REVIEWERS: u64 = 3; 

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
        poster_evidence_cid: option::Option<String>,
        freelancer_evidence_cid: option::Option<String>,
        status: DisputeStatus,
        votes: vector<Vote>,
        selected_reviewers: vector<address>,
    }

    struct DisputeStore has key {
        table: Table<u64, Dispute>,
        next_dispute_id: u64,
        reviewer_load: Table<address, u64>,
    }

    fun init_module(admin: &signer) {
        move_to(admin, DisputeStore {
            table: table::new(),
            next_dispute_id: 1,
            reviewer_load: table::new(),
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
        assert!(option::is_some(&freelancer_opt), 1);
        let freelancer_addr = *option::borrow(&freelancer_opt);
        assert!(caller == poster_addr || caller == freelancer_addr, 1);
        
        let store = borrow_global_mut<DisputeStore>(@job_work_board);

        let all_reviewers = role::get_reviewers();
        let eligible = vector::empty<address>();
        let n_all = vector::length(&all_reviewers);
        let i = 0;
        while (i < n_all) {
            let r = *vector::borrow(&all_reviewers, i);
            if (r != poster_addr && r != freelancer_addr) {
                let busy = if (table::contains(&store.reviewer_load, r)) { *table::borrow(&store.reviewer_load, r) } else { 0 };
                if (busy == 0) {
                    vector::push_back(&mut eligible, r);
                };
            };
            i = i + 1;
        };
        let n_eligible = vector::length(&eligible);
        assert!(n_eligible >= MIN_REVIEWERS, 2);
        
        let caller_ut = reputation::get(caller);
        
        let highest_ut_reviewer = option::none<address>();
        let highest_ut = 0;
        let j = 0;
        while (j < n_eligible) {
            let r = *vector::borrow(&eligible, j);
            let r_ut = reputation::get(r);
            if (r_ut > highest_ut) {
                highest_ut = r_ut;
                highest_ut_reviewer = option::some(r);
            };
            j = j + 1;
        };
        if (option::is_none(&highest_ut_reviewer)) {
            highest_ut_reviewer = option::some(*vector::borrow(&eligible, 0));
        };
        let highest_reviewer = *option::borrow(&highest_ut_reviewer);
        
        let mid_ut_reviewer = option::none<address>();
        j = 0;
        while (j < n_eligible) {
            let r = *vector::borrow(&eligible, j);
            if (r != highest_reviewer) {
                let r_ut = reputation::get(r);
                if (r_ut > caller_ut && r_ut < highest_ut) {
                    mid_ut_reviewer = option::some(r);
                    j = n_eligible; // break
                };
            };
            j = j + 1;
        };
        
        let low_ut_reviewer = option::none<address>();
        j = 0;
        while (j < n_eligible) {
            let r = *vector::borrow(&eligible, j);
            if (r != highest_reviewer && (option::is_none(&mid_ut_reviewer) || r != *option::borrow(&mid_ut_reviewer))) {
                let r_ut = reputation::get(r);
                if (r_ut < caller_ut) {
                    low_ut_reviewer = option::some(r);
                    j = n_eligible; // break
                };
            };
            j = j + 1;
        };
        
        let has_all_three = option::is_some(&mid_ut_reviewer) && option::is_some(&low_ut_reviewer);
        
        assert!(highest_reviewer != poster_addr && highest_reviewer != freelancer_addr, 5);
        
        let selected = vector::empty<address>();
        if (has_all_three) {
            let mid_reviewer = *option::borrow(&mid_ut_reviewer);
            let low_reviewer = *option::borrow(&low_ut_reviewer);
            
            assert!(mid_reviewer != poster_addr && mid_reviewer != freelancer_addr, 6);
            assert!(low_reviewer != poster_addr && low_reviewer != freelancer_addr, 7);
            
            vector::push_back(&mut selected, highest_reviewer);
            vector::push_back(&mut selected, mid_reviewer);
            vector::push_back(&mut selected, low_reviewer);
        } else {
            j = 0;
            while (j < n_eligible) {
                let r = *vector::borrow(&eligible, j);
                assert!(r != poster_addr && r != freelancer_addr, 8);
                let busy_check = if (table::contains(&store.reviewer_load, r)) { *table::borrow(&store.reviewer_load, r) } else { 0 };
                assert!(busy_check == 0, 9);
                vector::push_back(&mut selected, r);
                j = j + 1;
            };
        };
        
        let final_selected_len = vector::length(&selected);
        assert!(final_selected_len >= MIN_REVIEWERS, 4);
        let check_idx = 0;
        while (check_idx < final_selected_len) {
            let r_check = *vector::borrow(&selected, check_idx);
            assert!(r_check != poster_addr && r_check != freelancer_addr, 10);
            check_idx = check_idx + 1;
        };

        let dispute_id = store.next_dispute_id;
        store.next_dispute_id = store.next_dispute_id + 1;

        table::add(&mut store.table, dispute_id, Dispute {
            id: dispute_id,
            job_id,
            milestone_id,
            poster: poster_addr,
            freelancer: freelancer_addr,
            poster_evidence_cid: if (caller == poster_addr) { option::some(evidence_cid) } else { option::none() },
            freelancer_evidence_cid: if (caller == freelancer_addr) { option::some(evidence_cid) } else { option::none() },
            status: DisputeStatus::Voting,
            votes: vector::empty<Vote>(),
            selected_reviewers: selected,
        });

        let sel_len_mark = vector::length(&selected);
        let m = 0;
        while (m < sel_len_mark) {
            let r2 = *vector::borrow(&selected, m);
            if (table::contains(&store.reviewer_load, r2)) {
                let cur = table::borrow_mut(&mut store.reviewer_load, r2);
                *cur = *cur + 1;
            } else {
                table::add(&mut store.reviewer_load, r2, 1);
            };
            m = m + 1;
        };

        escrow::lock_for_dispute(job_id, milestone_id, dispute_id);
    }


    public entry fun reviewer_vote(
        reviewer: &signer,
        dispute_id: u64,
        vote_choice: bool
    ) acquires DisputeStore {
        let reviewer_addr = signer::address_of(reviewer);

        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute = table::borrow_mut(&mut store.table, dispute_id);
        
        assert!(dispute.status == DisputeStatus::Voting, 1);
        assert!(reviewer_addr != dispute.poster && reviewer_addr != dispute.freelancer, 1);

        let allowed = false;
        let k = 0;
        let sel_len = vector::length(&dispute.selected_reviewers);
        while (k < sel_len) {
            if (*vector::borrow(&dispute.selected_reviewers, k) == reviewer_addr) {
                allowed = true;
                k = sel_len; 
            } else {
                k = k + 1;
            };
        };
        assert!(allowed, 2);

        let votes_len = vector::length(&dispute.votes);
        let i = 0;
        while (i < votes_len) {
            let vote = vector::borrow(&dispute.votes, i);
            if (vote.reviewer == reviewer_addr) {
                abort 3
            };
            i = i + 1;
        };

        vector::push_back(&mut dispute.votes, Vote { reviewer: reviewer_addr, choice: vote_choice });

        if (vector::length(&dispute.votes) >= MIN_REVIEWERS) {
            tally_votes(dispute_id);
        };
    }

    public entry fun add_evidence(
        s: &signer,
        dispute_id: u64,
        evidence_cid: String
    ) acquires DisputeStore {
        let caller = signer::address_of(s);
        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute = table::borrow_mut(&mut store.table, dispute_id);
        assert!(caller == dispute.poster || caller == dispute.freelancer, 1);
        if (caller == dispute.poster) {
            dispute.poster_evidence_cid = option::some(evidence_cid);
        } else {
            dispute.freelancer_evidence_cid = option::some(evidence_cid);
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

        let poster_votes = total_votes - freelancer_votes;
        let winner_is_freelancer = freelancer_votes >= 2;
        if (freelancer_votes >= 2) {
            escrow::resolve_dispute(dispute.job_id, dispute.milestone_id, true);
            dispute.status = DisputeStatus::Resolved;
        } else if (poster_votes >= 2) {
            escrow::resolve_dispute(dispute.job_id, dispute.milestone_id, false);
            dispute.status = DisputeStatus::Resolved;
        } else {
            return
        };

        let votes_len = vector::length(&dispute.votes);
        let v = 0;
        while (v < votes_len) {
            let vote = vector::borrow(&dispute.votes, v);
            let reviewer_addr = vote.reviewer;
            let voted_freelancer = vote.choice;
            if (voted_freelancer == winner_is_freelancer) {
                reputation::inc_ut(reviewer_addr, 2);
            } else {
                reputation::dec_ut(reviewer_addr, 1);
            };
            v = v + 1;
        };

        let votes_len2 = vector::length(&dispute.votes);
        let z = 0;
        while (z < votes_len2) {
            let rr = vector::borrow(&dispute.votes, z).reviewer;
            if (table::contains(&store.reviewer_load, rr)) {
                let cur2 = table::borrow_mut(&mut store.reviewer_load, rr);
                if (*cur2 > 0) { *cur2 = *cur2 - 1; };
            };
            z = z + 1;
        };
    }
}
