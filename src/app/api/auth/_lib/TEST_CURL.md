# Test API với cURL - Cookie-based Authentication & CSRF Protection

Các lệnh curl để test authentication với **HttpOnly cookies** và **CSRF protection**. Hệ thống sử dụng:
- **Access Token**: Lưu trong cookie `auth_token` (HttpOnly, Secure, SameSite=strict) - hết hạn sau **1 giờ**
- **Refresh Token**: Lưu trong cookie `refresh_token` (HttpOnly, Secure, SameSite=strict) - hết hạn sau **7 ngày**
- **CSRF Token**: Lưu trong cookie `csrf_token` (readable, Secure, SameSite=strict) - gửi trong header `x-csrf-token` cho non-GET requests

## 1. Security Test - Kiểm tra không có cookies

**Mục đích:** Đảm bảo tất cả protected APIs trả về 401 Unauthorized khi không có cookies, KHÔNG được lộ dữ liệu.

### Test không có cookies (phải trả về 401)

```bash
# Test IPFS get (milestone evidence only) - PHẢI 401
curl -v -X GET "http://localhost:3000/api/ipfs/get?cid=enc:XXX..."

# Test IPFS job - PUBLIC (không cần auth)
curl -v -X GET "http://localhost:3000/api/ipfs/job?jobId=1"

# Test Profile - PUBLIC (không cần auth)
curl -v -X GET "http://localhost:3000/api/profile?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"

# Test IPFS dispute - PHẢI 401 (cần auth)
curl -v -X GET "http://localhost:3000/api/ipfs/dispute?disputeId=1&role=poster"

# Test Job list - PUBLIC (không cần auth)
curl -v -X GET "http://localhost:3000/api/job?list=true"

# Test Job detail - PUBLIC (không cần auth)
curl -v -X GET "http://localhost:3000/api/job/1"

# Test Role - PHẢI 401
curl -v -X GET "http://localhost:3000/api/role?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"

# Test Reputation - PHẢI 401
curl -v -X GET "http://localhost:3000/api/reputation?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"

# Test Dispute - PHẢI 401
curl -v -X GET "http://localhost:3000/api/dispute?action=get_summary&dispute_id=1"

# Test Chat messages - PHẢI 401
curl -v -X GET "http://localhost:3000/api/chat/messages?getRooms=true&userAddress=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"
curl -v -X GET "http://localhost:3000/api/chat/messages?roomId=room123&userAddress=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"

# Test IPFS upload - PHẢI 401 (thiếu CSRF token)
curl -v -X POST "http://localhost:3000/api/ipfs/upload" \
  -H "Content-Type: application/json" \
  -d '{"type":"profile","about":"test"}'

# Test Chat post - PHẢI 401 hoặc 403 (thiếu CSRF token)
curl -v -X POST "http://localhost:3000/api/chat/messages/post" \
  -H "Content-Type: application/json" \
  -d '{"action":"createRoom","creatorAddress":"0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9","participantAddress":"0x..."}'

# Test Chat delete - PHẢI 401 hoặc 403 (thiếu CSRF token)
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

**HTTP Status Code:** `401 Unauthorized` hoặc `403 Forbidden` (nếu thiếu CSRF token)

### Test CSRF Protection (thiếu x-csrf-token header)

```bash
# POST request không có x-csrf-token header - PHẢI 403
curl -v -X POST "http://localhost:3000/api/ipfs/upload" \
  -H "Content-Type: application/json" \
  -b "auth_token=valid_token; csrf_token=valid_csrf" \
  -d '{"type":"profile","about":"test"}'
```

**Expected Response:**
```json
{
  "error": "Invalid CSRF token"
}
```

**HTTP Status Code:** `403 Forbidden`

## 2. Authentication Flow

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

**Quan trọng:** Response sẽ set cookies (`auth_token`, `refresh_token`, `csrf_token`) thay vì trả về token trong body.

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
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
  "address": "0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"
}
```

**Cookies được set (kiểm tra với `-v` flag):**
```
Set-Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
Set-Cookie: csrf_token=abc123...; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

**Lưu cookies để dùng cho các request sau:**
```bash
# Sử dụng cookie jar file
curl -b cookies.txt -c cookies.txt ...

# Hoặc đọc CSRF token từ cookie (chỉ csrf_token là readable)
# Lưu ý: auth_token và refresh_token là HttpOnly, không đọc được từ JavaScript
```

### Bước 3: Kiểm tra session

```bash
curl -X GET "http://localhost:3000/api/auth/session" \
  -b cookies.txt \
  -c cookies.txt
```

**Response (nếu authenticated):**
```json
{
  "authenticated": true,
  "address": "0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"
}
```

**Response (nếu không authenticated):**
```json
{
  "error": "Unauthorized"
}
```

**HTTP Status Code:** `401 Unauthorized`

**Lưu ý:** Nếu access token hết hạn nhưng refresh token còn hợp lệ, endpoint này sẽ tự động tạo bộ token mới và set lại cookies.

### Bước 4: Logout

```bash
# Đọc CSRF token từ cookie (cần extract từ cookies.txt hoặc browser)
CSRF_TOKEN="abc123..."  # Lấy từ cookie csrf_token

curl -X POST "http://localhost:3000/api/auth/logout" \
  -b cookies.txt \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -c cookies.txt
```

**Response:**
```json
{
  "success": true
}
```

**Cookies sẽ bị xóa** (Max-Age=0 hoặc Expires trong quá khứ)

## 3. Protected API Endpoints (với cookies)

### Lưu ý quan trọng:
- **GET requests**: Chỉ cần cookies (`-b cookies.txt`)
- **POST/PUT/DELETE requests**: Cần cả cookies VÀ header `x-csrf-token`
- CSRF token có thể đọc từ cookie `csrf_token` (không phải HttpOnly)

### Cách lấy CSRF token từ cookie:

```bash
# Từ cookie jar file (cookies.txt)
CSRF_TOKEN=$(grep csrf_token cookies.txt | awk '{print $NF}')

# Hoặc từ browser DevTools > Application > Cookies > csrf_token
```

### IPFS APIs

#### GET `/api/ipfs/get` (Protected - chỉ milestone evidence)

**Lưu ý:** Endpoint này chỉ phục vụ milestone evidence CIDs. Backend sẽ tự động tìm job chứa CID này và verify user là poster/freelancer của job đó.

```bash
curl -X GET "http://localhost:3000/api/ipfs/get?cid=enc:JTvOzl8UfB4hP1DR:..." \
  -b cookies.txt \
  -c cookies.txt
```

**Response:**
```json
{
  "cid": "QmXXX...",
  "data": { ... },
  "milestoneId": 1,
  "jobId": 1
}
```

#### GET `/api/ipfs/job` (Public - không cần auth)

**Lưu ý:** Chỉ nhận `jobId`, không nhận arbitrary CIDs.

```bash
# Với jobId
curl -X GET "http://localhost:3000/api/ipfs/job?jobId=1"

# Với decodeOnly (chỉ decode CID, không fetch IPFS)
curl -X GET "http://localhost:3000/api/ipfs/job?jobId=1&decodeOnly=true"

# Lấy danh sách applicants
curl -X GET "http://localhost:3000/api/ipfs/job?jobId=1&freelancers=true"
```

#### GET `/api/profile` (Public - không cần auth)

**Lưu ý:** Chỉ nhận `address` và `role`, không nhận arbitrary CIDs.

```bash
curl -X GET "http://localhost:3000/api/profile?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9&role=poster"
```

#### GET `/api/ipfs/dispute` (Protected - cần auth)

```bash
curl -X GET "http://localhost:3000/api/ipfs/dispute?disputeId=1&role=poster" \
  -b cookies.txt \
  -c cookies.txt

# Với reviewer
curl -X GET "http://localhost:3000/api/ipfs/dispute?disputeId=1&role=reviewer&side=poster" \
  -b cookies.txt \
  -c cookies.txt
```

#### POST `/api/ipfs/upload` (Protected - cần auth + CSRF)

**Lưu ý:** Endpoint này xử lý cả JSON metadata và file uploads.

```bash
# Upload JSON metadata
curl -X POST "http://localhost:3000/api/ipfs/upload" \
  -b cookies.txt \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "profile",
    "about": "My profile description"
  }'

# Upload file
curl -X POST "http://localhost:3000/api/ipfs/upload" \
  -b cookies.txt \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "type=milestone_evidence" \
  -F "jobId=1"
```

### Job APIs (Public - không cần auth)

#### GET `/api/job?list=true`

```bash
curl -X GET "http://localhost:3000/api/job?list=true"
```

#### GET `/api/job/[id]`

```bash
curl -X GET "http://localhost:3000/api/job/1"
```

### Role API (Protected - cần auth)

#### GET `/api/role?address=xxx`

```bash
curl -X GET "http://localhost:3000/api/role?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9" \
  -b cookies.txt \
  -c cookies.txt
```

### Reputation API (Protected - cần auth)

#### GET `/api/reputation?address=xxx`

```bash
curl -X GET "http://localhost:3000/api/reputation?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9" \
  -b cookies.txt \
  -c cookies.txt
```

### Dispute API (Protected - cần auth)

#### GET `/api/dispute?action=get_reviewers&dispute_id=1`

```bash
curl -X GET "http://localhost:3000/api/dispute?action=get_reviewers&dispute_id=1" \
  -b cookies.txt \
  -c cookies.txt
```

#### GET `/api/dispute?action=get_summary&dispute_id=1`

```bash
curl -X GET "http://localhost:3000/api/dispute?action=get_summary&dispute_id=1" \
  -b cookies.txt \
  -c cookies.txt
```

### Chat APIs (Protected - cần auth + CSRF cho POST/DELETE)

#### GET `/api/chat/messages?getRooms=true&userAddress=xxx`

```bash
curl -X GET "http://localhost:3000/api/chat/messages?getRooms=true&userAddress=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9" \
  -b cookies.txt \
  -c cookies.txt
```

#### GET `/api/chat/messages?roomId=xxx&userAddress=xxx`

```bash
curl -X GET "http://localhost:3000/api/chat/messages?roomId=room123&userAddress=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9" \
  -b cookies.txt \
  -c cookies.txt
```

#### POST `/api/chat/messages/post`

```bash
curl -X POST "http://localhost:3000/api/chat/messages/post" \
  -b cookies.txt \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sendMessage",
    "roomId": "room123",
    "text": "Hello world"
  }'
```

#### DELETE `/api/chat/messages/delete`

```bash
curl -X DELETE "http://localhost:3000/api/chat/messages/delete" \
  -b cookies.txt \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "msg123",
    "roomId": "room123"
  }'
```

## 4. Refresh Token Flow

### Tự động refresh khi access token hết hạn

Khi access token hết hạn (sau 1 giờ), bất kỳ request nào đến protected endpoint sẽ tự động:
1. Phát hiện access token hết hạn
2. Kiểm tra refresh token (còn hợp lệ trong 7 ngày)
3. Tạo bộ token mới (access + refresh + csrf)
4. Set lại cookies trong response
5. Tiếp tục xử lý request ban đầu

**Ví dụ:**

```bash
# Request này sẽ tự động refresh nếu access token hết hạn
curl -X GET "http://localhost:3000/api/auth/session" \
  -b cookies.txt \
  -c cookies.txt \
  -v
```

**Response headers sẽ có:**
```
Set-Cookie: auth_token=...; Max-Age=3600
Set-Cookie: refresh_token=...; Max-Age=604800
Set-Cookie: csrf_token=...; Max-Age=3600
```

### Test refresh token flow

```bash
# 1. Login để lấy cookies
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{ ... }'

# 2. Đợi 1 giờ (hoặc chỉnh ACCESS_TOKEN_MAX_AGE trong code để test)

# 3. Gọi API bất kỳ - sẽ tự động refresh
curl -X GET "http://localhost:3000/api/auth/session" \
  -b cookies.txt \
  -c cookies.txt \
  -v
```

## 5. Token Expiration

- **Access Token**: 1 giờ (3600 giây)
- **Refresh Token**: 7 ngày (604800 giây)
- **CSRF Token**: 1 giờ (3600 giây) - cùng với access token

**Lưu ý:** 
- Access token và CSRF token hết hạn cùng lúc
- Refresh token có thời gian dài hơn để đảm bảo user không phải login lại thường xuyên
- Khi refresh token hết hạn, user phải login lại

## 6. Quick Test Script

### Windows PowerShell

```powershell
# Login và lưu cookies
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"address":"0x...","signature":"...","publicKey":"...","fullMessage":"...","message":"...","nonce":"..."}' `
  -SessionVariable session

# Lấy CSRF token từ cookies
$csrfToken = $session.Cookies.GetCookies("http://localhost:3000")["csrf_token"].Value

# Gọi protected API
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/session" `
  -Method GET `
  -WebSession $session
```

### Linux/Mac (Bash)

```bash
#!/bin/bash

# Login và lưu cookies
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "address": "0x...",
    "signature": "...",
    "publicKey": "...",
    "fullMessage": "...",
    "message": "...",
    "nonce": "..."
  }'

# Lấy CSRF token từ cookies.txt
CSRF_TOKEN=$(grep csrf_token cookies.txt | awk '{print $NF}')

# Gọi protected API
curl -X GET "http://localhost:3000/api/auth/session" \
  -b cookies.txt \
  -c cookies.txt

# Gọi POST API với CSRF token
curl -X POST "http://localhost:3000/api/ipfs/upload" \
  -b cookies.txt \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"profile","about":"test"}'
```


## 8. Security Best Practices

1. **HttpOnly Cookies**: `auth_token` và `refresh_token` là HttpOnly, không thể đọc từ JavaScript → chống XSS
2. **CSRF Protection**: Tất cả non-GET requests cần `x-csrf-token` header → chống CSRF
3. **Secure Cookies**: Trong production, cookies được set với `Secure` flag → chỉ gửi qua HTTPS
4. **SameSite=Strict**: Cookies chỉ gửi trong same-site requests → chống CSRF
5. **Short-lived Access Token**: 1 giờ → giảm thiểu damage nếu bị lộ
6. **Long-lived Refresh Token**: 7 ngày → user experience tốt, không phải login thường xuyên
7. **Automatic Refresh**: Backend tự động refresh khi access token hết hạn → seamless experience
