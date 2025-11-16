# JSON Test Cases cho MODULE 2: ESCROW - Quản lý công việc & thanh toán

## Cấu trúc JSON
```json
{
  "title": "Tiêu đề dự án",
  "description": "Mô tả chi tiết",
  "requirements": ["Kỹ năng 1", "Kỹ năng 2"],
  "deadline": 604800,  // Thời hạn nộp đơn (giây)
  "milestones": [
    {
      "amount": "0.1",           // Số tiền APT
      "duration": "7",            // Thời gian
      "unit": "ngày",            // Đơn vị: giây, phút, giờ, ngày, tuần, tháng
      "reviewPeriod": "3",       // Thời gian review (tùy chọn)
      "reviewUnit": "ngày"       // Đơn vị review (tùy chọn)
    }
  ]
}
```

---

## TEST CASE 1: Job đơn giản - 1 milestone
**Mục đích test:** Tạo job cơ bản nhất với 1 milestone, test flow tạo job → apply → hoàn thành → thanh toán

```json
{
  "title": "Phát triển landing page đơn giản",
  "description": "Cần thiết kế và code một landing page responsive cho sản phẩm mới. Yêu cầu HTML, CSS, JavaScript thuần.",
  "requirements": ["HTML", "CSS", "JavaScript"],
  "deadline": 604800,
  "milestones": [
    {
      "amount": "1.0",
      "duration": "7",
      "unit": "ngày",
      "reviewPeriod": "2",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 2: Job nhiều milestones - Test thanh toán từng milestone
**Mục đích test:** Test flow hoàn thành từng milestone và thanh toán tuần tự, test TH1 (suôn sẻ)

```json
{
  "title": "Phát triển ứng dụng web full-stack",
  "description": "Xây dựng ứng dụng web hoàn chỉnh với frontend React, backend Node.js, database MongoDB. Bao gồm authentication, CRUD operations, và deployment.",
  "requirements": ["React", "Node.js", "MongoDB", "Express", "JWT"],
  "deadline": 1209600,
  "milestones": [
    {
      "amount": "2.0",
      "duration": "14",
      "unit": "ngày",
      "reviewPeriod": "3",
      "reviewUnit": "ngày"
    },
    {
      "amount": "3.0",
      "duration": "14",
      "unit": "ngày",
      "reviewPeriod": "5",
      "reviewUnit": "ngày"
    },
    {
      "amount": "2.0",
      "duration": "7",
      "unit": "ngày",
      "reviewPeriod": "2",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 3: Job với thời gian ngắn (giây/phút) - Test timeout
**Mục đích test:** Test TH2 Case 1 - B không hoàn thành đúng hạn → A được claim_stake_B()

```json
{
  "title": "Test job timeout - Freelancer không hoàn thành",
  "description": "Job test để kiểm tra cơ chế timeout khi freelancer không hoàn thành milestone đúng hạn. Thời gian ngắn để test nhanh.",
  "requirements": ["Testing"],
  "deadline": 3600,
  "milestones": [
    {
      "amount": "0.1",
      "duration": "300",
      "unit": "giây",
      "reviewPeriod": "60",
      "reviewUnit": "giây"
    },
    {
      "amount": "0.1",
      "duration": "600",
      "unit": "giây",
      "reviewPeriod": "120",
      "reviewUnit": "giây"
    }
  ]
}
```

---

## TEST CASE 4: Job với review period dài - Test force_unlock
**Mục đích test:** Test TH2 Case 2 - B hoàn thành nhưng A không xác nhận → B force_unlock()

```json
{
  "title": "Test review period - Poster không xác nhận",
  "description": "Job test để kiểm tra cơ chế force_unlock khi poster không xác nhận milestone sau thời gian review. Review period dài để có thời gian test.",
  "requirements": ["Testing"],
  "deadline": 604800,
  "milestones": [
    {
      "amount": "0.5",
      "duration": "1",
      "unit": "ngày",
      "reviewPeriod": "1",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.5",
      "duration": "2",
      "unit": "ngày",
      "reviewPeriod": "1",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 5: Job với nhiều đơn vị thời gian khác nhau
**Mục đích test:** Test conversion các đơn vị thời gian (giây, phút, giờ, ngày, tuần, tháng)

```json
{
  "title": "Test conversion đơn vị thời gian",
  "description": "Job test để kiểm tra việc chuyển đổi các đơn vị thời gian khác nhau trong milestones.",
  "requirements": ["Testing"],
  "deadline": 2592000,
  "milestones": [
    {
      "amount": "0.1",
      "duration": "3600",
      "unit": "giây",
      "reviewPeriod": "1800",
      "reviewUnit": "giây"
    },
    {
      "amount": "0.1",
      "duration": "60",
      "unit": "phút",
      "reviewPeriod": "30",
      "reviewUnit": "phút"
    },
    {
      "amount": "0.1",
      "duration": "2",
      "unit": "giờ",
      "reviewPeriod": "1",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.1",
      "duration": "3",
      "unit": "ngày",
      "reviewPeriod": "1",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.1",
      "duration": "1",
      "unit": "tuần",
      "reviewPeriod": "2",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.1",
      "duration": "1",
      "unit": "tháng",
      "reviewPeriod": "7",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 6: Job không có review period - Dùng mặc định
**Mục đích test:** Test khi không có reviewPeriod → dùng duration làm review period

```json
{
  "title": "Test milestone không có review period",
  "description": "Job test để kiểm tra khi milestone không có reviewPeriod, hệ thống sẽ dùng duration làm review period mặc định.",
  "requirements": ["Testing"],
  "deadline": 604800,
  "milestones": [
    {
      "amount": "0.5",
      "duration": "7",
      "unit": "ngày"
    },
    {
      "amount": "0.5",
      "duration": "14",
      "unit": "ngày"
    }
  ]
}
```

---

## TEST CASE 7: Job với số tiền nhỏ - Test edge case
**Mục đích test:** Test với số tiền nhỏ nhất (0.001 APT) và kiểm tra tính toán stake/fee

```json
{
  "title": "Test job với số tiền nhỏ",
  "description": "Job test để kiểm tra edge case với số tiền milestone rất nhỏ. Test tính toán stake và fee system.",
  "requirements": ["Testing"],
  "deadline": 604800,
  "milestones": [
    {
      "amount": "0.001",
      "duration": "1",
      "unit": "ngày",
      "reviewPeriod": "12",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.002",
      "duration": "1",
      "unit": "ngày",
      "reviewPeriod": "12",
      "reviewUnit": "giờ"
    }
  ]
}
```

---

## TEST CASE 8: Job với số tiền lớn - Test tính toán tổng
**Mục đích test:** Test với số tiền lớn, kiểm tra tính toán total_amount và poster_deposit

```json
{
  "title": "Dự án blockchain lớn - Smart contract system",
  "description": "Phát triển hệ thống smart contract phức tạp với nhiều module: escrow, dispute, reputation. Yêu cầu audit và testing kỹ lưỡng.",
  "requirements": ["Move", "Aptos", "Smart Contract", "Security", "Testing"],
  "deadline": 2592000,
  "milestones": [
    {
      "amount": "10.0",
      "duration": "30",
      "unit": "ngày",
      "reviewPeriod": "7",
      "reviewUnit": "ngày"
    },
    {
      "amount": "15.0",
      "duration": "30",
      "unit": "ngày",
      "reviewPeriod": "7",
      "reviewUnit": "ngày"
    },
    {
      "amount": "10.0",
      "duration": "15",
      "unit": "ngày",
      "reviewPeriod": "5",
      "reviewUnit": "ngày"
    },
    {
      "amount": "5.0",
      "duration": "10",
      "unit": "ngày",
      "reviewPeriod": "3",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 9: Job deadline ngắn - Test hết hạn apply
**Mục đích test:** Test TH3 - Trường hợp hết hạn đăng job, A được rút escrow và stake về

```json
{
  "title": "Test job deadline ngắn",
  "description": "Job test với deadline rất ngắn để test trường hợp hết hạn apply. Poster sẽ được rút escrow và stake về.",
  "requirements": ["Testing"],
  "deadline": 3600,
  "milestones": [
    {
      "amount": "1.0",
      "duration": "7",
      "unit": "ngày",
      "reviewPeriod": "2",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 10: Job không có requirements - Test optional field
**Mục đích test:** Test khi không có requirements array hoặc requirements rỗng

```json
{
  "title": "Job không yêu cầu kỹ năng cụ thể",
  "description": "Dự án mở cho mọi freelancer, không yêu cầu kỹ năng cụ thể. Chỉ cần có kinh nghiệm và tinh thần trách nhiệm.",
  "deadline": 604800,
  "milestones": [
    {
      "amount": "2.0",
      "duration": "14",
      "unit": "ngày",
      "reviewPeriod": "3",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 11: Job với review unit khác unit chính
**Mục đích test:** Test khi reviewUnit khác với unit chính của milestone

```json
{
  "title": "Test review unit khác unit milestone",
  "description": "Job test để kiểm tra khi reviewUnit khác với unit chính của milestone. Ví dụ: milestone tính bằng ngày nhưng review tính bằng giờ.",
  "requirements": ["Testing"],
  "deadline": 604800,
  "milestones": [
    {
      "amount": "1.0",
      "duration": "7",
      "unit": "ngày",
      "reviewPeriod": "48",
      "reviewUnit": "giờ"
    },
    {
      "amount": "1.0",
      "duration": "2",
      "unit": "tuần",
      "reviewPeriod": "3",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## TEST CASE 12: Job thực tế - Smart contract development
**Mục đích test:** Test với job thực tế, đầy đủ thông tin, test toàn bộ flow từ tạo → apply → complete

```json
{
  "title": "Phát triển Smart Contract Escrow trên Aptos",
  "description": "Job test để kiểm tra khi reviewUnit khác với unit chính của milestone. Ví dụ: milestone tính bằng ngày nhưng review tính bằng giờ.",
  "requirements": [
    "Move",
    "Aptos",
    "Smart Contract",
    "Blockchain",
    "Security",
    "Testing"
  ],
  "deadline": 30,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.15",
      "duration": "21",
      "unit": "giây",
      "reviewPeriod": "5",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.1",
      "duration": "28",
      "unit": "ngày",
      "reviewPeriod": "7",
      "reviewUnit": "giây"
    },
    {
      "amount": "0.2",
      "duration": "14",
      "unit": "ngày",
      "reviewPeriod": "3",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.12",
      "duration": "7",
      "unit": "ngày",
      "reviewPeriod": "2",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

 aptos move publish \
  --profile zkp \
  --named-addresses job_work_board=0x345f210605fbfd1e4286ad513c1eb29ac08416d290bd635543be53488056bcf4 --assume-yes


## Tóm tắt các test case

| Test Case | Mục đích chính | Module/Flow test |
|-----------|----------------|------------------|
| 1 | Job đơn giản 1 milestone | ESCROW: Tạo job → Apply → Complete |
| 2 | Nhiều milestones | ESCROW: Thanh toán tuần tự (TH1) |
| 3 | Thời gian ngắn | ESCROW: Timeout, claim_stake_B (TH2 Case 1) |
| 4 | Review period dài | ESCROW: force_unlock (TH2 Case 2) |
| 5 | Đơn vị thời gian | ESCROW: Conversion giây/phút/giờ/ngày/tuần/tháng |
| 6 | Không có reviewPeriod | ESCROW: Default review period |
| 7 | Số tiền nhỏ | ESCROW: Edge case tính toán stake/fee |
| 8 | Số tiền lớn | ESCROW: Tính toán total_amount lớn |
| 9 | Deadline ngắn | ESCROW: Hết hạn apply, rút escrow (TH3) |
| 10 | Không có requirements | ESCROW: Optional field |
| 11 | Review unit khác | ESCROW: Conversion review period |
| 12 | Job thực tế | ESCROW: Full flow end-to-end |

---

## Lưu ý khi test

1. **Stake và Fee:**
   - Poster stake: 1 APT
   - Freelancer stake: 1 APT
   - Poster fee: 1.5 APT
   - Freelancer fee: 0.6 APT

2. **Deadline:** Tính bằng giây (Unix timestamp)
   - 3600 = 1 giờ
   - 86400 = 1 ngày
   - 604800 = 7 ngày
   - 2592000 = 30 ngày

3. **Milestone duration:** Sẽ được convert sang giây dựa trên unit

4. **Review period:** Nếu không có, sẽ dùng duration làm mặc định

