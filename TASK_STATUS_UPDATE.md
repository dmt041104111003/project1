# BACKLOG DỰ ÁN WEB2.5 FREELANCER (Áp dụng Scrum/Agile)

## 1. Tổng quan Agile
- **Định hướng**: phát triển theo vòng lặp ngắn (Sprint), liên tục kiểm chứng, nhận phản hồi và tinh chỉnh sản phẩm.
- **Product Backlog**: tập hợp yêu cầu được ưu tiên, mô tả dưới dạng User Story, có tiêu chí chấp nhận rõ ràng.
- **Sprint Backlog**: lựa chọn tập mục tiêu khả thi trong 1 Sprint (1-2 tuần), kết thúc bằng phiên bản có thể kiểm thử.
- **Sự kiện Scrum**: Lập kế hoạch Sprint → Daily Scrum → Sprint Review → Sprint Retrospective.
- **Vai trò**:
  - Product Owner (PO): định hướng giá trị, sắp xếp ưu tiên backlog (Tùng kiêm PO kỹ thuật).
  - Scrum Master (SM): điều phối, tháo gỡ vướng mắc (Hải).
  - Development Team: Tùng, Hải, Quý, Quân, Trang.

---

## 2. Product Backlog (Tóm tắt theo Nhóm Chức năng)

| Nhóm chức năng | User Story chính | Độ ưu tiên |
|----------------|------------------|------------|
| Hợp đồng thông minh & Escrow | “Là người thuê, tôi muốn gửi tiền ký quỹ an toàn để đảm bảo chỉ giải ngân khi cột mốc đạt.” | Rất cao |
| Tranh chấp & Uy tín | “Là người làm tự do, tôi muốn nếu có tranh chấp thì có hội đồng đánh giá công bằng và ghi nhận vào uy tín.” | Rất cao |
| Định danh AI + ZK Proof | “Là người dùng mới, tôi muốn xác minh danh tính mà không lộ dữ liệu gốc.” | Cao |
| Backend API | “Là frontend, tôi cần API ổn định để lấy job, tranh chấp, proof, IPFS...” | Cao |
| Giao diện người dùng | “Là người dùng, tôi muốn có UI trực quan để đăng job, theo dõi cột mốc, xử lý tranh chấp.” | Cao |
| Dịch vụ AI | “Là hệ thống, tôi cần OCR và xác minh khuôn mặt để tự động hoá định danh.” | Trung bình |
| Kiểm thử & Tài liệu | “Là đội dự án, tôi cần bộ test và tài liệu để đảm bảo chất lượng dài hạn.” | Trung bình |

---

## 3. Sprint Backlog chi tiết

### Sprint 1 – Nền tảng Smart Contract
| Mã | Hạng mục | Người phụ trách | Trạng thái |
|----|----------|-----------------|------------|
| S1-01 | Module Role & lưu CID | Tùng | Done |
| S1-02 | Module Escrow (job, cột mốc, ký quỹ) | Tùng | Done |
| S1-03 | Module Dispute | Tùng | Done |
| S1-04 | Module Reputation | Tùng | Done |
| S1-05 | Submit Milestone | Tùng | Done |
| S1-06 | Confirm Milestone | Tùng | Done |
| S1-07 | Reject Milestone & lock escrow | Tùng | Done |
| S1-08 | Withdraw (poster / freelancer) | Tùng | Done |
| S1-09 | Tạo tranh chấp + chọn reviewer | Tùng | Done |
| S1-10 | Bỏ phiếu tranh chấp | Tùng | Done |
| S1-11 | Cập nhật uy tín khi cột mốc hoàn thành | Tùng | Done |

### Sprint 2 – ZKP (proof & lưu trữ)
| Mã | Hạng mục | Người phụ trách | Trạng thái |
|----|----------|-----------------|------------|
| S2-01 | Thiết kế circuit xác minh CCCD (kiểm tuổi & hạn sử dụng) | Tùng | Done |
| S2-02 | Thiết lập pipeline build circuit → Groth16 proof (wasm, zkey, witness) | Tùng | Done |
| S2-03 | Sinh proof/public signals và ghi vào `RoleStore::proofs` | Tùng | Done |
| S2-04 | Kiểm thử & ngăn proof trùng lặp bằng bảng hash | Tùng | Done |

### Sprint 3 – Backend API
| Mã | Hạng mục | Người phụ trách | Trạng thái |
|----|----------|-----------------|------------|
| S3-01 | Dịch vụ chat (liệt kê & theo dõi phòng/tin) | Hải | Done |
| S3-02 | Dịch vụ chat (tạo phòng/gửi tin, kiểm tra điều kiện proof) | Hải | Done |
| S3-03 | Dịch vụ chat (xoá phòng/tin, đồng bộ Firebase) | Hải | Done |
| S3-04 | API tải ảnh khuôn mặt lên hệ thống xác minh | Hải | Done |
| S3-05 | API điều phối xác minh khuôn mặt (gọi Python AI) | Hải | Done |
| S3-06 | API điều phối OCR CCCD (gọi Python AI) | Hải | Done |
| S3-07 | API truy vấn proof trên blockchain | Hải | Done |
| S3-08 | API tạo proof + kiểm tra trùng lặp | Hải | Done |
| S3-09 | API quản lý metadata IPFS (upload/lấy minh chứng) | Hải | Done |
| S3-10 | API đồng bộ dữ liệu job/profile/tranh chấp từ IPFS | Hải | Done |
| S3-11 | Chuẩn hóa lỗi & validation cho toàn bộ backend | Hải | Done |

### Sprint 4 – Dịch vụ AI
| Mã | Hạng mục | Người phụ trách | Trạng thái |
|----|----------|-----------------|------------|
| S4-01 | OCR CCCD | Quân | Done |
| S4-02 | Face verification + anti-spoofing | Quân | Done |
| S4-03 | API hợp nhất OCR + Face | Quân | Done |

### Sprint 5 – Frontend UI
| Mã | Hạng mục | Nội dung chính | Người phụ trách | Trạng thái |
|----|----------|----------------|-----------------|------------|
| S5-01 | Luồng định danh & đăng vai trò | OCR → Face → ZK Proof → đăng vai trò, kiểm tra proof trước khi gọi contract | Quý | Done |
| S5-02 | Dashboard & trang quản lý công việc | Liệt kê job, trạng thái ký quỹ, tiến độ cột mốc, hành động rút/ứng tuyển | Quý | Done |
| S5-03 | Trải nghiệm chat bảo vệ bằng proof | Tạo phòng, kiểm tra proof cả hai bên, đồng bộ tin nhắn thời gian thực | Quý | Done |
| S5-04 | Trang danh sách/chi tiết công việc | Kết hợp dữ liệu on-chain và IPFS để hiển thị mô tả, cột mốc, người tham gia | Quý | Done |
| S5-05 | Quản lý cột mốc & hành động | Submit/Approve/Reject, cảnh báo tranh chấp, toast tiếng Việt | Quý | Done |
| S5-06 | Trang tranh chấp & bỏ phiếu | Hiển thị chứng cứ, reviewer, luồng bỏ phiếu 2/3, cập nhật kết quả | Quý | Done |
| S5-07 | Landing page & nội dung marketing tiếng Việt | Giải thích quy trình ký quỹ, tranh chấp 2/3, định danh bằng AI + ZK Proof | Quý | Done |
| S5-08 | Hạ tầng UI chung | Phân trang tái sử dụng, responsive, trạng thái tải/lỗi, đồng bộ context ví | Quý | Done |

### Sprint 6 – Testing & Documentation
| Mã | Hạng mục | Người phụ trách | Trạng thái |
|----|----------|-----------------|------------|
| S6-01 | Kiểm thử luồng đăng/ứng tuyển job | Trang | In progress |
| S6-02 | Kiểm thử cột mốc | Trang | In progress |
| S6-03 | Kiểm thử tranh chấp & uy tín | Trang | In progress |
| S6-04 | Kiểm thử định danh (OCR/Face/ZK) | Trang | In progress |
| S6-05 | Bộ E2E tổng thể | Trang | In progress |
| S6-06 | Kiểm thử hiệu năng | Trang | Pending |
| S6-07 | Tài liệu API | Trang | Pending |
| S6-08 | Hướng dẫn người dùng | Trang | Pending |

---

## 4. Thống kê
- **Theo thành viên**: Tùng (15), Hải (11), Quý (21), Quân (3), Trang (8).
- **Theo Sprint**: S1 (11), S2 (4), S3 (11), S4 (3), S5 (21), S6 (8).

## 5. Luồng phụ thuộc
1. **Sprint 1** (Smart Contract) → nền tảng cho toàn hệ thống.  
2. **Sprint 2** (ZK Proof) → phụ thuộc Sprint 1, cung cấp dữ liệu xác minh cho backend/frontend.  
3. **Sprint 3** (API) → cần Smart Contract + AI.  
4. **Sprint 4** (AI) → đầu vào cho Sprint 3 & 5.  
5. **Sprint 5** (Frontend) → tiêu thụ API & dịch vụ AI.  
6. **Sprint 6** (Testing/Docs) → chạy xuyên suốt nhưng cần phiên bản ổn định từ các sprint trước.