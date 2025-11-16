# TÀI LIỆU MÔ TẢ CÁC MODULE

## MODULE 1 - ROLE

### Mục
### Nội dung

**Tên module**
- ROLE - quản lý đăng ký vai trò

**Chức năng chính**
- Người dùng đăng ký: Freelancer / Poster / Reviewer
- Mỗi vai trò chỉ đăng ký 1 lần cho mỗi ví
- Dùng xác minh ZK off-chain để đảm bảo "mỗi người thật chỉ có 1 ví"

**Cách dùng ZK (off-chain)**
- Người dùng gửi ảnh CCCD + ảnh khuôn mặt lên backend 
- Backend đọc số CCCD bằng OCR
- So khớp khuôn mặt bằng AI 
- Kiểm tra số CCCD đã gắn với ví khác chưa 
- Sinh bằng chứng ZK chứng minh "CCCD này thuộc về ví này" 
- Gửi lên blockchain chỉ 1 cờ xác minh (đã xác thực), không gửi CCCD

**Dữ liệu lưu trên blockchain**
- Danh sách ví đã có vai trò 
- Hồ sơ CID dành cho Freelancer/Poster 
- Danh sách Reviewer đã xác minh 
- Cờ đánh dấu ví đã được xác minh ZK (proofs table)
- Cờ đánh dấu vai trò đã được đăng ký 1 lần
- Bảng proof_hashes để kiểm tra duplicate proof

**Luồng xử lý**
- Người dùng gửi CCCD + mặt -> backend xác minh 
- Backend kiểm tra số CCCD có bị dùng lại không 
- Backend tạo bằng chứng ZK 
- Backend gọi `store_proof` để lưu proof lên blockchain
- Backend gọi `register_role` để đăng ký vai trò (yêu cầu đã có proof)
- Blockchain ghi vai trò + xác minh 
- Reviewer được đưa vào danh sách Reviewer

**Ràng buộc bảo vệ**
- Một CCCD = một ví duy nhất (kiểm tra qua proof_hashes table)
- Một ví = mỗi vai trò chỉ đăng ký một lần (kiểm tra trong register_role)
- Reviewer bắt buộc phải qua xác minh (register_role yêu cầu has_proof)
- Không lưu CCCD hoặc ảnh trên blockchain (chỉ lưu ZK proof và public signals)

**Tương tác với module khác**
- ESCROW: chỉ ví đã xác minh mới tạo/nhận job (kiểm tra has_poster/has_freelancer)
- DISPUTE: chỉ reviewer đã xác minh được chọn (lấy từ danh sách reviewers)
- REPUTATION: điểm uy tín gắn với người thật

---

## MODULE 2 - ESCROW

### Mục
### Nội dung

**Tên module**
- ESCROW - quản lý job và dòng tiền

**Chức năng chính**
- Tạo job, nhận job, đặt cọc, gửi tiền escrow
- Quản lý từng mốc công việc (milestone)
- Duyệt, từ chối, nộp bài, chứng cứ
- Xử lý hết hạn, hủy, reset job

**Cách dùng ZK**
- Không dùng ZK trực tiếp bên trong ESCROW
- Chỉ cho phép người đã được xác minh ở module ROLE thực hiện hành động (kiểm tra has_poster/has_freelancer)

**Dữ liệu lưu trên blockchain**
- Danh sách job
- Trạng thái job
- Danh sách milestone
- Tiền escrow, tiền đặt cọc, phí hệ thống
- Hạn nộp bài và hạn đánh giá
- Mã tranh chấp liên kết DISPUTE

**Luồng xử lý**
- Người thuê (Poster) tạo job sau khi xác minh
- Người nhận (Freelancer) apply và đặt cọc
- Freelancer nộp kết quả mỗi milestone
- Poster duyệt hoặc từ chối
- Từ chối -> chuyển sang tranh chấp
- Hết hạn -> auto-accept hoặc mất cọc
- Có thể hủy job theo các điều kiện

**Ràng buộc bảo vệ**
- Chỉ người đã xác minh mới tạo hoặc nhận job (kiểm tra has_poster/has_freelancer)
- Không apply quá hạn
- Milestone xử lý theo thứ tự
- Không hủy khi milestone đang chờ duyệt
- Đặt cọc giúp chống spam apply

**Tương tác với module khác**
- ROLE: kiểm tra đã xác minh (has_poster/has_freelancer)
- DISPUTE: khi từ chối milestone (lock milestone và chuyển sang dispute)
- REPUTATION: cập nhật điểm khi milestone được accept (+1 cho cả freelancer và poster)

---

## MODULE 3 - DISPUTE

### Mục
### Nội dung

**Tên module**
- DISPUTE - xử lý tranh chấp

**Chức năng chính**
- Chọn 3 reviewer để bỏ phiếu
- Quyết định bên thắng dựa trên đa số 2/3

**Cách dùng ZK**
- Chỉ chọn reviewer đã được xác minh (qua CCCD + FaceMatch)
- Đảm bảo mỗi reviewer là một người thật và không thể tạo nhiều ví

**Dữ liệu lưu trên blockchain**
- Thông tin tranh chấp (job, milestone, hai bên liên quan)
- Bằng chứng từ hai bên
- 3 reviewer được chọn
- Danh sách phiếu bầu
- Trạng thái bận/rảnh của từng reviewer (reviewer_load table)

**Luồng xử lý**
- Poster từ chối milestone -> mở tranh chấp
- Chọn 3 reviewer theo logic:
  - Lọc reviewer đã xác minh, đang rảnh (busy = 0), không liên quan job
  - Nếu đủ điều kiện: chọn 1 reviewer có UT < UT của người khởi tạo dispute, 1 reviewer có UT > UT của người khởi tạo dispute, và 1 reviewer có điểm cao nhất
  - Nếu không đủ 3 loại: chọn tất cả reviewer eligible
- Reviewer bỏ phiếu (thắng Freelancer hoặc thắng Poster)
- Đủ 3 phiếu -> quyết định bằng đa số 2/3
- Gọi ESCROW để trả tiền/refund
- Reviewer được thưởng hoặc phạt điểm uy tín
- Reviewer được đánh dấu rảnh trở lại

**Ràng buộc bảo vệ**
- Reviewer phải đã qua xác minh (lấy từ danh sách reviewers của ROLE)
- Reviewer không được bận tranh chấp khác (kiểm tra reviewer_load)
- Reviewer không được là người trong cuộc (poster hoặc freelancer)
- Reviewer không bỏ phiếu 2 lần
- Quyết định phải có 2/3 phiếu (>= 2 phiếu trong 3 phiếu)

**Tương tác với module khác**
- ROLE: lấy reviewer đã xác minh (get_reviewers)
- ESCROW: xử lý thanh toán khi có kết quả (resolve_dispute)
- REPUTATION: cộng/trừ uy tín reviewer (vote đúng +2, vote sai -1) và hai bên (thắng +2, thua -1)

---

## MODULE 4 - REPUTATION

### Mục
### Nội dung

**Tên module**
- REPUTATION - quản lý điểm uy tín

**Chức năng chính**
- Ghi điểm uy tín (UT) cho từng ví người dùng

**Cách dùng ZK**
- Không dùng trực tiếp
- UT chỉ có ý nghĩa vì người dùng đã được xác minh là người thật

**Dữ liệu lưu trên blockchain**
- Điểm uy tín của mỗi ví (Rep table)

**Luồng cập nhật UT**
- Milestone được accept -> +1 cho cả freelancer và poster (gọi từ ESCROW.process_milestone_payment)
- Thắng tranh chấp -> +2 (bên thắng), bên thua -1 (gọi từ ESCROW.resolve_dispute)
- Reviewer vote đúng -> +2 (gọi từ DISPUTE.tally_votes)
- Reviewer vote sai -> -1 (gọi từ DISPUTE.tally_votes)

**Lưu ý quan trọng:**
- Code hiện tại KHÔNG có logic cập nhật UT khi job completed
- UT chỉ được cập nhật khi milestone được accept (mỗi milestone +1 cho cả 2 bên)
- Khi tất cả milestone được accept, job chuyển sang Completed nhưng không có thêm điểm UT

**Ràng buộc bảo vệ**
- Người dùng không thể tự chỉnh điểm
- Chỉ ESCROW và DISPUTE được quyền thay đổi UT (friend functions)

**Tương tác với module khác**
- ESCROW: tăng điểm khi milestone được accept
- DISPUTE: thưởng/phạt reviewer và hai bên
- ROLE: UT phản ánh uy tín của người thật đã xác minh

