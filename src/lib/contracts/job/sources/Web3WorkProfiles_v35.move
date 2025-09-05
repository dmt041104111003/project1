module did_addr_profile::web3_profiles_v35 {
	use std::signer;
	use std::vector;
	use std::string::String;
	use aptos_std::table;
	use aptos_framework::event::{EventHandle, emit_event};
	use aptos_framework::account;
	use aptos_framework::timestamp;
	use did_addr_profile::did_registry_v35;

	const EMODULE_NOT_INITIALIZED: u64 = 1;
	const EPROFILE_EXISTS: u64 = 2;
	const EPROFILE_NOT_FOUND: u64 = 3;
	const ENOT_OWNER: u64 = 4;
	const ENOT_VERIFIED_DID: u64 = 5;

	struct Profile has store, copy, drop {
		did_hash: vector<u8>,
		verification_cid: String,
		profile_cid: String,
		cv_cid: String,
		avatar_cid: String,
		created_at: u64,
	}

	struct Profiles has key { profiles: table::Table<address, Profile> }

	struct Events has key {
		registered: EventHandle<ProfileRegistered>,
		profile_updated: EventHandle<ProfileUpdated>,
	}

	struct ProfileRegistered has store, drop {
		user: address,
		did_hash: vector<u8>,
		verification_cid: String,
		profile_cid: String,
		cv_cid: String,
		avatar_cid: String,
		time: u64,
	}

	struct ProfileUpdated has store, drop {
		user: address,
		profile_cid: String,
		cv_cid: String,
		avatar_cid: String,
		time: u64,
	}

	public entry fun initialize(account: &signer) {
		let owner = signer::address_of(account);
		assert!(owner == @did_addr_profile, ENOT_OWNER);
		if (!exists<Profiles>(owner)) {
			move_to(account, Profiles { profiles: table::new<address, Profile>() });
		};
		if (!exists<Events>(owner)) {
			move_to(account, Events {
				registered: account::new_event_handle<ProfileRegistered>(account),
				profile_updated: account::new_event_handle<ProfileUpdated>(account),
			});
		};
	}

	public entry fun register_profile(account: &signer, verification_cid: String, profile_cid: String, cv_cid: String, avatar_cid: String) acquires Profiles, Events {
		let user = signer::address_of(account);
		assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		assert!(did_registry_v35::has_verified_did(user), ENOT_VERIFIED_DID);
		let did_hash = did_registry_v35::get_did_hash(user);

		let store = borrow_global_mut<Profiles>(@did_addr_profile);
		assert!(!table::contains(&store.profiles, user), EPROFILE_EXISTS);
		let now = timestamp::now_seconds();
		
		table::add(&mut store.profiles, user, Profile { 
			did_hash,
			verification_cid,
			profile_cid,
			cv_cid,
			avatar_cid,
			created_at: now 
		});

		let events = borrow_global_mut<Events>(@did_addr_profile);
		emit_event(&mut events.registered, ProfileRegistered { 
			user,
			did_hash,
			verification_cid,
			profile_cid,
			cv_cid,
			avatar_cid,
			time: now
		});
	}

	public entry fun update_profile_assets(account: &signer, new_profile_cid: String, new_cv_cid: String, new_avatar_cid: String) acquires Profiles, Events {
		let user = signer::address_of(account);
		assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		
		let store = borrow_global_mut<Profiles>(@did_addr_profile);
		assert!(table::contains(&store.profiles, user), EPROFILE_NOT_FOUND);
		
		let profile = table::borrow_mut(&mut store.profiles, user);
		profile.profile_cid = new_profile_cid;
		profile.cv_cid = new_cv_cid;
		profile.avatar_cid = new_avatar_cid;
		
		let events = borrow_global_mut<Events>(@did_addr_profile);
		emit_event(&mut events.profile_updated, ProfileUpdated { 
			user,
			profile_cid: profile.profile_cid,
			cv_cid: profile.cv_cid,
			avatar_cid: profile.avatar_cid,
			time: timestamp::now_seconds() 
		});
	}

	#[view]
	public fun has_profile(user: address): bool acquires Profiles {
		assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let store = borrow_global<Profiles>(@did_addr_profile);
		table::contains(&store.profiles, user)
	}

	#[view]
	public fun get_profile_by_address(user: address): Profile acquires Profiles {
		assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let store = borrow_global<Profiles>(@did_addr_profile);
		assert!(table::contains(&store.profiles, user), EPROFILE_NOT_FOUND);
		*table::borrow(&store.profiles, user)
	}

	#[view]
	public fun get_verification_cid_by_address(user: address): String acquires Profiles {
		assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let store = borrow_global<Profiles>(@did_addr_profile);
		assert!(table::contains(&store.profiles, user), EPROFILE_NOT_FOUND);
		let profile = table::borrow(&store.profiles, user);
		profile.verification_cid
	}

	#[view]
	public fun get_profile_cids_by_address(user: address): vector<String> acquires Profiles {
		assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let store = borrow_global<Profiles>(@did_addr_profile);
		assert!(table::contains(&store.profiles, user), EPROFILE_NOT_FOUND);
		let profile = table::borrow(&store.profiles, user);
		let cids = vector::empty<String>();
		vector::push_back(&mut cids, profile.profile_cid);
		vector::push_back(&mut cids, profile.cv_cid);
		vector::push_back(&mut cids, profile.avatar_cid);
		cids
	}

	#[view]
	public fun get_latest_profile_cid_by_address(user: address): String acquires Profiles {
		assert!(exists<Profiles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
		let store = borrow_global<Profiles>(@did_addr_profile);
		assert!(table::contains(&store.profiles, user), EPROFILE_NOT_FOUND);
		let profile = table::borrow(&store.profiles, user);
		profile.profile_cid
	}
}


