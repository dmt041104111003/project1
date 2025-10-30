module job_work_board::escrow {
    use std::option::{Self, Option};
    use std::vector;
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use job_work_board::role;
    use job_work_board::reputation;

    const E_ROLE_REQUIRED: u64 = 1;
    const E_ALREADY_JOINED: u64 = 2;
    const E_NOT_PARTY: u64 = 3;
    const E_INVALID_STATE: u64 = 4;
    const E_OUT_OF_BOUNDS: u64 = 5;
    const E_NOT_SUBMITTED: u64 = 6;
    const E_TOO_EARLY: u64 = 7;

    const OCTA: u64 = 100_000_000; // 1 APT = 1e8 Octas

    struct Milestone has store {
        amount: u64,
        deadline_sec: u64,
        submitted: bool,
        approved: bool,
        disputed: bool,
        released: bool,
    }

    struct Escrow has key, store {
        id: u64,
        poster: address,
        freelancer: Option<address>,
        cid: vector<u8>,
        total_amount: u64,
        milestones: vector<Milestone>,
        locked: bool,
        stake_poster: u64,
        stake_freelancer: u64,
        dispute_pool: u64,
        job_funds: coin::Coin<AptosCoin>,
        stake_pool: coin::Coin<AptosCoin>,
        dispute_pool_coin: coin::Coin<AptosCoin>,
        cancel_poster: bool,
        cancel_freelancer: bool,
    }

    struct EscrowStore has key {
        next_id: u64,
        table: aptos_std::table::Table<u64, Escrow>,
    }

    public fun init(admin: &signer) {
        if (!exists<EscrowStore>(signer::address_of(admin))) {
            move_to(admin, EscrowStore { next_id: 1, table: aptos_std::table::new<u64, Escrow>() });
        }
    }

    public fun create_job(store_addr: address, poster: &signer, cid: vector<u8>, milestone_amounts: vector<u64>, milestone_deadlines: vector<u64>, deposit_total_octas: u64) acquires EscrowStore {
        let a = signer::address_of(poster);
        assert!(role::has_poster(a), E_ROLE_REQUIRED);
        let n = vector::length(&milestone_amounts);
        assert!(n > 0 && n == vector::length(&milestone_deadlines), E_OUT_OF_BOUNDS);
        // Collect funds: total escrow + poster stake 1 APT + system fee 1.5 APT
        let dep = coin::withdraw<AptosCoin>(poster, deposit_total_octas);
        let stake = coin::withdraw<AptosCoin>(poster, 1 * OCTA);
        let fee = coin::withdraw<AptosCoin>(poster, 15 * OCTA / 10);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let id = store.next_id;
        store.next_id = id + 1;
        let milestones = vector::empty<Milestone>();
        let i = 0;
        let total_check = 0;
        while (i < n) {
            let amt = *vector::borrow(&milestone_amounts, i);
            let dl = *vector::borrow(&milestone_deadlines, i);
            vector::push_back(&mut milestones, Milestone { amount: amt, deadline_sec: dl, submitted: false, approved: false, disputed: false, released: false });
            total_check = total_check + amt;
            i = i + 1;
        };
        assert!(total_check == deposit_total_octas, E_OUT_OF_BOUNDS);
        let escrow = Escrow { id, poster: a, freelancer: option::none<address>(), cid, total_amount: deposit_total_octas, milestones, locked: false, stake_poster: 1 * OCTA, stake_freelancer: 0, dispute_pool: 15 * OCTA / 10, job_funds: dep, stake_pool: stake, dispute_pool_coin: fee, cancel_poster: false, cancel_freelancer: false };
        aptos_std::table::add(&mut store.table, id, escrow);
    }

    public fun join_as_freelancer(store_addr: address, freelancer: &signer, escrow_id: u64) acquires EscrowStore {
        let b = signer::address_of(freelancer);
        assert!(role::has_freelancer(b), E_ROLE_REQUIRED);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(option::is_none(&e.freelancer), E_ALREADY_JOINED);
        // stake 1 APT + system fee 0.6 APT
        let c_stake = coin::withdraw<AptosCoin>(freelancer, 1 * OCTA);
        let c_fee = coin::withdraw<AptosCoin>(freelancer, 6 * OCTA / 10);
        e.freelancer = option::some(b);
        e.locked = true;
        e.stake_freelancer = 1 * OCTA;
        e.dispute_pool = e.dispute_pool + 6 * OCTA / 10;
        coin::merge<AptosCoin>(&mut e.stake_pool, c_stake);
        coin::merge<AptosCoin>(&mut e.dispute_pool_coin, c_fee);
    }

    public fun submit_milestone(store_addr: address, freelancer: &signer, escrow_id: u64, index: u64) acquires EscrowStore {
        let addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(option::is_some(&e.freelancer) && option::borrow(&e.freelancer) == &addr, E_NOT_PARTY);
        let i = index;
        let m = vector::borrow_mut(&mut e.milestones, i);
        assert!(!m.submitted && !m.disputed && !m.released, E_INVALID_STATE);
        m.submitted = true;
    }

    public fun approve_milestone(store_addr: address, poster: &signer, escrow_id: u64, index: u64) acquires EscrowStore {
        let a = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(e.poster == a, E_NOT_PARTY);
        let i = index;
        let m = vector::borrow_mut(&mut e.milestones, i);
        assert!(m.submitted && !m.approved && !m.disputed && !m.released, E_INVALID_STATE);
        m.approved = true;
        m.released = true;
        // Payout to freelancer from job_funds
        if (option::is_some(&e.freelancer)) {
            let b = *option::borrow(&e.freelancer);
            let pay = coin::extract<AptosCoin>(&mut e.job_funds, m.amount);
            coin::deposit<AptosCoin>(b, pay);
        };
        // Payout to freelancer (logical accounting only)
        // Increase freelancer rep when last milestone approved
        if (i + 1 == vector::length(&e.milestones)) {
            if (option::is_some(&e.freelancer)) {
                let b = *option::borrow(&e.freelancer);
                reputation::inc_freelancer(store_addr, b, 2);
                reputation::inc_poster(store_addr, e.poster, 2);
                // Return stakes to both parties
                let back_poster = coin::extract<AptosCoin>(&mut e.stake_pool, 1 * OCTA);
                coin::deposit<AptosCoin>(e.poster, back_poster);
                let back_freelancer = coin::extract<AptosCoin>(&mut e.stake_pool, 1 * OCTA);
                coin::deposit<AptosCoin>(b, back_freelancer);
                e.stake_poster = 0;
                e.stake_freelancer = 0;
            };
        };
    }

    public fun auto_approve_if_poster_inactive(store_addr: address, freelancer: &signer, escrow_id: u64, index: u64, confirm_window_sec: u64) acquires EscrowStore {
        let addr = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(option::is_some(&e.freelancer) && option::borrow(&e.freelancer) == &addr, E_NOT_PARTY);
        let i = index;
        let m = vector::borrow_mut(&mut e.milestones, i);
        assert!(m.submitted && !m.approved && !m.disputed && !m.released, E_INVALID_STATE);
        let now = timestamp::now_seconds();
        assert!(now > m.deadline_sec + confirm_window_sec, E_TOO_EARLY);
        m.approved = true;
        m.released = true;
        if (option::is_some(&e.freelancer)) {
            let b = *option::borrow(&e.freelancer);
            let pay = coin::extract<AptosCoin>(&mut e.job_funds, m.amount);
            coin::deposit<AptosCoin>(b, pay);
        };
        if (i + 1 == vector::length(&e.milestones)) {
            if (option::is_some(&e.freelancer)) {
                let b = *option::borrow(&e.freelancer);
                reputation::inc_freelancer(store_addr, b, 2);
                reputation::inc_poster(store_addr, e.poster, 2);
                e.stake_poster = 0;
                e.stake_freelancer = 0;
            };
        };
    }

    public fun claim_stake_on_miss_deadline(store_addr: address, poster: &signer, escrow_id: u64, index: u64) acquires EscrowStore {
        let a = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(e.poster == a, E_NOT_PARTY);
        let i = index;
        let m = vector::borrow(&e.milestones, i);
        let now = timestamp::now_seconds();
        assert!(now > m.deadline_sec && !m.submitted && !m.released, E_INVALID_STATE);
        // Poster takes freelancer stake (1 APT), unlock job for new freelancer
        let pay = coin::extract<AptosCoin>(&mut e.stake_pool, 1 * OCTA);
        coin::deposit<AptosCoin>(a, pay);
        e.stake_freelancer = 0;
        e.freelancer = option::none<address>();
        e.locked = false;
    }

    public fun open_dispute(store_addr: address, poster: &signer, escrow_id: u64, index: u64, evidence_cid: vector<u8>) acquires EscrowStore {
        let a = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(e.poster == a, E_NOT_PARTY);
        let i = index;
        let m = vector::borrow_mut(&mut e.milestones, i);
        assert!(m.submitted && !m.approved && !m.released && !m.disputed, E_INVALID_STATE);
        m.disputed = true;
        if (option::is_some(&e.freelancer)) {
            let b = *option::borrow(&e.freelancer);
            job_work_board::dispute::open(store_addr, poster, escrow_id, b, evidence_cid);
            job_work_board::dispute::set_milestone_index(store_addr, poster, escrow_id, i);
        }
    }

    /// Called by dispute module after decision: winner 1 = poster, 2 = freelancer
    public fun apply_dispute_result(store_addr: address, escrow_id: u64, index: u64, winner: u8) acquires EscrowStore {
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        let i = index;
        let m = vector::borrow_mut(&mut e.milestones, i);
        assert!(m.disputed && !m.released, E_INVALID_STATE);
        if (winner == 1) {
            // poster wins: transfer B's stake (1 APT) to A
            if (e.stake_freelancer > 0) {
                let give = coin::extract<AptosCoin>(&mut e.stake_pool, 1 * OCTA);
                coin::deposit<AptosCoin>(e.poster, give);
                e.stake_freelancer = 0;
            };
            // release this milestone back to poster: move funds from job_funds to poster
            let refund = coin::extract<AptosCoin>(&mut e.job_funds, m.amount);
            coin::deposit<AptosCoin>(e.poster, refund);
            m.disputed = false;
            m.released = true;
        } else if (winner == 2) {
            // freelancer wins: release milestone to freelancer
            m.approved = true;
            m.released = true;
            m.disputed = false;
        };
    }

    public fun poster_request_cancel(store_addr: address, poster: &signer, escrow_id: u64) acquires EscrowStore {
        let a = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(e.poster == a, E_NOT_PARTY);
        e.cancel_poster = true;
        if (e.cancel_poster && e.cancel_freelancer) {
            // consensual cancel (poster requested): refund job escrow to A, all stakes to B
            let amt_job = coin::value<AptosCoin>(&e.job_funds);
            if (amt_job > 0) { let refund = coin::extract<AptosCoin>(&mut e.job_funds, amt_job); coin::deposit<AptosCoin>(a, refund); };
            if (option::is_some(&e.freelancer)) {
                let b = *option::borrow(&e.freelancer);
                let amt_stake = coin::value<AptosCoin>(&e.stake_pool);
                if (amt_stake > 0) { let give = coin::extract<AptosCoin>(&mut e.stake_pool, amt_stake); coin::deposit<AptosCoin>(b, give); };
                e.stake_poster = 0; e.stake_freelancer = 0;
            };
            e.freelancer = option::none<address>(); e.locked = false;
        }
    }

    public fun freelancer_request_cancel(store_addr: address, freelancer: &signer, escrow_id: u64) acquires EscrowStore {
        let b = signer::address_of(freelancer);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(option::is_some(&e.freelancer) && option::borrow(&e.freelancer) == &b, E_NOT_PARTY);
        e.cancel_freelancer = true;
        if (e.cancel_poster && e.cancel_freelancer) {
            // consensual cancel (freelancer requested): stakes to A, job funds remain for next freelancer
            let amt_stake = coin::value<AptosCoin>(&e.stake_pool);
            if (amt_stake > 0) { let give = coin::extract<AptosCoin>(&mut e.stake_pool, amt_stake); coin::deposit<AptosCoin>(e.poster, give); };
            e.stake_poster = 0; e.stake_freelancer = 0;
            e.freelancer = option::none<address>(); e.locked = false;
        }
    }

    /// Withdraw part (or all) of dispute fees to a treasury signer address
    public fun withdraw_dispute_fees(store_addr: address, treasury: &signer, escrow_id: u64, amount: u64) acquires EscrowStore {
        let to = signer::address_of(treasury);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        let val = coin::value<AptosCoin>(&e.dispute_pool_coin);
        let take = if (amount == 0 || amount > val) { val } else { amount };
        if (take > 0) { let c = coin::extract<AptosCoin>(&mut e.dispute_pool_coin, take); coin::deposit<AptosCoin>(to, c); };
    }

    /// Convenience: withdraw all dispute fees to treasury
    public fun withdraw_all_dispute_fees(store_addr: address, treasury: &signer, escrow_id: u64) acquires EscrowStore {
        withdraw_dispute_fees(store_addr, treasury, escrow_id, 0);
    }

    public fun unlock_non_disputed_to_poster(store_addr: address, poster: &signer, escrow_id: u64) acquires EscrowStore {
        let a = signer::address_of(poster);
        let store = borrow_global_mut<EscrowStore>(store_addr);
        let e = aptos_std::table::borrow_mut(&mut store.table, escrow_id);
        assert!(e.poster == a, E_NOT_PARTY);
        // Mark unreleased and not disputed milestones as released back to poster with real transfer
        let n = vector::length(&e.milestones);
        let i = 0;
        while (i < n) {
            let m = vector::borrow_mut(&mut e.milestones, i);
            if (!m.released && !m.disputed) {
                let refund = coin::extract<AptosCoin>(&mut e.job_funds, m.amount);
                coin::deposit<AptosCoin>(a, refund);
                m.released = true;
            };
            i = i + 1;
        };
    }
}


