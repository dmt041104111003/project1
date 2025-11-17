# ZK Proof và Duplicate Prevention

## Tổng quan

Hệ thống sử dụng **Groth16 Zero-Knowledge Proof** để xác minh thông tin CCCD mà không tiết lộ dữ liệu thực tế. Một trong những tính năng quan trọng là **duplicate prevention** - đảm bảo mỗi CCCD chỉ có thể được sử dụng bởi một địa chỉ duy nhất.

## Groth16 Proof System

### Proof vs Public Signals

Trong Groth16, có 2 thành phần chính:

1. **Proof** (Bằng chứng):
   - Mỗi lần tạo sẽ **khác nhau** (do randomness trong thuật toán)
   - Cùng một input, mỗi lần chạy `snarkjs groth16 prove` sẽ tạo ra proof khác nhau
   - Đây là tính năng của Groth16 để đảm bảo **zero-knowledge** (không thể trace back)

2. **Public Signals** (Tín hiệu công khai):
   - Là public inputs/outputs của circuit
   - **Giống nhau** nếu input giống nhau
   - Được sử dụng để verify proof và check duplicate

### Ví dụ

```bash
# Lần 1: Tạo proof cho CCCD "123456789"
snarkjs groth16 prove zkey.wasm witness.wtns proof1.json public1.json
# → proof1.json: { pi_a: [...], pi_b: [...], pi_c: [...] } (random)
# → public1.json: ["0x1234...", "0x5678..."] (deterministic)

# Lần 2: Tạo proof lại cho cùng CCCD "123456789"
snarkjs groth16 prove zkey.wasm witness.wtns proof2.json public2.json
# → proof2.json: { pi_a: [...], pi_b: [...], pi_c: [...] } (KHÁC proof1.json)
# → public2.json: ["0x1234...", "0x5678..."] (GIỐNG public1.json)
```

## Duplicate Prevention trong Code

### 1. Backend API (`/api/zk/generate-proof`)

Trước khi tạo proof, hệ thống kiểm tra duplicate bằng cách query blockchain:

```typescript
// src/app/api/zk/generate-proof/route.ts

// Bước 1: Generate proof (mỗi lần khác nhau)
const proof = JSON.parse(proofContent);  // ← Proof khác nhau mỗi lần
const publicSignals = JSON.parse(publicContent);  // ← Public signals giống nhau nếu cùng CCCD

// Bước 2: Check duplicate bằng public signals
const publicSignalsJson = JSON.stringify(publicSignals);
const publicSignalsBytes = new TextEncoder().encode(publicSignalsJson);
const publicSignalsHex = Array.from(publicSignalsBytes)
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');

// Query blockchain table với public_signals làm key
const tableRes = await fetch(`${APTOS_NODE_URL}/v1/tables/${proofHashesHandle}/item`, {
  method: 'POST',
  body: JSON.stringify({
    key_type: `vector<u8>`,
    value_type: 'address',
    key: `0x${publicSignalsHex}`  // ← Dùng public_signals làm key
  })
});

if (tableRes.ok) {
  const existingAddress = await tableRes.json();
  // → Nếu tìm thấy → CCCD đã được dùng bởi address khác
  return NextResponse.json({ 
    error: `Thông tin CCCD này đã được xác minh bởi địa chỉ khác (${existingAddress})`,
    existing_address: existingAddress,
    requires_reauth: true
  }, { status: 409 });
}
```

**Lưu ý**: Code dùng **public_signals** để check duplicate, không phải proof.

### 2. Move Contract (`role.move`)

Contract có 2 tables để quản lý:

```move
struct RoleStore has key {
    proofs: Table<address, CCCDProof>,  // Map address -> proof
    proof_hashes: Table<vector<u8>, address>,  // Map public_signals -> address
}
```

#### `store_proof` Function

```move
public entry fun store_proof(
    s: &signer,
    proof: vector<u8>,           // ← Proof (mỗi lần khác nhau)
    public_signals: vector<u8>  // ← Public signals (giống nhau nếu cùng CCCD)
) acquires RoleStore {
    let addr = signer::address_of(s);
    let store = borrow_global_mut<RoleStore>(@job_work_board);
    
    // Check 1: Mỗi address chỉ có thể store 1 proof
    assert!(!table::contains(&store.proofs, addr), 3);
    
    // Check 2: Mỗi CCCD (public_signals) chỉ có thể được dùng bởi 1 address
    assert!(!table::contains(&store.proof_hashes, public_signals), 4);
    
    // Lưu proof vào table (address -> CCCDProof)
    table::add(&mut store.proofs, addr, CCCDProof {
        proof,                    // ← Proof được lưu (mỗi lần khác nhau)
        public_signals: public_signals,  // ← Public signals được lưu
        timestamp: aptos_std::timestamp::now_seconds(),
    });
    
    // Lưu mapping (public_signals -> address) để check duplicate
    table::add(&mut store.proof_hashes, public_signals, addr);
}
```

#### Duplicate Prevention Rules

1. **Mỗi address chỉ có thể store 1 proof**:
   - Nếu address đã có proof → Fail (Error code 3)
   - Không thể store lại hoặc update proof

2. **Mỗi CCCD chỉ có thể được dùng bởi 1 address**:
   - Nếu public_signals đã tồn tại → Fail (Error code 4)
   - Ngăn chặn việc dùng cùng 1 CCCD bởi nhiều address

## Flow tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User upload CCCD và verify face                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend gọi /api/zk/generate-proof                      │
│    - Hash thông tin CCCD                                    │
│    - Generate witness                                       │
│    - Generate proof (mỗi lần khác nhau)                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend check duplicate                                  │
│    - Query proof_hashes table với public_signals            │
│    - Nếu tìm thấy → Return error 409                        │
│    - Nếu không → Tiếp tục                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend gọi Move contract store_proof                    │
│    - Check: address chưa có proof?                          │
│    - Check: public_signals chưa tồn tại?                    │
│    - Lưu vào 2 tables:                                      │
│      • proofs[address] = CCCDProof                          │
│      • proof_hashes[public_signals] = address              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. User có thể register role                                │
│    - register_role() check has_proof(address)              │
│    - Nếu có proof → Cho phép đăng ký                        │
└─────────────────────────────────────────────────────────────┘
```

## Ví dụ thực tế

### Scenario 1: User A tạo proof lần đầu

```
User A: CCCD "123456789"
→ Generate proof → proof_A_1.json (random)
→ Public signals: ["0xabc123..."]
→ Check duplicate: Không tìm thấy
→ Store proof: OK
→ proofs[0xAAA] = { proof: proof_A_1, public_signals: "0xabc123..." }
→ proof_hashes["0xabc123..."] = 0xAAA
```

### Scenario 2: User A tạo proof lại (cùng CCCD)

```
User A: CCCD "123456789" (lần 2)
→ Generate proof → proof_A_2.json (KHÁC proof_A_1)
→ Public signals: ["0xabc123..."] (GIỐNG lần 1)
→ Check duplicate: Tìm thấy address 0xAAA
→ Backend return error 409: "CCCD đã được xác minh bởi 0xAAA"
```

### Scenario 3: User B cố dùng CCCD của User A

```
User B: CCCD "123456789" (cùng CCCD với User A)
→ Generate proof → proof_B_1.json (random, khác proof_A_1)
→ Public signals: ["0xabc123..."] (GIỐNG User A)
→ Check duplicate: Tìm thấy address 0xAAA
→ Backend return error 409: "CCCD đã được xác minh bởi 0xAAA"
```

### Scenario 4: User B dùng CCCD khác

```
User B: CCCD "987654321" (CCCD khác)
→ Generate proof → proof_B_2.json (random)
→ Public signals: ["0xdef456..."] (KHÁC User A)
→ Check duplicate: Không tìm thấy
→ Store proof: OK
→ proofs[0xBBB] = { proof: proof_B_2, public_signals: "0xdef456..." }
→ proof_hashes["0xdef456..."] = 0xBBB
```

## Tại sao dùng Public Signals thay vì Proof?

1. **Proof thay đổi mỗi lần**: Không thể dùng để check duplicate vì mỗi lần tạo khác nhau
2. **Public Signals deterministic**: Cùng input → cùng output → có thể dùng làm key
3. **Bảo mật**: Public signals không tiết lộ thông tin nhạy cảm (chỉ là hash)
4. **Hiệu quả**: Query table với key cố định nhanh hơn so với so sánh proof

## Kết luận

- **Proof**: Mỗi lần tạo khác nhau (random) → Không thể dùng để check duplicate
- **Public Signals**: Giống nhau nếu cùng CCCD → Dùng làm key để check duplicate
- **Duplicate Prevention**: Dựa trên public_signals, không phải proof
- **Move Contract**: Sử dụng 2 tables để quản lý và ngăn chặn duplicate hiệu quả

