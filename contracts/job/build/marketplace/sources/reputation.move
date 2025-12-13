module job_work_board::reputation {
    use aptos_std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::account;

    friend job_work_board::escrow;
    friend job_work_board::dispute;

    const OCTA: u64 = 100_000_000;

    struct Rep has store {
        ut: u64,
    }

    struct ReputationChangedEvent has drop, store {
        address: address,
        old_value: u64,
        new_value: u64,
        delta: u64,  
        changed_at: u64,
    }

    struct RepStore has key {
        table: Table<address, Rep>,
        reputation_changed_events: event::EventHandle<ReputationChangedEvent>,
    }

    fun init_module(admin: &signer) {
        let t = table::new<address, Rep>();
        
        // nick 1 (poster): 100 UT
        table::add(&mut t, @0x9f91cd92705e69d7387ba3a4d4703cba1a94f97086b0f7273459a938135b23f5, Rep { ut: 100 });
        // nick 2 (freelancer): 80 UT
        table::add(&mut t, @0x2b3c1c44ac610399eef451c27968d030a07dbc25a7cbaf3c8324a1e7c7417e26, Rep { ut: 80 });
        // nick 3 (reviewer 1): 50 UT 
        table::add(&mut t, @0x840f14231a87be9b3a41638bd8a3f8879ca1a517db3f9f23e181dfbbfb2beccb, Rep { ut: 50 });
        // nick 4 (reviewer 2): 150 UT 
        table::add(&mut t, @0x28360a9a93c9240c28c1ecd45c46685f65d05d3ba0abf90353f352943ba755ff, Rep { ut: 150 });
        // nick 5 (reviewer 3): 200 UT 
        table::add(&mut t, @0x579024a64f477ef1fd1ddad0014a0c14f0f97e4c450ed8272528415fd56d00d6, Rep { ut: 200 });
        // nick 6 (reviewer 4): 120 UT 
        table::add(&mut t, @0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9, Rep { ut: 120 });

        move_to(admin, RepStore { 
            table: t,
            reputation_changed_events: account::new_event_handle<ReputationChangedEvent>(admin),
        });
    }

    public(friend) fun inc_ut(who: address, delta: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        let old_value = rep.ut;
        rep.ut = rep.ut + delta;
        let new_value = rep.ut;
        
        let now = aptos_std::timestamp::now_seconds();
        event::emit_event(
            &mut store.reputation_changed_events,
            ReputationChangedEvent {
                address: who,
                old_value,
                new_value,
                delta,
                changed_at: now,
            }
        );
    }

    public(friend) fun dec_ut(who: address, delta: u64) acquires RepStore {
        ensure_user(who);
        let store = borrow_global_mut<RepStore>(@job_work_board);
        let rep = table::borrow_mut(&mut store.table, who);
        let old_value = rep.ut;
        if (delta > rep.ut) {
            rep.ut = 0;
        } else {
            rep.ut = rep.ut - delta;
        };
        let new_value = rep.ut;
        
        let now = aptos_std::timestamp::now_seconds();
        event::emit_event(
            &mut store.reputation_changed_events,
            ReputationChangedEvent {
                address: who,
                old_value,
                new_value,
                delta,
                changed_at: now,
            }
        );
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
