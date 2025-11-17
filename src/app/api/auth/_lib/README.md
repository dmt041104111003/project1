# Authentication System - Wallet Signature Verification

Hệ thống đăng nhập với chữ ký điện tử theo flow từ bài viết Viblo, được adapt cho Next.js + Aptos (Petra Wallet).

## Tổng quan

Hệ thống này sử dụng **cryptographic signature verification** để xác thực người dùng thông qua ví Aptos (Petra Wallet), không cần mật khẩu truyền thống.

## Flow hoạt động

```
1. Client: Connect wallet → Get nonce từ server
2. Client: Sign message "Log in with {nonce}" bằng Petra wallet
3. Client: Gửi { fullMessage, signature, publicKey, nonce } lên server
4. Server: Verify signature với tweetnacl → Tạo JWT token
5. Client: Lưu JWT token → Dùng cho các request sau
```

## Setup

### 1. Environment Variables

Thêm vào `.env.local`:

```env
JWT_SECRET=your-secret-key-change-in-production
```

**Tạo JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Dependencies

Đã được cài đặt:
- `jsonwebtoken` - JWT token generation/verification
- `tweetnacl` - Ed25519 signature verification (theo Petra docs)
- `@aptos-labs/ts-sdk` - Aptos SDK

## Cấu trúc Files

```
src/lib/auth/
├── jwt.ts              # JWT token generation & verification
├── signature.ts        # Signature verification với tweetnacl
├── nonce-store.ts      # Nonce management (in-memory)
└── helpers.ts          # Helper functions cho route handlers

src/app/api/auth/
├── nonce/route.ts      # GET /api/auth/nonce - Lấy nonce
└── login/route.ts      # POST /api/auth/login - Verify & login

src/utils/
└── api.ts              # fetchWithAuth() helper để gọi API với JWT token
```

## API Endpoints

### Authentication Endpoints

#### GET `/api/auth/nonce?address=xxx`

Lấy nonce để sign message. **Public endpoint** (không cần authentication).

**Request:**
```
GET /api/auth/nonce?address=0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9
```

**Response:**
```json
{
  "nonce": "dkntg1f86h5ai69tfjifkmi2nua92",
  "message": "Log in with dkntg1f86h5ai69tfjifkmi2nua92"
}
```

#### POST `/api/auth/login`

Verify signature và trả về JWT token. **Public endpoint** (không cần authentication).

**Request:**
```json
{
  "address": "0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9",
  "signature": "0x1b79ed58fdc714e173fa...",
  "publicKey": "0xab3b71ae2b06ef587a...",
  "fullMessage": "APTOS\nnonce: dkntg1f86h5ai69tfjifkmi2nua92\nmessage: Log in with dkntg1f86h5ai69tfjifkmi2nua92",
  "message": "Log in with dkntg1f86h5ai69tfjifkmi2nua92",
  "nonce": "dkntg1f86h5ai69tfjifkmi2nua92"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "address": "0x99b2da3842c197120a79285ee93c9dcd345ba5efb87b69b7c1df9e514d9d18d9"
}
```

### Protected API Endpoints

Các endpoints sau **yêu cầu JWT authentication** (gửi `Authorization: Bearer <token>` trong header):

- **POST `/api/ipfs/upload`** - Upload metadata (job, profile, dispute, apply, finalize)
- **POST `/api/ipfs/upload-file`** - Upload files (milestone evidence, dispute evidence)
- **POST `/api/chat/messages/post`** - Chat operations (create room, send message, accept room, update room name, delete room)
- **DELETE `/api/chat/messages/delete`** - Delete chat messages

**Ví dụ gọi protected API:**

```typescript
import { fetchWithAuth } from '@/utils/api';

// Upload job metadata
const response = await fetchWithAuth('/api/ipfs/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'job',
    title: 'My Job Title',
    description: 'Job description',
    requirements: ['skill1', 'skill2']
  })
});

// Upload file
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'milestone_evidence');

const response = await fetchWithAuth('/api/ipfs/upload-file', {
  method: 'POST',
  body: formData
});
```

### Protected API Endpoints (GET)

Các endpoints GET sau **yêu cầu JWT authentication** và kiểm tra quyền truy cập:

- **GET `/api/chat/messages?roomId=xxx`** - Lấy messages (chỉ creator/participant của room mới xem được)
- **GET `/api/chat/messages?getRooms=true`** - Lấy danh sách rooms của user (tự động lấy từ JWT token)
- **GET `/api/dispute?action=xxx&dispute_id=xxx`** - Lấy thông tin dispute (reviewers, evidence, votes, summary, status)

### Protected API Endpoints (GET) - Query Table

Các endpoints GET sau **yêu cầu JWT authentication** để query dữ liệu từ blockchain:

- **GET `/api/role?address=xxx`** - Lấy roles của user từ blockchain table
- **GET `/api/reputation?address=xxx`** - Lấy reputation score từ blockchain table
- **GET `/api/ipfs/get?cid=xxx`** - Lấy metadata từ IPFS (profile, dispute, etc. - có thể decrypt CID)

### Public API Endpoints

Các endpoints sau **không cần authentication** (thông tin công khai):

- **GET `/api/job?list=true`** - Lấy danh sách jobs từ table
- **GET `/api/job?job_id=xxx`** - Lấy chi tiết job từ table
- **GET `/api/job/[id]`** - Lấy chi tiết job từ table (route params)
- **GET `/api/ipfs/job?cid=xxx`** - Lấy job metadata từ IPFS (public, không cần JWT)
- **GET `/api/ipfs/job?jobId=xxx`** - Lấy job metadata từ IPFS bằng jobId (public, không cần JWT)

## Sử dụng trong Code

### Client Side (React)

#### Cách 1: Sử dụng `fetchWithAuth()` (Khuyến nghị)

```typescript
import { fetchWithAuth } from '@/utils/api';
import { useWallet } from '@/contexts/WalletContext';

function MyComponent() {
  const { account, connectWallet } = useWallet();
  
  // Connect wallet (tự động sign message và lưu token)
  const handleLogin = async () => {
    await connectWallet();
  };
  
  // Gọi API với JWT token tự động
  const callProtectedAPI = async () => {
    if (!account) {
      // User chưa login
      return;
    }
    
    // fetchWithAuth tự động thêm JWT token vào header
    const response = await fetchWithAuth('/api/ipfs/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'profile',
        about: 'My profile description'
      })
    });
    
    const data = await response.json();
  };
}
```

#### Cách 2: Sử dụng `getAuthToken()` thủ công

```typescript
import { useWallet } from '@/contexts/WalletContext';

function MyComponent() {
  const { account, getAuthToken, connectWallet } = useWallet();
  
  const callProtectedAPI = async () => {
    const token = await getAuthToken();
    if (!token) {
      // User chưa login
      return;
    }
    
    const response = await fetch('/api/protected', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  };
}
```

### Server Side (API Routes)

#### Protected Route (cần authentication):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/auth/_lib/helpers';

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req, user) => {
    // user.address chứa address đã được verify
    // Your protected logic here
    
    return NextResponse.json({ 
      success: true,
      userAddress: user.address 
    });
  });
}
```

#### Public Route (không cần authentication):

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Không cần requireAuth, route tự động public
  return NextResponse.json({ data: 'public' });
}
```

## Bảo mật

### Các biện pháp bảo mật đã implement:

1. **Nonce Random** - Mỗi lần login có nonce mới, không thể đoán trước
2. **Nonce Expiration** - Nonce hết hạn sau 5 phút
3. **Replay Attack Protection** - Nonce bị xóa sau khi dùng (không thể dùng lại)
4. **Cryptographic Verification** - Verify signature với Ed25519 (tweetnacl)
5. **JWT Token** - Session token có expiration (7 ngày)
6. **Address Normalization** - Tất cả address được lowercase để tránh case-sensitivity issues
7. **Protected API Routes** - Các API routes quan trọng (upload, chat) yêu cầu JWT authentication
8. **Automatic Token Injection** - `fetchWithAuth()` tự động thêm JWT token vào header, giảm lỗi quên token

### Theo Petra Docs:

- Sử dụng `signMessage({ message, nonce })` với nonce trong payload
- Verify với `fullMessage` (format: `APTOS\nnonce: {nonce}\nmessage: {message}`)
- Dùng `tweetnacl.sign.detached.verify()` để verify signature
- Public key format đúng (32 bytes = 64 hex chars)

## Lưu ý

### Development vs Production

**Hiện tại (Development):**
- Nonce store: In-memory Map (dùng `global.__nonceStore`)
- JWT secret: Có thể hardcode trong dev

**Production nên:**
- Nonce store: Dùng Redis hoặc Database (có thể share giữa nhiều instances)
- JWT secret: Phải set trong environment variables
- Rate limiting: Thêm rate limiting cho `/api/auth/nonce` và `/api/auth/login`

### Nonce Store

Hiện tại dùng in-memory Map với global variable để share state giữa route handlers. Trong production với multiple instances, nên dùng Redis hoặc Database.

## Troubleshooting

### Lỗi "Invalid signature"

1. Kiểm tra `fullMessage` có đúng format không
2. Kiểm tra signature và publicKey có đúng format hex không
3. Xem console log để debug

### Lỗi "Invalid or expired nonce"

1. Nonce có thể đã hết hạn (5 phút)
2. Nonce store không được share (check global variable)
3. Address có thể không match (check lowercase)

### Lỗi "Unauthorized" (401) khi gọi protected API

1. Kiểm tra user đã login chưa (có JWT token trong localStorage)
2. Kiểm tra token có hết hạn chưa (JWT token hết hạn sau 7 ngày)
3. Đảm bảo sử dụng `fetchWithAuth()` hoặc thêm `Authorization: Bearer <token>` vào header
4. Nếu token hết hạn, cần connect wallet lại để lấy token mới

### Lỗi khi upload file

1. Đảm bảo sử dụng `fetchWithAuth()` khi gọi `/api/ipfs/upload-file`
2. Kiểm tra FormData có đúng format không
3. Kiểm tra file size có quá lớn không

## Tham khảo

- [Petra Wallet Docs - Signing Messages](https://petra.app/docs/signing-messages)
- [Viblo Article - Xây dựng hệ thống đăng nhập với chữ ký điện tử](https://viblo.asia/p/xay-dung-he-thong-dang-nhap-cho-cac-ung-dung-voi-chu-ki-dien-tu-1VgZvQKR5Aw)
- [tweetnacl Documentation](https://github.com/dchest/tweetnacl-js)

