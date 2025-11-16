#[test_only]
module job_work_board::test_all_modules {
    use std::option;
    use std::string;
    use aptos_framework::account;
    use job_work_board::role;

    const POSTER: address = @0x1111;
    const FREELANCER: address = @0x2222;
    const REVIEWER1: address = @0x3333;

    fun setup_poster(): signer {
        account::create_account_for_test(POSTER)
    }

    fun setup_freelancer(): signer {
        account::create_account_for_test(FREELANCER)
    }

    fun setup_reviewer1(): signer {
        account::create_account_for_test(REVIEWER1)
    }

    #[test]
    fun test_role_store_proof() {
        let poster = setup_poster();
        let proof = b"test_proof_json";
        let public_signals = b"test_public_signals_json";

        role::store_proof(&poster, proof, public_signals);

        assert!(role::has_proof(POSTER), 1);
        let proof_opt = role::get_proof(POSTER);
        assert!(option::is_some(&proof_opt), 2);
    }

    #[test]
    #[expected_failure(abort_code = 3, location = role)]
    fun test_role_store_proof_duplicate_address() {
        let poster = setup_poster();
        let proof1 = b"proof1";
        let proof2 = b"proof2";
        let signals1 = b"signals1";
        let signals2 = b"signals2";

        role::store_proof(&poster, proof1, signals1);
        role::store_proof(&poster, proof2, signals2);
    }

    #[test]
    #[expected_failure(abort_code = 4, location = role)]
    fun test_role_store_proof_duplicate_public_signals() {
        let poster = setup_poster();
        let freelancer = setup_freelancer();
        let proof1 = b"proof1";
        let proof2 = b"proof2";
        let signals = b"same_signals";

        role::store_proof(&poster, proof1, signals);
        role::store_proof(&freelancer, proof2, signals);
    }

    #[test]
    #[expected_failure(abort_code = 5, location = role)]
    fun test_role_register_without_proof() {
        let poster = setup_poster();
        let cid = string::utf8(b"test_cid");

        role::register_role(&poster, 2, option::some(cid));
    }

    #[test]
    fun test_role_register_with_proof() {
        let poster = setup_poster();
        let proof = b"test_proof";
        let signals = b"test_signals";
        let cid = string::utf8(b"test_cid");

        role::store_proof(&poster, proof, signals);
        role::register_role(&poster, 2, option::some(cid));

        assert!(role::has_poster(POSTER), 1);
        let cid_opt = role::get_cid(POSTER, 2);
        assert!(option::is_some(&cid_opt), 2);
    }

    #[test]
    fun test_role_register_multiple_roles() {
        let poster = setup_poster();
        let proof = b"test_proof";
        let signals = b"test_signals";
        let cid_poster = string::utf8(b"poster_cid");
        let cid_freelancer = string::utf8(b"freelancer_cid");

        role::store_proof(&poster, proof, signals);
        role::register_role(&poster, 2, option::some(cid_poster));
        role::register_role(&poster, 1, option::some(cid_freelancer));

        assert!(role::has_poster(POSTER), 1);
        assert!(role::has_freelancer(POSTER), 2);
    }

    #[test]
    fun test_role_register_reviewer() {
        let reviewer = setup_reviewer1();
        let proof = b"test_proof";
        let signals = b"test_signals";

        role::store_proof(&reviewer, proof, signals);
        role::register_role(&reviewer, 3, option::none());

        assert!(role::has_reviewer(REVIEWER1), 1);
    }
}

