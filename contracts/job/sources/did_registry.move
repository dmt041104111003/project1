module did_addr_profile::did_registry {
    use std::string::{Self, String};
    use std::vector;
    use std::table::{Self, Table};
    use std::signer;
    
    use aptos_framework::timestamp;
    const ERR_DID_ALREADY_EXISTS: u64 = 1000;
    const ERR_DID_NOT_FOUND: u64 = 1001;
    const ERR_INVALID_PUBLIC_KEY: u64 = 1003;
    
    const ROLE_FREELANCER: u8 = 1;
    const ROLE_POSTER: u8 = 2;
    struct DIDDocument has store, copy, drop {
        id: String,
        controller: String,
        roles: vector<u8>,
        did_commitment: vector<u8>,
        profile_cid: vector<u8>,
        created: u64,
        updated: u64,
    }
    struct DIDRegistry has key {
        did_documents: Table<String, DIDDocument>,
        commitment_to_did: Table<vector<u8>, String>,
        commitment_to_address: Table<vector<u8>, address>,
    }
    fun init_module(account: &signer) {
        move_to(account, DIDRegistry {
            did_documents: table::new(),
            commitment_to_did: table::new(),
            commitment_to_address: table::new(),
        });
    }

    

    fun build_did_doc(
        did: String,
        roles: vector<u8>,
        did_commitment: vector<u8>,
        profile_cid: vector<u8>,
        now: u64
    ): DIDDocument {
        DIDDocument { id: did, controller: did, roles: roles, did_commitment, profile_cid, created: now, updated: now }
    }


    public entry fun create_profile(
        user: &signer,
        did: String,
        roles: vector<u8>,
        did_commitment: vector<u8>,
        profile_cid: vector<u8>,
        table_commitment_hex: String,
        t_I_commitment: vector<u8>,
        a_commitment: vector<u8>
    ) acquires DIDRegistry {
        let registry = borrow_global_mut<DIDRegistry>(@did_addr_profile);
        assert!(!table::contains(&registry.did_documents, did), ERR_DID_ALREADY_EXISTS);
        let now = timestamp::now_seconds();
        let did_doc = build_did_doc(did, roles, did_commitment, profile_cid, now);
        let user_addr = signer::address_of(user);
        
        table::add(&mut registry.did_documents, did, did_doc);
        table::add(&mut registry.commitment_to_did, did_commitment, did);
        table::add(&mut registry.commitment_to_address, did_commitment, user_addr);
        did_addr_profile::zkp_lookup::set_did_commitment_internal(did, did_commitment);
        did_addr_profile::zkp_lookup::add_zkp_proof_internal(did, table_commitment_hex, t_I_commitment, a_commitment);
    }

    public entry fun update_profile(
        did: String,
        roles: vector<u8>,
        did_commitment: vector<u8>,
        profile_cid: vector<u8>,
        table_commitment_hex: String,
        t_I_commitment: vector<u8>,
        a_commitment: vector<u8>
    ) acquires DIDRegistry {
        let registry = borrow_global_mut<DIDRegistry>(@did_addr_profile);
        assert!(table::contains(&registry.did_documents, did), ERR_DID_NOT_FOUND);
        
        let did_doc = table::borrow_mut(&mut registry.did_documents, did);
        let i = 0;
        let n = vector::length(&roles);
        while (i < n) {
            let v = *vector::borrow(&roles, i);
            assert!(v == ROLE_FREELANCER || v == ROLE_POSTER, ERR_INVALID_PUBLIC_KEY);
            i = i + 1;
        };
        let has_freelancer = vector::contains(&roles, &ROLE_FREELANCER);
        let has_poster = vector::contains(&roles, &ROLE_POSTER);
        let normalized = vector::empty<u8>();
        if (has_freelancer) { vector::push_back(&mut normalized, ROLE_FREELANCER); };
        if (has_poster) { vector::push_back(&mut normalized, ROLE_POSTER); };
        did_doc.roles = normalized;
        
        if (vector::length(&did_commitment) > 0) {
            did_doc.did_commitment = did_commitment;
        };
        
        if (vector::length(&profile_cid) > 0) {
            did_doc.profile_cid = profile_cid;
        };
        
        did_doc.updated = timestamp::now_seconds();
        
        
        if (vector::length(&did_commitment) > 0) {
            did_addr_profile::zkp_lookup::set_did_commitment_internal(did, did_commitment);
        };
        
        if (string::length(&table_commitment_hex) > 0 && vector::length(&t_I_commitment) > 0 && vector::length(&a_commitment) > 0) {
            did_addr_profile::zkp_lookup::add_zkp_proof_internal(did, table_commitment_hex, t_I_commitment, a_commitment);
        };
    }

    #[view]
    public fun is_profile_verified(did: String, table_commitment_hex: String): bool {
        did_addr_profile::zkp_lookup::verify_zkp_proof_exists(did, table_commitment_hex)
    }




    #[view]
    public fun get_role_types_by_commitment(commitment: vector<u8>): vector<u8> acquires DIDRegistry {
        let registry = borrow_global<DIDRegistry>(@did_addr_profile);
        if (!table::contains(&registry.commitment_to_did, commitment)) {
            return vector::empty<u8>()
        };
        
        let did = *table::borrow(&registry.commitment_to_did, commitment);
        
        if (!table::contains(&registry.did_documents, did)) {
            return vector::empty<u8>()
        };
        
        let did_doc = table::borrow(&registry.did_documents, did);
        did_doc.roles
    }




    #[view]
    public fun get_profile_data_by_commitment(commitment: vector<u8>): (vector<u8>, vector<u8>) acquires DIDRegistry {
        let registry = borrow_global<DIDRegistry>(@did_addr_profile);
        if (!table::contains(&registry.commitment_to_did, commitment)) {
            return (vector::empty<u8>(), vector::empty<u8>())
        };
        let did = *table::borrow(&registry.commitment_to_did, commitment);
        if (!table::contains(&registry.did_documents, did)) {
            return (vector::empty<u8>(), vector::empty<u8>())
        };
        let doc = table::borrow(&registry.did_documents, did);
        (doc.did_commitment, doc.profile_cid)
    }

    #[view]
    public fun get_address_by_commitment(commitment: vector<u8>): address acquires DIDRegistry {
        let registry = borrow_global<DIDRegistry>(@did_addr_profile);
        assert!(table::contains(&registry.commitment_to_address, commitment), ERR_DID_NOT_FOUND);
        *table::borrow(&registry.commitment_to_address, commitment)
    }



    fun is_valid_did_format(d: &String): bool {
        let bytes = string::bytes(d);
        let len = vector::length(bytes);
        if (len < 7) return false;
        if (*vector::borrow(bytes, 0) != 100 ||
            *vector::borrow(bytes, 1) != 105 ||
            *vector::borrow(bytes, 2) != 100 ||
            *vector::borrow(bytes, 3) != 58) {
            return false
        };
        
        true
    }

    public entry fun burn_did(
        did: String,
        table_commitment_hex: String,
        t_I_commitment: vector<u8>,
        a_commitment: vector<u8>,
        roles: vector<u8>
    ) acquires DIDRegistry {
        let registry = borrow_global_mut<DIDRegistry>(@did_addr_profile);
        assert!(table::contains(&registry.did_documents, did), ERR_DID_NOT_FOUND);
        let did_doc = table::borrow(&registry.did_documents, did);
        let controller = did_doc.controller;
        assert!(string::length(&table_commitment_hex) > 0, ERR_INVALID_PUBLIC_KEY);
        
        assert!(vector::length(&t_I_commitment) > 0, ERR_INVALID_PUBLIC_KEY);
        assert!(vector::length(&a_commitment) > 0, ERR_INVALID_PUBLIC_KEY);
        
        assert!(string::length(&controller) > 0, ERR_INVALID_PUBLIC_KEY);
        
        let i = 0;
        let n = vector::length(&roles);
        while (i < n) {
            let v = *vector::borrow(&roles, i);
            assert!(v == ROLE_FREELANCER || v == ROLE_POSTER, ERR_INVALID_PUBLIC_KEY);
            i = i + 1;
        };
        
        let has_freelancer = vector::contains(&roles, &ROLE_FREELANCER);
        let has_poster = vector::contains(&roles, &ROLE_POSTER);
        let normalized = vector::empty<u8>();
        if (has_freelancer) { vector::push_back(&mut normalized, ROLE_FREELANCER); };
        if (has_poster) { vector::push_back(&mut normalized, ROLE_POSTER); };
        assert!(vector::length(&normalized) == vector::length(&did_doc.roles), ERR_INVALID_PUBLIC_KEY);
        
        if (vector::length(&did_doc.did_commitment) > 0) {
            if (table::contains(&registry.commitment_to_did, did_doc.did_commitment)) {
                table::remove(&mut registry.commitment_to_did, did_doc.did_commitment);
            };
        };
        
        did_addr_profile::zkp_lookup::clear_did_internal(did);
        
  
        
        table::remove(&mut registry.did_documents, did);
        
        
    }
}