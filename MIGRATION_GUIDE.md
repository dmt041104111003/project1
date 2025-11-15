# Migration Guide: Remove Unnecessary API Routes

## Đã xóa các API routes không cần thiết:
- `/api/escrow` - Chỉ map action → function
- `/api/job/apply` - Chỉ map action → function  
- `/api/job/cancel` - Chỉ map action → function
- `/api/job/withdraw` - Chỉ map action → function
- `/api/job/unlock` - Chỉ map action → function
- `/api/dispute` POST - Chỉ map action → function (GET vẫn giữ lại)

## Đã tạo helper functions:
File: `src/utils/contractHelpers.ts`
- `escrowHelpers.*` - Tất cả escrow functions
- `disputeHelpers.*` - Tất cả dispute functions  
- `roleHelpers.*` - Tất cả role functions
- `reputationHelpers.*` - Tất cả reputation functions

## Cách sử dụng:

### Trước (dùng API):
```typescript
const res = await fetch('/api/job/apply', {
  method: 'POST',
  body: JSON.stringify({ job_id: jobId })
});
const payload = await res.json();
await wallet.signAndSubmitTransaction(payload);
```

### Sau (dùng helper):
```typescript
import { escrowHelpers } from '@/utils/contractHelpers';
const payload = escrowHelpers.applyJob(jobId);
await wallet.signAndSubmitTransaction(payload);
```

## Files cần cập nhật:

1. ✅ `src/components/jobs/JobDetailContent.tsx` - Đã cập nhật `handleApply`
2. ⏳ `src/components/dashboard/MilestonesList.tsx` - Cần cập nhật:
   - `handleClaimTimeout` (dòng 302)
   - `handleMutualCancel` (dòng 401, 438, 471)
   - `handleFreelancerWithdraw` (dòng 508, 545, 578)
   - `handleUnlockNonDisputed` (dòng 614)
   - `handleOpenDispute` (dòng 232)
   - `handleSubmitEvidence` (dòng 272)

3. ⏳ `src/components/dashboard/JobCard.tsx` - Cần cập nhật:
   - `handleWithdraw` (dòng 66)

4. ⏳ `src/components/disputes/useDisputes.ts` - Cần cập nhật:
   - `openDispute` (dòng 172)
   - `resolveToPoster` (dòng 196)
   - `resolveToFreelancer` (dòng 216)

5. ⏳ `src/components/reputation/useReputation.ts` - Cần cập nhật:
   - `claimUTF`, `claimUTP` (nếu có dùng API)

## APIs vẫn giữ lại (có logic phức tạp):

- ✅ `/api/job/post` - Có validation và tính toán `poster_deposit`, `apply_deadline`
- ✅ `/api/job/milestone` - Có validation logic (check review deadline)
- ✅ `/api/role` POST - Có logic upload IPFS nếu có `about`
- ✅ Tất cả GET APIs - Query data từ blockchain
- ✅ IPFS APIs - Upload/get files

