module job_work_board::dispute {
    use std::vector;
    use std::option;
    use std::string::String;
    use aptos_framework::signer;
    use aptos_std::table::{Self, Table};
    use job_work_board::role;
    use job_work_board::escrow;

    const MIN_REVIEWERS: u64 = 3; // selection size and required votes to close

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
        // Either poster or freelancer can open
        assert!(caller == poster_addr || caller == freelancer_addr, 1);
        
        // borrow store first to check reviewer_load during selection
        let store = borrow_global_mut<DisputeStore>(@job_work_board);

        let all_reviewers = role::get_reviewers();
        let eligible = vector::empty<address>();
        let n_all = vector::length(&all_reviewers);
        let i = 0;
        while (i < n_all) {
            let r = *vector::borrow(&all_reviewers, i);
            // Rule: must have reviewer role (ensured by get_reviewers) and not in any active dispute
            let busy = if (table::contains(&store.reviewer_load, r)) { *table::borrow(&store.reviewer_load, r) } else { 0 };
            if (busy == 0) {
                vector::push_back(&mut eligible, r);
            };
            i = i + 1;
        };
        let n_eligible = vector::length(&eligible);
        assert!(n_eligible >= MIN_REVIEWERS, 2);
        // Select all eligible reviewers for this dispute
        let selected = vector::empty<address>();
        let j = 0;
        while (j < n_eligible) {
            vector::push_back(&mut selected, *vector::borrow(&eligible, j));
            j = j + 1;
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

        // mark selected reviewers busy
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
                k = sel_len; // break
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

        // Only resolve when all selected reviewers have voted (3 votes)
        if (vector::length(&dispute.votes) >= MIN_REVIEWERS) {
            tally_votes(dispute_id);
        };
    }

    // Optional: other party can add evidence CID later (no status change required)
    public entry fun add_evidence(
        s: &signer,
        dispute_id: u64,
        evidence_cid: String
    ) acquires DisputeStore {
        let caller = signer::address_of(s);
        let store = borrow_global_mut<DisputeStore>(@job_work_board);
        let dispute = table::borrow_mut(&mut store.table, dispute_id);
        // Only poster or freelancer of this dispute can add
        assert!(caller == dispute.poster || caller == dispute.freelancer, 1);
        if (caller == dispute.poster) {
            // overwrite or set
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
        // Resolve only if a side has at least 2 votes (majority of 3)
        if (freelancer_votes >= 2) {
            escrow::resolve_dispute(dispute.job_id, dispute.milestone_id, true);
            dispute.status = DisputeStatus::Resolved;
        } else if (poster_votes >= 2) {
            escrow::resolve_dispute(dispute.job_id, dispute.milestone_id, false);
            dispute.status = DisputeStatus::Resolved;
        } else {
            // tie, do nothing and wait for more votes
            return
        };

        // decrement reviewer load
        let nsel = vector::length(&dispute.selected_reviewers);
        let z = 0;
        while (z < nsel) {
            let rr = *vector::borrow(&dispute.selected_reviewers, z);
            if (table::contains(&store.reviewer_load, rr)) {
                let cur2 = table::borrow_mut(&mut store.reviewer_load, rr);
                if (*cur2 > 0) { *cur2 = *cur2 - 1; };
            };
            z = z + 1;
        };
    }
}
