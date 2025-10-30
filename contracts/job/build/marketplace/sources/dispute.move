module job_work_board::dispute {
    use std::vector;
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use job_work_board::role;
    use job_work_board::reputation;

    const E_NOT_PARTY: u64 = 1;
    const E_ALREADY_DECIDED: u64 = 2;
    const E_NOT_REVIEWER: u64 = 3;
    const E_DUPLICATE_VOTE: u64 = 4;

    struct Vote has store { reviewer: address, support: bool }

    struct Dispute has store {
        escrow_id: u64,
        poster: address,
        freelancer: address,
        evidence_cid: vector<u8>,
        milestone_index: u64,
        open: bool,
        result: u8, // 0 undecided, 1 poster true, 2 freelancer true
        votes: vector<Vote>,
        reviewer_stakes: u64,
        allowed_reviewers: vector<address>,
    }

    struct DisputeStore has key {
        table: aptos_std::table::Table<u64, Dispute>,
    }

    public fun init(admin: &signer) {
        if (!exists<DisputeStore>(signer::address_of(admin))) {
            move_to(admin, DisputeStore { table: aptos_std::table::new<u64, Dispute>() });
        }
    }

    public fun open(store_addr: address, poster: &signer, escrow_id: u64, freelancer: address, evidence_cid: vector<u8>) acquires DisputeStore {
        let a = signer::address_of(poster);
        let s = borrow_global_mut<DisputeStore>(store_addr);
        // default milestone_index 0; the escrow will pass real index via a setter before voting
        // choose top-3 reviewers by UTR (x2 scale), exclude poster/freelancer
        let pool_addr = signer::address_of(poster);
        let allowed = job_work_board::role::top_three_reviewers(store_addr, pool_addr, a, freelancer);
        aptos_std::table::add(&mut s.table, escrow_id, Dispute { escrow_id, poster: a, freelancer, evidence_cid, milestone_index: 0, open: true, result: 0, votes: vector::empty<Vote>(), reviewer_stakes: 0, allowed_reviewers: allowed });
    }

    public fun set_milestone_index(store_addr: address, poster: &signer, escrow_id: u64, index: u64) acquires DisputeStore {
        let a = signer::address_of(poster);
        let s = borrow_global_mut<DisputeStore>(store_addr);
        let d = aptos_std::table::borrow_mut(&mut s.table, escrow_id);
        assert!(d.poster == a && d.open, E_ALREADY_DECIDED);
        d.milestone_index = index;
    }

    public fun freelancer_response(store_addr: address, freelancer: &signer, escrow_id: u64, agree: bool) acquires DisputeStore {
        let b = signer::address_of(freelancer);
        let s = borrow_global_mut<DisputeStore>(store_addr);
        let d = aptos_std::table::borrow_mut(&mut s.table, escrow_id);
        assert!(d.freelancer == b, E_NOT_PARTY);
        assert!(d.open && d.result == 0, E_ALREADY_DECIDED);
        if (agree) {
            // Poster wins immediately; escrow finalization will be called externally using this result
            d.result = 1;
            d.open = false;
        } else {
            // escalate to community review (no selection constraint here)
        }
    }

    public fun reviewer_stake_and_vote(store_addr: address, reviewer: &signer, escrow_id: u64, support_poster: bool) acquires DisputeStore {
        let r = signer::address_of(reviewer);
        assert!(role::has_reviewer(r), E_NOT_REVIEWER);
        let s = borrow_global_mut<DisputeStore>(store_addr);
        let d = aptos_std::table::borrow_mut(&mut s.table, escrow_id);
        assert!(d.open && d.result == 0, E_ALREADY_DECIDED);
        // must be in allowed top-3
        let ok = contains(&d.allowed_reviewers, r);
        assert!(ok, E_NOT_REVIEWER);
        // must have at least 1 UTR to participate
        let (utr, _utf, _utp) = reputation::get(store_addr, r);
        assert!(utr >= 1, E_NOT_REVIEWER);
        // prevent duplicate vote
        let n = vector::length(&d.votes);
        let i = 0;
        while (i < n) { let v = vector::borrow(&d.votes, i); if (v.reviewer == r) { abort E_DUPLICATE_VOTE; }; i = i + 1; };
        // stake 1 APT
        let c = coin::withdraw<AptosCoin>(reviewer, 100_000_000);
        coin::deposit<AptosCoin>(r, c);
        d.reviewer_stakes = d.reviewer_stakes + 100_000_000;
        vector::push_back(&mut d.votes, Vote { reviewer: r, support: support_poster });
        // finalize if 3 votes reached
        if (vector::length(&d.votes) >= 3) {
            let yes = 0; let total = 0; let m = vector::length(&d.votes); let j = 0;
            while (j < m) { let v2 = vector::borrow(&d.votes, j); if (v2.support) yes = yes + 1; total = total + 1; j = j + 1; };
            if (yes * 3 > total * 2) { d.result = 1; d.open = false; apply_reviewer_rewards(store_addr, &d.votes, true); }
            else if ((total - yes) * 3 > total * 2) { d.result = 2; d.open = false; apply_reviewer_rewards(store_addr, &d.votes, false); };
        }
    }

    fun contains(v: &vector<address>, a: address): bool { let n = vector::length(v); let i = 0; while (i < n) { if (*vector::borrow(v, i) == a) return true; i = i + 1; }; false }

    fun apply_reviewer_rewards(store_addr: address, votes: &vector<Vote>, poster_won: bool) {
        let n = vector::length(votes); let i = 0;
        while (i < n) {
            let v = vector::borrow(votes, i);
            let on_winner = if (poster_won) { v.support } else { !v.support };
            if (on_winner) { reputation::inc_reviewer(store_addr, v.reviewer, 2); } else { reputation::dec_reviewer_half(store_addr, v.reviewer); };
            i = i + 1;
        };
    }
}


