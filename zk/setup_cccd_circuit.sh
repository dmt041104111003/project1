#!/bin/bash

echo "=== Setup CCCD Verification Circuit ==="

# Install dependencies nếu chưa có
if ! command -v circom &> /dev/null; then
    echo "Circom chưa được cài đặt. Vui lòng chạy setup_zk.sh trước."
    exit 1
fi

if ! command -v snarkjs &> /dev/null; then
    echo "SnarkJS chưa được cài đặt. Vui lòng chạy setup_zk.sh trước."
    exit 1
fi

# Install circomlib nếu chưa có
if [ ! -d "node_modules/circomlib" ]; then
    echo "Đang cài đặt circomlib..."
    npm install circomlib
fi

# Compile circuit
echo "Đang compile circuit..."
circom cccd_verification.circom --r1cs --wasm --sym

# Generate setup
echo "Đang tạo setup (có thể mất vài phút)..."
snarkjs powersoftau new bn128 14 pot.ptau -v
snarkjs powersoftau contribute pot.ptau pot1.ptau --name="First contribution" -v
snarkjs powersoftau contribute pot1.ptau pot2.ptau --name="Second contribution" -v
snarkjs powersoftau prepare phase2 pot2.ptau pot_final.ptau -v

# Generate zkey
echo "Đang tạo zkey..."
snarkjs groth16 setup cccd_verification.r1cs pot_final.ptau cccd_verification.zkey

# Export verification key
echo "Đang export verification key..."
snarkjs zkey export verificationkey cccd_verification.zkey verification_key.json

echo "✅ Setup hoàn tất!"
echo "Circuit files:"
echo "  - cccd_verification.r1cs"
echo "  - cccd_verification_js/cccd_verification.wasm"
echo "  - cccd_verification.zkey"
echo "  - verification_key.json"

