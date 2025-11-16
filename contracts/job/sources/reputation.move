module job_work_board::reputation {
    use aptos_std::table::{Self, Table};

    friend job_work_board::escrow;
    friend job_work_board::dispute;

    const OCTA: u64 = 100_000_000;

    struct Rep has store {
        ut: u64,
    }

    struct RepStore has key {
        table: Table<address, Rep>
    }

    fun init_module(admin: &signer) {
        move_to(admin, RepStore { table: table::new() });
    }

    public(friend) fun inc_ut(who: address, delta: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        rep.ut = rep.ut + delta;
    }

    public(friend) fun dec_ut(who: address, delta: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        if (delta > rep.ut) {
            rep.ut = 0;
        } else {
            rep.ut = rep.ut - delta;
        };
    }

    public fun get(addr: address): u64 acquires RepStore {
        if (!exists<RepStore>(@job_work_board)) return 0;
        let store = borrow_global<RepStore>(@job_work_board);
        if (!table::contains(&store.table, addr)) return 0;
        let rep = table::borrow(&store.table, addr);
        rep.ut
    }


    fun ensure_user(addr: address) acquires RepStore {
        let store = borrow_global_mut<RepStore>(@job_work_board);
        if (!table::contains(&store.table, addr)) {
            table::add(&mut store.table, addr, Rep {
                ut: 0,
            });
        };
    }
}
