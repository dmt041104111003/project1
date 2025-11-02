module job_work_board::reputation {
    use std::signer;
    use aptos_std::table::{Self, Table};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    friend job_work_board::escrow;
    friend job_work_board::dispute;

    const OCTA: u64 = 100_000_000;
    const REVIEWER_REWARD: u64 = 5 * OCTA / 10; // 0.5 APT
    const FREELANCER_REWARD: u64 = 3 * OCTA / 10; // 0.3 APT
    const POSTER_REWARD: u64 = 1 * OCTA / 10; // 0.1 APT

    struct Rep has store {
        utr_x10: u64,
        utf: u64,
        utp: u64,
        claimed_reviewer: bool,
        claimed_freelancer: bool,
        claimed_poster: bool,
    }

    struct RepStore has key {
        table: Table<address, Rep>
    }

    fun init_module(admin: &signer) {
        move_to(admin, RepStore { table: table::new() });
    }

    public(friend) fun inc_utf(who: address, delta: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        rep.utf = rep.utf + delta;
    }

    public(friend) fun inc_utp(who: address, delta: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        rep.utp = rep.utp + delta;
    }

    public(friend) fun inc_utr(who: address, delta_x10: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        rep.utr_x10 = rep.utr_x10 + delta_x10;
    }

    public(friend) fun change_utr(who: address, delta_x10: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        if (delta_x10 > rep.utr_x10) {
            rep.utr_x10 = 0;
        } else {
            rep.utr_x10 = rep.utr_x10 - delta_x10;
        };
    }

    public fun get(addr: address): (u64, u64, u64) acquires RepStore {
        if (!exists<RepStore>(@job_work_board)) return (0, 0, 0);
        let store = borrow_global<RepStore>(@job_work_board);
        if (!table::contains(&store.table, addr)) return (0, 0, 0);
        let rep = table::borrow(&store.table, addr);
        (rep.utr_x10, rep.utf, rep.utp)
    }

    public entry fun claim_reviewer_reward(s: &signer, treasury: &signer) acquires RepStore {
        let who = signer::address_of(s);
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        assert!(rep.utr_x10 >= 10 && !rep.claimed_reviewer, 1);
        rep.claimed_reviewer = true;
        coin::transfer<AptosCoin>(treasury, who, REVIEWER_REWARD);
    }

    public entry fun claim_freelancer_reward(s: &signer, treasury: &signer) acquires RepStore {
        let who = signer::address_of(s);
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        assert!(rep.utf >= 1 && !rep.claimed_freelancer, 1);
        rep.claimed_freelancer = true;
        coin::transfer<AptosCoin>(treasury, who, FREELANCER_REWARD);
    }

    public entry fun claim_poster_reward(s: &signer, treasury: &signer) acquires RepStore {
        let who = signer::address_of(s);
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        assert!(rep.utp >= 1 && !rep.claimed_poster, 1);
        rep.claimed_poster = true;
        coin::transfer<AptosCoin>(treasury, who, POSTER_REWARD);
    }

    fun ensure_user(addr: address) acquires RepStore {
        let store = borrow_global_mut<RepStore>(@job_work_board);
        if (!table::contains(&store.table, addr)) {
            table::add(&mut store.table, addr, Rep {
                utr_x10: 0,
                utf: 0,
                utp: 0,
                claimed_reviewer: false,
                claimed_freelancer: false,
                claimed_poster: false,
            });
        };
    }
}
