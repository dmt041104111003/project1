module job_work_board::role {
    use std::signer;
    use std::option::{Self, Option};
    use std::string::String;
    use std::vector;
    use aptos_std::table::{Self, Table};

    friend job_work_board::dispute;

    const FREELANCER: u8 = 1;
    const POSTER: u8 = 2;
    const REVIEWER: u8 = 3;

    struct UserRoles has store {
        roles: Table<u8, bool>,
        cids: Table<u8, String>,
    }

    struct RoleStore has key {
        users: Table<address, UserRoles>,
        reviewers: vector<address>,
    }

    fun init_module(admin: &signer) {
        move_to(admin, RoleStore { users: table::new(), reviewers: vector::empty<address>() });
    }

    public entry fun register_role(s: &signer, role_kind: u8, cid_opt: Option<String>) acquires RoleStore {
        let addr = signer::address_of(s);
        assert!(role_kind == FREELANCER || role_kind == POSTER || role_kind == REVIEWER, 1);
        
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
}
