module job_work_board::role {
    use std::signer;
    use std::option::{Self, Option};
    use std::string::String;
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::account;

    friend job_work_board::dispute;

    const FREELANCER: u8 = 1;
    const POSTER: u8 = 2;
    const REVIEWER: u8 = 3;

    struct UserRoles has store {
        roles: Table<u8, bool>,
        cids: Table<u8, String>,
    }

    struct CCCDProof has store, copy, drop {
        proof: vector<u8>,  // ZK proof (JSON serialized)
        public_signals: vector<u8>,  // Public signals (JSON serialized)
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
        proofs: Table<address, CCCDProof>,  // Map address -> proof
        identity_hashes: Table<u64, address>,  // Map identity_hash -> address (để check duplicate CCCD)
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

    public entry fun register_role(s: &signer, role_kind: u8, cid_opt: Option<String>) acquires RoleStore {
        let addr = signer::address_of(s);
        assert!(role_kind == FREELANCER || role_kind == POSTER || role_kind == REVIEWER, 1);
        
        // Check xem địa chỉ đã có proof chưa (bắt buộc phải có proof để đăng ký role)
        assert!(has_proof(addr), 5); // Error code 5: Proof required to register role
        
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
                    i = len; // break
                } else {
                    i = i + 1;
                };
            };
            if (!found) {
                vector::push_back(&mut store.reviewers, addr);
            };
        };

        // Emit event
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

        // Emit event (metadata only - full proof data stored in table)
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
