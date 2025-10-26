#!/bin/bash
# ZK Minimal Setup Script (x == 1) - For Circom 2.1.8

set -e

# Step 1: Create circuit
cat > membership.circom <<'EOF'
pragma circom 2.1.8;

template Membership() {
    signal input x;
    signal output ok;

    // ok = 1 nếu x == 1, ok = 0 nếu khác
    ok <== x;

    // Giới hạn ok là boolean
    ok * (ok - 1) === 0;
}

component main = Membership();
EOF

echo "[1/6] ✅ Circuit created: membership.circom"

# Step 2: Compile circuit
circom membership.circom --r1cs --wasm --sym
echo "[2/6] ✅ Compilation done (R1CS + WASM)"

# Step 3: Download ptau
curl -L -o pot_final.ptau https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau
echo "[3/6] ✅ Downloaded pot_final.ptau"

# Step 4: Setup zkey (from parent dir)
cd ..
npx --yes snarkjs groth16 setup zk/membership.r1cs zk/pot_final.ptau zk/circuit.zkey
npx --yes snarkjs zkey export verificationkey zk/circuit.zkey zk/verification_key.json
echo "[4/6] ✅ ZKey + Verification Key generated"

# Step 5: Generate witness & proof
cd zk
echo '{"x":1}' > input.json
npx --yes snarkjs wtns calculate membership_js/membership.wasm input.json witness.wtns
npx --yes snarkjs groth16 prove circuit.zkey witness.wtns proof.json public.json
echo "[5/6] ✅ Proof generated"

# Step 6: Create .env.local
cat > .env.local <<EOF
ZK_WASM_PATH=$(pwd)/membership_js/membership.wasm
ZK_ZKEY_PATH=$(pwd)/circuit.zkey
ZK_INPUT_PATH=$(pwd)/input.json
ZK_VK_PATH=$(pwd)/verification_key.json
EOF

echo "[6/6] ✅ .env.local created"

echo "🎉 ZK setup complete on Circom 2.1.8!"
