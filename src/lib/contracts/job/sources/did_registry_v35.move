module did_addr_profile::did_registry_v35 {
	use std::signer;
	use aptos_std::table;
	use aptos_std::bcs;
	use aptos_framework::event::{EventHandle, emit_event};
	use aptos_framework::account;
	use std::vector;
	use aptos_std::hash;

	const EMODULE_NOT_INITIALIZED: u64 = 1;
	const EDID_ALREADY_REGISTERED: u64 = 2;
	const EINVALID_SIGNER_FOR_INIT: u64 = 3;
	const EDID_NOT_FOUND: u64 = 4;

	struct DidRegistry has key {
		map: table::Table<address, vector<u8>>,
	}

	struct DidIndex has key {
		index: table::Table<vector<u8>, address>,
	}

	struct Events has key {
		did_registered_event: EventHandle<DidRegistered>,
	}

	struct DidRegistered has drop, store {
		controller: address,
		did_hash: vector<u8>,
	}

	public entry fun initialize(account: &signer) {
		let owner = signer::address_of(account);
		assert!(owner == @did_addr_profile, EINVALID_SIGNER_FOR_INIT);
		if (!exists<DidRegistry>(owner)) {
			move_to(account, DidRegistry { map: table::new<address, vector<u8>>() });
		};
		if (!exists<DidIndex>(owner)) {
			move_to(account, DidIndex { index: table::new<vector<u8>, address>() });
		};
		if (!exists<Events>(owner)) {
			move_to(account, Events {
				did_registered_event: account::new_event_handle<DidRegistered>(account),
			});
		};
	}

	fun compute_did_hash(addr: address): vector<u8> {
		let addr_bytes = bcs::to_bytes(&addr);
		hash::sha2_256(addr_bytes)
	}

	public entry fun register_did(account: &signer) acquires DidRegistry, DidIndex, Events {
		let controller = signer::address_of(account);
		assert!(exists<DidRegistry>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		assert!(exists<DidIndex>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let did_hash = compute_did_hash(controller);

		let registry = borrow_global_mut<DidRegistry>(@did_addr_profile);
		let already = table::contains(&registry.map, controller);
		assert!(!already, EDID_ALREADY_REGISTERED);
		table::add(&mut registry.map, controller, did_hash);

		let index = borrow_global_mut<DidIndex>(@did_addr_profile);
		table::add(&mut index.index, did_hash, controller);

		let events = borrow_global_mut<Events>(@did_addr_profile);
		emit_event(&mut events.did_registered_event, DidRegistered { controller, did_hash });
	}

	public fun has_verified_did(addr: address): bool acquires DidRegistry {
		assert!(exists<DidRegistry>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let registry = borrow_global<DidRegistry>(@did_addr_profile);
		table::contains(&registry.map, addr)
	}

	public fun get_did_hash(addr: address): vector<u8> acquires DidRegistry {
		assert!(exists<DidRegistry>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let registry = borrow_global<DidRegistry>(@did_addr_profile);
		assert!(table::contains(&registry.map, addr), EDID_NOT_FOUND);
		*table::borrow(&registry.map, addr)
	}

	#[view]
	public fun resolve_controller_by_hash(did_hash: vector<u8>): address acquires DidIndex {
		assert!(exists<DidIndex>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let index = borrow_global<DidIndex>(@did_addr_profile);
		assert!(table::contains(&index.index, did_hash), EDID_NOT_FOUND);
		*table::borrow(&index.index, did_hash)
	}
}


