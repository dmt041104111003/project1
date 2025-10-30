module job_work_board::reputation {
    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    const E_INSUFFICIENT_REP: u64 = 1;
    const E_ALREADY_CLAIMED: u64 = 2;

    struct Rep has store {
        utr: u64, // reviewer, scaled x2 (1.0 point == 2)
        utf: u64, // freelancer, scaled x2
        utp: u64, // poster, scaled x2
        claimed_reviewer_bonus: bool,
        claimed_freelancer_bonus: bool,
        claimed_poster_bonus: bool,
    }

    struct Store has key {
        table: aptos_std::table::Table<address, Rep>,
    }

    public fun init(admin: &signer) {
        if (!exists<Store>(signer::address_of(admin))) {
            move_to(admin, Store { table: aptos_std::table::new<address, Rep>() });
        }
    }

    fun ensure_entry(s: &mut Store, addr: address) {
        if (!aptos_std::table::contains(&s.table, addr)) {
            aptos_std::table::add(&mut s.table, addr, Rep { utr: 0, utf: 0, utp: 0, claimed_reviewer_bonus: false, claimed_freelancer_bonus: false, claimed_poster_bonus: false });
        }
    }

    public fun inc_reviewer(store_addr: address, addr: address, delta_x2: u64) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, addr);
        r.utr = r.utr + delta_x2;
    }

    public fun dec_reviewer(store_addr: address, addr: address, delta_x2: u64) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, addr);
        if (r.utr >= delta_x2) r.utr = r.utr - delta_x2 else r.utr = 0;
    }

    public fun inc_freelancer(store_addr: address, addr: address, delta_x2: u64) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, addr);
        r.utf = r.utf + delta_x2;
    }

    public fun inc_poster(store_addr: address, addr: address, delta_x2: u64) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, addr);
        r.utp = r.utp + delta_x2;
    }

    public fun get(store_addr: address, addr: address): (u64, u64, u64) acquires Store {
        if (!exists<Store>(store_addr)) return (0, 0, 0);
        let s = borrow_global<Store>(store_addr);
        if (!aptos_std::table::contains(&s.table, addr)) return (0, 0, 0);
        let r = aptos_std::table::borrow(&s.table, addr);
        (r.utr, r.utf, r.utp)
    }

    /// Claim one-time bonuses when rep >= 1.0 (>=2 in x2 scaling)
    public fun claim_reviewer_bonus(store_addr: address, claimant_addr: address, treasury: &signer, amount_octas: u64) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, claimant_addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, claimant_addr);
        assert!(r.utr >= 2, E_INSUFFICIENT_REP);
        assert!(!r.claimed_reviewer_bonus, E_ALREADY_CLAIMED);
        r.claimed_reviewer_bonus = true;
        coin::transfer<AptosCoin>(treasury, claimant_addr, amount_octas);
    }

    public fun claim_freelancer_bonus(store_addr: address, claimant_addr: address, treasury: &signer, amount_octas: u64) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, claimant_addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, claimant_addr);
        assert!(r.utf >= 2, E_INSUFFICIENT_REP);
        assert!(!r.claimed_freelancer_bonus, E_ALREADY_CLAIMED);
        r.claimed_freelancer_bonus = true;
        coin::transfer<AptosCoin>(treasury, claimant_addr, amount_octas);
    }

    public fun claim_poster_bonus(store_addr: address, claimant_addr: address, treasury: &signer, amount_octas: u64) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, claimant_addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, claimant_addr);
        assert!(r.utp >= 2, E_INSUFFICIENT_REP);
        assert!(!r.claimed_poster_bonus, E_ALREADY_CLAIMED);
        r.claimed_poster_bonus = true;
        coin::transfer<AptosCoin>(treasury, claimant_addr, amount_octas);
    }

    public fun dec_reviewer_half(store_addr: address, addr: address) acquires Store {
        let s = borrow_global_mut<Store>(store_addr);
        ensure_entry(s, addr);
        let r = aptos_std::table::borrow_mut(&mut s.table, addr);
        if (r.utr >= 1) r.utr = r.utr - 1 else r.utr = 0;
    }
}


