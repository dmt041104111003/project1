# API Cleanup Summary

## ✅ Đã xóa các API không cần thiết:

### POST APIs (chỉ map action → function):
1. ❌ `/api/escrow` - Đã xóa
2. ❌ `/api/job/apply` - Đã xóa
3. ❌ `/api/job/cancel` - Đã xóa
4. ❌ `/api/job/withdraw` - Đã xóa
5. ❌ `/api/job/unlock` - Đã xóa
6. ❌ `/api/job/post` - Đã xóa (logic tính toán có thể làm ở frontend)
7. ❌ `/api/job/milestone` - Đã xóa (validation có thể làm ở frontend)
8. ❌ `/api/dispute` POST - Đã xóa
9. ❌ `/api/reputation` POST - Đã xóa
10. ❌ `/api/role` POST - Đã xóa (IPFS upload có thể làm ở frontend trước)

## ✅ APIs còn giữ lại (có logic phức tạp):

### GET APIs (query data từ blockchain):
- ✅ `/api/job/list` - Query danh sách jobs
- ✅ `/api/job/[id]` - Query chi tiết job
- ✅ `/api/job/route.ts` - Query job data
- ✅ `/api/role` GET - Query roles của user
- ✅ `/api/dispute` GET - Query dispute data
- ✅ `/api/reputation` GET - (nếu có)

### IPFS APIs:
- ✅ `/api/ipfs/upload` - Upload data lên IPFS
- ✅ `/api/ipfs/upload-file` - Upload file lên IPFS
- ✅ `/api/ipfs/get` - Get data từ IPFS

## 📝 Helper Functions đã tạo:

File: `src/utils/contractHelpers.ts`

### escrowHelpers:
- `createJob()` - Tính toán poster_deposit và apply_deadline
- `applyJob()`
- `submitMilestone()`
- `confirmMilestone()`
- `rejectMilestone()`
- `claimTimeout()`
- `mutualCancel()`
- `acceptMutualCancel()`
- `rejectMutualCancel()`
- `freelancerWithdraw()`
- `acceptFreelancerWithdraw()`
- `rejectFreelancerWithdraw()`
- `posterWithdrawUnfilled()`
- `unlockNonDisputedMilestones()`
- `claimDisputePayment()`
- `claimDisputeRefund()`

### disputeHelpers:
- `openDispute()`
- `addEvidence()`
- `reviewerVote()`

### roleHelpers:
- `registerFreelancer(cid)`
- `registerPoster(cid)`
- `registerReviewer()`

### reputationHelpers:
- `claimReviewerReward(treasury)`
- `claimFreelancerReward()`
- `claimPosterReward()`

## 🔄 Cần cập nhật frontend:

1. **PostJobTab.tsx** - Dùng `escrowHelpers.createJob()` thay vì `/api/job/post`
2. **MilestonesList.tsx** - Dùng helpers thay vì `/api/job/milestone`
3. **DIDActionsPanel.tsx** - Upload IPFS trước, rồi dùng `roleHelpers.*` thay vì `/api/role` POST
4. **useReputation.ts** - Dùng `reputationHelpers.*` thay vì `/api/reputation`
5. **useDisputes.ts** - Dùng `disputeHelpers.*` thay vì `/api/dispute` POST
6. **MilestonesList.tsx** - Cập nhật các chỗ còn dùng `/api/escrow`

