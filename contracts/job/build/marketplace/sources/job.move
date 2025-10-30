module job_work_board::job {
    use job_work_board::escrow;
    use job_work_board::dispute;

    struct Created has drop { id: u64, poster: address }
    struct Joined has drop { id: u64, freelancer: address }

    public fun create(store_addr: address, poster: &signer, cid: vector<u8>, milestone_amounts: vector<u64>, milestone_deadlines: vector<u64>, deposit_total_octas: u64) {
        escrow::init(poster);
        escrow::create_job(store_addr, poster, cid, milestone_amounts, milestone_deadlines, deposit_total_octas);
    }

    public fun join(store_addr: address, freelancer: &signer, escrow_id: u64) {
        escrow::join_as_freelancer(store_addr, freelancer, escrow_id);
    }

    public fun submit(store_addr: address, freelancer: &signer, escrow_id: u64, index: u64) {
        escrow::submit_milestone(store_addr, freelancer, escrow_id, index);
    }

    public fun approve(store_addr: address, poster: &signer, escrow_id: u64, index: u64) {
        escrow::approve_milestone(store_addr, poster, escrow_id, index);
    }

    public fun auto_approve_after_timeout(store_addr: address, freelancer: &signer, escrow_id: u64, index: u64, confirm_window_sec: u64) {
        escrow::auto_approve_if_poster_inactive(store_addr, freelancer, escrow_id, index, confirm_window_sec);
    }

    public fun miss_deadline_claim(store_addr: address, poster: &signer, escrow_id: u64, index: u64) {
        escrow::claim_stake_on_miss_deadline(store_addr, poster, escrow_id, index);
    }

    public fun open_dispute(store_addr: address, poster: &signer, escrow_id: u64, freelancer: address, evidence_cid: vector<u8>) {
        dispute::init(poster);
        dispute::open(store_addr, poster, escrow_id, freelancer, evidence_cid);
    }
}


