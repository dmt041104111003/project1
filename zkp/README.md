# ZKP - Zero Knowledge Proof cho xác minh CCCD

Hệ thống ZKP sử dụng **Groth16** để chứng minh người dùng đủ 18 tuổi và CCCD còn hạn mà **không tiết lộ** ngày sinh hay ngày hết hạn thực sự.

## 📁 Cấu trúc thư mục

```
zkp/
├── circuit.circom          # 🔧 Mạch logic (circuit)
├── input.json              # ✅ Input test hợp lệ
├── input_underage.json     # ❌ Input test chưa đủ tuổi
├── input_expired.json      # ❌ Input test CCCD hết hạn
├── pot_final.ptau          # 🔐 Powers of Tau (trusted setup)
├── circuit_final.zkey      # 🔑 Proving key
├── circuit.r1cs            # 📐 Rank-1 Constraint System
├── circuit.sym             # 📝 Symbol file
├── witness.wtns            # 🧮 Witness
├── proof.json              # 🎫 ZK Proof output
├── public.json             # 📢 Public signals [valid, identity_hash, name_hash]
├── circuit_js/             # 📦 WASM để generate witness
├── contracts/
│   └── Verifier.sol        # ⚡ Smart contract verify (auto-generated)
└── scripts/
    ├── deploy.js           # 🚀 Deploy Verifier
    └── testVerify.js       # 🧪 Test on-chain
```

## 🔧 Cài đặt

### Yêu cầu
- Node.js >= 16
- Rust (để build Circom)

### Cài Circom & SnarkJS

```bash
# Cài Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Cài snarkjs
npm install -g snarkjs

# Cài dependencies
cd zkp
npm install
```

## 📐 Circuit Logic

```
┌─────────────────────────────────────────────────────────────┐
│                   CCCDAgeExpiryCheck                        │
├─────────────────────────────────────────────────────────────┤
│  Private Inputs (bí mật):                                   │
│    - dob: Ngày sinh (YYYYMMDD)                              │
│    - expiry: Ngày hết hạn CCCD (YYYYMMDD)                   │
│    - id_hash: Hash số CCCD                                  │
│    - name_hash: Hash họ tên                                 │
├─────────────────────────────────────────────────────────────┤
│  Public Inputs (công khai):                                 │
│    - today: Ngày hôm nay (YYYYMMDD)                         │
│    - min_age: Tuổi tối thiểu (18)                           │
├─────────────────────────────────────────────────────────────┤
│  Outputs (công khai):                                       │
│    - valid: 1 nếu hợp lệ, 0 nếu không                       │
│    - identity_hash_out: Trả ra id_hash                      │
│    - name_hash_out: Trả ra name_hash                        │
├─────────────────────────────────────────────────────────────┤
│  Logic:                                                     │
│    age_raw = today - dob                                    │
│    is_old_enough = (age_raw >= min_age * 10000) ? 1 : 0     │
│    is_valid_expiry = (expiry >= today) ? 1 : 0              │
│    valid = is_old_enough * is_valid_expiry                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Quy trình biên dịch từ đầu

### Bước 1: Biên dịch Circuit

```bash
circom circuit.circom --r1cs --wasm --sym -o .
```

### Bước 2: Trusted Setup

```bash
# Tạo Powers of Tau (hoặc dùng sẵn pot_final.ptau)
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First" -v
snarkjs powersoftau beacon pot12_0001.ptau pot12_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -v
snarkjs powersoftau prepare phase2 pot12_beacon.ptau pot_final.ptau -v
```

### Bước 3: Setup Circuit Key

```bash
snarkjs groth16 setup circuit.r1cs pot_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="Contributor 1" -v
snarkjs zkey beacon circuit_0001.zkey circuit_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -v
```

### Bước 4: Export Verifier Contract

```bash
snarkjs zkey export solidityverifier circuit_final.zkey contracts/Verifier.sol
```

## 🎫 Tạo Proof

```bash
# Generate witness
node circuit_js/generate_witness.js circuit_js/circuit.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json
```

## ✅ Verify Proof

### Off-chain

```bash
snarkjs groth16 verify verification_key.json public.json proof.json
# Output: [INFO] snarkJS: OK!
```

### On-chain (Solidity)

```bash
# Export calldata
snarkjs zkey export soliditycalldata public.json proof.json

# Deploy & test
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/testVerify.js --network sepolia
```

## 🧪 Test Cases

### Test 1: Hợp lệ ✅

```json
// input.json
{
    "dob": 20000101,      // Sinh 01/01/2000 → 25 tuổi
    "expiry": 20300101,   // Hết hạn 01/01/2030
    "id_hash": 12345,
    "name_hash": 67890,
    "today": 20250201,
    "min_age": 18
}
```

**Kết quả:** `valid = 1`

```bash
node circuit_js/generate_witness.js circuit_js/circuit.wasm input.json witness.wtns
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json
cat public.json
# ["1", "12345", "67890"]
```

### Test 2: Chưa đủ tuổi ❌

```json
// input_underage.json
{
    "dob": 20100101,      // Sinh 01/01/2010 → 15 tuổi
    "expiry": 20300101,
    "id_hash": 12345,
    "name_hash": 67890,
    "today": 20250201,
    "min_age": 18
}
```

**Kết quả:** `valid = 0`

```bash
node circuit_js/generate_witness.js circuit_js/circuit.wasm input_underage.json witness_u.wtns
snarkjs groth16 prove circuit_final.zkey witness_u.wtns proof_u.json public_u.json
cat public_u.json
# ["0", "12345", "67890"]
```

### Test 3: CCCD hết hạn ❌

```json
// input_expired.json
{
    "dob": 20000101,      // Đủ tuổi
    "expiry": 20200101,   // Hết hạn 01/01/2020 → đã hết hạn!
    "id_hash": 12345,
    "name_hash": 67890,
    "today": 20250201,
    "min_age": 18
}
```

**Kết quả:** `valid = 0`

```bash
node circuit_js/generate_witness.js circuit_js/circuit.wasm input_expired.json witness_e.wtns
snarkjs groth16 prove circuit_final.zkey witness_e.wtns proof_e.json public_e.json
cat public_e.json
# ["0", "12345", "67890"]
```

## 🚀 Chạy tất cả test

```bash
# Windows PowerShell
.\test_all.ps1

# Linux/Mac
./test_all.sh
```

## 📊 Bảng Test Cases

| ID | Test Case | Input | Expected Output | Pass/Fail |
|---|---|---|---|---|
| ZK_01 | Tuổi ≥ 18, CCCD còn hạn | dob=20000101, expiry=20300101 | valid=1 | P |
| ZK_02 | Tuổi < 18 | dob=20100101 (15 tuổi) | valid=0 | P |
| ZK_03 | CCCD hết hạn | expiry=20200101 | valid=0 | P |
| ZK_04 | Đúng 18 tuổi | dob=20070201 | valid=1 | P |
| ZK_05 | Verify proof on-chain | proof.json, public.json | return true | P |
| ZK_06 | Proof giả mạo | Modified proof | return false | P |

## 🔐 Bảo mật

- **Private inputs** (dob, expiry, id_hash, name_hash) không bao giờ được tiết lộ
- Chỉ **public outputs** (valid, identity_hash_out, name_hash_out) được công khai
- Proof có thể verify mà không cần biết private inputs
- `identity_hash` dùng để chống **Sybil attack** (1 CCCD = 1 tài khoản)

## 📝 License

MIT
