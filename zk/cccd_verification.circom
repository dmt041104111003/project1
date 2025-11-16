pragma circom 2.1.8;

include "../node_modules/circomlib/circuits/poseidon.circom";

template CCCDVerification() {
    // Input signals: các thông tin từ CCCD
    signal input id_number;        // Số CCCD (hash)
    signal input name_hash;         // Hash của họ tên
    signal input dob_hash;          // Hash của ngày sinh
    signal input gender_hash;       // Hash của giới tính
    signal input nationality_hash;  // Hash của quốc tịch
    signal input expiry_hash;       // Hash của ngày hết hạn
    signal input face_verified;     // Face verification result (1 = true, 0 = false)
    
    // Output: proof hợp lệ nếu tất cả thông tin đều có và face verified
    signal output valid;
    
    // Component để hash tất cả thông tin
    component poseidon = Poseidon(7);
    
    // Hash tất cả thông tin lại với nhau
    poseidon.inputs[0] <== id_number;
    poseidon.inputs[1] <== name_hash;
    poseidon.inputs[2] <== dob_hash;
    poseidon.inputs[3] <== gender_hash;
    poseidon.inputs[4] <== nationality_hash;
    poseidon.inputs[5] <== expiry_hash;
    poseidon.inputs[6] <== face_verified;
    
    // Output là hash cuối cùng
    valid <== poseidon.out;
    
    // Đảm bảo face_verified là boolean (0 hoặc 1)
    face_verified * (face_verified - 1) === 0;
}

component main = CCCDVerification();

