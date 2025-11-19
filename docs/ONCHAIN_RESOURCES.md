# Tài liệu Kiểm tra Resource On-chain

Tài liệu này hướng dẫn cách kiểm tra trạng thái on-chain của Freelancer Marketplace trên Aptos testnet và giải thích từng resource trong smart contract đang bảo vệ điều gì.

## Địa chỉ & Module quan trọng

| Hạng mục | Giá trị |
|----------|---------|
| Địa chỉ deploy contract | `0x7c5a7a65544cfc54692e55abf4367381f9b332e29fb781ab3d5f622f21080a8f` |
| Escrow Module | `0x…::escrow` |
| Dispute Module | `0x…::dispute` |
| Role Module | `0x…::role` |
| Reputation Module | `0x…::reputation` |
| REST Endpoint | `https://api.testnet.aptoslabs.com` |
| API Key Header | `x-api-key: <aptoslabs_key>` |

> Thay `<aptoslabs_key>` bằng key Aptos Labs của bạn (để tăng hạn mức). Không có key vẫn gọi được, nhưng dễ bị rate limit hơn.

---

## 1. Kiểm tra dữ liệu Escrow của Job

Mỗi job được lưu trong bảng `EscrowStore`. Ta có thể đọc theo `job_id` thông qua table handle và schema.

```powershell
# Payload query Job #1
$body = @{
    key_type   = "u64"
    value_type = "0x7c5a7a65...::escrow::Job"
    key        = "1"
} | ConvertTo-Json

# Gọi POST /v1/tables/<handle>/item
Invoke-WebRequest `
  -Uri "https://api.testnet.aptoslabs.com/v1/tables/0x138c9e963f021d5d0f6a7ffa997091e5de91ca469385c6707a872d29da4ed13d/item" `
  -Method POST `
  -Headers @{
      "Content-Type"="application/json"
      "x-api-key"    ="<aptoslabs_key>"
  } `
  -Body $body |
  Select-Object -ExpandProperty Content
```

### Kết quả nhận được
- `total_escrow` / `job_funds`: tổng APT đang bị khóa trong escrow.
- `milestones`: danh sách cột mốc (số tiền, trạng thái, deadline, `evidence_cid` mã hóa).
- `poster` / `freelancer`: địa chỉ ví liên quan.
- `state`: trạng thái job (`Pending`, `Submitted`, `Completed`, …).

Dựa vào đó, ta xác minh được số tiền đang khóa, milestone nào đã chấp nhận, và có dispute hay chưa.

---

## 2. Kiểm tra Dispute

Bước 1: lấy resource `DisputeStore` để biết table handle chứa toàn bộ dispute.

```powershell
Invoke-WebRequest `
  -Uri "https://api.testnet.aptoslabs.com/v1/accounts/0x7c5a7a65.../resource/0x7c5a7a65...::dispute::DisputeStore" `
  -Headers @{ "x-api-key"="<aptoslabs_key>" } |
  Select-Object -ExpandProperty Content
```

Bước 2: dùng `table.handle` đọc chi tiết dispute (ví dụ Dispute #1):

```powershell
$disputeTable = "0xbb0f0f7e491b0ea7f53cf1dfb657d3f7f83cad4312ecdda53f376b943ae680e2"

$body = @{
    key_type   = "u64"
    value_type = "0x7c5a7a65...::dispute::Dispute"
    key        = "1"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "https://api.testnet.aptoslabs.com/v1/tables/$disputeTable/item" `
  -Method POST `
  -Headers @{
      "Content-Type"="application/json"
      "x-api-key"    ="<aptoslabs_key>"
  } `
  -Body $body |
  Select-Object -ExpandProperty Content
```

JSON trả về cho biết reviewer nào được chọn, phiếu bầu ra sao, trạng thái hiện tại (`Open`, `Resolved`), và các `poster_evidence_cid` / `freelancer_evidence_cid`.

---

## 3. Role & Reviewer

Đọc resource `RoleStore` để xem danh sách reviewer và bảng lưu role người dùng:

```powershell
Invoke-WebRequest `
  -Uri "https://api.testnet.aptoslabs.com/v1/accounts/0x7c5a7a65.../resource/0x7c5a7a65...::role::RoleStore" `
  -Headers @{ "x-api-key"="<aptoslabs_key>" } |
  Select-Object -ExpandProperty Content
```

Kết quả gồm:
- `reviewers`: array địa chỉ được phép làm reviewer.
- `users.handle`: table handle dùng để map `address -> roles`, phục vụ việc kiểm tra chứng minh/role trên frontend.

---

## 4. Reputation

Reputation lưu trong `RepStore`:

```powershell
Invoke-WebRequest `
  -Uri "https://api.testnet.aptoslabs.com/v1/accounts/0x7c5a7a65.../resource/0x7c5a7a65...::reputation::RepStore" `
  -Headers @{ "x-api-key"="<aptoslabs_key>" } |
  Select-Object -ExpandProperty Content
```

Trả về table handle chứa điểm rep cho từng địa chỉ. Muốn xem điểm của ai thì dùng `POST /v1/tables/{handle}/item` tương tự như job/dispute ở trên.

---

## Smart Contract bảo vệ những gì?

1. **Escrow**
   - Poster nạp APT vào escrow theo từng milestone.
   - Tiền chỉ chuyển qua logic contract (poster accept, dispute resolve, mutual cancel).
   - Poster/freelancer phải stake khi cần, contract theo dõi `poster_stake`, `freelancer_stake`.

2. **Quy trình Milestone**
   - Milestone có flow rõ ràng (`Pending → Submitted → Accepted/Locked`).
   - `evidence_cid` được mã hóa để tránh lộ dữ liệu.
   - Freelancer không thể rút tiền khi chưa được nhận, poster cũng không thể đòi lại tiền nếu milestone đã accept trừ khi thắng dispute.

3. **Dispute & Reviewer Voting**
   - Mỗi dispute chọn ngẫu nhiên 3 reviewer từ danh sách on-chain.
   - Phiếu bầu lưu trực tiếp on-chain, đảm bảo minh bạch ai vote cho bên nào.
   - `poster_evidence_cid` / `freelancer_evidence_cid` chỉ là tham chiếu; file thật lưu trên IPFS, cần JWT để giải mã trên backend.

4. **Role + CCCD Proof**
   - `role::RoleStore` buộc ví phải nộp ZK proof CCCD trước khi đăng ký role freelancer/poster.
   - Reviewer list cũng on-chain, front-end chỉ hiện UI khi địa chỉ có mặt trong danh sách này.

5. **Reputation**
   - Mỗi job hoàn thành cập nhật điểm rep trong `RepStore`.
   - Không thể reset hoặc giả mạo rep vì dữ liệu nằm on-chain.

=> Các module này đảm bảo:
- Tiền escrow khóa chặt, chỉ giải ngân theo đúng kết quả milestone/dispute.
- Không ai có thể đăng ký role nếu chưa verify danh tính.
- Dispute minh bạch nhờ hệ thống reviewer + phiếu bầu on-chain.
- Reputation gắn với lịch sử job thật, không sửa được.

Bạn có thể dùng các lệnh PowerShell ở trên (hoặc chuyển sang `curl`) để audit job/dispute/role bất kỳ lúc nào. Chỉ cần giữ nguyên JSON body, đổi mỗi endpoint/handle cho phù hợp.

