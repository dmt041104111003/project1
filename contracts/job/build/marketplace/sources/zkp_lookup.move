module did_addr_profile::zkp_lookup {
    use std::string::String;
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;

    struct ZKPLookupTable has store, copy, drop {
        table_id: String,
        table_commitment: vector<u8>,
        created: u64,
    }

    struct ZKPProof has store, copy, drop {
        table_commitment_hex: String,
        t_I_commitment: vector<u8>,
        z_I_commitment_g1: vector<u8>,
        z_I_commitment_g2: vector<u8>,
        a_commitment: vector<u8>,
        v_commitment: vector<u8>,
        d_commitment: vector<u8>,
        r_commitment: vector<u8>,
        q_a_commitment: vector<u8>,
        q_1_commitment: vector<u8>,
        e_commitment: vector<u8>,
        q_2_commitment: vector<u8>,
        w_1_commitment: vector<u8>,
        w_2_commitment: vector<u8>,
        w_3_commitment: vector<u8>,
        w_4_commitment: vector<u8>,
        p1_commitment: vector<u8>,
        p2_commitment: vector<u8>,
        v_1: vector<u8>,
        v_2: vector<u8>,
        v_3: vector<u8>,
        v_4: vector<u8>,
        v_5: vector<u8>,
        created: u64,
    }

    struct ZKPRegistry has key {
        did_commitments: Table<String, vector<u8>>,       
        tables: Table<String, ZKPLookupTable>,
        user_proofs: Table<String, vector<ZKPProof>>, // did_commitment_hex -> proofs
        did_events: EventHandle<DidAddedEvent>,
        table_events: EventHandle<TableAddedEvent>,
        proof_events: EventHandle<ProofAddedEvent>,
    }

    struct DidAddedEvent has drop, store { did: String, timestamp: u64 }
    struct TableAddedEvent has drop, store { table_id: String, timestamp: u64 }
    struct ProofAddedEvent has drop, store { did_commitment_hex: String, table_commitment_hex: String, timestamp: u64 }

    fun init_module(account: &signer) {
        move_to(account, ZKPRegistry {
            did_commitments: table::new(),
            tables: table::new(),
            user_proofs: table::new(),
            did_events: account::new_event_handle<DidAddedEvent>(account),
            table_events: account::new_event_handle<TableAddedEvent>(account),
            proof_events: account::new_event_handle<ProofAddedEvent>(account),
        });
    }

    public entry fun set_did_commitment(did: String, commitment: vector<u8>) acquires ZKPRegistry {
        let registry = borrow_global_mut<ZKPRegistry>(@did_addr_profile);
        if (table::contains(&registry.did_commitments, did)) { table::remove(&mut registry.did_commitments, did); };
        table::add(&mut registry.did_commitments, did, commitment);
        event::emit_event(&mut registry.did_events, DidAddedEvent { did, timestamp: timestamp::now_seconds() });
    }

    public fun set_did_commitment_internal(did: String, commitment: vector<u8>) acquires ZKPRegistry {
        let registry = borrow_global_mut<ZKPRegistry>(@did_addr_profile);
        if (table::contains(&registry.did_commitments, did)) { table::remove(&mut registry.did_commitments, did); };
        table::add(&mut registry.did_commitments, did, commitment);
        event::emit_event(&mut registry.did_events, DidAddedEvent { did, timestamp: timestamp::now_seconds() });
    }

    public fun clear_did_internal(did: String) acquires ZKPRegistry {
        let registry = borrow_global_mut<ZKPRegistry>(@did_addr_profile);
        if (table::contains(&registry.did_commitments, did)) { table::remove(&mut registry.did_commitments, did); };
        if (table::contains(&registry.user_proofs, did)) { table::remove(&mut registry.user_proofs, did); };
    }

    public entry fun add_lookup_table(table_id: String, table_commitment: vector<u8>) acquires ZKPRegistry {
        let registry = borrow_global_mut<ZKPRegistry>(@did_addr_profile);
        if (table::contains(&registry.tables, table_id)) { return };
        let t = ZKPLookupTable { table_id, table_commitment, created: timestamp::now_seconds() };
        table::add(&mut registry.tables, t.table_id, t);
        event::emit_event(&mut registry.table_events, TableAddedEvent { table_id: t.table_id, timestamp: t.created });
    }

    public entry fun add_zkp_proof(
        did_commitment_hex: String,
        table_commitment_hex: String,
        t_I_commitment: vector<u8>, z_I_commitment_g1: vector<u8>, z_I_commitment_g2: vector<u8>, a_commitment: vector<u8>, v_commitment: vector<u8>,
        d_commitment: vector<u8>, r_commitment: vector<u8>, q_a_commitment: vector<u8>, q_1_commitment: vector<u8>,
        e_commitment: vector<u8>, q_2_commitment: vector<u8>,
        w_1_commitment: vector<u8>, w_2_commitment: vector<u8>, w_3_commitment: vector<u8>, w_4_commitment: vector<u8>,
        p1_commitment: vector<u8>, p2_commitment: vector<u8>,
        v_1: vector<u8>, v_2: vector<u8>, v_3: vector<u8>, v_4: vector<u8>, v_5: vector<u8>
    ) acquires ZKPRegistry {
        let registry = borrow_global_mut<ZKPRegistry>(@did_addr_profile);
        if (!table::contains(&registry.user_proofs, did_commitment_hex)) { table::add(&mut registry.user_proofs, did_commitment_hex, vector::empty<ZKPProof>()); };
        let proofs = table::borrow_mut(&mut registry.user_proofs, did_commitment_hex);
        let pr = ZKPProof { table_commitment_hex, t_I_commitment, z_I_commitment_g1, z_I_commitment_g2, a_commitment, v_commitment, d_commitment, r_commitment, q_a_commitment, q_1_commitment, e_commitment, q_2_commitment, w_1_commitment, w_2_commitment, w_3_commitment, w_4_commitment, p1_commitment, p2_commitment, v_1, v_2, v_3, v_4, v_5, created: timestamp::now_seconds() };
        vector::push_back(proofs, pr);
        event::emit_event(&mut registry.proof_events, ProofAddedEvent { did_commitment_hex, table_commitment_hex, timestamp: timestamp::now_seconds() });
    }

    public fun add_zkp_proof_internal(
        did_commitment_hex: String,
        table_commitment_hex: String,
        t_I_commitment: vector<u8>,
        a_commitment: vector<u8>
    ) acquires ZKPRegistry {
        let registry = borrow_global_mut<ZKPRegistry>(@did_addr_profile);
        if (!table::contains(&registry.user_proofs, did_commitment_hex)) { table::add(&mut registry.user_proofs, did_commitment_hex, vector::empty<ZKPProof>()); };
        let proofs = table::borrow_mut(&mut registry.user_proofs, did_commitment_hex);
        let empty = vector::empty<u8>();
        let pr = ZKPProof {
            table_commitment_hex,
            t_I_commitment,
            z_I_commitment_g1: empty,
            z_I_commitment_g2: empty,
            a_commitment,
            v_commitment: empty,
            d_commitment: empty,
            r_commitment: empty,
            q_a_commitment: empty,
            q_1_commitment: empty,
            e_commitment: empty,
            q_2_commitment: empty,
            w_1_commitment: empty,
            w_2_commitment: empty,
            w_3_commitment: empty,
            w_4_commitment: empty,
            p1_commitment: empty,
            p2_commitment: empty,
            v_1: empty,
            v_2: empty,
            v_3: empty,
            v_4: empty,
            v_5: empty,
            created: timestamp::now_seconds(),
        };
        vector::push_back(proofs, pr);
        event::emit_event(&mut registry.proof_events, ProofAddedEvent { did_commitment_hex, table_commitment_hex, timestamp: timestamp::now_seconds() });
    }

    #[view]
    public fun verify_zkp_proof_exists(did_commitment_hex: String, table_commitment_hex: String): bool acquires ZKPRegistry {
        let registry = borrow_global<ZKPRegistry>(@did_addr_profile);
        if (!table::contains(&registry.user_proofs, did_commitment_hex)) { return false };
        let proofs = table::borrow(&registry.user_proofs, did_commitment_hex);
        let i = 0;
        let n = vector::length(proofs);
        while (i < n) {
            let pr = vector::borrow(proofs, i);
            if (pr.table_commitment_hex == table_commitment_hex) { return true };
            i = i + 1;
        };
        false
    }
}