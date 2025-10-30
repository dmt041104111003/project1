module job_work_board::role {
    use std::option::{Self, Option};
    use std::string;
    use std::vector;
    use aptos_framework::signer;

    const E_ALREADY_REGISTERED: u64 = 1;
    const E_INVALID_CID: u64 = 2;

    const ROLE_FREELANCER: u8 = 1;
    const ROLE_POSTER: u8 = 2;
    const ROLE_REVIEWER: u8 = 3;

    struct RoleEntry has store {
        kind: u8, // 1:freelancer 2:poster 3:reviewer
        role: string::String, // 'freelancer' | 'poster' | 'reviewer'
        cid: Option<string::String>
    }

    struct Roles has key, store { entries: vector<RoleEntry> }

    fun contains_in_entries(entries: &vector<RoleEntry>, kind: u8): bool {
        let n = vector::length(entries);
        let i = 0; while (i < n) { let e = vector::borrow(entries, i); if (e.kind == kind) return true; i = i + 1; }; false
    }

    struct ReviewerPool has key, store { addrs: vector<address> }

    public fun init_pool(admin: &signer) {
        if (!exists<ReviewerPool>(signer::address_of(admin))) {
            move_to(admin, ReviewerPool { addrs: vector::empty<address>() });
        }
    }

    fun contains_addr(v: &vector<address>, a: address): bool {
        let n = vector::length(v); let i = 0; while (i < n) { if (*vector::borrow(v, i) == a) return true; i = i + 1; }; false
    }

    public entry fun register_freelancer(registrar: &signer, role: string::String, cid: string::String) acquires Roles {
        assert!(string::length(&cid) > 0, E_INVALID_CID);
        let addr = signer::address_of(registrar);
        if (exists<Roles>(addr)) {
            let r = borrow_global_mut<Roles>(addr);
            assert!(!contains_in_entries(&r.entries, ROLE_FREELANCER), E_ALREADY_REGISTERED);
            vector::push_back(&mut r.entries, RoleEntry { kind: ROLE_FREELANCER, role, cid: option::some(cid) });
        } else {
            move_to(registrar, Roles { entries: vector::empty<RoleEntry>() });
            let r2 = borrow_global_mut<Roles>(addr);
            vector::push_back(&mut r2.entries, RoleEntry { kind: ROLE_FREELANCER, role, cid: option::some(cid) });
        }
    }

    public entry fun register_poster(registrar: &signer, role: string::String, cid: string::String) acquires Roles {
        assert!(string::length(&cid) > 0, E_INVALID_CID);
        let addr = signer::address_of(registrar);
        if (exists<Roles>(addr)) {
            let r = borrow_global_mut<Roles>(addr);
            assert!(!contains_in_entries(&r.entries, ROLE_POSTER), E_ALREADY_REGISTERED);
            vector::push_back(&mut r.entries, RoleEntry { kind: ROLE_POSTER, role, cid: option::some(cid) });
        } else {
            move_to(registrar, Roles { entries: vector::empty<RoleEntry>() });
            let r2 = borrow_global_mut<Roles>(addr);
            vector::push_back(&mut r2.entries, RoleEntry { kind: ROLE_POSTER, role, cid: option::some(cid) });
        }
    }

    public entry fun register_reviewer(registrar: &signer) acquires Roles, ReviewerPool {
        let addr = signer::address_of(registrar);
        if (exists<Roles>(addr)) {
            let r = borrow_global_mut<Roles>(addr);
            assert!(!contains_in_entries(&r.entries, ROLE_REVIEWER), E_ALREADY_REGISTERED);
            vector::push_back(&mut r.entries, RoleEntry { kind: ROLE_REVIEWER, role: string::utf8(b"reviewer"), cid: option::none<string::String>() });
        } else {
            move_to(registrar, Roles { entries: vector::empty<RoleEntry>() });
            let r2 = borrow_global_mut<Roles>(addr);
            vector::push_back(&mut r2.entries, RoleEntry { kind: ROLE_REVIEWER, role: string::utf8(b"reviewer"), cid: option::none<string::String>() });
        };
        // add to reviewer pool if exists under the same address as registrar
        if (exists<ReviewerPool>(signer::address_of(registrar))) {
            let pool = borrow_global_mut<ReviewerPool>(signer::address_of(registrar));
            if (!contains_addr(&pool.addrs, addr)) vector::push_back(&mut pool.addrs, addr);
        };
    }

    public fun top_three_reviewers(store_addr: address, pool_addr: address, exclude1: address, exclude2: address): vector<address> acquires ReviewerPool {
        if (!exists<ReviewerPool>(pool_addr)) return vector::empty<address>();
        let pool = borrow_global<ReviewerPool>(pool_addr);
        let top = vector::empty<address>();
        let n = vector::length(&pool.addrs);
        let i = 0;
        let best1: address = exclude1; let best2: address = exclude1; let best3: address = exclude1;
        let s1: u64 = 0; let s2: u64 = 0; let s3: u64 = 0;
        while (i < n) {
            let a = *vector::borrow(&pool.addrs, i);
            if (a != exclude1 && a != exclude2) {
                let (utr2, _utf2, _utp2) = job_work_board::reputation::get(store_addr, a);
                if (utr2 >= s1) { best3 = best2; s3 = s2; best2 = best1; s2 = s1; best1 = a; s1 = utr2; }
                else if (utr2 >= s2) { best3 = best2; s3 = s2; best2 = a; s2 = utr2; }
                else if (utr2 >= s3) { best3 = a; s3 = utr2; };
            };
            i = i + 1;
        };
        if (s1 > 0) vector::push_back(&mut top, best1);
        if (s2 > 0 && best2 != best1) vector::push_back(&mut top, best2);
        if (s3 > 0 && best3 != best2 && best3 != best1) vector::push_back(&mut top, best3);
        top
    }

    public fun has_freelancer(addr: address): bool acquires Roles {
        if (!exists<Roles>(addr)) return false;
        let r = borrow_global<Roles>(addr);
        contains_in_entries(&r.entries, ROLE_FREELANCER)
    }

    public fun has_poster(addr: address): bool acquires Roles {
        if (!exists<Roles>(addr)) return false;
        let r = borrow_global<Roles>(addr);
        contains_in_entries(&r.entries, ROLE_POSTER)
    }

    public fun has_reviewer(addr: address): bool acquires Roles {
        if (!exists<Roles>(addr)) return false;
        let r = borrow_global<Roles>(addr);
        contains_in_entries(&r.entries, ROLE_REVIEWER)
    }

    public fun get_poster_cid(_addr: address): Option<string::String> {
        option::none<string::String>()
    }

    public fun get_freelancer_cid(_addr: address): Option<string::String> {
        option::none<string::String>()
    }

    fun copy_bytes(src: &vector<u8>): vector<u8> {
        let n = vector::length(src);
        let out = vector::empty<u8>();
        let i = 0; while (i < n) { let b = *vector::borrow(src, i); vector::push_back(&mut out, b); i = i + 1; };
        out
    }

    public fun get_poster_cid_bytes(addr: address): Option<vector<u8>> acquires Roles {
        if (!exists<Roles>(addr)) return option::none<vector<u8>>();
        let r = borrow_global<Roles>(addr);
        let n = vector::length(&r.entries);
        let i = 0;
        while (i < n) {
            let e = vector::borrow(&r.entries, i);
            if (e.kind == ROLE_POSTER) {
                if (option::is_some(&e.cid)) { let s = option::borrow(&e.cid); let bytes = string::bytes(s); return option::some(copy_bytes(bytes)); } else { return option::none<vector<u8>>(); }
            };
            i = i + 1;
        };
        option::none<vector<u8>>()
    }

    public fun get_freelancer_cid_bytes(addr: address): Option<vector<u8>> acquires Roles {
        if (!exists<Roles>(addr)) return option::none<vector<u8>>();
        let r = borrow_global<Roles>(addr);
        let n = vector::length(&r.entries);
        let i = 0;
        while (i < n) {
            let e = vector::borrow(&r.entries, i);
            if (e.kind == ROLE_FREELANCER) {
                if (option::is_some(&e.cid)) { let s = option::borrow(&e.cid); let bytes = string::bytes(s); return option::some(copy_bytes(bytes)); } else { return option::none<vector<u8>>(); }
            };
            i = i + 1;
        };
        option::none<vector<u8>>()
    }

    public fun get_role_info(addr: address, kind: u8): (string::String, Option<string::String>) acquires Roles {
if (!exists<Roles>(addr)) return (string::utf8(b""), option::none<string::String>());        let r = borrow_global<Roles>(addr);
        let n = vector::length(&r.entries);
        let i = 0;
        while (i < n) {
            let e = vector::borrow(&r.entries, i);
            if (e.kind == kind) return (e.role, e.cid);
            i = i + 1;
        };
        (string::utf8(b""), option::none<string::String>())
    }
}


