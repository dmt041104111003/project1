#[test_only]
module job_work_board::test_all_modules {
    use std::option;
    use std::string;
    use aptos_framework::account;
    use job_work_board::role;
    use job_work_board::escrow;
    use job_work_board::dispute;
    use job_work_board::reputation;

    const ADMIN: address = @job_work_board;
    const POSTER: address = @0x1111;
    const FREELANCER: address = @0x2222;
    const REVIEWER1: address = @0x3333;

    fun setup_admin(): signer {
        account::create_account_for_test(ADMIN)
    }

    fun setup_poster(): signer {
        account::create_account_for_test(POSTER)
    }

    fun setup_freelancer(): signer {
        account::create_account_for_test(FREELANCER)
    }

    fun setup_reviewer1(): signer {
        account::create_account_for_test(REVIEWER1)
    }

    // ROLE module tests
    // Note: These tests require contract to be published and RoleStore initialized
    
    // ESCROW module tests  
    // Note: These tests require contract to be published
    
    // DISPUTE module tests
    // Note: These tests require contract to be published
    
    // REPUTATION module tests
    // Note: These tests require contract to be published
}
