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
        delta: u64,  // Positive for increase, negative for decrease (signed as u64)
        changed_at: u64,
    }

    struct RepStore has key {
        table: Table<address, Rep>,
        reputation_changed_events: event::EventHandle<ReputationChangedEvent>,
    }

    fun init_module(admin: &signer) {
        move_to(admin, RepStore { 
            table: table::new(),
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
        
        // Emit event
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
        
        // Emit event (delta is positive but represents a decrease)
        let now = aptos_std::timestamp::now_seconds();
        event::emit_event(
            &mut store.reputation_changed_events,
            ReputationChangedEvent {
                address: who,
                old_value,
                new_value,
                delta,  // Positive value representing decrease amount
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
