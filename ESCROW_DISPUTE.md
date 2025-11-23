# Ký Quỹ và Tranh Chấp

## Ký Quỹ (Escrow)

### Stake và Phí

- **Poster stake**: 1 APT (bắt buộc khi tạo job)
- **Freelancer stake**: 1 APT (bắt buộc khi apply)
- **Poster fee**: 0.2 APT
- **Freelancer fee**: 0.1 APT

### Quy Trình Thanh Toán

1. **Tạo Job**: Poster ký quỹ toàn bộ số tiền milestone + stake + fee
2. **Apply Job**: Freelancer nộp stake + fee
3. **Phê duyệt**: Job chuyển sang `InProgress`, milestone đầu tiên bắt đầu
4. **Submit Milestone**: Freelancer nộp evidence (CID trên IPFS)
5. **Accept/Reject**: Poster xác nhận hoặc từ chối milestone
   - **Accept**: Tiền milestone được chuyển cho freelancer
   - **Reject**: Milestone bị khóa, có thể mở dispute

### Claim Timeout

- Khi milestone quá hạn deadline, poster có thể `claim_timeout`
- Poster nhận lại:
  - Tiền milestone chưa thanh toán
  - Freelancer stake (phạt freelancer)
- Job được reset về `Posted`, có thể apply lại

### Rút Tiền

- **Poster**: Có thể rút job chưa có freelancer (nhận lại toàn bộ)
- **Freelancer**: Có thể rút application trước khi được approve (không mất stake và fee)
- **Mutual Cancel**: Cả hai bên đồng ý hủy job

## Tranh Chấp (Dispute)

### Mở Dispute

- Poster hoặc Freelancer có thể mở dispute cho milestone bị reject
- Cần cung cấp evidence (CID trên IPFS)
- Hệ thống tự động chọn 3 reviewers từ pool reviewers

### Quy Trình Voting

1. **Open**: Dispute được mở, reviewers được thông báo
2. **Voting**: Reviewers có 3 phút để vote (có delay để tránh front-running)
3. **Resolution**: Sau khi đủ votes, hệ thống tự động tính kết quả

### Kết Quả

- **Freelancer thắng**: Nhận tiền milestone + stake được hoàn
- **Poster thắng**: Nhận lại tiền milestone + freelancer stake (phạt)
- Tiền từ dispute pool được phân phối cho reviewers

### Reviewer

- Phải có role `Reviewer` trong hệ thống
- Được phân công tự động dựa trên workload
- Nhận phần thưởng khi vote trong dispute

## Tích Hợp

### Smart Contracts

- `escrow.move`: Quản lý ký quỹ, thanh toán milestone, claim timeout
- `dispute.move`: Quản lý tranh chấp, voting, resolution

### Frontend

- `useDisputes.ts`: Hook quản lý dispute operations
- `DisputesTab.tsx`: UI hiển thị danh sách disputes
- `MilestoneItem.tsx`: UI milestone với actions submit/accept/reject/dispute

### Events

Tất cả operations đều emit events để frontend có thể track:
- `JobCreatedEvent`, `JobAppliedEvent`, `JobStateChangedEvent`
- `MilestoneSubmittedEvent`, `MilestoneAcceptedEvent`, `MilestoneRejectedEvent`
- `ClaimTimeoutEvent`
- `DisputeOpenedEvent`, `DisputeVotedEvent`, `DisputeResolvedEvent`

