# BACKLOG SCRUM - WEB2.5 FREELANCER PLATFORM

## TEAM MEMBERS
- **Quý**: Frontend, Backend
- **Trang**: Test, Data
- **Hải**: Backend, Frontend
- **Quân**: AI, Frontend
- **Tùng**: Smart Contract

---

## SPRINT 1: FOUNDATION & JOB MANAGEMENT

### SCRUM-001: Xây dựng Smart Contract Module ROLE
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract quản lý đăng ký vai trò (Freelancer/Poster/Reviewer) với ZK proof storage

### SCRUM-002: Xây dựng Smart Contract Module ESCROW
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract quản lý job, milestone, escrow, stake và payment flow

### SCRUM-003: Xây dựng Smart Contract Module DISPUTE
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract xử lý tranh chấp với logic chọn reviewer theo UT

### SCRUM-004: Xây dựng Smart Contract Module REPUTATION
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Tạo contract quản lý điểm uy tín (UT) cho từng address

### SCRUM-005: Backend API - Tạo Job và Upload IPFS
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Xây dựng API endpoint tạo job, upload metadata lên IPFS, parse và validate dữ liệu

### SCRUM-006: Backend API - Lấy danh sách Job và Job Detail
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Xây dựng API endpoints để list jobs và get job detail với error handling

### SCRUM-007: Backend API - Apply Job
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng API endpoint để freelancer apply job với stake validation

### SCRUM-008: Frontend UI - Form Đăng Job (Manual Input)
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo form nhập thủ công với validation đầy đủ, tính toán cost, milestone durations

### SCRUM-009: Frontend UI - Form Đăng Job (JSON Input)
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo form nhập JSON với parse và error handling, parity với contract

### SCRUM-010: Frontend UI - Trang Danh sách Job
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Hiển thị danh sách job với filter, search, pagination (4 cards/hàng, 2 hàng/trang)

### SCRUM-011: Frontend UI - Trang Chi tiết Job
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Hiển thị chi tiết job, milestones với pagination (4 milestones/trang)

### SCRUM-012: Testing - Test Flow Đăng Job và Apply Job
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases E2E cho flow đăng job, apply job, validate data

---

## SPRINT 2: MILESTONE & ESCROW MANAGEMENT

### SCRUM-013: Smart Contract - Submit Milestone
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement function submit milestone với evidence CID validation

### SCRUM-014: Smart Contract - Confirm Milestone (Approve)
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement function confirm milestone, unlock escrow, update reputation

### SCRUM-015: Smart Contract - Reject Milestone (Dispute)
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement function reject milestone, lock escrow, trigger dispute

### SCRUM-016: Smart Contract - Withdraw Functions
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement poster withdraw unfilled job, freelancer withdraw request/accept/reject

### SCRUM-017: Backend API - Milestone Operations
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Xây dựng API wrapper cho submit/confirm/reject milestone với error handling

### SCRUM-018: Frontend UI - Milestone List Component
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component hiển thị danh sách milestones với pagination, status badges

### SCRUM-019: Frontend UI - Milestone Actions (Submit/Approve/Reject)
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo UI buttons và handlers cho submit milestone, approve, reject với file upload

### SCRUM-020: Frontend UI - Withdraw Actions Component
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo component cho poster withdraw và freelancer withdraw request/accept/reject

### SCRUM-021: Frontend UI - Milestone Detail View
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Hiển thị chi tiết milestone: deadline, review period, evidence, status

### SCRUM-022: Testing - Test Flow Milestone Submit/Approve/Reject
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases cho milestone workflow, edge cases (timeout, dispute)

---

## SPRINT 3: DISPUTE & REPUTATION SYSTEM

### SCRUM-023: Smart Contract - Dispute Creation và Reviewer Selection
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement logic tạo dispute, chọn 3 reviewers (1 < UT, 1 > UT, 1 cao nhất)

### SCRUM-024: Smart Contract - Dispute Voting
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement voting mechanism cho reviewers, determine winner

### SCRUM-025: Smart Contract - Reputation Update Functions
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement inc_ut, dec_ut functions, update UT khi milestone accepted

### SCRUM-026: Backend API - Dispute List và Detail
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng API endpoints để list disputes, get dispute detail với reviewer info

### SCRUM-027: Backend API - Reputation Query
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Xây dựng API wrapper để query reputation (UT) cho bất kỳ address nào

### SCRUM-028: Frontend UI - Disputes Page (List View)
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo trang hiển thị danh sách disputes với filter, search, status badges

### SCRUM-029: Frontend UI - Dispute Detail và Voting
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo UI cho dispute detail, hiển thị evidence, reviewer votes, winner

### SCRUM-030: Frontend UI - Reputation Display Component
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component hiển thị reputation score, proof info, verify proof

### SCRUM-031: Testing - Test Flow Dispute và Reputation
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases cho dispute workflow, reputation updates, edge cases

---

## SPRINT 4: DID & ZK PROOF SYSTEM

### SCRUM-032: Smart Contract - ZK Proof Storage
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement CCCDProof struct, store_proof, get_proof, has_proof, proof_hashes table

### SCRUM-033: Smart Contract - Duplicate Proof Prevention
**Assignee:** Tùng  
**Status:** DONE  
**Mô tả:** Implement logic kiểm tra duplicate proof qua proof_hashes table

### SCRUM-034: Python API - OCR Extraction từ CCCD
**Assignee:** Quân  
**Status:** DONE  
**Mô tả:** Xây dựng OCR API sử dụng PaddleOCR để extract thông tin từ ảnh CCCD

### SCRUM-035: Python API - Face Verification và Anti-Spoofing
**Assignee:** Quân  
**Status:** DONE  
**Mô tả:** Xây dựng Face API với DeepFace và Silent-Face-Anti-Spoofing để verify khuôn mặt

### SCRUM-036: Backend API - OCR Proxy
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo Next.js API route proxy requests đến Python OCR API (phụ thuộc: SCRUM-034)

### SCRUM-037: Backend API - Face Verification Proxy
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo Next.js API route proxy requests đến Python Face API (phụ thuộc: SCRUM-035)

### SCRUM-038: Backend API - ZK Proof Generation
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Xây dựng API generate ZK proof từ identity data, check duplicate, store on-chain (phụ thuộc: SCRUM-032, 033, 034, 035)

### SCRUM-039: Backend API - ZK Proof Verification
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Xây dựng API verify ZK proof sử dụng snarkjs groth16 verify (phụ thuộc: SCRUM-032)

### SCRUM-040: Frontend UI - OCR và Upload CCCD
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo component upload ảnh CCCD, hiển thị OCR results, validate fields (phụ thuộc: SCRUM-036)

### SCRUM-041: Frontend UI - Face Verification với Webcam
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo component capture webcam, verify face, hiển thị kết quả liveness (phụ thuộc: SCRUM-037)

### SCRUM-042: Frontend UI - DID Verification Flow và Role Registration
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo main flow: OCR → Face → ZK Proof → Role Registration với CID upload (phụ thuộc: SCRUM-040, 041, 038)

### SCRUM-043: Frontend UI - Role Registration Form với CID
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Tạo form đăng ký role với about field, encrypt, upload IPFS, register với CID (tích hợp trong SCRUM-042)

### SCRUM-044: Testing - Test Flow DID Verification
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo test cases cho OCR, face verification, ZK proof generation, role registration

---

## SPRINT 5: UI/UX ENHANCEMENT & OPTIMIZATION

### SCRUM-045: Frontend UI - Pagination Component
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Tạo reusable Pagination component với navigation, step indicators, auto-play

### SCRUM-046: Frontend UI - Job List Pagination
**Assignee:** Hải  
**Status:** DONE  
**Mô tả:** Implement pagination cho job list (8 jobs/trang: 4 cards/hàng x 2 hàng) (phụ thuộc: SCRUM-045)

### SCRUM-047: Frontend UI - Milestone Pagination
**Assignee:** Quý  
**Status:** DONE  
**Mô tả:** Implement pagination cho milestones (4 milestones/trang) trong job detail và dashboard (phụ thuộc: SCRUM-045)

### SCRUM-048: Frontend UI - Landing Page Redesign
**Assignee:** Quân  
**Status:** DONE  
**Mô tả:** Redesign landing page với "How it works" flow, persona switcher, FAQ updates

### SCRUM-049: Frontend UI - Responsive Design Optimization
**Assignee:** Quân  
**Status:** IN PROGRESS  
**Mô tả:** Tối ưu responsive design cho mobile, tablet, desktop trên tất cả pages

### SCRUM-050: Frontend UI - Loading States và Error Handling
**Assignee:** Hải  
**Status:** IN PROGRESS  
**Mô tả:** Cải thiện loading states, error messages, toast notifications trên toàn bộ app

### SCRUM-051: Backend API - Error Handling và Validation
**Assignee:** Quý  
**Status:** IN PROGRESS  
**Mô tả:** Cải thiện error handling, input validation, response formatting cho tất cả APIs

### SCRUM-052: Testing - E2E Testing Suite
**Assignee:** Trang  
**Status:** IN PROGRESS  
**Mô tả:** Tạo comprehensive E2E test suite cho toàn bộ user flows

### SCRUM-053: Testing - Performance Testing
**Assignee:** Trang  
**Status:** PENDING  
**Mô tả:** Test performance của API, contract interactions, UI rendering

### SCRUM-054: Documentation - API Documentation
**Assignee:** Quý  
**Status:** PENDING  
**Mô tả:** Viết documentation cho tất cả API endpoints với examples

### SCRUM-055: Documentation - User Guide
**Assignee:** Hải  
**Status:** PENDING  
**Mô tả:** Viết user guide cho poster và freelancer workflows

---

## TỔNG KẾT

### Thống kê theo Status
- **DONE**: 43 tasks
- **IN PROGRESS**: 7 tasks
- **PENDING**: 5 tasks

### Thống kê theo Assignee
- **Tùng**: 11 tasks (Smart Contract)
- **Quý**: 15 tasks (Backend, Frontend)
- **Hải**: 12 tasks (Backend, Frontend)
- **Quân**: 3 tasks (AI, Frontend)
- **Trang**: 5 tasks (Test, Data)

### Thống kê theo Sprint
- **Sprint 1**: 12 tasks (Foundation & Job Management)
- **Sprint 2**: 10 tasks (Milestone & Escrow Management)
- **Sprint 3**: 9 tasks (Dispute & Reputation System)
- **Sprint 4**: 13 tasks (DID & ZK Proof System)
- **Sprint 5**: 11 tasks (UI/UX Enhancement & Optimization)

### Dependency Flow
- **Sprint 1**: Contracts → Backend API → Frontend UI → Testing
- **Sprint 2**: Contract Functions → Backend API → Frontend UI → Testing
- **Sprint 3**: Contract Functions → Backend API → Frontend UI → Testing
- **Sprint 4**: Contracts + Python API → Backend Proxy → Backend ZK API → Frontend UI → Testing
- **Sprint 5**: Pagination Component → Apply Pagination → UI/UX Improvements → Testing & Documentation

---

## GHI CHÚ

- Tất cả tasks đã được phân công rõ ràng cho từng thành viên
- Mỗi sprint tập trung vào một module/feature chính
- Testing được tích hợp vào mỗi sprint
- Documentation được ưu tiên trong Sprint 5
