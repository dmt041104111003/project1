pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template CCCDAgeExpiryCheck() {
    signal input dob;
    signal input expiry;
    signal input id_hash;
    signal input name_hash;

    signal input today;
    signal input min_age;

    signal output valid;
    signal output identity_hash_out;
    signal output name_hash_out;

    // age_raw = today - dob
    signal age_raw;
    age_raw <== today - dob;

    // min_age_scaled = min_age * 10000
    // vì dob và today dạng YYYYMMDD
    signal min_age_scaled;
    min_age_scaled <== min_age * 10000;

    // age_raw >= min_age_scaled ?
    component cmp_age = GreaterEqThan(32);
    cmp_age.in[0] <== age_raw;
    cmp_age.in[1] <== min_age_scaled;

    signal is_old_enough;
    is_old_enough <== cmp_age.out;

    // expiry >= today ?
    component cmp_expiry = GreaterEqThan(32);
    cmp_expiry.in[0] <== expiry;
    cmp_expiry.in[1] <== today;

    signal is_valid_expiry;
    is_valid_expiry <== cmp_expiry.out;

    valid <== is_old_enough * is_valid_expiry;
    identity_hash_out <== id_hash;
    name_hash_out <== name_hash;
}

component main = CCCDAgeExpiryCheck();
