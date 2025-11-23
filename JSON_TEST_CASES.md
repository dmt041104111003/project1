

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

## Test Case 1: Job đơn giản với 1 milestone

```json
{
  "title": "Thiết kế Logo đơn giản",
  "description": "Thiết kế logo cho startup công nghệ, yêu cầu đơn giản và hiện đại.",
  "requirements": [
    "Design",
    "Logo",
    "Adobe Illustrator"
  ],
  "deadline": 7,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.05",
      "duration": "5",
      "unit": "ngày",
      "reviewPeriod": "1",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## Test Case 2: Job với nhiều milestones nhỏ

```json
{
  "title": "Viết bài blog 3 phần",
  "description": "Viết 3 bài blog về công nghệ blockchain, mỗi bài 1000 từ.",
  "requirements": [
    "Writing",
    "Content",
    "Blockchain"
  ],
  "deadline": 14,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.03",
      "duration": "3",
      "unit": "ngày",
      "reviewPeriod": "12",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.03",
      "duration": "3",
      "unit": "ngày",
      "reviewPeriod": "12",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.04",
      "duration": "4",
      "unit": "ngày",
      "reviewPeriod": "1",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## Test Case 3: Job với deadline ngắn và review nhanh

```json
{
  "title": "Sửa lỗi bug khẩn cấp",
  "description": "Sửa lỗi critical bug trong ứng dụng web, cần hoàn thành nhanh.",
  "requirements": [
    "JavaScript",
    "React",
    "Bug Fix"
  ],
  "deadline": 2,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.08",
      "duration": "1",
      "unit": "ngày",
      "reviewPeriod": "2",
      "reviewUnit": "giờ"
    }
  ]
}
```

---

## Test Case 4: Job với milestones có unit khác nhau

```json
{
  "title": "Phát triển tính năng mới",
  "description": "Phát triển tính năng đăng nhập OAuth và dashboard người dùng.",
  "requirements": [
    "Node.js",
    "OAuth",
    "Frontend"
  ],
  "deadline": 21,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.06",
      "duration": "7",
      "unit": "ngày",
      "reviewPeriod": "24",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.07",
      "duration": "10",
      "unit": "ngày",
      "reviewPeriod": "2",
      "reviewUnit": "ngày"
    },
    {
      "amount": "0.07",
      "duration": "4",
      "unit": "ngày",
      "reviewPeriod": "1",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## Test Case 5: Job với số tiền rất nhỏ

```json
{
  "title": "Dịch tài liệu ngắn",
  "description": "Dịch tài liệu kỹ thuật từ tiếng Anh sang tiếng Việt, khoảng 500 từ.",
  "requirements": [
    "Translation",
    "English",
    "Vietnamese"
  ],
  "deadline": 3,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.01",
      "duration": "2",
      "unit": "ngày",
      "reviewPeriod": "6",
      "reviewUnit": "giờ"
    }
  ]
}
```

---

## Test Case 6: Job với nhiều milestones và review period ngắn

```json
{
  "title": "Tối ưu hóa database",
  "description": "Tối ưu hóa database với 4 bước: phân tích, index, query optimization, testing.",
  "requirements": [
    "SQL",
    "Database",
    "Optimization"
  ],
  "deadline": 10,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.02",
      "duration": "2",
      "unit": "ngày",
      "reviewPeriod": "4",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.02",
      "duration": "2",
      "unit": "ngày",
      "reviewPeriod": "4",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.03",
      "duration": "3",
      "unit": "ngày",
      "reviewPeriod": "6",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.03",
      "duration": "3",
      "unit": "ngày",
      "reviewPeriod": "1",
      "reviewUnit": "ngày"
    }
  ]
}
```

---

## Test Case 7: Job với unit giờ và phút

```json
{
  "title": "Setup server production",
  "description": "Setup và cấu hình server production cho ứng dụng web.",
  "requirements": [
    "DevOps",
    "Linux",
    "Nginx"
  ],
  "deadline": 5,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.04",
      "duration": "8",
      "unit": "giờ",
      "reviewPeriod": "30",
      "reviewUnit": "phút"
    },
    {
      "amount": "0.06",
      "duration": "12",
      "unit": "giờ",
      "reviewPeriod": "1",
      "reviewUnit": "giờ"
    }
  ]
}
```

---

## Test Case 8: Job với milestones có thời gian rất ngắn

```json
{
  "title": "Code review và refactor",
  "description": "Review code và refactor các function quan trọng trong dự án.",
  "requirements": [
    "Code Review",
    "Refactoring",
    "Best Practices"
  ],
  "deadline": 7,
  "deadlineUnit": "ngày",
  "milestones": [
    {
      "amount": "0.025",
      "duration": "1",
      "unit": "ngày",
      "reviewPeriod": "3",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.025",
      "duration": "1",
      "unit": "ngày",
      "reviewPeriod": "3",
      "reviewUnit": "giờ"
    },
    {
      "amount": "0.05",
      "duration": "2",
      "unit": "ngày",
      "reviewPeriod": "6",
      "reviewUnit": "giờ"
    }
  ]
}
```

---

aptos init --network testnet --profile zkp --assume-yes 

 aptos move publish \
  --profile zkp \
  --named-addresses job_work_board=0x48cab96b6e8464bc899e92222bc1c3afb7384b92770ad6c97cb1674a50843aba --assume-yes


pip install -r requirements.txt; pip install face-recognition==1.3.0 --no-deps; pip install Click>=6.0 face-recognition-models>=0.3.0