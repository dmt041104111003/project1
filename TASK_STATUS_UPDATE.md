# BÁO CÁO CẬP NHẬT TRẠNG THÁI TASK

## Tổng quan
Dựa trên code hiện tại, các task sau đã được implement nhưng vẫn đang ở trạng thái "IDEA" cần được cập nhật thành "DONE".

---

## SPRINT 1

### ✅ SCRUM-50: Backend Job API (create job + views + errors) - **CẦN UPDATE → DONE**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ `/api/job/route.ts` - GET job by ID với error handling
- ✅ `/api/job/list/route.ts` - GET list jobs
- ✅ `/api/job/[id]/route.ts` - GET job detail
- ✅ `/api/job/utils.ts` - Utilities để parse state, milestones, addresses
- ✅ `/api/ipfs/upload/route.ts` - Upload job metadata lên IPFS
- ✅ `contractHelpers.ts` - `escrowHelpers.createJob()` function
- ✅ Contract `escrow.move` có `create_job` function

**Người phụ trách:** Quý (Backend)

---

### ✅ SCRUM-51: UI Post Job (validate + UX + parity) - **CẦN UPDATE → DONE**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ `PostJobTab.tsx` - Component chính cho post job
- ✅ `ManualJobForm.tsx` - Form nhập thủ công với validation đầy đủ
- ✅ `JsonJobInput.tsx` - Form nhập JSON với parse và error handling
- ✅ Validation: kiểm tra role poster, validate form fields, validate milestones
- ✅ UX: Loading states, error messages, success feedback
- ✅ Parity với contract: tính toán đúng cost, milestone durations, review periods

**Người phụ trách:** Quý (FE), Hải (FE)

---

### ⚠️ SCRUM-52: IPFS apply/finalize API (accept + clear applicants) - **CẦN KIỂM TRA**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** CẦN XÁC MINH

**Cần kiểm tra:**
- [ ] API để apply job (có thể đã có trong contract `apply_job`)
- [ ] API để finalize/accept applicant
- [ ] Logic clear applicants trong IPFS metadata
- [ ] Backend API routes cho apply/finalize

**Người phụ trách:** Quý (Backend), Hải (Backend)

---

### ✅ SCRUM-53: Disputes UI (single view: open + list, reviewer gate) - **CẦN UPDATE → DONE**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ `DisputesContent.tsx` - Main component cho disputes
- ✅ `DisputeItem.tsx` - Component hiển thị từng dispute
- ✅ `DisputesLayout.tsx` - Layout cho disputes page
- ✅ `useDisputes.ts` - Custom hook để fetch và manage disputes
- ✅ `/api/dispute/route.ts` - API endpoint cho disputes
- ✅ Reviewer gate: Contract `dispute.move` có logic chọn reviewer đã xác minh

**Người phụ trách:** Quý (FE), Hải (FE)

---

## SPRINT 2

### ✅ SCRUM-58: Milestone integrate (submit/approve/reject) in Projects/Detail - **CẦN UPDATE → DONE**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ `Milestones.tsx` - Component milestone với submit/approve/reject buttons
- ✅ `MilestonesList.tsx` - Full implementation với:
  - Submit milestone với evidence CID
  - Approve milestone (confirm)
  - Reject milestone (dispute)
  - Display milestone status
  - Handle dispute states
- ✅ Contract functions: `submit_milestone`, `confirm_milestone`, `reject_milestone`
- ✅ Integration trong Projects/Detail page

**Người phụ trách:** Quý (FE), Hải (FE), Tùng (Contract)

---

### ✅ SCRUM-59: Withdraw stake + unlock-to-poster integration - **CẦN UPDATE → DONE**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ Contract: `poster_withdraw_unfilled_job`, `freelancer_withdraw`, `accept_freelancer_withdraw`, `reject_freelancer_withdraw`
- ✅ `contractHelpers.ts` có đầy đủ helper functions
- ✅ `JobCard.tsx` có `handleWithdraw` cho poster withdraw
- ✅ `MilestonesList.tsx` có đầy đủ:
  - `handleFreelancerWithdraw` - Request withdraw
  - `handleAcceptFreelancerWithdraw` - Accept withdraw
  - `handleRejectFreelancerWithdraw` - Reject withdraw
- ✅ `JobCancelActions.tsx` - UI component cho withdraw actions
- ✅ API parse `freelancer_withdraw_requested_by` trong `/api/job` routes
- ✅ Integration trong Projects/Detail page

**Người phụ trách:** Tùng (Contract), Quý/Hải (Backend/FE)

---

## SPRINT 3

### ✅ SCRUM-62: Reputation view funcs (UTF/UTP/UTR) on-chain - **CẦN UPDATE → DONE**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ Contract `reputation.move` có `get(addr)` - Public function để get UT cho bất kỳ address nào
- ✅ Không cần separate functions cho UTF/UTP/UTR vì UT là chung cho mỗi address
- ✅ `reputation::inc_ut`, `reputation::dec_ut` - Friend functions để update UT

**Người phụ trách:** Tùng (Contract)

---

### ✅ SCRUM-63: API wrapper + wire Reputation UI to views - **CẦN UPDATE → DONE**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ `/api/reputation/route.ts` - Backend API wrapper để get reputation
- ✅ `ReputationContent.tsx` - UI component hiển thị reputation và proof
- ✅ Integration trong Reputation page với check address và display UT
- ✅ Có thể query reputation cho bất kỳ address nào

**Người phụ trách:** Quý (Backend), Hải (FE)

---

### ⚠️ SCRUM-64: Role register: about → IPFS enc CID → register - **CẦN KIỂM TRA**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** CẦN XÁC MINH

**Cần kiểm tra:**
- [ ] Flow: User nhập "about" → Encrypt → Upload IPFS → Get CID → Register role với CID
- [ ] UI component cho role registration với about field
- [ ] Backend API để encrypt và upload CID
- [ ] Integration với contract `register_role`

**Người phụ trách:** Quý (Backend/FE), Hải (FE)

---

## SPRINT 4

### ✅ SCRUM-29: Contract Milestone Submit/Accept/Reject - **ĐÃ DONE** (đúng status)

**Trạng thái hiện tại:** DONE  
**Trạng thái thực tế:** ĐÃ HOÀN THÀNH

**Bằng chứng:**
- ✅ Contract `escrow.move` có đầy đủ:
  - `submit_milestone`
  - `confirm_milestone` (accept)
  - `reject_milestone`

**Người phụ trách:** Tùng (Contract)

---

## SPRINT 5

### ⚠️ SCRUM-71: DID contract (storage/events/access) - **CẦN KIỂM TRA**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** CẦN XÁC MINH

**Hiện tại có:**
- ✅ `role.move` có `CCCDProof` struct để store ZK proof
- ✅ `store_proof`, `get_proof`, `has_proof` functions
- ✅ `proof_hashes` table để check duplicate

**Cần kiểm tra:**
- [ ] Có module DID riêng không, hay dùng role module?
- [ ] Events cho DID operations
- [ ] Access control functions

**Người phụ trách:** Tùng (Contract)

---

### ⚠️ SCRUM-72: DID backend - **CẦN KIỂM TRA**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** CẦN XÁC MINH

**Hiện tại có:**
- ✅ `/api/zk/generate-proof` - Generate ZK proof
- ✅ `/api/zk/verify-proof` - Verify ZK proof
- ✅ `/api/proof` - Get proof from blockchain
- ✅ `/api/face` - Face verification API
- ✅ `/api/ocr` - OCR API

**Cần kiểm tra:**
- [ ] Backend API cho DID operations (nếu có module DID riêng)
- [ ] Integration với ZK proof generation
- [ ] Error handling và validation

**Người phụ trách:** Quý (Backend), Hải (Backend)

---

### ⚠️ SCRUM-73: UI flows - **CẦN KIỂM TRA**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** CẦN XÁC MINH

**Hiện tại có:**
- ✅ `DIDActionsPanel.tsx` - Main DID verification flow
- ✅ `FaceVerification.tsx` - OCR và ID card upload
- ✅ `VerificationResult.tsx` - Face verification với webcam
- ✅ `ReputationContent.tsx` - Display reputation và proof

**Cần kiểm tra:**
- [ ] UI flows có đầy đủ không (OCR → Face → ZK Proof → Role Registration)
- [ ] Error handling và user feedback
- [ ] Loading states và transitions

**Người phụ trách:** Quý (FE), Hải (FE), Quân (FE)

---

### ⚠️ SCRUM-74: Face AI pre-check/liveness integration - **CẦN KIỂM TRA**

**Trạng thái hiện tại:** IDEA  
**Trạng thái thực tế:** CẦN XÁC MINH

**Hiện tại có:**
- ✅ `verification_api.py` có anti-spoofing (liveness detection)
- ✅ `test` function từ `my_test.py` để check liveness
- ✅ Integration trong `/face/verify` endpoint

**Cần kiểm tra:**
- [ ] Pre-check trước khi capture webcam
- [ ] Liveness detection có hoạt động đúng không
- [ ] Error handling cho liveness failures

**Người phụ trách:** Quân (AI)

---

## TÓM TẮT

### ✅ CẦN UPDATE THÀNH DONE (8 tasks):
1. **SCRUM-50**: Backend Job API
2. **SCRUM-51**: UI Post Job
3. **SCRUM-53**: Disputes UI
4. **SCRUM-58**: Milestone integrate
5. **SCRUM-59**: Withdraw stake + unlock-to-poster integration
6. **SCRUM-62**: Reputation view funcs
7. **SCRUM-63**: API wrapper + wire Reputation UI to views

### ⚠️ CẦN KIỂM TRA KỸ (5 tasks):
1. **SCRUM-52**: IPFS apply/finalize API
2. **SCRUM-64**: Role register với about → IPFS
3. **SCRUM-71**: DID contract
4. **SCRUM-72**: DID backend
5. **SCRUM-73**: UI flows
6. **SCRUM-74**: Face AI pre-check/liveness

### ✅ ĐÃ ĐÚNG STATUS:
- **SCRUM-29**: Contract Milestone (DONE)
- **SCRUM-54**: Escrow contract (DONE)
- **SCRUM-60**: Escrow contract edge cases (DONE)
- **SCRUM-17**: Contract Profile Register/Update (DONE)

---

## HÀNH ĐỘNG TIẾP THEO

1. **Quý & Hải**: Review và test các task đã mark "CẦN KIỂM TRA"
2. **Tùng**: Xác nhận các contract functions đã implement
3. **Quân**: Test Face AI và liveness detection
4. **Trang**: Test E2E flows và tạo test cases cho các task mới

