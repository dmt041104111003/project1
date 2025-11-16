# BACKLOG SCRUM - WEB2.5 FREELANCER PLATFORM

## TEAM MEMBERS
- **Tùng**: Smart Contract + ZK Proof (Move contracts, Circom circuit, SnarkJS)
- **Hải**: Backend API (Next.js API routes trong `src/app/api`)
- **Quý**: Frontend UI (Tất cả React components, pages, UI)
- **Quân**: AI Services (Python API - OCR, Face Verification)
- **Trang**: Testing (E2E, Unit, Integration, Performance)

---

## SPRINT 1: SMART CONTRACT FOUNDATION

### SCRUM-001: Smart Contract Module ROLE
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract quản lý đăng ký vai trò (Freelancer/Poster/Reviewer), query roles, get CID

### SCRUM-002: Smart Contract Module ESCROW
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract quản lý job, milestone, escrow, stake và payment flow

### SCRUM-003: Smart Contract Module DISPUTE
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract xử lý tranh chấp với logic chọn reviewer theo UT

### SCRUM-004: Smart Contract Module REPUTATION
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract quản lý điểm uy tín (UT) cho từng address

### SCRUM-005: Smart Contract - Submit Milestone
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement function submit milestone với evidence CID validation

### SCRUM-006: Smart Contract - Confirm Milestone
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement function confirm milestone, unlock escrow, update reputation

### SCRUM-007: Smart Contract - Reject Milestone
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement function reject milestone, lock escrow, trigger dispute

### SCRUM-008: Smart Contract - Withdraw Functions
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement poster withdraw unfilled job, freelancer withdraw request/accept/reject

### SCRUM-009: Smart Contract - Dispute Creation và Reviewer Selection
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement logic tạo dispute, chọn 3 reviewers (1 < UT, 1 > UT, 1 cao nhất)

### SCRUM-010: Smart Contract - Dispute Voting
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement voting mechanism cho reviewers, determine winner

### SCRUM-011: Smart Contract - Reputation Update Functions
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement inc_ut, dec_ut functions, update UT khi milestone accepted

---

## SPRINT 2: ZK PROOF SYSTEM

### SCRUM-012: ZK Circuit - CCCD Verification Circuit
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo Circom circuit `cccd_verification.circom` để hash CCCD data và face verification result

### SCRUM-013: ZK Setup - Circuit Compilation và zkey Generation
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Compile circuit, generate zkey, export verification key sử dụng SnarkJS

### SCRUM-014: Smart Contract - ZK Proof Storage
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement CCCDProof struct, store_proof, get_proof, has_proof, proof_hashes table

### SCRUM-015: Smart Contract - Duplicate Proof Prevention
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement logic kiểm tra duplicate proof qua proof_hashes table

---

## SPRINT 3: BACKEND API (NEXT.JS API ROUTES)

### SCRUM-016: Backend API - Role Query
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/role` để query roles, get CID cho address

### SCRUM-017: Backend API - Job List và Job Detail
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/job` và `/api/job/[id]` để list jobs và get job detail

### SCRUM-018: Backend API - Dispute List và Detail
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/dispute` để list disputes, get dispute detail với reviewer info

### SCRUM-019: Backend API - Reputation Query
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/reputation` để query reputation (UT) cho bất kỳ address nào

### SCRUM-020: Backend API - Proof Query
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/proof` để query ZK proof từ blockchain cho address

### SCRUM-021: Backend API - IPFS Upload và Get
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/ipfs/upload` và `/api/ipfs/get` để upload và retrieve IPFS data

### SCRUM-022: Backend API - OCR Proxy
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo `/api/ocr` proxy requests đến Python OCR API (phụ thuộc: SCRUM-028)

### SCRUM-023: Backend API - Face Verification Proxy
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo `/api/face` proxy requests đến Python Face API (phụ thuộc: SCRUM-029)

### SCRUM-024: Backend API - ZK Proof Generation
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/zk/generate-proof` để generate ZK proof từ identity data, check duplicate, store on-chain (phụ thuộc: SCRUM-014, 015, 028, 029)

### SCRUM-025: Backend API - Chat Messages
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng `/api/chat/messages` để handle chat functionality

### SCRUM-026: Backend API - Error Handling và Validation
**Assignee:** Hải  
**Status:** IN PROGRESS  
**Mô tả:** Cải thiện error handling, input validation, response formatting cho tất cả APIs

---

## SPRINT 4: AI SERVICES (PYTHON API)

### SCRUM-027: Python API - OCR Extraction từ CCCD
**Assignee:** Quân  
**Status:** DONE  
**Mô tả:** Xây dựng OCR API sử dụng PaddleOCR để extract thông tin từ ảnh CCCD

### SCRUM-028: Python API - Face Verification và Anti-Spoofing
**Assignee:** Quân  
**Status:** DONE  
**Mô tả:** Xây dựng Face API với DeepFace và Silent-Face-Anti-Spoofing để verify khuôn mặt

### SCRUM-029: Python API - Unified Verification API
**Assignee:** Quân  
**Status:** DONE  
**Mô tả:** Merge OCR và Face API thành một `verification_api.py` chạy trên port 5000

---

## SPRINT 5: FRONTEND UI

### SCRUM-030: Frontend UI - Form Đăng Job (Manual Input)
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo form nhập thủ công với validation đầy đủ, tính toán cost, milestone durations

### SCRUM-031: Frontend UI - Form Đăng Job (JSON Input)
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo form nhập JSON với parse và error handling, parity với contract

### SCRUM-032: Frontend UI - Trang Danh sách Job
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Hiển thị danh sách job với filter, search, pagination (4 cards/hàng, 2 hàng/trang)

### SCRUM-033: Frontend UI - Trang Chi tiết Job
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Hiển thị chi tiết job, milestones với pagination (4 milestones/trang)

### SCRUM-034: Frontend UI - Milestone List Component
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component hiển thị danh sách milestones với pagination, status badges

### SCRUM-035: Frontend UI - Milestone Actions (Submit/Approve/Reject)
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo UI buttons và handlers cho submit milestone, approve, reject với file upload

### SCRUM-036: Frontend UI - Withdraw Actions Component
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component cho poster withdraw và freelancer withdraw request/accept/reject

### SCRUM-037: Frontend UI - Milestone Detail View
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Hiển thị chi tiết milestone: deadline, review period, evidence, status

### SCRUM-038: Frontend UI - Disputes Page (List View)
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo trang hiển thị danh sách disputes với filter, search, status badges

### SCRUM-039: Frontend UI - Dispute Detail và Voting
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo UI cho dispute detail, hiển thị evidence, reviewer votes, winner

### SCRUM-040: Frontend UI - Reputation Display Component
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component hiển thị reputation score, proof info, verify proof

### SCRUM-041: Frontend UI - OCR và Upload CCCD
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component upload ảnh CCCD, hiển thị OCR results, validate fields (phụ thuộc: SCRUM-022)

### SCRUM-042: Frontend UI - Face Verification với Webcam
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component capture webcam, verify face, hiển thị kết quả liveness (phụ thuộc: SCRUM-023)

### SCRUM-043: Frontend UI - DID Verification Flow và Role Registration
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo main flow: OCR → Face → ZK Proof → Role Registration với CID upload (phụ thuộc: SCRUM-041, 042, 024)

### SCRUM-044: Frontend UI - Role Registration Form với CID
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo form đăng ký role với about field, encrypt, upload IPFS, register với CID

### SCRUM-045: Frontend UI - Pagination Component
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo reusable Pagination component với navigation, step indicators, auto-play

### SCRUM-046: Frontend UI - Job List Pagination Integration
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Implement pagination cho job list (8 jobs/trang: 4 cards/hàng x 2 hàng) (phụ thuộc: SCRUM-045)

### SCRUM-047: Frontend UI - Milestone Pagination Integration
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Implement pagination cho milestones (4 milestones/trang) trong job detail và dashboard (phụ thuộc: SCRUM-045)

### SCRUM-048: Frontend UI - Landing Page Redesign
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Redesign landing page với "How it works" flow, persona switcher, FAQ updates

### SCRUM-049: Frontend UI - Responsive Design Optimization
**Assignee:** Quý  
**Status:** IN PROGRESS  
**Mô tả:** Tối ưu responsive design cho mobile, tablet, desktop trên tất cả pages

### SCRUM-050: Frontend UI - Loading States và Error Handling
**Assignee:** Quý  
**Status:** IN PROGRESS  
**Mô tả:** Cải thiện loading states, error messages, toast notifications trên toàn bộ app

---

## SPRINT 6: TESTING & DOCUMENTATION

### SCRUM-051: Testing - Test Flow Đăng Job và Apply Job
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases E2E cho flow đăng job, apply job, validate data

### SCRUM-052: Testing - Test Flow Milestone Submit/Approve/Reject
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases cho milestone workflow, edge cases (timeout, dispute)

### SCRUM-053: Testing - Test Flow Dispute và Reputation
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases cho dispute workflow, reputation updates, edge cases

### SCRUM-054: Testing - Test Flow DID Verification
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases cho OCR, face verification, ZK proof generation, role registration

### SCRUM-055: Testing - E2E Testing Suite
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo comprehensive E2E test suite cho toàn bộ user flows

### SCRUM-056: Testing - Performance Testing
**Assignee:** Trang  
**Status:** PENDING  
**Mô tả:** Test performance của API, contract interactions, UI rendering

### SCRUM-057: Documentation - API Documentation
**Assignee:** Trang  
**Status:** PENDING  
**Mô tả:** Viết documentation cho tất cả API endpoints với examples

### SCRUM-058: Documentation - User Guide
**Assignee:** Trang  
**Status:** PENDING  
**Mô tả:** Viết user guide cho poster và freelancer workflows

---


### Thống kê theo Assignee
- **Tùng**: 15 tasks (Smart Contract + ZK Proof)
- **Hải**: 11 tasks (Backend API)
- **Quý**: 21 tasks (Frontend UI)
- **Quân**: 3 tasks (AI Services)
- **Trang**: 8 tasks (Testing + Documentation)

### Thống kê theo Sprint
- **Sprint 1**: 11 tasks (Smart Contract Foundation)
- **Sprint 2**: 4 tasks (ZK Proof System)
- **Sprint 3**: 11 tasks (Backend API)
- **Sprint 4**: 3 tasks (AI Services)
- **Sprint 5**: 21 tasks (Frontend UI)
- **Sprint 6**: 8 tasks (Testing & Documentation)

### Dependency Flow
- **Sprint 1**: Smart Contracts (Foundation)
- **Sprint 2**: ZK Circuit + Contract Storage (phụ thuộc: Sprint 1)
- **Sprint 3**: Backend API Routes (phụ thuộc: Sprint 1, 2, 4)
- **Sprint 4**: Python AI API (Independent, nhưng cần cho Sprint 3)
- **Sprint 5**: Frontend UI (phụ thuộc: Sprint 3, 4)
- **Sprint 6**: Testing & Documentation (phụ thuộc: Tất cả sprints trước)

