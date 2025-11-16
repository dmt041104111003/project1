# ZK Circuit cho CCCD Verification

Zero-Knowledge Proof circuit để xác minh danh tính CCCD mà không tiết lộ thông tin cá nhân.

## Mô tả

Circuit này sử dụng **Circom** và **SnarkJS** để tạo ZK proof cho việc xác minh:
- Thông tin CCCD (số CCCD, họ tên, ngày sinh, giới tính, quốc tịch, ngày hết hạn)
- Kết quả face verification

Tất cả thông tin được hash bằng **Poseidon hash** để đảm bảo privacy.

## Yêu cầu hệ thống

- **Node.js** >= 18.x
- **npm** hoặc **yarn**
- **Circom** v2.1.8
- **SnarkJS** (cài qua npm)

## Cài đặt Dependencies

### 1. Cài đặt SnarkJS (toàn cục)

```powershell
npm install -g snarkjs
```

### 2. Tải Circom cho Windows

```powershell
Invoke-WebRequest -Uri "https://github.com/iden3/circom/releases/download/v2.1.8/circom-windows-amd64.exe" -OutFile "circom.exe"
```

### 3. Cài đặt Circomlib (local)

```powershell
npm install circomlib
```

## Setup Circuit

### Bước 1: Compile Circuit

```powershell
.\circom.exe cccd_verification.circom --r1cs --wasm --sym
```

**Kết quả:**
- `cccd_verification.r1cs` - R1CS constraints
- `cccd_verification.wasm` - WebAssembly file (trong `cccd_verification_js/`)
- `cccd_verification.sym` - Symbol file

### Bước 2: Tạo ZKey từ Powers of Tau có sẵn

```powershell
snarkjs groth16 setup cccd_verification.r1cs pot_final.ptau cccd_verification.zkey
```

**Lưu ý:** File `pot_final.ptau` phải có sẵn trong thư mục `zk/`. Nếu chưa có, xem phần "Tạo Powers of Tau mới" bên dưới.

### Bước 3: Export Verification Key

```powershell
snarkjs zkey export verificationkey cccd_verification.zkey verification_key.json
```

## Cấu trúc File

```
zk/
├── cccd_verification.circom          # Circuit source code
├── cccd_verification.r1cs             # Compiled constraints
├── cccd_verification.zkey             # Proving key
├── cccd_verification.sym              # Symbol file
├── pot_final.ptau                     # Powers of Tau (trusted setup)
├── verification_key.json              # Verification key
├── circom.exe                         # Circom compiler (Windows)
├── cccd_verification_js/
│   ├── cccd_verification.wasm         # WebAssembly file
│   ├── generate_witness.js            # Script tạo witness
│   └── witness_calculator.js          # Witness calculator
└── README.md                          # File này
```

## Tạo Powers of Tau mới (nếu chưa có)

Nếu file `pot_final.ptau` chưa có, chạy các lệnh sau:

```powershell
# Tạo powers of tau mới (power 14)
snarkjs powersoftau new bn128 14 pot.ptau -v

# Contribute lần 1
snarkjs powersoftau contribute pot.ptau pot1.ptau --name="First contribution" -v

# Contribute lần 2
snarkjs powersoftau contribute pot1.ptau pot2.ptau --name="Second contribution" -v

# Prepare phase 2
snarkjs powersoftau prepare phase2 pot2.ptau pot_final.ptau -v
```

**Lưu ý:** Quá trình này có thể mất vài phút. File `pot_final.ptau` có thể dùng chung cho nhiều circuit.

## Sử dụng trong API

Circuit được sử dụng qua API route `/api/zk/generate-proof`:

**Input:**
```json
{
  "id_number": "001204014664",
  "name": "NGUYEN MINH QUAN",
  "date_of_birth": "09/09/2004",
  "gender": "Nam",
  "nationality": "Viet Nam",
  "date_of_expiry": "09/09/2029",
  "face_verified": true
}
```

**Output:**
```json
{
  "success": true,
  "proof": { ... },
  "public_signals": [ ... ]
}
```

## Test Circuit (tùy chọn)

### Tạo input test

Tạo file `test_input.json`:

```json
{
  "id_number": "1234567890123456789012345678901234567890123456789012345678901234",
  "name_hash": "2345678901234567890123456789012345678901234567890123456789012345",
  "dob_hash": "3456789012345678901234567890123456789012345678901234567890123456",
  "gender_hash": "4567890123456789012345678901234567890123456789012345678901234567",
  "nationality_hash": "5678901234567890123456789012345678901234567890123456789012345678",
  "expiry_hash": "6789012345678901234567890123456789012345678901234567890123456789",
  "face_verified": 1
}
```

### Generate witness

```powershell
node cccd_verification_js/generate_witness.js cccd_verification_js/cccd_verification.wasm test_input.json test_witness.wtns
```

### Generate proof

```powershell
snarkjs groth16 prove cccd_verification.zkey test_witness.wtns test_proof.json test_public.json
```

### Verify proof

```powershell
snarkjs groth16 verify verification_key.json test_public.json test_proof.json
```

## Troubleshooting

### Lỗi: "circom is not recognized"

**Giải pháp:** Đảm bảo file `circom.exe` có trong thư mục `zk/` hoặc thêm vào PATH.

### Lỗi: "Cannot find module 'circomlib'"

**Giải pháp:** Chạy `npm install circomlib` trong thư mục `zk/`.

### Lỗi: "pot_final.ptau not found"

**Giải pháp:** Tạo file `pot_final.ptau` bằng các lệnh ở phần "Tạo Powers of Tau mới" hoặc copy từ nơi khác.

### Lỗi: "Circuit hash mismatch"

**Giải pháp:** Xóa `cccd_verification.zkey` và tạo lại từ `cccd_verification.r1cs`.

## Lưu ý quan trọng

1. **File `pot_final.ptau`** là trusted setup, cần giữ bí mật và an toàn.
2. **File `cccd_verification.zkey`** là proving key, cần có để generate proof.
3. **File `verification_key.json`** là public key, có thể chia sẻ để verify proof.
4. Circuit sử dụng **Poseidon hash** với 7 inputs (6 hash + 1 face_verified).
5. Input `face_verified` phải là **0 hoặc 1** (boolean).

## Tài liệu tham khảo

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Circomlib](https://github.com/iden3/circomlib)

## Checklist Setup

- [ ] Node.js đã cài đặt
- [ ] SnarkJS đã cài đặt (`snarkjs --version`)
- [ ] Circom đã tải về (`.\circom.exe --version`)
- [ ] Circomlib đã cài đặt (`npm install circomlib`)
- [ ] Circuit đã compile (`cccd_verification.r1cs` tồn tại)
- [ ] ZKey đã tạo (`cccd_verification.zkey` tồn tại)
- [ ] Verification key đã export (`verification_key.json` tồn tại)
- [ ] WASM file đã có (`cccd_verification_js/cccd_verification.wasm` tồn tại)

---


