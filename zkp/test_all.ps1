# ZKP Test Script for Windows PowerShell
# Usage: .\test_all.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ZKP Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

# Test 1: Valid input
Write-Host "`n[Test 1] Valid input (age >= 18, CCCD valid)" -ForegroundColor Yellow
try {
    node circuit_js/generate_witness.js circuit_js/circuit.wasm input.json witness_test1.wtns 2>$null
    npx snarkjs groth16 prove circuit_final.zkey witness_test1.wtns proof_test1.json public_test1.json 2>$null
    $content = Get-Content public_test1.json -Raw | ConvertFrom-Json
    $valid = $content[0]
    if ($valid -eq "1") {
        Write-Host "  PASS: valid = 1" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAIL: expected valid = 1, got $valid" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $failed++
}

# Test 2: Underage
Write-Host "`n[Test 2] Underage (age < 18)" -ForegroundColor Yellow
try {
    node circuit_js/generate_witness.js circuit_js/circuit.wasm input_underage.json witness_test2.wtns 2>$null
    npx snarkjs groth16 prove circuit_final.zkey witness_test2.wtns proof_test2.json public_test2.json 2>$null
    $content = Get-Content public_test2.json -Raw | ConvertFrom-Json
    $valid = $content[0]
    if ($valid -eq "0") {
        Write-Host "  PASS: valid = 0" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAIL: expected valid = 0, got $valid" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $failed++
}

# Test 3: Expired CCCD
Write-Host "`n[Test 3] Expired CCCD" -ForegroundColor Yellow
try {
    node circuit_js/generate_witness.js circuit_js/circuit.wasm input_expired.json witness_test3.wtns 2>$null
    npx snarkjs groth16 prove circuit_final.zkey witness_test3.wtns proof_test3.json public_test3.json 2>$null
    $content = Get-Content public_test3.json -Raw | ConvertFrom-Json
    $valid = $content[0]
    if ($valid -eq "0") {
        Write-Host "  PASS: valid = 0" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAIL: expected valid = 0, got $valid" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $failed++
}

# Test 4: Verify proof off-chain
Write-Host "`n[Test 4] Verify proof off-chain" -ForegroundColor Yellow
try {
    # First export verification key if not exists
    if (-not (Test-Path "verification_key.json")) {
        npx snarkjs zkey export verificationkey circuit_final.zkey verification_key.json 2>$null
    }
    $result = npx snarkjs groth16 verify verification_key.json public_test1.json proof_test1.json 2>&1
    if ($result -match "OK") {
        Write-Host "  PASS: Proof verified" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAIL: Proof verification failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $failed++
}

# Cleanup
Remove-Item -Path "witness_test*.wtns" -ErrorAction SilentlyContinue
Remove-Item -Path "proof_test*.json" -ErrorAction SilentlyContinue
Remove-Item -Path "public_test*.json" -ErrorAction SilentlyContinue

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================" -ForegroundColor Cyan

exit $failed

