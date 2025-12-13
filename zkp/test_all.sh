#!/bin/bash
# ZKP Test Script for Linux/Mac
# Usage: ./test_all.sh

set -e
cd "$(dirname "$0")"

echo "=========================================="
echo "ZKP Test Suite"
echo "=========================================="

PASSED=0
FAILED=0

# Test 1: Valid input
echo -e "\n\033[33m[Test 1] Valid input (age >= 18, CCCD valid)\033[0m"
node circuit_js/generate_witness.js circuit_js/circuit.wasm input.json witness_test1.wtns 2>/dev/null
npx snarkjs groth16 prove circuit_final.zkey witness_test1.wtns proof_test1.json public_test1.json 2>/dev/null
VALID=$(cat public_test1.json | grep -o '"[01]"' | head -1 | tr -d '"')
if [ "$VALID" = "1" ]; then
    echo -e "  \033[32mPASS: valid = 1\033[0m"
    ((PASSED++))
else
    echo -e "  \033[31mFAIL: expected valid = 1, got $VALID\033[0m"
    ((FAILED++))
fi

# Test 2: Underage
echo -e "\n\033[33m[Test 2] Underage (age < 18)\033[0m"
node circuit_js/generate_witness.js circuit_js/circuit.wasm input_underage.json witness_test2.wtns 2>/dev/null
npx snarkjs groth16 prove circuit_final.zkey witness_test2.wtns proof_test2.json public_test2.json 2>/dev/null
VALID=$(cat public_test2.json | grep -o '"[01]"' | head -1 | tr -d '"')
if [ "$VALID" = "0" ]; then
    echo -e "  \033[32mPASS: valid = 0\033[0m"
    ((PASSED++))
else
    echo -e "  \033[31mFAIL: expected valid = 0, got $VALID\033[0m"
    ((FAILED++))
fi

# Test 3: Expired CCCD
echo -e "\n\033[33m[Test 3] Expired CCCD\033[0m"
node circuit_js/generate_witness.js circuit_js/circuit.wasm input_expired.json witness_test3.wtns 2>/dev/null
npx snarkjs groth16 prove circuit_final.zkey witness_test3.wtns proof_test3.json public_test3.json 2>/dev/null
VALID=$(cat public_test3.json | grep -o '"[01]"' | head -1 | tr -d '"')
if [ "$VALID" = "0" ]; then
    echo -e "  \033[32mPASS: valid = 0\033[0m"
    ((PASSED++))
else
    echo -e "  \033[31mFAIL: expected valid = 0, got $VALID\033[0m"
    ((FAILED++))
fi

# Test 4: Verify proof off-chain
echo -e "\n\033[33m[Test 4] Verify proof off-chain\033[0m"
if [ ! -f "verification_key.json" ]; then
    npx snarkjs zkey export verificationkey circuit_final.zkey verification_key.json 2>/dev/null
fi
RESULT=$(npx snarkjs groth16 verify verification_key.json public_test1.json proof_test1.json 2>&1)
if echo "$RESULT" | grep -q "OK"; then
    echo -e "  \033[32mPASS: Proof verified\033[0m"
    ((PASSED++))
else
    echo -e "  \033[31mFAIL: Proof verification failed\033[0m"
    ((FAILED++))
fi

# Cleanup
rm -f witness_test*.wtns proof_test*.json public_test*.json

echo -e "\n=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "\033[32mResults: $PASSED passed, $FAILED failed\033[0m"
else
    echo -e "\033[31mResults: $PASSED passed, $FAILED failed\033[0m"
fi
echo "=========================================="

exit $FAILED

