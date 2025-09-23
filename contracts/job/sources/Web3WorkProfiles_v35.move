module did_addr_profile::web3_profiles_v35 {
    use std::signer;
    use std::vector;
    use std::string::String;
    use aptos_std::table;
    use aptos_framework::event::{EventHandle, emit_event};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_framework::coin::{Self};
    use aptos_framework::aptos_coin::AptosCoin;
    use did_addr_profile::did_registry_v35;

    const EMODULE_NOT_INITIALIZED: u64 = 1;
    const EPROFILE_EXISTS: u64 = 2;
    const EPROFILE_NOT_FOUND: u64 = 3;
    const ENOT_OWNER: u64 = 4;
    const ENOT_VERIFIED_DID: u64 = 5;
    const EALREADY_ROLE: u64 = 6;
    const EINSUFFICIENT_FUNDS: u64 = 7;

    const ONE_APT: u64 = 100_000_000;
    const REGISTRATION_FEE: u64 = 150_000_000; // 1.5 APT
    const FEE_RECIPIENT: address = @0x63f7258246d645d71b7c397cfcccef84ff47930065018b18f7667ce37565cf89;

	struct Profile has store, copy, drop {
		did_hash: vector<u8>,
		verification_cid: String,
		profile_cid: String,
		cv_cid: String,
		avatar_cid: String,
		created_at: u64,
	}

	struct Profiles has key { profiles: table::Table<address, Profile> }

    struct Roles has key { roles: table::Table<address, RoleFlags> }

    struct RoleFlags has store, copy, drop { is_poster: bool, is_freelancer: bool }

	struct Events has key {
		registered: EventHandle<ProfileRegistered>,
		profile_updated: EventHandle<ProfileUpdated>,
        role_registered: EventHandle<RoleRegistered>,
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

    struct RoleRegistered has store, drop {
        user: address,
        role: vector<u8>, // "poster" or "freelancer"
        fee_paid: u64,
        time: u64,
    }

    public entry fun initialize(account: &signer) {
		let owner = signer::address_of(account);
		assert!(owner == @did_addr_profile, ENOT_OWNER);
		if (!exists<Profiles>(owner)) {
			move_to(account, Profiles { profiles: table::new<address, Profile>() });
		};
        if (!exists<Roles>(owner)) {
            move_to(account, Roles { roles: table::new<address, RoleFlags>() });
        };
		if (!exists<Events>(owner)) {
			move_to(account, Events {
				registered: account::new_event_handle<ProfileRegistered>(account),
                profile_updated: account::new_event_handle<ProfileUpdated>(account),
                role_registered: account::new_event_handle<RoleRegistered>(account),
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

    public entry fun register_poster(account: &signer) acquires Roles, Events {
        let user = signer::address_of(account);
        assert!(exists<Roles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(did_registry_v35::has_verified_did(user), ENOT_VERIFIED_DID);
        let store = borrow_global_mut<Roles>(@did_addr_profile);
        let flags = if (table::contains(&store.roles, user)) {
            table::borrow_mut(&mut store.roles, user)
        } else {
            let init = RoleFlags { is_poster: false, is_freelancer: false };
            table::add(&mut store.roles, user, init);
            table::borrow_mut(&mut store.roles, user)
        };
        assert!(!flags.is_poster, EALREADY_ROLE);
        let bal = coin::balance<AptosCoin>(user);
        assert!(bal >= REGISTRATION_FEE, EINSUFFICIENT_FUNDS);
        coin::transfer<AptosCoin>(account, FEE_RECIPIENT, REGISTRATION_FEE);
        flags.is_poster = true;
        let events = borrow_global_mut<Events>(@did_addr_profile);
        emit_event(&mut events.role_registered, RoleRegistered { user, role: b"poster", fee_paid: REGISTRATION_FEE, time: timestamp::now_seconds() });
    }

    public entry fun register_freelancer(account: &signer) acquires Roles, Events {
        let user = signer::address_of(account);
        assert!(exists<Roles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        assert!(did_registry_v35::has_verified_did(user), ENOT_VERIFIED_DID);
        let store = borrow_global_mut<Roles>(@did_addr_profile);
        let flags = if (table::contains(&store.roles, user)) {
            table::borrow_mut(&mut store.roles, user)
        } else {
            let init = RoleFlags { is_poster: false, is_freelancer: false };
            table::add(&mut store.roles, user, init);
            table::borrow_mut(&mut store.roles, user)
        };
        assert!(!flags.is_freelancer, EALREADY_ROLE);
        let bal = coin::balance<AptosCoin>(user);
        assert!(bal >= REGISTRATION_FEE, EINSUFFICIENT_FUNDS);
        coin::transfer<AptosCoin>(account, FEE_RECIPIENT, REGISTRATION_FEE);
        flags.is_freelancer = true;
        let events = borrow_global_mut<Events>(@did_addr_profile);
        emit_event(&mut events.role_registered, RoleRegistered { user, role: b"freelancer", fee_paid: REGISTRATION_FEE, time: timestamp::now_seconds() });
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
    public fun has_poster_role(user: address): bool acquires Roles {
        assert!(exists<Roles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        let store = borrow_global<Roles>(@did_addr_profile);
        if (!table::contains(&store.roles, user)) return false;
        let flags = table::borrow(&store.roles, user);
        flags.is_poster
    }

    #[view]
    public fun has_freelancer_role(user: address): bool acquires Roles {
        assert!(exists<Roles>(@did_addr_profile), EMODULE_NOT_INITIALIZED);
        let store = borrow_global<Roles>(@did_addr_profile);
        if (!table::contains(&store.roles, user)) return false;
        let flags = table::borrow(&store.roles, user);
        flags.is_freelancer
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


