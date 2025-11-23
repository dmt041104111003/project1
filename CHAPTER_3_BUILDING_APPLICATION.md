# CHƯƠNG 3: XÂY DỰNG ỨNG DỤNG

## 1. KIẾN TRÚC HỆ THỐNG

### 1.1. Kiến trúc kỹ thuật

**Mô hình: Client-Side Architecture với Next.js App Router (MVC-like)**

Ứng dụng sử dụng kiến trúc **Client-Side Rendering (CSR)** kết hợp **Server-Side API Routes**, tương tự mô hình MVC:

- **Model**: 
  - Smart contracts trên Aptos blockchain (`contracts/job/sources/`)
  - IPFS storage cho metadata (job descriptions, profiles, evidence)
  - Firebase Realtime Database cho chat messages
  
- **View**: 
  - React components trong `src/components/`
  - Next.js pages trong `src/app/`
  - UI components với Tailwind CSS

- **Controller**: 
  - API routes trong `src/app/api/`
  - Custom hooks trong `src/hooks/`
  - Context providers (`WalletContext`, `RolesContext`, `ChatContext`)
  - Business logic trong `src/lib/` và `src/utils/`

**Kiến trúc Peer-to-Peer (User-to-User)**:
- Người dùng tương tác trực tiếp với blockchain (không qua server trung gian)
- Wallet-to-wallet communication qua Aptos blockchain
- Chat trực tiếp giữa Poster và Freelancer (Firebase Realtime)
- Escrow smart contract quản lý thanh toán peer-to-peer

### 1.2. Cấu trúc thư mục

```
src/
├── app/                    # Next.js App Router (Pages & API Routes)
│   ├── api/                # Backend API endpoints
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Dashboard page
│   ├── jobs/               # Job listing & detail pages
│   └── chat/               # Chat page
├── components/              # React UI Components (View layer)
│   ├── auth/               # Authentication components
│   ├── dashboard/          # Dashboard components
│   ├── jobs/               # Job-related components
│   └── ui/                 # Reusable UI components
├── contexts/               # React Context (State management)
├── hooks/                  # Custom React hooks (Controller logic)
├── lib/                    # Core libraries (Aptos client, events)
└── utils/                  # Utility functions
```

---

## 2. DEPLOYMENT

### 2.1. Chuẩn bị Host và Domain

**Hosting Platform:**
- **Vercel**: Platform chính để deploy Next.js application
- **Domain**: `web3.technova.id.vn`
- **Type**: Serverless hosting với auto-scaling

**Domain Configuration:**
- Domain: `web3.technova.id.vn`
- DNS: Cấu hình CNAME record trỏ đến Vercel
- SSL/TLS: Tự động được cấp bởi Vercel (HTTPS)

**Vercel Setup:**
1. Kết nối GitHub repository với Vercel
2. Cấu hình domain: Thêm `web3.technova.id.vn` vào project settings
3. Environment variables: Thêm các biến môi trường cần thiết
4. Build settings: Tự động detect Next.js, sử dụng `npm run build`

### 2.2. Công cụ và Dịch vụ sử dụng

**Frontend Deployment:**
- **Platform**: Vercel
- **Framework**: Next.js 15.5.0
- **Build command**: `npm run build`
- **Output directory**: `.next` (tự động)
- **Node version**: 20.x (Vercel tự động detect)

**Backend Services:**

1. **Next.js API Routes** (Serverless Functions trên Vercel):
   - Tự động deploy cùng với frontend
   - Endpoints: `/api/*`
   - Runtime: Node.js 20.x
   - Timeout: 10s (Hobby plan) hoặc 60s (Pro plan)

2. **Flask API** (Python - Face Verification & OCR):
   - **Hosting**: Có thể deploy trên:
     - Railway.app
     - Render.com
     - DigitalOcean App Platform
     - AWS EC2 / ECS
   - **Port**: 5000
   - **Environment**: Python 3.10+
   - **CORS**: Cho phép requests từ `web3.technova.id.vn`

3. **Firebase Realtime Database**:
   - Cloud service, không cần deploy riêng
   - Sử dụng cho chat messages
   - Configuration qua `FIREBASE_CONFIG` environment variable

4. **IPFS/Pinata**:
   - Cloud service, không cần deploy riêng
   - Gateway: `https://gateway.pinata.cloud/ipfs`
   - API key qua environment variable

**Blockchain:**
- **Aptos Testnet/Mainnet**: Public blockchain, không cần deploy
- **Smart Contracts**: Deploy bằng `aptos move publish`
- **Contract Address**: `0x55491d4abd9f4b3c0aa4d09b469ba7f2482523065e116846ef7701ea59bfb842`

### 2.3. Environment Variables

**Vercel Environment Variables** (Project Settings → Environment Variables):

```env
# Aptos Configuration
NEXT_PUBLIC_APTOS_NODE_URL=https://api.testnet.aptoslabs.com
NEXT_PUBLIC_APTOS_API_KEY=your_api_key
NEXT_PUBLIC_CONTRACT_ADDRESS=0x55491d4abd9f4b3c0aa4d09b469ba7f2482523065e116846ef7701ea59bfb842

# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Face Verification API
NEXT_PUBLIC_FACE_API_BASE_URL=https://your-face-api-domain.com
# Hoặc nếu deploy trên cùng domain: https://api.web3.technova.id.vn

# Encryption
ENCRYPTION_KEY=your_encryption_key_for_ipfs_cid
```

**Flask API Environment Variables** (nếu deploy riêng):
```env
FLASK_ENV=production
FLASK_DEBUG=False
CORS_ORIGINS=https://web3.technova.id.vn
```

### 2.4. Quy trình Deploy

**Bước 1: Deploy Smart Contracts (Aptos)**
```bash
cd contracts/job
aptos move publish --named-addresses job_work_board=0x55491d4abd9f4b3c0aa4d09b469ba7f2482523065e116846ef7701ea59bfb842
```

**Bước 2: Deploy Flask API (Face Verification)**
- Deploy lên Railway/Render/DigitalOcean
- Cấu hình CORS để cho phép requests từ `web3.technova.id.vn`
- Lấy URL và thêm vào `NEXT_PUBLIC_FACE_API_BASE_URL`

**Bước 3: Deploy Next.js Application (Vercel)**
1. **Connect GitHub Repository**:
   - Vào Vercel Dashboard
   - Click "Add New Project"
   - Import GitHub repository
   - Chọn branch `main` hoặc `master`

2. **Configure Project**:
   - Framework Preset: Next.js (tự động detect)
   - Root Directory: `./` (root của repo)
   - Build Command: `npm run build` (mặc định)
   - Output Directory: `.next` (mặc định)
   - Install Command: `npm install` (mặc định)

3. **Add Environment Variables**:
   - Vào Project Settings → Environment Variables
   - Thêm tất cả các biến môi trường cần thiết
   - Chọn environment: Production, Preview, Development

4. **Configure Domain**:
   - Vào Project Settings → Domains
   - Add domain: `web3.technova.id.vn`
   - Vercel sẽ cung cấp DNS records để cấu hình
   - Cấu hình DNS tại domain provider:
     - Type: CNAME
     - Name: web3 (hoặc @)
     - Value: cname.vercel-dns.com

5. **Deploy**:
   - Vercel tự động deploy khi push code lên GitHub
   - Hoặc click "Deploy" trong Vercel Dashboard
   - Chờ build và deploy hoàn tất (thường 2-5 phút)

6. **Verify Deployment**:
   - Truy cập `https://web3.technova.id.vn`
   - Kiểm tra các API endpoints hoạt động
   - Test face verification và các chức năng chính

### 2.5. Máy chủ và Máy trạm

**Máy chủ (Server):**
- **Vercel Serverless Functions**: 
  - Không cần quản lý server
  - Auto-scaling theo traffic
  - Edge network cho performance tốt
- **Flask API Server** (nếu deploy riêng):
  - Cần server với Python 3.10+
  - RAM tối thiểu: 2GB (cho models)
  - CPU: 2 cores trở lên
  - Storage: 10GB+ (cho models và temp files)

**Máy trạm (Workstation/Development):**
- **Development Environment**:
  - Node.js 20.x
  - npm hoặc yarn
  - Git
  - Code editor (VS Code)
- **Local Testing**:
  - Chạy Next.js dev server: `npm run dev`
  - Chạy Flask API: `python Face/Code/main.py`
  - Test trên `localhost:3000` và `localhost:5000`

**Production vs Development:**
- **Production**: Deploy trên Vercel với domain `web3.technova.id.vn`
- **Development**: Chạy local với `localhost:3000`
- **Staging**: Có thể tạo preview deployment trên Vercel (tự động cho mỗi PR)

### 2.6. Đẩy lên chợ (Marketplace/App Store)

**Web Application:**
- Không cần đẩy lên app store (web app)
- Chỉ cần deploy lên Vercel và cấu hình domain
- User truy cập qua browser: `https://web3.technova.id.vn`

**Nếu muốn tạo Mobile App:**
- Có thể wrap web app bằng React Native hoặc PWA
- Deploy lên:
  - **Google Play Store**: Android app
  - **Apple App Store**: iOS app
- Hiện tại: Chỉ deploy web application

### 2.7. Monitoring và Maintenance

**Vercel Analytics:**
- Xem traffic, performance metrics
- Error tracking
- Real-time logs

**Health Checks:**
- `/api/health` endpoints cho các services
- Monitor Flask API: `GET /health`
- Monitor Vercel deployment status

**Backup:**
- Code: GitHub repository (tự động backup)
- Database: Firebase có auto backup
- IPFS: Pinata có redundancy
- Blockchain: Aptos blockchain là immutable và distributed

---

## 3. CÁC GIAO DIỆN CHÍNH (4-5 INTERFACES)

### 3.1. Interface 1: Landing Page (Trang chủ) - Guest Access

**File**: `src/app/page.tsx`, `src/components/landing/`

**Mục đích**: 
- Giới thiệu nền tảng freelancer phi tập trung
- Thu hút người dùng mới đăng ký
- Hiển thị thông tin về cách hoạt động

**Quyền truy cập**: 
- **Guest** (không cần đăng nhập)
- Tất cả người dùng

**Luồng hoạt động**:
1. User truy cập trang chủ
2. Xem thông tin về nền tảng
3. Click "Kết nối ví" → Chuyển đến wallet connection
4. Sau khi kết nối ví → Có thể xem jobs hoặc đăng ký role

**Đặc biệt**:
- Responsive design với Windows Classic Theme
- Hero section với CTA buttons
- FAQ section giải thích cách sử dụng
- Trust numbers (số liệu thống kê)

---

### 3.2. Interface 2: Authentication & Role Registration (Đăng ký vai trò) - Guest → User

**File**: `src/app/auth/did-verification/page.tsx`, `src/components/auth/DIDVerification.tsx`

**Mục đích**: 
- Xác minh danh tính bằng sinh trắc học (biometrics)
- Đăng ký vai trò (Poster/Freelancer/Reviewer)
- Tạo ZK Proof để đảm bảo 1 người = 1 ví

**Quyền truy cập**: 
- **Guest** (chưa có role) → **User** (đã có role)
- Yêu cầu: Đã kết nối ví Petra

**Luồng hoạt động**:
1. **Bước 1: Upload CCCD**
   - User upload ảnh CCCD/CMND
   - Backend OCR để đọc thông tin (số CCCD, họ tên, ngày sinh)
   - Hiển thị preview thông tin đã đọc

2. **Bước 2: Face Verification (Sinh trắc học)**
   - User cho phép truy cập webcam
   - Chụp ảnh khuôn mặt
   - Backend so sánh với ảnh trên CCCD bằng DeepFace
   - Kiểm tra anti-spoofing (chống giả mạo)
   - Kết quả: `verified: true/false`, `similarity: 0-100%`, `is_real: true/false`

3. **Bước 3: Tạo ZK Proof**
   - Backend tạo Zero-Knowledge Proof chứng minh "CCCD này thuộc về ví này"
   - Lưu proof lên blockchain (không lưu CCCD gốc)
   - Kiểm tra duplicate (1 CCCD chỉ được dùng 1 lần)

4. **Bước 4: Đăng ký Role**
   - User chọn role: Poster, Freelancer, hoặc Reviewer
   - Upload profile CID (IPFS) nếu có
   - Gọi smart contract `register_role`
   - Hoàn tất đăng ký

**Đặc biệt**:
- **Sinh trắc học (Biometrics)**: 
  - Face matching với DeepFace
  - Anti-spoofing detection (chống ảnh giả, video giả)
  - Real-time webcam verification
- **Zero-Knowledge Proof (ZK Proof)**: 
  - Circuit kiểm tra tuổi và hết hạn CCCD (`zkp/circuit.circom`)
  - Groth16 proof generation với `snarkjs`
  - Public signals (identity_hash, name_hash) được dùng để check duplicate
  - Proof được lưu on-chain, không lộ thông tin CCCD gốc
  - Ngăn chặn 1 CCCD dùng nhiều ví (duplicate prevention)
- **Blockchain verification**: Proof được lưu on-chain, không thể giả mạo

**Công nghệ sử dụng**:
- **OCR**: RapidOCR để đọc CCCD
- **Face Verification**: DeepFace + Silent-Face-Anti-Spoofing
- **ZK Proof**: Circom + snarkjs
- **Blockchain**: Aptos Move smart contracts

---

### 3.3. Interface 3: Dashboard (Quản lý dự án) - Poster/Freelancer Access

**File**: `src/app/dashboard/page.tsx`, `src/components/dashboard/`

**Mục đích**: 
- Quản lý jobs đã đăng (Poster)
- Xem jobs đã ứng tuyển (Freelancer)
- Theo dõi milestones và thanh toán

**Quyền truy cập**: 
- **Poster**: Xem tab "Công việc Đã Đăng"
- **Freelancer**: Xem tab "Công việc Đã Ứng tuyển"
- Yêu cầu: Đã kết nối ví và có role tương ứng

**Luồng hoạt động**:

**Cho Poster:**
1. Xem danh sách jobs đã đăng
2. Xem trạng thái: Posted, PendingApproval, InProgress, Completed, Cancelled
3. **Duyệt/Từ chối ứng viên**:
   - Khi có ứng viên apply → Hiển thị nút "Phê duyệt ứng viên" và "Từ chối & hoàn tiền"
   - Click duyệt → Gọi contract `review_candidate(true)`
   - Click từ chối → Gọi contract `review_candidate(false)` → Hoàn stake và phí cho ứng viên
4. Quản lý milestones: Xem tiến độ, approve/reject submissions
5. Xử lý tranh chấp nếu có

**Cho Freelancer:**
1. Xem danh sách jobs đã apply
2. **Rút ứng tuyển** (khi đang chờ duyệt):
   - Nếu job ở trạng thái PendingApproval
   - Click "Rút ứng tuyển (Không mất stake và phí)"
   - Gọi contract `withdraw_application`
3. Submit milestones khi hoàn thành
4. Xem thanh toán và trạng thái milestones

**Đặc biệt**:
- **Real-time updates**: Tự động refresh sau khi có transaction
- **Role-based UI**: Hiển thị khác nhau cho Poster vs Freelancer
- **Cache management**: Clear cache sau mỗi transaction để đảm bảo data mới nhất
- **Transaction tracking**: Hiển thị TX hash sau mỗi giao dịch

---

### 3.4. Interface 4: Job Detail (Chi tiết công việc) - All Users

**File**: `src/app/jobs/[id]/page.tsx`, `src/components/jobs/JobDetailContent.tsx`

**Mục đích**: 
- Hiển thị chi tiết job (mô tả, milestones, trạng thái)
- Ứng tuyển job (Freelancer)
- Quản lý milestones (Poster/Freelancer)

**Quyền truy cập**: 
- **Guest**: Chỉ xem (read-only)
- **Freelancer**: Xem + Apply job
- **Poster**: Xem + Duyệt ứng viên + Quản lý milestones

**Luồng hoạt động**:

1. **Guest/Freelancer xem job**:
   - Xem mô tả job (từ IPFS)
   - Xem milestones và số tiền
   - Xem poster address
   - Nếu là Freelancer → Có nút "Ứng tuyển"

2. **Freelancer apply job**:
   - Click "Ứng tuyển"
   - Gọi contract `apply_job` với stake và phí
   - Job chuyển sang trạng thái PendingApproval
   - Poster nhận thông báo có ứng viên

3. **Poster duyệt ứng viên**:
   - Xem thông tin ứng viên đang chờ
   - Click "Phê duyệt ứng viên" → Job chuyển sang InProgress
   - Click "Từ chối & hoàn tiền" → Hoàn stake và phí cho ứng viên

4. **Quản lý milestones**:
   - Freelancer submit milestone với evidence (IPFS CID)
   - Poster review và approve/reject
   - Tự động giải ngân khi approve

**Đặc biệt**:
- **IPFS integration**: Job metadata được lưu trên IPFS, chỉ CID trên blockchain
- **Milestone tracking**: Real-time cập nhật trạng thái milestones
- **Escrow protection**: Tiền được giữ trong smart contract, chỉ giải ngân khi approve
- **Dispute handling**: Có thể mở dispute nếu có tranh chấp

---

### 3.5. Interface 5: Chat (Tin nhắn) - Poster/Freelancer Access

**File**: `src/app/chat/page.tsx`, `src/components/chat/`

**Mục đích**: 
- Chat trực tiếp giữa Poster và Freelancer
- Bảo vệ bằng ZK Proof (chỉ người đã verify mới chat được)

**Quyền truy cập**: 
- **Poster**: Chat với Freelancer của jobs mình đã đăng
- **Freelancer**: Chat với Poster của jobs mình đã apply
- Yêu cầu: Cả 2 bên phải có ZK Proof (đã verify CCCD)

**Luồng hoạt động**:

1. **Tạo phòng chat**:
   - User chọn job từ dropdown
   - Hệ thống kiểm tra:
     - User có ZK Proof chưa?
     - Đối phương có ZK Proof chưa?
     - User có quyền chat (Poster hoặc Freelancer của job đó)?
   - Nếu đủ điều kiện → Tạo phòng chat trên Firebase

2. **Gửi tin nhắn**:
   - Real-time messaging qua Firebase Realtime Database
   - Hiển thị timestamp và sender address
   - Auto-scroll khi có tin nhắn mới

3. **Xóa phòng/tin nhắn**:
   - Chỉ người tạo phòng mới xóa được
   - Xóa trên Firebase và cập nhật UI

**Đặc biệt**:
- **Proof-gated chat**: Chỉ người đã verify CCCD mới chat được (chống spam, bot)
- **Real-time**: Firebase Realtime Database cho instant messaging
- **Privacy**: Chỉ Poster và Freelancer của cùng 1 job mới chat được
- **Decentralized identity**: Sử dụng wallet address làm identity, không cần email/phone

---

## 4. ZERO-KNOWLEDGE PROOF (ZK PROOF) - CHI TIẾT KỸ THUẬT

### 4.1. Tổng quan về ZK Proof trong hệ thống

Hệ thống sử dụng **Groth16 Zero-Knowledge Proof** để xác minh thông tin CCCD mà không tiết lộ dữ liệu thực tế. ZK Proof đảm bảo:
- **Privacy**: Không lộ thông tin CCCD gốc trên blockchain
- **Verification**: Chứng minh CCCD hợp lệ (đủ tuổi, chưa hết hạn)
- **Duplicate Prevention**: Ngăn chặn 1 CCCD được dùng bởi nhiều ví

### 4.2. Circuit Definition

**File**: `zkp/circuit.circom`

Circuit sử dụng **Circom 2.0** để định nghĩa các ràng buộc (constraints) cho việc xác minh CCCD.

**Template**: `CCCDAgeExpiryCheck()`

**Inputs (Private Signals)**:
- `dob`: Ngày sinh dạng YYYYMMDD (ví dụ: 20000101)
- `expiry`: Ngày hết hạn CCCD dạng YYYYMMDD (ví dụ: 20300101)
- `id_hash`: Hash của số CCCD (simple hash function)
- `name_hash`: Hash của họ tên
- `today`: Ngày hiện tại dạng YYYYMMDD
- `min_age`: Tuổi tối thiểu (18)

**Outputs (Public Signals)**:
- `valid`: Boolean - CCCD hợp lệ (đủ tuổi + chưa hết hạn)
- `identity_hash_out`: Hash số CCCD (public signal - dùng để check duplicate)
- `name_hash_out`: Hash họ tên (public signal)

**Circuit Logic (Chi tiết)**:

```circom
// Bước 1: Tính tuổi từ ngày sinh
age_raw = today - dob

// Bước 2: Scale min_age để so sánh với YYYYMMDD format
// Ví dụ: min_age = 18 → min_age_scaled = 180000
min_age_scaled = min_age * 10000

// Bước 3: Kiểm tra đủ tuổi (sử dụng GreaterEqThan comparator từ circomlib)
component cmp_age = GreaterEqThan(32);
cmp_age.in[0] <== age_raw;
cmp_age.in[1] <== min_age_scaled;
is_old_enough <== cmp_age.out;

// Bước 4: Kiểm tra hết hạn
component cmp_expiry = GreaterEqThan(32);
cmp_expiry.in[0] <== expiry;
cmp_expiry.in[1] <== today;
is_valid_expiry <== cmp_expiry.out;

// Bước 5: Kết quả hợp lệ (cả 2 điều kiện đều phải đúng)
valid <== is_old_enough * is_valid_expiry;

// Bước 6: Output public signals (dùng để check duplicate)
identity_hash_out <== id_hash;
name_hash_out <== name_hash;
```

**Ví dụ Input** (`zkp/input.json`):
```json
{
  "dob": 20000101,      // 1/1/2000
  "expiry": 20300101,   // 1/1/2030
  "id_hash": 12345,     // Hash của số CCCD
  "name_hash": 67890,   // Hash của họ tên
  "today": 20250201,    // 1/2/2025
  "min_age": 18
}
```

**Kết quả**:
- `age_raw = 20250201 - 20000101 = 250100` (25 tuổi)
- `min_age_scaled = 18 * 10000 = 180000`
- `is_old_enough = true` (250100 >= 180000)
- `is_valid_expiry = true` (20300101 >= 20250201)
- `valid = true * true = true` ✅
- `identity_hash_out = 12345`
- `name_hash_out = 67890`

### 4.3. Proof Generation Process (Chi tiết)

**File**: `src/app/api/zk/generate-proof/route.ts`  
**Utils**: `src/app/api/zk/generate-proof/zkProofUtils.ts`

**Quy trình 5 bước chi tiết**:

#### Bước 1: Parse Input Data

**Function**: `prepareInputData(cccdData: CCCDData)`

**Input từ Frontend**:
```typescript
{
  id_number: "001234567890",
  name: "Nguyễn Văn A",
  date_of_birth: "2000-01-01",
  date_of_expiry: "2030-01-01",
  gender: "Nam",
  nationality: "Việt Nam",
  face_verified: true
}
```

**Xử lý**:
1. **Parse Date**: `parseDateToYYYYMMDD(dateStr)`
   - Hỗ trợ format: `YYYY-MM-DD`, `DD/MM/YYYY`, `YYYYMMDD`
   - Convert: `"2000-01-01"` → `20000101`

2. **Hash thông tin**:
   - `id_hash = simpleHash(id_number)`: Hash số CCCD
   - `name_hash = simpleHash(name)`: Hash họ tên
   - Hash function: Simple hash (left shift + XOR)

3. **Tính ngày hiện tại**: `getTodayYYYYMMDD()`
   - Format: `YYYYMMDD` (ví dụ: `20250201`)

**Output**:
```typescript
{
  dob: 20000101,
  expiry: 20300101,
  id_hash: 12345,
  name_hash: 67890,
  today: 20250201,
  min_age: 18
}
```

#### Bước 2: Generate Witness

**Command**: 
```bash
node circuit_js/generate_witness.js circuit.wasm input.json witness.wtns
```

**Process**:
1. Load WASM file (`circuit.wasm`) - compiled circuit
2. Load input data từ `input.json`
3. Tính toán tất cả intermediate values:
   - `age_raw = today - dob`
   - `min_age_scaled = min_age * 10000`
   - `is_old_enough = (age_raw >= min_age_scaled) ? 1 : 0`
   - `is_valid_expiry = (expiry >= today) ? 1 : 0`
   - `valid = is_old_enough * is_valid_expiry`
4. Output: `witness.wtns` (witness file)

#### Bước 3: Generate Proof (Groth16)

**Command**:
```bash
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json
```

**Process**:
1. Load trusted setup key (`circuit_final.zkey`)
2. Load witness file (`witness.wtns`)
3. Generate Groth16 proof:
   - `pi_a`: Point A (elliptic curve point)
   - `pi_b`: Point B (elliptic curve point)
   - `pi_c`: Point C (elliptic curve point)
4. Generate public signals (deterministic):
   - `[valid, identity_hash_out, name_hash_out]`

**Output Files**:
- `proof.json`: Proof (random mỗi lần) - **KHÔNG dùng để check duplicate**
- `public.json`: Public signals (deterministic) - **Dùng để check duplicate**

**Lưu ý quan trọng**:
- Proof mỗi lần tạo **KHÁC NHAU** (do randomness trong Groth16)
- Public signals **GIỐNG NHAU** nếu cùng input → Dùng để check duplicate

#### Bước 4: Check Duplicate

**Function**: `checkDuplicateProof()`

**Process**:
1. Query blockchain table `identity_hashes`:
   ```typescript
   queryTableItem({
     handle: identityHashesHandle,
     keyType: 'u64',
     valueType: 'address',
     key: inputData.id_hash  // Hash số CCCD
   })
   ```

2. **Nếu tìm thấy address**:
   - So sánh với address hiện tại
   - Nếu khác → Return error 409: "CCCD đã được dùng bởi address khác"
   - Nếu giống → Cho phép tiếp tục (user đang tạo lại proof)

3. **Nếu không tìm thấy**:
   - CCCD chưa được dùng → Cho phép tiếp tục

**Error Response** (409 Conflict):
```json
{
  "error": "Thông tin CCCD này đã được xác minh bởi địa chỉ khác (0xABC...)",
  "existing_address": "0xabc...",
  "requires_reauth": true
}
```

#### Bước 5: Return Proof

**Response**:
```json
{
  "success": true,
  "proof": {
    "pi_a": ["0x...", "0x..."],
    "pi_b": [["0x...", "0x..."], ["0x...", "0x..."]],
    "pi_c": ["0x...", "0x..."]
  },
  "public_signals": {
    "signals": ["1", "12345", "67890"],
    "identity_hash": 12345,
    "name_hash": 67890,
    "owner": "0x..."
  },
  "raw_public_signals": ["1", "12345", "67890"],
  "solidity_calldata": {
    "a": ["0x...", "0x..."],
    "b": [["0x...", "0x..."], ["0x...", "0x..."]],
    "c": ["0x...", "0x..."],
    "publicSignals": ["1", "12345", "67890"]
  },
  "identity_hash": 12345
}
```

**Frontend sử dụng**:
1. Lưu proof lên blockchain: `store_proof(proof, public_signals)`
2. Sau đó có thể đăng ký role: `register_role(role_kind, cid_opt)`

### 4.4. Duplicate Prevention (Chi tiết)

**Vấn đề**: Ngăn chặn 1 CCCD được dùng bởi nhiều ví (1 người dùng nhiều tài khoản)

**Cơ chế**:

#### 1. Public Signals vs Proof

**Public Signals** (Deterministic):
- Cùng CCCD → Cùng public signals
- Format: `[valid, identity_hash, name_hash]`
- Ví dụ: CCCD "001234567890" → `["1", "12345", "67890"]`
- **Dùng làm key** để check duplicate

**Proof** (Random):
- Mỗi lần tạo **KHÁC NHAU** (do randomness trong Groth16)
- Không thể dùng để check duplicate
- Đảm bảo zero-knowledge property

#### 2. Smart Contract Structure

**File**: `contracts/job/sources/role.move`

```move
struct RoleStore has key {
    proofs: Table<address, CCCDProof>,              // address -> proof
    identity_hashes: Table<u64, address>,           // id_hash -> address
    // ...
}

struct CCCDProof has store, copy, drop {
    proof: vector<u8>,           // Groth16 proof (random)
    public_signals: vector<u8>,  // Public signals (deterministic)
    timestamp: u64,
}
```

#### 3. Duplicate Check Flow

**Backend Check** (trước khi tạo proof):
```typescript
// Query identity_hashes table với id_hash
const matchedAddress = await queryTableItem({
  handle: identityHashesHandle,
  keyType: 'u64',
  valueType: 'address',
  key: inputData.id_hash  // Hash số CCCD
});

if (matchedAddress && matchedAddress !== currentAddress) {
  return error 409; // CCCD đã được dùng
}
```

**Smart Contract Check** (khi store proof):
```move
public entry fun store_proof(
    s: &signer,
    proof: vector<u8>,
    public_signals: vector<u8>
) {
    let addr = signer::address_of(s);
    
    // Check 1: Address chưa có proof?
    assert!(!table::contains(&store.proofs, addr), 3);
    
    // Check 2: CCCD (id_hash) chưa được dùng?
    let id_hash = extract_id_hash(public_signals);
    assert!(!table::contains(&store.identity_hashes, id_hash), 4);
    
    // Store proof
    table::add(&store.proofs, addr, CCCDProof { ... });
    table::add(&store.identity_hashes, id_hash, addr);
}
```

**Ràng buộc**:
1. **Mỗi address chỉ có thể store 1 proof**: Error code 3
2. **Mỗi CCCD chỉ có thể được dùng bởi 1 address**: Error code 4

#### 4. Ví dụ thực tế

**Scenario 1: User A tạo proof lần đầu**
```
User A: CCCD "001234567890"
→ id_hash = 12345
→ Check duplicate: Không tìm thấy
→ Store proof: OK
→ identity_hashes[12345] = 0xAAA
```

**Scenario 2: User B cố dùng CCCD của User A**
```
User B: CCCD "001234567890" (cùng CCCD)
→ id_hash = 12345 (giống User A)
→ Check duplicate: Tìm thấy 0xAAA
→ Backend return error 409: "CCCD đã được dùng bởi 0xAAA"
→ Không cho phép tạo proof
```

**Scenario 3: User A tạo proof lại (cùng CCCD)**
```
User A: CCCD "001234567890" (lần 2)
→ id_hash = 12345
→ Check duplicate: Tìm thấy 0xAAA (chính mình)
→ So sánh: 0xAAA === 0xAAA → Cho phép tiếp tục
→ Có thể tạo proof mới (proof sẽ khác lần 1, nhưng public_signals giống)
```

### 4.5. Files và Dependencies

**ZK Proof Directory Structure** (`zkp/`):

```
zkp/
├── circuit.circom              # Circuit definition (source)
├── circuit.r1cs                # Compiled circuit (R1CS format)
├── circuit.sym                 # Symbol file
├── circuit_final.zkey          # Trusted setup key (Groth16)
├── circuit_0000.zkey           # Intermediate zkey files
├── circuit_0001.zkey
├── pot_final.ptau              # Powers of Tau (trusted setup ceremony)
├── circuit_js/                 # Compiled JavaScript
│   ├── circuit.wasm            # WebAssembly file
│   ├── generate_witness.js     # Witness generation script
│   └── ...
├── artifacts/                  # Build artifacts
├── cache/                      # Compilation cache
├── contracts/                  # Smart contract verifiers
├── scripts/                    # Deployment scripts
│   ├── deploy.js               # Deploy verifier contract
│   └── testVerify.js           # Test verification
├── input.json                  # Sample input
├── input_underage.json         # Test case: underage
├── input_expired.json          # Test case: expired
├── witness.wtns                # Generated witness
├── proof.json                  # Generated proof
├── public.json                 # Public signals
├── package.json                # Dependencies
└── hardhat.config.js           # Hardhat config
```

**Dependencies** (`zkp/package.json`):
- `circomlib@^2.0.5`: Circom standard library (comparators, hashing)
- `snarkjs@^0.7.5`: Groth16 proof generation và verification
- `hardhat@^2.27.0`: Development environment
- `@nomicfoundation/hardhat-toolbox`: Hardhat plugins

**API Endpoints**:

1. **POST `/api/zk/generate-proof`**:
   - **Input**: CCCD data (id_number, name, date_of_birth, date_of_expiry, face_verified)
   - **Process**: Parse → Generate witness → Generate proof → Check duplicate
   - **Output**: Proof, public_signals, solidity_calldata
   - **Error**: 409 nếu CCCD đã được dùng

2. **POST `/api/zk/verify`**:
   - **Input**: Proof và public_signals
   - **Process**: Verify proof bằng snarkjs
   - **Output**: Verification result (valid/invalid)

**Trusted Setup**:
- **Powers of Tau** (`pot_final.ptau`): 1.2MB file từ trusted setup ceremony
- **Circuit Key** (`circuit_final.zkey`): 44KB file, được tạo từ Powers of Tau
- **Security**: Trusted setup đảm bảo tính bảo mật của proof system

---

## 5. FACE VERIFICATION SYSTEM - CHI TIẾT KỸ THUẬT

### 5.1. Tổng quan

Hệ thống Face Verification sử dụng **AI/ML** để xác minh danh tính người dùng bằng cách so khớp khuôn mặt từ webcam với ảnh trên CCCD. Hệ thống bao gồm:
- **OCR**: Đọc thông tin từ CCCD
- **Face Embedding**: Extract đặc trưng khuôn mặt
- **Face Matching**: So khớp khuôn mặt
- **Anti-Spoofing**: Phát hiện ảnh giả, video, mask

### 5.2. Kiến trúc

**Backend**: Flask API (Python) - `Face/Code/main.py`  
**Frontend**: Next.js API Routes (Proxy) - `src/app/api/face/`  
**Models**: Pre-trained models trong `Face/resources/`

**Luồng dữ liệu**:
```
Frontend (React)
    ↓
Next.js API Routes (/api/face/*)
    ↓
Flask API (Python) - localhost:5000
    ↓
AI Models (DeepFace, MiniFASNet, RapidOCR)
    ↓
Response (verified, similarity, is_real)
```

### 5.2. Các thành phần chính

**1. OCR (Optical Character Recognition)**:
- **Library**: RapidOCR
- **Chức năng**: Đọc thông tin từ ảnh CCCD/CMND
- **Output**: Số CCCD, họ tên, ngày sinh, ngày hết hạn, giới tính, quốc tịch
- **Endpoint**: `POST /ocr/extract`

**2. Face Embedding Extraction**:
- **Library**: DeepFace với ArcFace model
- **Detector**: RetinaFace (fallback: OpenCV)
- **Chức năng**: Extract face embedding từ ảnh CCCD
- **Normalization**: L2 normalization
- **Storage**: Lưu trong session với `session_id`

**3. Face Matching**:
- **Algorithm**: Cosine similarity giữa 2 embeddings
- **Threshold**: 0.4 (40% similarity)
- **Process**: So sánh embedding từ webcam với embedding từ CCCD

**4. Anti-Spoofing Detection**:
- **Model**: MiniFASNet (Silent-Face-Anti-Spoofing)
- **Chức năng**: Phát hiện ảnh giả, video, mask, màn hình
- **Labels**: 
  - `0`: Real face (khuôn mặt thật)
  - `1/2`: Spoof (ảnh giả, video, mask)
- **Detection**: RetinaFace detector để detect face trong ảnh

### 5.3. Luồng xử lý Face Verification (Chi tiết)

#### Bước 1: Upload CCCD và Extract Face Embedding

**Endpoint**: `POST /face/upload_id_card`  
**File**: `Face/Code/main.py` → `upload_id_card()`

**Input**:
- `image`: File ảnh CCCD (JPEG/PNG)

**Process chi tiết**:

1. **Đọc ảnh từ bytes**:
   ```python
   image_bytes = file.read()
   img = read_image_from_bytes(image_bytes)
   # Convert bytes → numpy array → OpenCV image
   ```

2. **Preprocess ảnh**:
   ```python
   def preprocess_image(img):
       # Convert BGR → RGB
       img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
       
       # Brightness adjustment
       gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
       mean_brightness = np.mean(gray)
       
       if mean_brightness < 50:      # Quá tối
           img_rgb = cv2.convertScaleAbs(img_rgb, alpha=1.2, beta=20)
       elif mean_brightness > 200:   # Quá sáng
           img_rgb = cv2.convertScaleAbs(img_rgb, alpha=0.9, beta=-10)
       
       return img_rgb
   ```

3. **Extract Face Embedding**:
   ```python
   def get_face_embedding(img):
       # Sử dụng DeepFace với ArcFace model
       embedding_obj = DeepFace.represent(
           img_path=temp_path,
           model_name='ArcFace',          # Face recognition model
           detector_backend='retinaface',  # Face detector
           enforce_detection=True,        # Bắt buộc phải detect được face
           align=True,                    # Align face
           normalization='base'           # Normalization method
       )
       
       embedding = np.array(embedding_obj[0]['embedding'])
       
       # L2 Normalization
       norm = np.linalg.norm(embedding)
       if norm > 0:
           embedding = embedding / norm
       
       return embedding  # Shape: (512,)
   ```

4. **Lưu vào Session**:
   ```python
   session_id = os.urandom(16).hex()  # Random 32-char hex string
   sessions[session_id] = {
       'embedding': embedding,  # Face embedding vector
       'created': time.time()   # Timestamp
   }
   ```

**Output**:
```json
{
  "success": true,
  "session_id": "a1b2c3d4e5f6...",
  "message": "Đã lưu embedding từ ảnh CCCD"
}
```

#### Bước 2: Face Verification từ Webcam

**Endpoint**: `POST /face/verify`  
**File**: `Face/Code/main.py` → `verify_face()`

**Input**:
- `image`: File ảnh từ webcam
- `session_id`: Session ID từ bước 1

**Process chi tiết**:

1. **Load Session**:
   ```python
   sess = sessions.get(session_id)
   if not sess:
       return error 400: "Session không hợp lệ"
   embedding_card = sess['embedding']  # Embedding từ CCCD
   ```

2. **Đọc ảnh webcam**:
   ```python
   img_webcam = read_image_from_bytes(image_bytes)
   ```

3. **Kiểm tra Anti-Spoofing** (QUAN TRỌNG):
   ```python
   # Sử dụng MiniFASNet model
   anti_spoof_result = test(
       image=img_webcam,
       model_dir=MODEL_DIR,  # Face/resources/anti_spoof_models/
       device_id=0
   )
   
   # Kết quả:
   # 0 = Real face (khuôn mặt thật)
   # 1 = Spoof (ảnh giả)
   # 2 = Spoof (video/mask)
   # None = Không detect được face (quá nhỏ/lớn)
   
   is_real = bool(anti_spoof_result == 0)
   ```

   **Anti-Spoofing Process** (`anti_spoof_predict.py`):
   - Detect face bằng RetinaFace detector
   - Crop và resize face region
   - Predict bằng MiniFASNet model
   - Output: Label (0=real, 1/2=spoof)

4. **Nếu Anti-Spoofing PASS** (`is_real == True`):

   a. **Extract Embedding từ Webcam**:
   ```python
   embedding_webcam = get_face_embedding(img_webcam)
   ```

   b. **Face Matching (Cosine Similarity)**:
   ```python
   def cosine_similarity(emb1, emb2):
       # Cosine similarity = dot product / (norm1 * norm2)
       return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
   
   similarity = cosine_similarity(embedding_card, embedding_webcam)
   # Range: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)
   ```

   c. **Threshold Check**:
   ```python
   threshold = 0.4  # 40% similarity
   face_match_passed = bool(similarity >= threshold)
   ```

5. **Kết quả cuối cùng**:
   ```python
   final_verified = is_real and face_match_passed
   
   return {
       'verified': final_verified,
       'similarity': float(similarity) if is_real else 0.0,
       'threshold': 0.4,
       'face_match_passed': face_match_passed,
       'is_real': is_real,
       'anti_spoof_label': anti_spoof_label,
       'message': 'Xác minh thành công' if final_verified else (
           'Không phải từ camera thật' if not is_real
           else 'Khuôn mặt không khớp'
       )
   }
   ```

**Output Examples**:

**Success**:
```json
{
  "success": true,
  "verified": true,
  "similarity": 0.85,
  "threshold": 0.4,
  "face_match_passed": true,
  "is_real": true,
  "anti_spoof_label": 0,
  "message": "Xác minh thành công"
}
```

**Anti-Spoofing Fail**:
```json
{
  "success": true,
  "verified": false,
  "similarity": 0.0,
  "is_real": false,
  "anti_spoof_label": 1,
  "message": "Không phải từ camera thật (có thể là ảnh giả, video, hoặc màn hình)"
}
```

**Face Mismatch**:
```json
{
  "success": true,
  "verified": false,
  "similarity": 0.25,
  "face_match_passed": false,
  "is_real": true,
  "message": "Khuôn mặt không khớp"
}
```

### 5.4. Models và Resources

**Anti-Spoofing Models** (`Face/resources/anti_spoof_models/`):
- `2.7_80x80_MiniFASNetV2.pth`: Model version 2
- `4_0_0_80x80_MiniFASNetV1SE.pth`: Model version 1SE

**Face Detection Model** (`Face/resources/detection_model/`):
- `Widerface-RetinaFace.caffemodel`: RetinaFace model
- `deploy.prototxt`: Caffe prototxt file

**Dependencies** (`Face/Code/requirements.txt`):
- `deepface>=0.0.79`: Face recognition
- `rapidocr-onnxruntime>=1.3.0`: OCR
- `torch==2.5.1`: PyTorch
- `tensorflow>=2.15.0`: TensorFlow
- `opencv-python-headless==4.11.0.86`: Image processing
- `flask==2.0.2`: Web framework

### 5.5. API Integration

**Next.js API Routes** (Proxy layer):
- `src/app/api/face/upload/route.ts`: Proxy đến Flask `/face/upload_id_card`
- `src/app/api/face/verify/route.ts`: Proxy đến Flask `/face/verify`
- `src/app/api/ocr/route.ts`: Proxy đến Flask `/ocr/extract`

**Frontend Hooks**:
- `src/hooks/useFaceVerification.ts`: React hook để gọi face verification
- `src/hooks/useWebcam.ts`: Webcam capture và photo capture
- `src/hooks/useOcrUpload.ts`: OCR upload và face upload

**UI Components**:
- `src/components/auth/FaceVerificationStep.tsx`: UI cho face verification
- `src/components/auth/IDCardUploadStep.tsx`: UI cho CCCD upload

### 5.6. Error Handling

**Các trường hợp lỗi**:
1. **Không tìm thấy face**: "Không tìm thấy khuôn mặt trong ảnh"
2. **Face quá nhỏ/lớn**: "Khuôn mặt quá nhỏ hoặc quá lớn (cần 25-45% khung hình)"
3. **Anti-spoofing fail**: "Không phải từ camera thật (có thể là ảnh giả, video, hoặc màn hình)"
4. **Face mismatch**: "Khuôn mặt không khớp" (similarity < 0.4)
5. **Session expired**: "Session không hợp lệ hoặc đã hết hạn"

### 5.7. Security Features

1. **Anti-Spoofing**: Ngăn chặn ảnh giả, video, mask
2. **Session-based**: Embedding chỉ tồn tại trong session, không lưu vĩnh viễn
3. **Threshold-based matching**: Chỉ chấp nhận similarity >= 0.4
4. **Real-time verification**: Yêu cầu chụp ảnh từ webcam, không chấp nhận upload file

---

## 6. BACKEND ARCHITECTURE - CHI TIẾT KỸ THUẬT

### 6.1. Tổng quan Backend

Backend của hệ thống được xây dựng trên **Next.js API Routes** (Serverless Functions), kết hợp với các dịch vụ bên ngoài:
- **Next.js API Routes**: Serverless functions cho business logic
- **Flask API** (Python): Face verification và OCR
- **Firebase Realtime Database**: Chat messages
- **IPFS/Pinata**: Decentralized storage
- **Aptos Blockchain**: Smart contracts

### 6.2. Next.js API Routes Structure

**Directory**: `src/app/api/`

```
api/
├── chat/
│   ├── messages/
│   │   ├── route.ts          # GET: Lấy messages, POST: Gửi message
│   │   ├── post/
│   │   │   └── route.ts      # POST: Gửi message (alternative)
│   │   └── delete/
│   │       └── route.ts      # DELETE: Xóa message
│   └── route.ts              # GET: Lấy danh sách rooms
├── face/
│   ├── upload/
│   │   └── route.ts          # POST: Upload CCCD, lưu embedding
│   └── verify/
│       └── route.ts          # POST: Verify face từ webcam
├── ipfs/
│   ├── upload/
│   │   └── route.ts          # POST: Upload metadata/file lên IPFS
│   ├── get/
│   │   └── route.ts          # GET: Lấy metadata từ IPFS
│   ├── job/
│   │   └── route.ts          # GET: Lấy job metadata
│   ├── profile/
│   │   └── route.ts          # GET: Lấy profile metadata
│   └── dispute/
│       └── route.ts          # GET: Lấy dispute evidence
├── ocr/
│   └── route.ts              # POST: OCR ảnh CCCD
└── zk/
    ├── generate-proof/
    │   ├── route.ts          # POST: Tạo ZK proof
    │   └── zkProofUtils.ts   # Utilities cho ZK proof
    └── verify/
        └── route.ts          # POST: Verify ZK proof
```

### 6.3. API Endpoints Chi tiết

#### 6.3.1. IPFS Upload API

**Endpoint**: `POST /api/ipfs/upload`  
**File**: `src/app/api/ipfs/upload/route.ts`

**Chức năng**: Upload metadata hoặc files lên IPFS (Pinata)

**Input**:
```typescript
{
  type: 'job' | 'dispute' | 'apply' | 'finalize' | 'profile',
  metadata?: {
    title: string,
    description: string,
    // ... job metadata
  },
  file?: File,  // Optional file upload
  fileType?: 'milestone_evidence' | 'dispute_evidence' | 'profile_attachment'
}
```

**Process**:
1. **Validate input**: Kiểm tra type, metadata/file
2. **Upload metadata** (nếu có):
   - Tạo JSON file từ metadata
   - Upload lên Pinata
   - Encrypt CID (nếu cần)
   - Return CID
3. **Upload file** (nếu có):
   - Validate file size (max 15MB)
   - Upload lên Pinata
   - Return CID

**Output**:
```json
{
  "success": true,
  "cid": "QmXXX...",
  "encryptedCid": "encrypted_XXX..."  // Nếu encrypt
}
```

**Security**:
- Validate file size: Max 15MB
- Validate metadata length: Max 2000 chars
- Sanitize text input
- Role-based access control

#### 6.3.2. IPFS Get API

**Endpoint**: `GET /api/ipfs/get`  
**File**: `src/app/api/ipfs/get/route.ts`

**Chức năng**: Lấy metadata từ IPFS

**Query Parameters**:
- `cid`: IPFS CID (có thể encrypted)
- `decodeOnly`: Chỉ decode CID, không fetch data

**Process**:
1. Decrypt CID (nếu encrypted)
2. Fetch từ IPFS gateway
3. Parse JSON
4. Return data

#### 6.3.3. Chat API

**Endpoints**:
- `GET /api/chat/messages?roomId=xxx`: Lấy messages trong room
- `POST /api/chat/messages`: Gửi message
- `DELETE /api/chat/messages?roomId=xxx&messageId=xxx`: Xóa message
- `GET /api/chat?getRooms=true`: Lấy danh sách rooms

**File**: `src/app/api/chat/messages/route.ts`

**Chức năng**: Quản lý chat messages trên Firebase Realtime Database

**Process**:
1. **Check Proof**: Kiểm tra user có ZK Proof chưa
2. **Check Permission**: Kiểm tra user có quyền chat (Poster/Freelancer của job)
3. **Firebase Operations**:
   - Read/Write messages
   - Create/Delete rooms
   - Update last viewed timestamp

**Firebase Structure**:
```json
{
  "chatRooms": {
    "roomId": {
      "creatorAddress": "0x...",
      "participantAddress": "0x...",
      "jobId": 123,
      "createdAt": 1234567890,
      "members": {
        "0x...": true
      },
      "messages": {
        "messageId": {
          "sender": "0x...",
          "text": "Hello",
          "timestamp": 1234567890
        }
      }
    }
  }
}
```

#### 6.3.4. OCR API

**Endpoint**: `POST /api/ocr`  
**File**: `src/app/api/ocr/route.ts`

**Chức năng**: Proxy đến Flask API để OCR ảnh CCCD

**Process**:
1. Nhận file ảnh từ FormData
2. Forward đến Flask API: `POST /ocr/extract`
3. Return kết quả OCR

**Output**:
```json
{
  "success": true,
  "data": {
    "id_number": "001234567890",
    "name": "Nguyễn Văn A",
    "date_of_birth": "2000-01-01",
    "gender": "Nam",
    "nationality": "Việt Nam",
    "date_of_expiry": "2030-01-01"
  }
}
```

### 6.4. Aptos Client Core

**File**: `src/lib/aptosClientCore.ts`

**Chức năng**: Core library để tương tác với Aptos blockchain

**Features**:
1. **Caching System**:
   - `resourceCache`: Cache contract resources (TTL: 30s)
   - `tableCache`: Cache table items (TTL: 30s)
   - `eventsCache`: Cache events (TTL: 30s)
   - `inflightRequests`: Tránh duplicate requests

2. **Fetch Functions**:
   - `fetchContractResource<T>(resourcePath)`: Lấy resource từ contract
   - `queryTableItem<T>(params)`: Query table item
   - `aptosFetch()`: Fetch với retry logic (max 3 lần, exponential backoff)

3. **Error Handling**:
   - Retry với exponential backoff cho 429 errors
   - Cache để giảm API calls
   - Graceful degradation

**Example Usage**:
```typescript
// Fetch resource
const roleStore = await fetchContractResource('role::RoleStore');

// Query table
const proof = await queryTableItem({
  handle: roleStore.proofs.handle,
  keyType: 'address',
  valueType: `${CONTRACT_ADDRESS}::role::CCCDProof`,
  key: userAddress
});
```

### 6.5. Aptos Events System

**File**: `src/lib/aptosEvents.ts`

**Chức năng**: Query events từ Aptos blockchain

**Features**:
1. **Event Querying**:
   - `queryEvents(eventHandle, fieldName, limit)`: Generic event query
   - Cache với TTL 30s
   - Deduplicate inflight requests

2. **Job Events**:
   - `getJobCreatedEvents()`: Job creation events
   - `getJobAppliedEvents()`: Job application events
   - `getJobStateChangedEvents()`: State change events
   - `getMilestoneCreatedEvents()`: Milestone creation
   - `getMilestoneSubmittedEvents()`: Milestone submission
   - `getMilestoneAcceptedEvents()`: Milestone acceptance
   - `getMilestoneRejectedEvents()`: Milestone rejection

3. **User Events**:
   - `getRoleRegisteredEvents()`: Role registration
   - `getReputationChangedEvents()`: Reputation changes

4. **Dispute Events**:
   - `getDisputeOpenedEvents()`: Dispute creation
   - `getDisputeVotedEvents()`: Dispute votes
   - `getEvidenceAddedEvents()`: Evidence submission

5. **Cache Management**:
   - `clearRoleEventsCache()`: Clear role events cache
   - `clearJobEventsCache()`: Clear job events cache

### 6.6. Aptos Queries System

**Files**: 
- `src/lib/aptosJobQueries.ts`: Job-related queries
- `src/lib/aptosUserQueries.ts`: User-related queries

**Job Queries** (`aptosJobQueries.ts`):

1. **getJobsList(maxJobs)**:
   - Lấy danh sách jobs từ events
   - Combine: created, applied, state changed events
   - Return: Array of jobs với state và freelancer

2. **getJobData(jobId)**:
   - Query trực tiếp từ contract state (table)
   - Return: Raw job data từ blockchain

3. **getParsedJobData(jobId)**:
   - Combine events và contract state
   - Parse milestones từ events
   - Determine state và pending_freelancer
   - Return: Complete job data với milestones

**User Queries** (`aptosUserQueries.ts`):

1. **getUserRoles(address, limit)**:
   - Lấy roles từ events
   - Filter theo address
   - Return: Array of roles với CIDs

2. **getReputationPoints(address, limit)**:
   - Tính tổng reputation từ events
   - Sum tất cả reputation changes
   - Return: Total reputation points

3. **getProofData(address)**:
   - Query CCCD proof từ contract state
   - Return: Proof data hoặc null

4. **Dispute Queries**:
   - `getDisputeSummary()`: Tóm tắt dispute (votes, winner)
   - `getDisputeEvidence()`: Evidence CIDs
   - `getDisputeData()`: Dispute information
   - `getReviewerDisputeHistory()`: Lịch sử disputes của reviewer

### 6.7. Contract Helpers

**File**: `src/utils/contractHelpers.ts`

**Chức năng**: Build transaction payloads cho Aptos smart contracts

**Functions**:

1. **buildTransactionPayload()**:
   - Tạo transaction payload format
   - Format: `{ type, function, type_arguments, arguments }`

2. **escrowHelpers**:
   - `createJob()`: Tạo job transaction
   - `applyJob()`: Apply job transaction
   - `reviewCandidate()`: Duyệt/từ chối ứng viên
   - `withdrawApplication()`: Rút ứng tuyển
   - `submitMilestone()`: Submit milestone
   - `confirmMilestone()`: Approve milestone
   - `rejectMilestone()`: Reject milestone
   - `mutualCancel()`: Yêu cầu hủy job
   - `acceptMutualCancel()`: Chấp nhận hủy
   - `rejectMutualCancel()`: Từ chối hủy
   - `freelancerWithdraw()`: Freelancer rút tiền
   - `posterWithdrawUnfilled()`: Poster rút job chưa có freelancer
   - Và nhiều functions khác...

**Constants**:
- `OCTA = 100_000_000`: 1 APT = 100M octas
- `STAKE_AMOUNT = 1 * OCTA`: Stake khi apply job
- `POSTER_FEE = 2 * OCTA / 10`: Phí khi tạo job

### 6.8. Encryption

**File**: `src/lib/encryption.ts`

**Chức năng**: Encrypt/decrypt IPFS CIDs

**Process**:
- Encrypt CID trước khi lưu lên blockchain
- Decrypt CID khi fetch từ IPFS
- Sử dụng symmetric encryption

---

## 7. FRONTEND ARCHITECTURE - CHI TIẾT KỸ THUẬT

### 7.1. Tổng quan Frontend

Frontend được xây dựng trên **Next.js 15.5.0** với **React 19.1.0**, sử dụng:
- **App Router**: File-based routing
- **Server Components**: Default (React Server Components)
- **Client Components**: `"use client"` directive
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling

### 7.2. Component Architecture

**Structure**:
```
src/
├── app/                    # Pages (App Router)
│   ├── page.tsx           # Landing page
│   ├── dashboard/
│   │   └── page.tsx       # Dashboard page
│   ├── jobs/
│   │   ├── page.tsx        # Jobs listing
│   │   └── [id]/
│   │       └── page.tsx    # Job detail
│   ├── auth/
│   │   └── did-verification/
│   │       └── page.tsx   # Authentication
│   └── chat/
│       └── page.tsx       # Chat page
├── components/            # React Components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── jobs/              # Job-related components
│   ├── chat/              # Chat components
│   ├── common/            # Shared components
│   ├── landing/           # Landing page components
│   └── ui/               # UI primitives
├── contexts/              # React Context
│   ├── WalletContext.tsx  # Wallet state
│   ├── RolesContext.tsx   # Roles state
│   └── ChatContext.tsx    # Chat state
├── hooks/                 # Custom hooks
└── lib/                   # Libraries
```

### 7.3. State Management

#### 7.3.1. Wallet Context

**File**: `src/contexts/WalletContext.tsx`

**Chức năng**: Quản lý wallet connection state

**State**:
- `account`: Wallet address (string | null)
- `isConnecting`: Đang kết nối (boolean)
- `accountType`: 'aptos' | null
- `aptosNetwork`: Network name

**Functions**:
- `connectWallet()`: Kết nối ví Petra
- `disconnectWallet()`: Ngắt kết nối
- `ensureWallet()`: Kiểm tra đã kết nối chưa

**Integration**: Sử dụng `usePetraAuth` hook

#### 7.3.2. Roles Context

**File**: `src/contexts/RolesContext.tsx`

**Chức năng**: Quản lý user roles và proof status

**State**:
- `roles`: Array of role names
- `loading`: Đang load roles
- `hasProof`: Có ZK Proof chưa
- `hasPosterRole`: Có role Poster
- `hasFreelancerRole`: Có role Freelancer
- `hasReviewerRole`: Có role Reviewer

**Functions**:
- `refreshRoles()`: Refresh roles từ blockchain

**Data Source**: Query từ Aptos events và contract state

#### 7.3.3. Chat Context

**File**: `src/contexts/ChatContext.tsx`

**Chức năng**: Quản lý chat state

**State**:
- `rooms`: Array of chat rooms
- `messages`: Messages trong room hiện tại
- `selectedRoomId`: Room đang chọn

**Functions**:
- `createRoom()`: Tạo phòng chat
- `sendMessage()`: Gửi tin nhắn
- `deleteRoom()`: Xóa phòng

**Data Source**: Firebase Realtime Database

### 7.4. Custom Hooks

**Directory**: `src/hooks/`

**Important Hooks**:

1. **usePetraAuth**:
   - Kết nối ví Petra
   - Auto-restore session
   - Listen network changes

2. **useRoleManagement**:
   - Quản lý role registration
   - Handle face verification
   - Generate ZK proof
   - Register role on-chain

3. **useFaceVerification**:
   - Capture photo từ webcam
   - Call face verification API
   - Handle verification result

4. **useWebcam**:
   - Access webcam
   - Capture photo
   - Video preview

5. **useOcrUpload**:
   - Upload CCCD image
   - Call OCR API
   - Handle OCR result

6. **useMilestoneHandlers**:
   - Submit milestone
   - Approve/reject milestone
   - Handle disputes
   - Cancel/withdraw actions

7. **useDisputeData**:
   - Fetch dispute information
   - Get dispute votes
   - Determine winner

### 7.5. Component Hierarchy

**Landing Page**:
```
page.tsx
├── Header
├── Hero
├── HowItWorks
├── PersonaSwitcher
├── TrustNumbers
├── FAQ
└── Footer
```

**Dashboard**:
```
dashboard/page.tsx
└── DashboardContent
    ├── SegmentedTabs
    ├── PostJobTab (nếu có Poster role)
    └── ProjectsTab
        └── JobCard (multiple)
            └── MilestonesList
                ├── MilestoneItem (multiple)
                └── JobCancelActions
```

**Job Detail**:
```
jobs/[id]/page.tsx
└── JobDetailContent
    ├── Job Info
    ├── JobSidebar
    └── MilestonesList
        └── MilestoneItem (multiple)
```

**Authentication**:
```
auth/did-verification/page.tsx
└── DIDVerification
    ├── WalletAddressDisplay
    ├── RoleList
    ├── IDCardUploadStep
    ├── FaceVerificationStep
    └── RoleRegistrationForm
```

### 7.6. Data Flow

**Job Creation Flow**:
```
PostJobTab
  ↓ (user input)
PostJobTab.handleSubmit()
  ↓ (upload metadata)
/api/ipfs/upload
  ↓ (get CID)
escrowHelpers.createJob()
  ↓ (build payload)
window.aptos.signAndSubmitTransaction()
  ↓ (transaction)
Aptos Blockchain
  ↓ (event)
getJobsList() → Refresh UI
```

**Face Verification Flow**:
```
DIDVerification
  ↓ (upload CCCD)
/api/ocr → Flask API
  ↓ (OCR result)
/api/face/upload → Flask API
  ↓ (session_id)
FaceVerificationStep
  ↓ (capture photo)
/api/face/verify → Flask API
  ↓ (verified: true)
/api/zk/generate-proof
  ↓ (proof)
store_proof() on-chain
  ↓ (success)
register_role() on-chain
```

**Job Application Flow**:
```
JobDetailContent
  ↓ (click Apply)
escrowHelpers.applyJob()
  ↓ (transaction)
Aptos Blockchain
  ↓ (event)
getParsedJobData() → Update UI
  ↓ (dispatch event)
window.dispatchEvent('jobsUpdated')
  ↓ (listener)
ProjectsTab.fetchJobs() → Refresh
```

### 7.7. UI Components

**Directory**: `src/components/ui/`

**Components**:
- `Button`: Button với variants (primary, outline, etc.)
- `Card`: Card container
- `Pagination`: Pagination controls
- `Tabs`: Tab navigation
- `SegmentedTabs`: Segmented control
- `StatusBadge`: Status badge với colors
- `Avatar`: User avatar
- `Switch`: Toggle switch

**Styling**: Windows Classic Theme với Tailwind CSS

### 7.8. Event-Driven Updates

**Custom Events**:
- `jobsUpdated`: Khi có job transaction
- `rolesUpdated`: Khi có role transaction

**Usage**:
```typescript
// Dispatch event
window.dispatchEvent(new CustomEvent('jobsUpdated'));

// Listen event
useEffect(() => {
  const handler = () => {
    fetchJobs(); // Refresh data
  };
  window.addEventListener('jobsUpdated', handler);
  return () => window.removeEventListener('jobsUpdated', handler);
}, []);
```

**Benefits**:
- Decouple components
- Real-time updates
- Cache invalidation

---

## 8. PHÂN QUYỀN TRUY CẬP (ROLE-BASED ACCESS CONTROL)

### 4.1. Các vai trò (Roles)

1. **Guest** (Khách):
   - Xem landing page
   - Xem danh sách jobs (read-only)
   - Xem chi tiết job (read-only)
   - Không thể apply job hoặc đăng job

2. **Poster** (Người thuê):
   - Tất cả quyền của Guest
   - Đăng job mới
   - Duyệt/từ chối ứng viên
   - Quản lý milestones (approve/reject)
   - Rút tiền từ job chưa có freelancer
   - Chat với Freelancer

3. **Freelancer** (Người làm tự do):
   - Tất cả quyền của Guest
   - Ứng tuyển job
   - Rút ứng tuyển (khi đang chờ duyệt)
   - Submit milestones
   - Chat với Poster

4. **Reviewer** (Người đánh giá):
   - Tham gia giải quyết disputes
   - Vote cho bên thắng trong dispute
   - Xem lịch sử disputes đã tham gia

### 4.2. Kiểm tra quyền trong code

**File**: `src/contexts/RolesContext.tsx`

```typescript
const { hasPosterRole, hasFreelancerRole, hasReviewerRole } = useRoles();
```

**Ví dụ kiểm tra trong component**:
```typescript
{isPoster && (
  <Button onClick={handleReviewCandidate}>
    Phê duyệt ứng viên
  </Button>
)}
```

---

## 9. ĐIỂM ĐẶC BIỆT CỦA HỆ THỐNG

### 5.1. Sinh trắc học (Biometrics) - Face Verification System

**Thư mục**: `Face/Code/`

Hệ thống sử dụng **Flask API** (Python) để xử lý face verification với anti-spoofing detection.

**Công nghệ sử dụng**:
- **DeepFace**: Face matching và recognition
- **Silent-Face-Anti-Spoofing**: Phát hiện ảnh giả, video giả, mask
- **RapidOCR**: OCR để đọc thông tin từ CCCD
- **OpenCV**: Xử lý ảnh và video
- **PyTorch/TensorFlow**: Deep learning models

**API Endpoints** (Flask - `main.py`):

1. **POST `/face/upload_id_card`**:
   - Upload ảnh CCCD
   - Extract face embedding từ ảnh CCCD
   - Lưu embedding vào session
   - Return: `session_id`

2. **POST `/face/verify`**:
   - Nhận ảnh từ webcam
   - So khớp với face embedding đã lưu (DeepFace)
   - Kiểm tra anti-spoofing (Silent-Face-Anti-Spoofing)
   - Return: `verified`, `similarity`, `is_real`, `message`

3. **POST `/ocr/extract`**:
   - OCR ảnh CCCD/CMND
   - Extract thông tin: số CCCD, họ tên, ngày sinh, ngày hết hạn, etc.
   - Return: JSON với thông tin đã đọc

**Luồng xử lý**:

1. **Upload CCCD**:
   - User upload ảnh CCCD
   - Backend extract face embedding
   - Lưu vào session với `session_id`

2. **Face Verification**:
   - User chụp ảnh từ webcam
   - Backend so khớp với embedding đã lưu
   - Kiểm tra anti-spoofing (phát hiện ảnh giả, video, màn hình)
   - Tính similarity score (0-1)
   - Kết quả: `verified: true/false`, `similarity: 0-1`, `is_real: true/false`

**Anti-Spoofing Detection**:
- **MiniFASNet Model**: Phát hiện ảnh giả, video, mask
- **Silent-Face-Anti-Spoofing**: Chống giả mạo khuôn mặt
- Kiểm tra: Ảnh thật từ webcam vs Ảnh giả/video/màn hình

**Files chính**:
- `Face/Code/main.py`: Flask API server
- `Face/Code/anti_spoof_predict.py`: Anti-spoofing prediction
- `Face/Code/my_test.py`: Face matching logic
- `Face/Code/test_ocr.py`: OCR extraction
- `Face/Code/model_lib/MiniFASNet.py`: Anti-spoofing model
- `Face/resources/anti_spoof_models/`: Pre-trained models

**Next.js API Routes** (Proxy):
- `src/app/api/face/upload/route.ts`: Proxy đến Flask API
- `src/app/api/face/verify/route.ts`: Proxy đến Flask API
- `src/app/api/ocr/route.ts`: Proxy đến Flask OCR API

**Frontend Integration**:
- `src/hooks/useFaceVerification.ts`: React hook để gọi face verification API
- `src/hooks/useWebcam.ts`: Webcam capture
- `src/components/auth/FaceVerificationStep.tsx`: UI component

**Privacy-first**: Chỉ lưu ZK Proof, không lưu ảnh gốc

### 5.2. Zero-Knowledge Proof (ZK Proof)

**Circuit**: `zkp/circuit.circom`

Hệ thống sử dụng **Groth16 ZK Proof** với Circom để xác minh CCCD mà không tiết lộ thông tin thực tế.

**Circuit Logic**:
- **Input**: 
  - `dob`: Ngày sinh (YYYYMMDD)
  - `expiry`: Ngày hết hạn CCCD (YYYYMMDD)
  - `id_hash`: Hash của số CCCD
  - `name_hash`: Hash của họ tên
  - `today`: Ngày hiện tại (YYYYMMDD)
  - `min_age`: Tuổi tối thiểu (18)

- **Output**:
  - `valid`: CCCD hợp lệ (đủ tuổi + chưa hết hạn)
  - `identity_hash_out`: Hash số CCCD (public signal)
  - `name_hash_out`: Hash họ tên (public signal)

**Các ràng buộc (Constraints)**:
1. **Kiểm tra tuổi**: `today - dob >= min_age * 10000`
2. **Kiểm tra hết hạn**: `expiry >= today`
3. **Output hợp lệ**: `valid = is_old_enough * is_valid_expiry`

**Luồng tạo Proof**:
1. **Parse CCCD data**: Chuyển đổi thông tin CCCD thành input format
2. **Generate witness**: Tính toán intermediate values từ input
3. **Generate proof**: Tạo Groth16 proof bằng `snarkjs`
4. **Check duplicate**: Kiểm tra `public_signals` đã tồn tại chưa
5. **Store on-chain**: Lưu proof và public signals lên blockchain

**Duplicate Prevention**:
- Mỗi CCCD chỉ có thể được dùng bởi 1 ví duy nhất
- Sử dụng `public_signals` (deterministic) làm key để check duplicate
- Proof (random mỗi lần) không được dùng để check duplicate

**Files liên quan**:
- `zkp/circuit.circom`: Circuit definition
- `zkp/circuit_final.zkey`: Trusted setup key
- `src/app/api/zk/generate-proof/route.ts`: API tạo proof
- `contracts/job/sources/role.move`: Smart contract lưu proof

### 5.3. Blockchain Escrow

- Tiền được giữ trong smart contract
- Tự động giải ngân khi milestone được approve
- Không cần trust third-party

### 5.4. Decentralized Storage (IPFS)

- Job metadata, profiles, evidence lưu trên IPFS
- Chỉ CID được lưu trên blockchain
- Không thể sửa đổi sau khi đã lưu

### 5.5. Real-time Updates

- Event-driven architecture
- Tự động refresh UI sau mỗi transaction
- Cache management để đảm bảo data mới nhất

---

## 10. CÔNG NGHỆ SỬ DỤNG

### Frontend:
- **Next.js 15.5.0**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **React Context**: State management
- **Sonner**: Toast notifications

### Backend:
- **Next.js API Routes**: Serverless functions
- **Flask (Python)**: Face verification & OCR API
- **Firebase**: Realtime Database cho chat

### Blockchain:
- **Aptos**: Smart contract platform
- **Move**: Smart contract language
- **Petra Wallet**: Wallet integration

### Storage:
- **IPFS/Pinata**: Decentralized storage
- **Firebase Realtime Database**: Chat messages

### AI/ML:
- **RapidOCR**: OCR cho CCCD
- **DeepFace**: Face matching
- **Silent-Face-Anti-Spoofing**: Anti-spoofing detection

### Cryptography:
- **Circom**: ZK circuit language (circuit definition)
- **snarkjs**: Groth16 proof generation và verification
- **Groth16**: Zero-knowledge proof system
- **TweetNaCl**: Encryption

---

## 11. KẾT LUẬN

Hệ thống sử dụng kiến trúc **Client-Side với Peer-to-Peer**, kết hợp:
- Blockchain (Aptos) cho trustless escrow
- IPFS cho decentralized storage
- Biometrics + ZK Proof cho identity verification
- Real-time chat với proof-gated access

Tất cả giao diện đều có **role-based access control** rõ ràng, đảm bảo người dùng chỉ thấy và thực hiện được các hành động phù hợp với vai trò của mình.

