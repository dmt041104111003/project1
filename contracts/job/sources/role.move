module job_work_board::role {
    use std::signer;
    use std::option::{Self, Option};
    use std::string::String;
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::account;
    use job_work_board::reputation;

    friend job_work_board::dispute;

    const FREELANCER: u8 = 1;
    const POSTER: u8 = 2;
    const REVIEWER: u8 = 3;

    const POSTER_ADDR: address = @0x9f91cd92705e69d7387ba3a4d4703cba1a94f97086b0f7273459a938135b23f5;
    const FREELANCER_ADDR: address = @0x2b3c1c44ac610399eef451c27968d030a07dbc25a7cbaf3c8324a1e7c7417e26;
    const REVIEWER_1_ADDR: address = @0x840f14231a87be9b3a41638bd8a3f8879ca1a517db3f9f23e181dfbbfb2beccb;
    const REVIEWER_2_ADDR: address = @0x28360a9a93c9240c28c1ecd45c46685f65d05d3ba0abf90353f352943ba755ff;
    const REVIEWER_3_ADDR: address = @0x579024a64f477ef1fd1ddad0014a0c14f0f97e4c450ed8272528415fd56d00d6;
    const REVIEWER_4_ADDR: address = @0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9;

    struct UserRoles has store {
        roles: Table<u8, bool>,
        cids: Table<u8, String>,
    }

    struct CCCDProof has store, copy, drop {
        proof: vector<u8>,
        public_signals: vector<u8>,
        timestamp: u64,
    }

    struct ProofStoredEvent has drop, store {
        address: address,
        identity_hash: u64,
        timestamp: u64,
    }

    struct RoleRegisteredEvent has drop, store {
        address: address,
        role_kind: u8,
        cid: Option<String>,
        registered_at: u64,
    }

    struct RoleStore has key {
        users: Table<address, UserRoles>,
        reviewers: vector<address>,
        proofs: Table<address, CCCDProof>,
        identity_hashes: Table<u64, address>,
        proof_stored_events: event::EventHandle<ProofStoredEvent>,
        role_registered_events: event::EventHandle<RoleRegisteredEvent>,
    }

    fun init_module(admin: &signer) {
        move_to(admin, RoleStore { 
            users: table::new(), 
            reviewers: vector::empty<address>(),
            proofs: table::new(),
            identity_hashes: table::new(),
            proof_stored_events: account::new_event_handle<ProofStoredEvent>(admin),
            role_registered_events: account::new_event_handle<RoleRegisteredEvent>(admin),
        });
    }

    // Trả về UT khởi tạo cho địa chỉ test khi đăng ký vai trò đúng
    fun get_initial_ut(addr: address, role_kind: u8): u64 {
        // nick 1 (poster): 100 UT khi đăng ký POSTER
        if (addr == POSTER_ADDR && role_kind == POSTER) {
            return 100
        };
        // nick 2 (freelancer): 80 UT khi đăng ký FREELANCER
        if (addr == FREELANCER_ADDR && role_kind == FREELANCER) {
            return 80
        };
        // nick 3 (reviewer 1): 50 UT khi đăng ký REVIEWER
        if (addr == REVIEWER_1_ADDR && role_kind == REVIEWER) {
            return 50
        };
        // nick 4 (reviewer 2): 150 UT khi đăng ký REVIEWER
        if (addr == REVIEWER_2_ADDR && role_kind == REVIEWER) {
            return 150
        };
        // nick 5 (reviewer 3): 200 UT khi đăng ký REVIEWER
        if (addr == REVIEWER_3_ADDR && role_kind == REVIEWER) {
            return 200
        };
        // nick 6 (reviewer 4): 120 UT khi đăng ký REVIEWER
        if (addr == REVIEWER_4_ADDR && role_kind == REVIEWER) {
            return 120
        };
        0
    }

    public entry fun register_role(s: &signer, role_kind: u8, cid_opt: Option<String>) acquires RoleStore {
        let addr = signer::address_of(s);
        assert!(role_kind == FREELANCER || role_kind == POSTER || role_kind == REVIEWER, 1);
        assert!(has_proof(addr), 5);
        
        let store = borrow_global_mut<RoleStore>(@job_work_board);
        
        if (!table::contains(&store.users, addr)) {
            table::add(&mut store.users, addr, UserRoles {
                roles: table::new(),
                cids: table::new()
            });
        };
        
        let user = table::borrow_mut(&mut store.users, addr);
        let is_new_role = !table::contains(&user.roles, role_kind);
        if (is_new_role) {
            table::add(&mut user.roles, role_kind, true);
        };
        
        if (role_kind == POSTER || role_kind == FREELANCER) {
            assert!(option::is_some(&cid_opt), 2);
            let cid = *option::borrow(&cid_opt);
            if (table::contains(&user.cids, role_kind)) {
                *table::borrow_mut(&mut user.cids, role_kind) = cid;
            } else {
                table::add(&mut user.cids, role_kind, cid);
            };
        };

        if (role_kind == REVIEWER && is_new_role) {
            let len = vector::length(&store.reviewers);
            let i = 0;
            let found = false;
            while (i < len) {
                if (*vector::borrow(&store.reviewers, i) == addr) {
                    found = true;
                    i = len;
                } else {
                    i = i + 1;
                };
            };
            if (!found) {
                vector::push_back(&mut store.reviewers, addr);
            };
        };

        // Cộng UT khởi tạo nếu là địa chỉ test và role đúng
        if (is_new_role) {
            let initial_ut = get_initial_ut(addr, role_kind);
            if (initial_ut > 0) {
                reputation::inc_ut(addr, initial_ut);
            };
        };

        let now = aptos_std::timestamp::now_seconds();
        event::emit_event(
            &mut store.role_registered_events,
            RoleRegisteredEvent {
                address: addr,
                role_kind,
                cid: cid_opt,
                registered_at: now,
            }
        );
    }

    public fun has_role(addr: address, role_kind: u8): bool acquires RoleStore {
        if (!exists<RoleStore>(@job_work_board)) return false;
        let store = borrow_global<RoleStore>(@job_work_board);
        if (!table::contains(&store.users, addr)) return false;
        table::contains(&table::borrow(&store.users, addr).roles, role_kind)
    }

    public fun get_cid(addr: address, role_kind: u8): Option<String> acquires RoleStore {
        if (!exists<RoleStore>(@job_work_board)) return option::none();
        let store = borrow_global<RoleStore>(@job_work_board);
        if (!table::contains(&store.users, addr)) return option::none();
        let user = table::borrow(&store.users, addr);
        if (table::contains(&user.cids, role_kind)) {
            option::some(*table::borrow(&user.cids, role_kind))
        } else {
            option::none()
        }
    }

    public fun has_freelancer(addr: address): bool acquires RoleStore { has_role(addr, FREELANCER) }
    public fun has_poster(addr: address): bool acquires RoleStore { has_role(addr, POSTER) }
    public fun has_reviewer(addr: address): bool acquires RoleStore { has_role(addr, REVIEWER) }

    public(friend) fun get_reviewers(): vector<address> acquires RoleStore {
        let store = borrow_global<RoleStore>(@job_work_board);
        let len = vector::length(&store.reviewers);
        let out = vector::empty<address>();
        let i = 0;
        while (i < len) {
            let a = *vector::borrow(&store.reviewers, i);
            vector::push_back(&mut out, a);
            i = i + 1;
        };
        out
    }

    public entry fun store_proof(
        s: &signer,
        proof: vector<u8>,
        public_signals: vector<u8>,
        identity_hash: u64
    ) acquires RoleStore {
        let addr = signer::address_of(s);
        let store = borrow_global_mut<RoleStore>(@job_work_board);
        assert!(!table::contains(&store.proofs, addr), 3);
        assert!(!table::contains(&store.identity_hashes, identity_hash), 4);
        
        let now = aptos_std::timestamp::now_seconds();
        table::add(&mut store.proofs, addr, CCCDProof {
            proof,
            public_signals: public_signals,
            timestamp: now,
        });
        table::add(&mut store.identity_hashes, identity_hash, addr);

        event::emit_event(
            &mut store.proof_stored_events,
            ProofStoredEvent {
                address: addr,
                identity_hash,
                timestamp: now,
            }
        );
    }

    public fun has_proof(addr: address): bool acquires RoleStore {
        if (!exists<RoleStore>(@job_work_board)) return false;
        let store = borrow_global<RoleStore>(@job_work_board);
        table::contains(&store.proofs, addr)
    }

    public fun get_proof(addr: address): Option<CCCDProof> acquires RoleStore {
        if (!exists<RoleStore>(@job_work_board)) return option::none();
        let store = borrow_global<RoleStore>(@job_work_board);
        if (!table::contains(&store.proofs, addr)) return option::none();
        option::some(*table::borrow(&store.proofs, addr))
    }
    
    public fun get_identity_hash_owner(identity_hash: u64): Option<address> acquires RoleStore {
        if (!exists<RoleStore>(@job_work_board)) return option::none();
        let store = borrow_global<RoleStore>(@job_work_board);
        if (!table::contains(&store.identity_hashes, identity_hash)) return option::none();
        option::some(*table::borrow(&store.identity_hashes, identity_hash))
    }
}
