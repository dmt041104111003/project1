# Test API với cURL - Security Testing

Các lệnh curl để test authentication và kiểm tra security (không có JWT token thì không được lộ dữ liệu).

## 1. Security Test - Kiểm tra không có JWT token

**Mục đích:** Đảm bảo tất cả protected APIs trả về 401 Unauthorized khi không có JWT token, KHÔNG được lộ dữ liệu.

### Test không có JWT token (phải trả về 401)

```bash
# Test IPFS get (profile/dispute) - PHẢI 401
curl -v -X GET "http://localhost:3000/api/ipfs/get?cid=QmXXX..."

# Test IPFS job - PUBLIC (không cần JWT)
curl -v -X GET "http://localhost:3000/api/ipfs/job?cid=QmXXX..."

# Test Job list - PUBLIC (không cần JWT)
curl -v -X GET "http://localhost:3000/api/job?list=true"

# Test Job detail - PUBLIC (không cần JWT)
curl -v -X GET "http://localhost:3000/api/job/1"

# Test Role - PHẢI 401
curl -v -X GET "http://localhost:3000/api/role?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"

# Test Reputation - PHẢI 401
curl -v -X GET "http://localhost:3000/api/reputation?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"

# Test Dispute - PHẢI 401
curl -v -X GET "http://localhost:3000/api/dispute?action=get_summary&dispute_id=1"

# Test Chat messages - PHẢI 401
curl -v -X GET "http://localhost:3000/api/chat/messages?getRooms=true"
curl -v -X GET "http://localhost:3000/api/chat/messages?roomId=room123"

# Test IPFS upload - PHẢI 401
curl -v -X POST "http://localhost:3000/api/ipfs/upload" \
  -H "Content-Type: application/json" \
  -d '{"type":"profile","about":"test"}'

# Test Chat post - PHẢI 401
curl -v -X POST "http://localhost:3000/api/chat/messages/post" \
  -H "Content-Type: application/json" \
  -d '{"text":"test","sender":"test","senderId":"0x..."}'

# Test Chat delete - PHẢI 401
curl -v -X DELETE "http://localhost:3000/api/chat/messages/delete" \
  -H "Content-Type: application/json" \
  -d '{"messageId":"msg123","roomId":"room123"}'
```

**Expected Response (tất cả phải giống nhau):**
```json
{
  "error": "Unauthorized"
}
```

**HTTP Status Code:** `401 Unauthorized`

### Test JWT token không hợp lệ

```bash
curl -v -X GET "http://localhost:3000/api/job?list=true" \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

**HTTP Status Code:** `401 Unauthorized`

### Test JWT token hết hạn

```bash
curl -v -X GET "http://localhost:3000/api/job?list=true" \
  -H "Authorization: Bearer expired_token_here"
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

**HTTP Status Code:** `401 Unauthorized`

### Test với Authorization header sai format

```bash
# Thiếu "Bearer "
curl -v -X GET "http://localhost:3000/api/job?list=true" \
  -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Sai format
curl -v -X GET "http://localhost:3000/api/job?list=true" \
  -H "Authorization: Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

**HTTP Status Code:** `401 Unauthorized`

## 2. Authentication Flow (Public APIs)

### Bước 1: Lấy nonce

```bash
curl -X GET "http://localhost:3000/api/auth/nonce?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"
```

**Response:**
```json
{
  "nonce": "dkntg1f86h5ai69tfjifkmi2nua92",
  "message": "Log in with dkntg1f86h5ai69tfjifkmi2nua92"
}
```

### Bước 2: Login (cần sign message với Petra wallet trước)

**Lưu ý:** Bước này cần sign message với Petra wallet. Sau khi sign, bạn sẽ có:
- `signature`: Chữ ký từ wallet
- `fullMessage`: Message đầy đủ mà Petra sign
- `publicKey`: Public key từ wallet

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9",
    "signature": "0x1b79ed58fdc714e173fa...",
    "publicKey": "0xab3b71ae2b06ef587a...",
    "fullMessage": "APTOS\nnonce: dkntg1f86h5ai69tfjifkmi2nua92\nmessage: Log in with dkntg1f86h5ai69tfjifkmi2nua92",
    "message": "Log in with dkntg1f86h5ai69tfjifkmi2nua92",
    "nonce": "dkntg1f86h5ai69tfjifkmi2nua92"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "address": "0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"
}
```

**Lưu token này để dùng cho các request sau:**
```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 3. Protected API Endpoints (với JWT token)

### IPFS APIs

#### GET `/api/ipfs/get` (Protected - cần JWT)

```bash
curl -X GET "http://localhost:3000/api/ipfs/get?cid=QmXXX..." \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### GET `/api/ipfs/job` (Public - không cần JWT)

```bash
# Với CID
curl -X GET "http://localhost:3000/api/ipfs/job?cid=QmXXX..."

# Với jobId
curl -X GET "http://localhost:3000/api/ipfs/job?jobId=1"

# Chỉ decode CID (không fetch data)
curl -X GET "http://localhost:3000/api/ipfs/job?cid=QmXXX...&decodeOnly=true"

# Lấy danh sách applicants
curl -X GET "http://localhost:3000/api/ipfs/job?cid=QmXXX...&freelancers=true"
```

#### POST `/api/ipfs/upload`

```bash
curl -X POST "http://localhost:3000/api/ipfs/upload" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "profile",
    "about": "My profile description"
  }'
```

#### POST `/api/ipfs/upload-file`

```bash
curl -X POST "http://localhost:3000/api/ipfs/upload-file" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "type=milestone_evidence"
```

### Job APIs (Public - không cần JWT)

#### GET `/api/job?list=true`

```bash
curl -X GET "http://localhost:3000/api/job?list=true"
```

#### GET `/api/job?job_id=1`

```bash
curl -X GET "http://localhost:3000/api/job?job_id=1"
```

#### GET `/api/job/[id]`

```bash
curl -X GET "http://localhost:3000/api/job/1"
```

### Role API

#### GET `/api/role?address=xxx`

```bash
curl -X GET "http://localhost:3000/api/role?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Reputation API

#### GET `/api/reputation?address=xxx`

```bash
curl -X GET "http://localhost:3000/api/reputation?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Dispute API

#### GET `/api/dispute?action=get_reviewers&dispute_id=1`

```bash
curl -X GET "http://localhost:3000/api/dispute?action=get_reviewers&dispute_id=1" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### GET `/api/dispute?action=get_summary&dispute_id=1`

```bash
curl -X GET "http://localhost:3000/api/dispute?action=get_summary&dispute_id=1" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### GET `/api/dispute?action=get_evidence&dispute_id=1`

```bash
curl -X GET "http://localhost:3000/api/dispute?action=get_evidence&dispute_id=1" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Chat APIs

#### GET `/api/chat/messages?getRooms=true`

```bash
curl -X GET "http://localhost:3000/api/chat/messages?getRooms=true" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### GET `/api/chat/messages?roomId=xxx`

```bash
curl -X GET "http://localhost:3000/api/chat/messages?roomId=room123" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### POST `/api/chat/messages/post`

```bash
curl -X POST "http://localhost:3000/api/chat/messages/post" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room123",
    "text": "Hello world",
    "sender": "User Name",
    "senderId": "0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"
  }'
```

#### DELETE `/api/chat/messages/delete`

```bash
curl -X DELETE "http://localhost:3000/api/chat/messages/delete" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "msg123",
    "roomId": "room123"
  }'
```

## 4. Quick Security Test Script

### Windows PowerShell

Chạy script `test-security.ps1` để test tất cả APIs không có JWT:

```powershell
.\test-security.ps1
```

### Linux/Mac (Bash)

Chạy script `test-security.sh` để test tất cả APIs không có JWT:

```bash
chmod +x test-security.sh
./test-security.sh
```

Script sẽ test tất cả protected APIs và kiểm tra xem có trả về 401 không.

## 5. Production URLs

Thay `http://localhost:3000` bằng production URL:

```bash
# Ví dụ với Vercel
BASE_URL="https://escrow-rho.vercel.app"

# Hoặc custom domain
BASE_URL="https://yourdomain.com"
```

